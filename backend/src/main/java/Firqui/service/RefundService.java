package Firqui.service;

import Firqui.dto.CancellationResponseDTO;
import Firqui.entity.*;
import Firqui.repository.CancellationRequestRepository;
import Firqui.repository.OrderRepository;
import Firqui.repository.ProductRepository;
import Firqui.repository.RefundRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Cancellations and Razorpay refunds.
 *
 * Rules:
 *  - The refundable amount is always (amount paid) minus (refunds that have not failed),
 *    so no combination of retries, partial refunds and webhooks can refund more than was paid.
 *  - Before every new refund the local records are synced with Razorpay's list of refunds
 *    for the payment, so a refund whose response was lost is found instead of repeated.
 *  - Each refund row has its own idempotency key ("firqui-refund-{id}") sent to Razorpay.
 *  - A refund that fails at the gateway never blocks the cancellation itself: the order is
 *    cancelled, the refund is marked FAILED and the admin can retry it from the order page.
 */
@Service
public class RefundService {

    private static final Logger logger = LoggerFactory.getLogger(RefundService.class);

    public static final String REFUND_INITIATED = "INITIATED";
    public static final String REFUND_PENDING = "PENDING";
    public static final String REFUND_PROCESSED = "PROCESSED";
    public static final String REFUND_FAILED = "FAILED";

    /** A refund whose outcome was unknown and that Razorpay still doesn't list after this long never happened. */
    private static final Duration UNCONFIRMED_REFUND_TIMEOUT = Duration.ofMinutes(15);

    @Autowired private RazorpayGateway gateway;
    @Autowired private OrderRepository orderRepository;
    @Autowired private RefundRepository refundRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CancellationRequestRepository cancellationRequestRepository;
    @Autowired(required = false) private EmailService emailService;
    @Autowired(required = false) private ShopNotificationService shopNotifications;

    @Value("${app.cancellation.window-hours:24}")
    private long cancellationWindowHours;

    /** "optimum" = instant refund where Razorpay supports it (falls back to normal); "normal" = 5-7 working days. */
    @Value("${app.refunds.speed:optimum}")
    private String refundSpeed = "optimum";

    /* =====================================================
       CUSTOMER: cancel own order (refund is automatic)
    ====================================================== */
    @Transactional
    public CancellationResponseDTO cancelByCustomer(User user, String orderNumber, String reason, String details) {
        if (user == null) throw new SecurityException("Please log in to cancel an order.");
        Order order = lockOrder(orderNumber);
        if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            throw new SecurityException("You can only cancel your own orders.");
        }
        ensureCancellable(order);

        LocalDateTime since = order.getPaymentVerifiedAt() != null ? order.getPaymentVerifiedAt() : order.getCreatedAt();
        if (since != null && Duration.between(since, LocalDateTime.now()).toHours() >= cancellationWindowHours) {
            throw new IllegalStateException("Orders can only be cancelled within " + cancellationWindowHours
                    + " hours of payment. Please contact info@firquijewels.com for help.");
        }

        String cleanReason = blankTo(reason, "Customer requested cancellation");
        cancelOrderAndRefund(order, cleanReason, details, "CUSTOMER");

        CancellationRequest request = cancellationRequestRepository
                .findTopByOrderNumberOrderByCreatedAtDesc(order.getOrderNumber())
                .filter(r -> "PENDING".equalsIgnoreCase(r.getStatus()))
                .orElseGet(() -> new CancellationRequest(order, user, cleanReason, details));
        request.setStatus("APPROVED");
        request.setRefundStatus(order.getRefundStatus());
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy("SYSTEM_AUTO_POLICY");
        request.setAdminNotes(refundNote(order));
        CancellationRequest saved = cancellationRequestRepository.save(request);

