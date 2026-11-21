package Firqui.service;

import Firqui.entity.Order;
import Firqui.entity.Payment;
import Firqui.entity.WebhookEvent;
import Firqui.repository.CartItemRepository;
import Firqui.repository.OrderRepository;
import Firqui.repository.PaymentRepository;
import Firqui.repository.WebhookEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Razorpay "Standard Checkout" flow for online orders.
 *
 *  1. POST /api/orders                  -> order saved as PENDING_PAYMENT, stock reserved
 *  2. startCheckout(orderNumber)        -> Razorpay order created for the TRUSTED order total
 *  3. Browser opens Razorpay Checkout   -> customer pays
 *  4. confirmCheckout(...)              -> signature checked, payment fetched from Razorpay, order PAID
 *     payment.captured / order.paid webhook does the same if the browser never comes back,
 *     and reconcile() lets the page ask "did my payment go through?".
 *
 * All three entry points end in applyPayment(), which runs with the order row locked
 * and is idempotent, so they can race each other safely.
 */
@Service
public class RazorpayPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayPaymentService.class);

    public static final String AWAITING_PAYMENT = "PENDING_PAYMENT";

    @Autowired private RazorpayGateway gateway;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private CartItemRepository cartItemRepository;
    @Autowired private RefundService refundService;
    @Autowired(required = false) private EmailService emailService;
    @Autowired private PlatformTransactionManager transactionManager;

    /** Unpaid online orders are cancelled (and their stock released) after this long. */
    @Value("${app.payments.checkout-expiry-minutes:45}")
    private long checkoutExpiryMinutes;

    public record Outcome(boolean paid, String orderNumber, String paymentId, String paymentMethod, String message) {
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("success", paid);
            m.put("paid", paid);
            m.put("orderNumber", orderNumber);
            if (paid) {
                m.put("paymentId", paymentId);
                m.put("paymentMethod", paymentMethod);
            }
            m.put("message", message);
            return m;
        }
    }

    public String getKeyId() {
        return gateway.getKeyId();
    }

    /* =====================================================
       1. START CHECKOUT
       The amount always comes from the saved order, never from the browser.
    ====================================================== */
    @Transactional
    public Map<String, Object> startCheckout(String orderNumber) {
        if (!gateway.isConfigured()) {
            throw new PaymentException(503, "Online payment is temporarily unavailable. Please try again later.");
        }
        if (orderNumber == null || orderNumber.isBlank()) throw new PaymentException(400, "Order number is required.");
        String clean = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findLockedByOrderNumber(clean)
                .orElseThrow(() -> new PaymentException(404, "Order #" + clean + " not found."));

        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new PaymentException(409, "Order #" + clean + " has already been paid.");
        }
        if (RefundService.isCancelled(order) || !AWAITING_PAYMENT.equalsIgnoreCase(order.getPaymentStatus())) {
            throw new PaymentException(409, "Order #" + clean + " can no longer be paid online. Please place a new order.");
        }
        long amount = RefundService.toPaise(order.getTotalAmount());
        if (amount < 100) throw new PaymentException(400, "Order total is below the minimum online payment of ₹1.");

        // A Razorpay order accepts repeated attempts until one succeeds, so it is created once and reused
        if (order.getRazorpayOrderId() == null || order.getRazorpayOrderId().isBlank()) {
            try {
                JsonNode created = gateway.createOrder(amount, order.getOrderNumber(),
                        Map.of("order_number", order.getOrderNumber()));
                order.setRazorpayOrderId(created.path("id").asString());
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);
            } catch (RazorpayGateway.RazorpayException e) {
                throw new PaymentException(502, "Could not start the payment: " + e.getMessage());
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("orderNumber", order.getOrderNumber());
        res.put("order_id", order.getRazorpayOrderId());
        res.put("amount", amount);
        res.put("currency", "INR");
        res.put("key_id", gateway.getKeyId());
        return res;
    }

    /* =====================================================
       2. CHECKOUT CALLBACK (Razorpay handler -> browser -> here)
    ====================================================== */
    @Transactional
    public Outcome confirmCheckout(String razorpayOrderId, String paymentId, String signature) {
        if (!gateway.verifyPaymentSignature(razorpayOrderId, paymentId, signature)) {
            logger.warn("Rejected payment callback with bad signature (order {}, payment {})", razorpayOrderId, paymentId);
            throw new PaymentException(400, "Payment verification failed. If money was debited, it will be confirmed or refunded automatically.");
        }
        Order order = orderRepository.findLockedByRazorpayOrderId(razorpayOrderId.trim())
                .orElseThrow(() -> new PaymentException(404, "No order is linked to this payment."));
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus()) && paymentId.trim().equals(order.getRazorpayPaymentId())) {
            return paidOutcome(order, "Payment already confirmed.");
        }
        JsonNode payment;
        try {
            payment = gateway.fetchPayment(paymentId.trim());
        } catch (RazorpayGateway.RazorpayException e) {
            throw new PaymentException(502, "Could not confirm the payment with Razorpay yet. It will be confirmed automatically.");
        }
        return applyPayment(order, payment);
    }

    /* =====================================================
       3. WEBHOOK
       Throws on anything Razorpay should retry (5xx); returns normally otherwise.
    ====================================================== */
    @Transactional
    public void handleWebhook(String eventIdHeader, byte[] rawBody, String signature) {
        if (!gateway.isWebhookConfigured()) {
            logger.error("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set");
            throw new PaymentException(503, "Webhook secret not configured");
        }
        if (!gateway.verifyWebhookSignature(rawBody, signature)) {
            logger.warn("Rejected Razorpay webhook with invalid signature");
            throw new PaymentException(400, "Invalid signature");
        }
        String eventId = eventIdHeader != null && !eventIdHeader.isBlank() ? eventIdHeader.trim() : "sha256:" + sha256(rawBody);
        if (webhookEventRepository.existsByEventId(eventId)) {
            logger.info("Duplicate Razorpay webhook {} skipped", eventId);
            return;
        }

        JsonNode event = gateway.parse(rawBody);
        String type = event.path("event").asString("");
        JsonNode payload = event.path("payload");
        String outcome = "PROCESSED";
        try {
            switch (type) {
                case "payment.authorized", "payment.captured", "order.paid" ->
                        onPaymentEvent(payload.path("payment").path("entity"));
                case "payment.failed" -> onPaymentFailed(payload.path("payment").path("entity"));
                case "refund.created", "refund.processed", "refund.failed" ->
                        refundService.onRefundWebhook(payload.path("refund").path("entity"));
                default -> outcome = "IGNORED";
            }
        } catch (PaymentException e) {
            if (e.getHttpStatus() >= 500) throw e;
            // A permanent problem (e.g. amount mismatch): retrying will not help, so record and stop
            logger.error("Razorpay webhook {} ({}) could not be applied: {}", eventId, type, e.getMessage());
            outcome = "FAILED";
        }
        webhookEventRepository.save(new WebhookEvent(eventId, type.isEmpty() ? "unknown" : type,
                new String(rawBody, StandardCharsets.UTF_8), outcome));
    }

    private void onPaymentEvent(JsonNode payment) {
        String razorpayOrderId = payment.path("order_id").asString("");
        if (razorpayOrderId.isEmpty()) return;
        Optional<Order> order = orderRepository.findLockedByRazorpayOrderId(razorpayOrderId);
        if (order.isEmpty()) {
            logger.info("Webhook payment {} is for Razorpay order {} which is not ours; ignored",
                    payment.path("id").asString(), razorpayOrderId);
            return;
        }
        applyPayment(order.get(), payment);
    }

    private void onPaymentFailed(JsonNode payment) {
        orderRepository.findLockedByRazorpayOrderId(payment.path("order_id").asString(""))
                .ifPresent(order -> recordPayment(order, payment, false));
        // The order stays PENDING_PAYMENT: the customer can try again with another method
    }

    /* =====================================================
       4. RECONCILE ("Check payment status" button, modal closed early, etc.)
    ====================================================== */
    @Transactional
    public Outcome reconcile(String orderNumber) {
        if (orderNumber == null || orderNumber.isBlank()) throw new PaymentException(400, "Order number is required.");
        String clean = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findLockedByOrderNumber(clean)
                .orElseThrow(() -> new PaymentException(404, "Order #" + clean + " not found."));
        return reconcileLocked(order);
    }

    private Outcome reconcileLocked(Order order) {
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus()) && order.getRazorpayPaymentId() != null) {
            return paidOutcome(order, "Payment confirmed.");
        }
        if (order.getRazorpayOrderId() == null || order.getRazorpayOrderId().isBlank()) {
            return new Outcome(false, order.getOrderNumber(), null, null, "No payment has been started for this order.");
        }
        JsonNode attempts;
        try {
            attempts = gateway.fetchOrderPayments(order.getRazorpayOrderId());
        } catch (RazorpayGateway.RazorpayException e) {
            throw new PaymentException(502, "Could not reach Razorpay. Please try again in a moment.");
        }
        for (String wanted : List.of("captured", "authorized")) {
            for (JsonNode p : attempts) {
                if (wanted.equals(p.path("status").asString())) return applyPayment(order, p);
            }
        }
        return new Outcome(false, order.getOrderNumber(), null, null,
                "We have not received the payment yet. If money was debited, it will be confirmed or refunded automatically.");
    }

    /* =====================================================
       5. EXPIRE ABANDONED CHECKOUTS
       Releases stock held by online orders that were never paid.
    ====================================================== */
    @Scheduled(fixedDelayString = "${app.payments.expiry-sweep-ms:600000}", initialDelayString = "${app.payments.expiry-sweep-initial-ms:120000}")
    public void expireAbandonedCheckouts() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(checkoutExpiryMinutes);
        List<Order> stale = orderRepository.findByPaymentStatusAndCreatedAtBefore(AWAITING_PAYMENT, cutoff);
        if (stale.isEmpty()) return;
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        for (Order o : stale) {
            try {
                tx.executeWithoutResult(s -> expireOne(o.getOrderNumber()));
            } catch (Exception e) {
                logger.warn("Could not expire checkout for order #{}: {}", o.getOrderNumber(), e.getMessage());
            }
        }
    }

    private void expireOne(String orderNumber) {
        Order order = orderRepository.findLockedByOrderNumber(orderNumber).orElse(null);
        if (order == null || !AWAITING_PAYMENT.equalsIgnoreCase(order.getPaymentStatus())) return;
        if (order.getRazorpayOrderId() != null && !order.getRazorpayOrderId().isBlank()) {
            // Never expire an order Razorpay might have taken money for; reconcile throws if Razorpay is unreachable
            if (reconcileLocked(order).paid()) return;
            if (!AWAITING_PAYMENT.equalsIgnoreCase(order.getPaymentStatus())) return;
        }
        RefundService.markCancelled(order, "Payment not completed",
                "Checkout expired after " + checkoutExpiryMinutes + " minutes without a successful payment.");
        refundService.restoreStock(order);
        order.setPaymentStatus("EXPIRED");
        order.setRefundStatus("NOT_APPLICABLE");
        orderRepository.save(order);
        logger.info("Order #{} expired unpaid; stock released", order.getOrderNumber());
    }

    /* =====================================================
       CORE: apply a Razorpay payment to a LOCKED order (idempotent)
    ====================================================== */
    Outcome applyPayment(Order order, JsonNode payment) {
        String paymentId = payment.path("id").asString("");
        String status = payment.path("status").asString("");
        long expected = RefundService.toPaise(order.getTotalAmount());

        if (!paymentId.startsWith("pay_") || !payment.path("order_id").asString("").equals(order.getRazorpayOrderId())) {
            throw new PaymentException(400, "This payment does not belong to order #" + order.getOrderNumber() + ".");
        }
        long amount = payment.path("amount").asLong(-1);
        if (amount != expected || !"INR".equalsIgnoreCase(payment.path("currency").asString(""))) {
            logger.error("Order #{}: payment {} is {} {} but order total is {} paise",
                    order.getOrderNumber(), paymentId, amount, payment.path("currency").asString(), expected);
            throw new PaymentException(400, "Payment amount does not match the order total.");
        }

        if ("authorized".equals(status)) {
            payment = capture(paymentId, amount);
            status = payment.path("status").asString("");
        }
        if ("failed".equals(status)) {
            recordPayment(order, payment, false);
            String reason = payment.path("error_description").asString("The payment was declined.");
            return new Outcome(false, order.getOrderNumber(), null, null, "Payment failed: " + reason);
        }
        if (!"captured".equals(status)) {
            return new Outcome(false, order.getOrderNumber(), null, null, "Payment is not complete yet (" + status + ").");
        }

        // --- captured ---
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            if (paymentId.equals(order.getRazorpayPaymentId())) {
                recordPayment(order, payment, true);
                return paidOutcome(order, "Payment already confirmed.");
            }
            // The customer paid twice for the same order: keep the first, return the second
            recordPayment(order, payment, true);
            if (!hasRefundFor(order, paymentId)) refundService.refundDuplicatePayment(order, paymentId, amount);
            logger.warn("Order #{} received a second payment {}; it is being refunded", order.getOrderNumber(), paymentId);
            return paidOutcome(order, "This order was already paid. The extra payment is being refunded.");
        }

        setPaymentFields(order, payment);
        if (RefundService.isCancelled(order)) {
            // Paid after the order was cancelled (checkout expired / cancelled meanwhile): refund in full
            orderRepository.save(order);
            recordPayment(order, payment, true);
            if (refundService.refundablePaise(order) >= 100) {
                refundService.refundPaymentForCancelledOrder(order, paymentId, amount);
            }
            orderRepository.save(order);
            logger.warn("Order #{} was paid ({}) after it was cancelled; refunded", order.getOrderNumber(), paymentId);
            return new Outcome(false, order.getOrderNumber(), null, null,
                    "This order was cancelled before your payment completed, so the full amount is being refunded to you.");
        }

        order.setOrderStatus("CONFIRMED");
        Order saved = orderRepository.save(order);
        recordPayment(saved, payment, true);
        if (saved.getUser() != null) cartItemRepository.deleteByUser(saved.getUser());
        sendConfirmationAfterCommit(saved);
        logger.info("Order #{} PAID via Razorpay payment {} ({})", saved.getOrderNumber(), paymentId, saved.getPaymentMethod());
        return paidOutcome(saved, "Payment successful.");
    }

    private JsonNode capture(String paymentId, long amount) {
        try {
            return gateway.capturePayment(paymentId, amount);
        } catch (RazorpayGateway.RazorpayException e) {
            // Most often "already captured" (auto-capture or a parallel request): read the real state
            try {
                return gateway.fetchPayment(paymentId);
            } catch (RazorpayGateway.RazorpayException again) {
                throw new PaymentException(502, "Payment authorised but not yet captured; it will be confirmed shortly.");
            }
        }
    }

    private void setPaymentFields(Order order, JsonNode payment) {
        String paymentId = payment.path("id").asString();
        order.setPaymentStatus("PAID");
        order.setPaymentMethod(RefundService.truncate(describeMethod(payment), 255));
        order.setTransactionId(paymentId);
        order.setRazorpayPaymentId(paymentId);
        order.setPaymentVerifiedAt(LocalDateTime.now());
        order.setVerifiedBy("RAZORPAY");
        order.setUpdatedAt(LocalDateTime.now());
    }

    private boolean hasRefundFor(Order order, String paymentId) {
        return refundService.hasActiveRefund(paymentId);
    }

    /** Upserts the payments table row for this Razorpay payment. */
    private void recordPayment(Order order, JsonNode p, boolean verified) {
        String paymentId = p.path("id").asString("");
        if (paymentId.isEmpty()) return;
        Payment row = paymentRepository.findByRazorpayPaymentId(paymentId).orElseGet(Payment::new);
        row.setOrder(order);
        row.setOrderNumber(order.getOrderNumber());
        row.setRazorpayPaymentId(paymentId);
        row.setRazorpayOrderId(p.path("order_id").asString(order.getRazorpayOrderId() != null ? order.getRazorpayOrderId() : "N/A"));
        row.setAmount(p.path("amount").asLong(0) / 100.0);
        row.setCurrency(p.path("currency").asString("INR"));
        row.setPaymentMethod(RefundService.truncate(p.path("method").asString(null), 50));
        row.setPaymentStatus(p.path("status").asString("unknown"));
        row.setBank(RefundService.truncate(nullIfBlank(p.path("bank").asString(null)), 50));
        row.setVpa(RefundService.truncate(nullIfBlank(p.path("vpa").asString(null)), 100));
        row.setCardNetwork(RefundService.truncate(nullIfBlank(p.path("card").path("network").asString(null)), 30));
        row.setCardLast4(RefundService.truncate(nullIfBlank(p.path("card").path("last4").asString(null)), 10));
        row.setVerified(verified);
        row.setRawResponse(RefundService.truncate(p.toString(), 3900));
        paymentRepository.save(row);
    }

    static String describeMethod(JsonNode p) {
        String method = p.path("method").asString("");
        return switch (method) {
            case "upi" -> nullIfBlank(p.path("vpa").asString(null)) != null ? "UPI (" + p.path("vpa").asString() + ")" : "UPI";
            case "card" -> {
                String net = p.path("card").path("network").asString("Card");
                String last4 = p.path("card").path("last4").asString("");
                yield last4.isEmpty() ? net : net + " ending in " + last4;
            }
            case "netbanking" -> "Net Banking" + (nullIfBlank(p.path("bank").asString(null)) != null ? " (" + p.path("bank").asString() + ")" : "");
            case "wallet" -> "Wallet" + (nullIfBlank(p.path("wallet").asString(null)) != null ? " (" + p.path("wallet").asString() + ")" : "");
            case "emi" -> "EMI";
            default -> method.isEmpty() ? "Razorpay" : "Razorpay (" + method + ")";
        };
    }

    private void sendConfirmationAfterCommit(Order order) {
        if (emailService == null || Boolean.TRUE.equals(order.getConfirmationEmailSent())) return;
        Long id = order.getId();
        RefundService.afterCommit(() -> {
            if (!emailService.sendOrderConfirmationEmail(order)) return;
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            tx.executeWithoutResult(s -> orderRepository.findById(id).ifPresent(o -> {
                o.setConfirmationEmailSent(true);
                o.setConfirmationEmailSentAt(LocalDateTime.now());
                orderRepository.save(o);
            }));
        });
    }

    private static Outcome paidOutcome(Order order, String message) {
        return new Outcome(true, order.getOrderNumber(), order.getRazorpayPaymentId(), order.getPaymentMethod(), message);
    }

    private static String nullIfBlank(String s) {
        return s == null || s.isBlank() || "null".equals(s) ? null : s;
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