        if (shopNotifications != null) shopNotifications.cancellationRequested(saved);
        afterCommit(() -> {
            if (emailService != null) emailService.sendCancellationApprovedEmail(order, saved);
        });
        logger.info("Order #{} cancelled by customer {} (refund status {})",
                order.getOrderNumber(), user.getEmail(), order.getRefundStatus());
        return CancellationResponseDTO.fromEntity(saved);
    }

    /* =====================================================
       SHARED: cancel + restore stock + refund what was paid online
       Caller must hold the order lock (lockOrder) inside a transaction.
    ====================================================== */
    @Transactional
    public void cancelOrderAndRefund(Order order, String reason, String details, String initiatedBy) {
        markCancelled(order, reason, details);
        restoreStock(order);

        if (isPaidOnline(order)) {
            syncWithGateway(order);
            long remaining = refundablePaise(order);
            if (remaining >= 100) {
                issueRefund(order, order.getRazorpayPaymentId(), remaining, reason, initiatedBy);
            }
        } else if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            // Paid outside Razorpay (manually verified UPI transfer): money must be returned by hand
            order.setRefundStatus("PENDING_REFUND");
            order.setRefundAmount(order.getTotalAmount());
            order.setRefundInitiatedAt(LocalDateTime.now());
        } else {
            order.setRefundStatus("NOT_APPLICABLE");
        }
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    /* =====================================================
       ADMIN: refund (full remaining, or a partial amount)
    ====================================================== */
    @Transactional
    public Refund adminRefund(String orderNumber, Long amountPaise, String reason, String adminEmail) {
        Order order = lockOrder(orderNumber);
        if (!isPaidOnline(order)) {
            throw new IllegalStateException("Order #" + order.getOrderNumber()
                    + " was not paid through Razorpay, so it has to be refunded manually.");
        }
        if (!isWithinRefundWindow(order)) {
            throw new IllegalStateException("Refunds can only be issued within " + cancellationWindowHours
                    + " hours of payment. Order #" + order.getOrderNumber() + " is past that window.");
        }
        return refundRemainingOrAmount(order, amountPaise, reason, adminEmail);
    }

    /**
     * Finishes a refund that was already due: a cancelled order, or a refund that failed.
     * Allowed after the refund window, because the customer cancelled in time and is owed the money.
     */
    @Transactional
    public Refund retryRefund(String orderNumber, String adminEmail) {
        Order order = lockOrder(orderNumber);
        if (!isPaidOnline(order)) {
            throw new IllegalStateException("Order #" + order.getOrderNumber()
                    + " was not paid through Razorpay, so it has to be refunded manually.");
        }
        if (!isCancelled(order) && !"REFUND_FAILED".equalsIgnoreCase(order.getRefundStatus())) {
            throw new IllegalStateException("Order #" + order.getOrderNumber()
                    + " has no cancelled or failed refund to retry.");
        }
        return refundRemainingOrAmount(order, null, "Refund retried by admin", adminEmail);
    }

    /** True while the order is within the refund window counted from payment. */
    public boolean isWithinRefundWindow(Order order) {
        LocalDateTime paidAt = order.getPaymentVerifiedAt() != null ? order.getPaymentVerifiedAt() : order.getCreatedAt();
        return paidAt != null && Duration.between(paidAt, LocalDateTime.now()).toHours() < cancellationWindowHours;
    }

    private Refund refundRemainingOrAmount(Order order, Long amountPaise, String reason, String adminEmail) {
        syncWithGateway(order);
        long remaining = refundablePaise(order);
        long amount = amountPaise != null ? amountPaise : remaining;
        if (remaining < 100) {
            throw new IllegalStateException("Nothing left to refund on order #" + order.getOrderNumber() + ".");
        }
        if (amount < 100) throw new IllegalArgumentException("Refund amount must be at least ₹1.");
        if (amount > remaining) {
            throw new IllegalArgumentException("Refund amount exceeds what is left to refund (₹"
                    + String.format(Locale.ROOT, "%.2f", remaining / 100.0) + ").");
        }
        Refund refund = issueRefund(order, order.getRazorpayPaymentId(), amount,
                blankTo(reason, "Refund issued by admin"), "ADMIN:" + blankTo(adminEmail, "admin"));
        orderRepository.save(order);
        return refund;
    }

    /* =====================================================
       Payments that must be returned (called by RazorpayPaymentService)
    ====================================================== */

    /** A payment captured for an order that was already cancelled (e.g. checkout expired). */
    @Transactional
    public Refund refundPaymentForCancelledOrder(Order order, String paymentId, long amountPaise) {
        return issueRefund(order, paymentId, amountPaise,
                "Order was cancelled before the payment completed", "SYSTEM_LATE_PAYMENT");
    }

    /** A second captured payment for an order that was already paid. */
    @Transactional
    public Refund refundDuplicatePayment(Order order, String paymentId, long amountPaise) {
        return issueRefund(order, paymentId, amountPaise,
                "Duplicate payment for order #" + order.getOrderNumber(), "SYSTEM_DUPLICATE_PAYMENT");
    }

    /* =====================================================
       WEBHOOK: refund.created / refund.processed / refund.failed
    ====================================================== */
    @Transactional
    public void onRefundWebhook(JsonNode refundEntity) {
        String paymentId = refundEntity.path("payment_id").asString("");
        if (paymentId.isEmpty()) return;

        Optional<Order> orderOpt = orderRepository.findLockedByRazorpayPaymentId(paymentId);
        if (orderOpt.isEmpty()) {
            // Refund on a duplicate/late payment: find the order through our own refund row
            orderOpt = refundRepository.findByRazorpayRefundId(refundEntity.path("id").asString(""))
                    .map(Refund::getOrder);
        }
        if (orderOpt.isEmpty()) {
            logger.info("Refund webhook for unknown payment {} ignored", paymentId);
            return;
        }
        Order order = orderOpt.get();
        upsertFromGateway(order, refundRepository.findByOrderIdOrderByInitiatedAtDesc(order.getId()), refundEntity);
        recomputeOrderRefundState(order);
        orderRepository.save(order);
    }

    /* =====================================================
       Core
    ====================================================== */

    private Refund issueRefund(Order order, String paymentId, long amountPaise, String reason, String initiatedBy) {
        Refund refund = new Refund(order, order.getOrderNumber(), paymentId, null,
                amountPaise / 100.0, "INR", truncate(reason, 500), REFUND_INITIATED, truncate(initiatedBy, 100));
        refund = refundRepository.saveAndFlush(refund);

        Map<String, String> notes = new LinkedHashMap<>();
        notes.put("firqui_refund_id", String.valueOf(refund.getId()));
        notes.put("order_number", order.getOrderNumber());
        notes.put("reason", truncate(reason, 200));

        try {
            String receipt = "rf_" + order.getOrderNumber() + "_" + refund.getId();
            String key = "firqui-refund-" + refund.getId();
            JsonNode res;
            try {
                res = gateway.createRefund(paymentId, amountPaise, receipt, notes, key, refundSpeed);
            } catch (RazorpayGateway.RazorpayException e) {
                // "Instant refund not supported for the payment": nothing was created, so ask again at
                // normal speed. A new idempotency key is required because the request body differs.
                if ("normal".equals(refundSpeed) || e.getStatusCode() != 400
                        || e.getMessage() == null || !e.getMessage().toLowerCase(Locale.ROOT).contains("instant")) {
                    throw e;
                }
                logger.info("Instant refund not available for order #{}; using normal speed", order.getOrderNumber());
                res = gateway.createRefund(paymentId, amountPaise, receipt, notes, key + "-normal", "normal");
            }
            applyGatewayState(refund, res);
            logger.info("Refund {} of {} paise created for order #{} (status {}, speed {})",
                    refund.getRazorpayRefundId(), amountPaise, order.getOrderNumber(), refund.getStatus(),
                    res.path("speed_processed").asString(res.path("speed_requested").asString("normal")));
        } catch (RazorpayGateway.RazorpayException e) {
            if (e.isOutcomeUnknown()) {
                // May have gone through; the next sync or the refund webhook settles it
                refund.setStatus(REFUND_PENDING);
                refund.setErrorMessage(truncate("Awaiting confirmation from Razorpay: " + e.getMessage(), 1000));
            } else {
                refund.setStatus(REFUND_FAILED);
                refund.setErrorMessage(truncate(e.getMessage(), 1000));
            }
            logger.error("Refund for order #{} ({} paise) did not complete: {}",
                    order.getOrderNumber(), amountPaise, e.getMessage());
        }
        refundRepository.save(refund);
        recomputeOrderRefundState(order);
        return refund;
    }

    /** Pulls Razorpay's refunds for the order's payment and brings local rows up to date. */
    void syncWithGateway(Order order) {
        if (!isPaidOnline(order)) return;
        JsonNode items;
        try {
            items = gateway.fetchRefundsForPayment(order.getRazorpayPaymentId());
        } catch (RazorpayGateway.RazorpayException e) {
            // Unconfirmed rows still count against the refundable amount, so going on is safe
            logger.warn("Could not sync refunds for order #{}: {}", order.getOrderNumber(), e.getMessage());
            return;
        }
        List<Refund> local = refundRepository.findByOrderIdOrderByInitiatedAtDesc(order.getId());
        Set<Long> seen = new HashSet<>();
        for (JsonNode item : items) {
            seen.add(upsertFromGateway(order, local, item).getId());
        }
        LocalDateTime cutoff = LocalDateTime.now().minus(UNCONFIRMED_REFUND_TIMEOUT);
        for (Refund r : local) {
            boolean unconfirmed = r.getRazorpayRefundId() == null
                    && (REFUND_PENDING.equals(r.getStatus()) || REFUND_INITIATED.equals(r.getStatus()));
            if (unconfirmed && !seen.contains(r.getId()) && r.getInitiatedAt().isBefore(cutoff)
                    && order.getRazorpayPaymentId().equals(r.getRazorpayPaymentId())) {
                r.setStatus(REFUND_FAILED);
                r.setErrorMessage("Razorpay has no record of this refund.");
                refundRepository.save(r);
            }
        }
        recomputeOrderRefundState(order);
    }

    private Refund upsertFromGateway(Order order, List<Refund> local, JsonNode item) {
        String rzpId = item.path("id").asString("");
        String localId = item.path("notes").path("firqui_refund_id").asString("");
        Refund match = null;
        for (Refund r : local) {
            if (rzpId.equals(r.getRazorpayRefundId()) || (!localId.isEmpty() && localId.equals(String.valueOf(r.getId())))) {
                match = r;
                break;
            }
        }
        if (match == null) {
            // Made outside this flow (Razorpay dashboard), or our row was rolled back after the call
            match = new Refund(order, order.getOrderNumber(), item.path("payment_id").asString(""), rzpId,
                    item.path("amount").asLong(0) / 100.0, "INR",
                    truncate(item.path("notes").path("reason").asString("Refund recorded from Razorpay"), 500),
                    REFUND_PENDING, "RAZORPAY_SYNC");
            local.add(match);
        }
        applyGatewayState(match, item);
        return refundRepository.save(match);
    }

    private static void applyGatewayState(Refund refund, JsonNode node) {
        String id = node.path("id").asString("");
        if (!id.isEmpty()) refund.setRazorpayRefundId(id);
        if (node.has("amount")) refund.setAmount(node.path("amount").asLong(0) / 100.0);
        switch (node.path("status").asString("pending").toLowerCase(Locale.ROOT)) {
            case "processed" -> {
                refund.setStatus(REFUND_PROCESSED);
                if (refund.getProcessedAt() == null) refund.setProcessedAt(LocalDateTime.now());
                refund.setErrorMessage(null);
            }
            case "failed" -> refund.setStatus(REFUND_FAILED);
            default -> refund.setStatus(REFUND_PENDING);
        }
    }

    /** Rolls the refund rows of the order's main payment up into the order's refund fields. */
    void recomputeOrderRefundState(Order order) {
        String mainPayment = order.getRazorpayPaymentId();
        List<Refund> all = refundRepository.findByOrderIdOrderByInitiatedAtDesc(order.getId());
        long processed = 0, pending = 0;
        boolean anyFailed = false;
        Refund latest = null;
        for (Refund r : all) {
            if (mainPayment == null || !mainPayment.equals(r.getRazorpayPaymentId())) continue;
            long paise = toPaise(r.getAmount());
            switch (r.getStatus()) {
                case REFUND_PROCESSED -> processed += paise;
                case REFUND_FAILED -> anyFailed = true;
                default -> pending += paise;
            }
            if (latest == null && !REFUND_FAILED.equals(r.getStatus())) latest = r;
        }
        if (processed == 0 && pending == 0 && !anyFailed) return;

        long paid = toPaise(order.getTotalAmount());
        String status;
        if (pending > 0) status = "PENDING_REFUND";
        else if (processed >= paid) status = "REFUNDED";
        else if (processed > 0) status = "PARTIALLY_REFUNDED";
        else status = "REFUND_FAILED";

        order.setRefundStatus(status);
        order.setRefundAmount((processed + pending) / 100.0);
        if (latest != null) {
            order.setRazorpayRefundId(latest.getRazorpayRefundId());
            order.setRefundInitiatedAt(latest.getInitiatedAt());
        }
        if ("REFUNDED".equals(status) && order.getRefundProcessedAt() == null) {
            order.setRefundProcessedAt(LocalDateTime.now());
        }
        order.setUpdatedAt(LocalDateTime.now());

        cancellationRequestRepository.findTopByOrderNumberOrderByCreatedAtDesc(order.getOrderNumber())
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getStatus()))
                .ifPresent(r -> r.setRefundStatus(status));
    }

    /* =====================================================
       Helpers
    ====================================================== */

    public long refundablePaise(Order order) {
        long paid = toPaise(order.getTotalAmount());
        long used = 0;
        for (Refund r : refundRepository.findByOrderIdOrderByInitiatedAtDesc(order.getId())) {
            if (!REFUND_FAILED.equals(r.getStatus()) && order.getRazorpayPaymentId() != null
                    && order.getRazorpayPaymentId().equals(r.getRazorpayPaymentId())) {
                used += toPaise(r.getAmount());
            }
        }
        return Math.max(0, paid - used);
    }

    /** True if a refund that has not failed already exists for this Razorpay payment. */
    public boolean hasActiveRefund(String paymentId) {
        return refundRepository.findByRazorpayPaymentIdOrderByInitiatedAtDesc(paymentId).stream()
                .anyMatch(r -> !REFUND_FAILED.equals(r.getStatus()));
    }

    public Order lockOrder(String orderNumber) {
        if (orderNumber == null || orderNumber.isBlank()) throw new IllegalArgumentException("Order number is required.");
        String clean = orderNumber.trim().replace("#", "");
        return orderRepository.findLockedByOrderNumber(clean)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: #" + clean));
    }

    public static boolean isPaidOnline(Order order) {
        return "PAID".equalsIgnoreCase(order.getPaymentStatus())
                && order.getRazorpayPaymentId() != null && order.getRazorpayPaymentId().startsWith("pay_");
    }

    public static boolean isCancelled(Order order) {
        return "Cancelled".equalsIgnoreCase(order.getOrderStatus())
                || "CANCELLED".equalsIgnoreCase(order.getCancellationStatus());
    }

    public static void ensureCancellable(Order order) {
        String status = order.getOrderStatus() != null ? order.getOrderStatus() : "";
        if (isCancelled(order)) throw new IllegalStateException("Order #" + order.getOrderNumber() + " is already cancelled.");
        if ("Shipped".equalsIgnoreCase(status) || "Delivered".equalsIgnoreCase(status)) {
            throw new IllegalStateException("Order #" + order.getOrderNumber() + " has already been "
                    + status.toLowerCase(Locale.ROOT) + " and cannot be cancelled. Please contact customer care for returns.");
        }
    }

    public static void markCancelled(Order order, String reason, String details) {
        order.setOrderStatus("Cancelled");
        order.setCancellationStatus("CANCELLED");
        order.setCancelledAt(LocalDateTime.now());
        order.setCancellationReason(truncate(reason, 500));
        order.setCancellationDetails(truncate(details, 2000));
        order.setUpdatedAt(LocalDateTime.now());
    }

    /** Puts the ordered quantities back in stock, once per order (mirrors ProductRules.deductStock). */
    public void restoreStock(Order order) {
        if (Boolean.TRUE.equals(order.getStockRestored()) || order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            Product p = item.getProduct();
            if (p == null || item.getQuantity() == null || p.getStockQuantity() == null
                    || ProductRules.ARRIVING_SOON.equals(p.getAvailability())) continue;
            p.setStockQuantity(p.getStockQuantity() + item.getQuantity());
            if (ProductRules.OUT_OF_STOCK.equals(p.getAvailability()) && p.getStockQuantity() > 0) {
                p.setAvailability(ProductRules.IN_STOCK);
            }
            productRepository.save(p);
        }
        order.setStockRestored(true);
    }

    public static long toPaise(Double rupees) {
        return rupees == null ? 0 : Math.round(rupees * 100);
    }

    private static String refundNote(Order order) {
        String status = order.getRefundStatus();
        if ("NOT_APPLICABLE".equals(status)) return "Cancelled by customer (no payment taken).";
        if ("REFUND_FAILED".equals(status)) return "Cancelled; Razorpay refund FAILED - retry from the order page.";
        if (order.getRazorpayRefundId() != null) return "Cancelled; refunded via Razorpay (" + order.getRazorpayRefundId() + ").";
        return "Cancelled; refund " + status + ".";
    }

    static void afterCommit(Runnable task) {
        Runnable safe = () -> {
            try {
                task.run();
            } catch (Exception e) {
                logger.warn("Post-commit task failed: {}", e.getMessage());
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    safe.run();
                }
            });
        } else {
            safe.run();
        }
    }

    private static String blankTo(String s, String fallback) {
        return s == null || s.isBlank() ? fallback : s.trim();
    }

    static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
