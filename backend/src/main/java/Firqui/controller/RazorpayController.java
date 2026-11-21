package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.CancellationResponseDTO;
import Firqui.entity.Order;
import Firqui.entity.Refund;
import Firqui.entity.User;
import Firqui.repository.OrderRepository;
import Firqui.service.PaymentException;
import Firqui.service.RazorpayPaymentService;
import Firqui.service.RefundService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Razorpay endpoints.
 *
 * Public (guest checkout): config, create-order, verify-payment, reconcile-payment, webhook.
 * None of these trust anything from the browser except identifiers: amounts come from the
 * database, payments are re-read from Razorpay, and the webhook is signature-checked.
 */
@RestController
public class RazorpayController {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayController.class);

    @Autowired private RazorpayPaymentService paymentService;
    @Autowired private RefundService refundService;
    @Autowired private OrderRepository orderRepository;

    /* GET /api/razorpay/config - public key id for the checkout script */
    @GetMapping("/api/razorpay/config")
    public Map<String, Object> config() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key_id", paymentService.getKeyId());
        m.put("currency", "INR");
        return m;
    }

    /* POST /api/create-order  { "orderNumber": "FQ123456" }
       Creates (or reuses) the Razorpay order for a saved order. Any "amount" sent is ignored. */
    @PostMapping("/api/create-order")
    public ResponseEntity<?> createOrder(@RequestBody(required = false) Map<String, Object> body) {
        String orderNumber = field(body, "orderNumber", "order_number");
        try {
            return ResponseEntity.ok(paymentService.startCheckout(orderNumber));
        } catch (PaymentException e) {
            return error(e.getHttpStatus(), e.getMessage());
        }
    }

    /* POST /api/verify-payment  { razorpay_order_id, razorpay_payment_id, razorpay_signature } */
    @PostMapping("/api/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody(required = false) Map<String, Object> body) {
        String orderId = field(body, "razorpay_order_id");
        String paymentId = field(body, "razorpay_payment_id");
        String signature = field(body, "razorpay_signature");
        if (orderId == null || paymentId == null || signature == null) {
            return error(400, "razorpay_order_id, razorpay_payment_id and razorpay_signature are required.");
        }
        try {
            RazorpayPaymentService.Outcome outcome = paymentService.confirmCheckout(orderId, paymentId, signature);
            return ResponseEntity.status(outcome.paid() ? 200 : 402).body(outcome.toMap());
        } catch (PaymentException e) {
            return error(e.getHttpStatus(), e.getMessage());
        }
    }

    /* GET|POST /api/orders/{orderNumber}/reconcile-payment - asks Razorpay whether the order was paid */
    @RequestMapping(value = "/api/orders/{orderNumber}/reconcile-payment", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> reconcile(@PathVariable String orderNumber) {
        try {
            return ResponseEntity.ok(paymentService.reconcile(orderNumber).toMap());
        } catch (PaymentException e) {
            return error(e.getHttpStatus(), e.getMessage());
        }
    }

    /* POST /api/razorpay/webhook - configure this URL in Razorpay Dashboard > Webhooks.
       Body is read as raw bytes: the signature is over the exact bytes Razorpay sent. */
    @PostMapping("/api/razorpay/webhook")
    public ResponseEntity<String> webhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId,
            @RequestBody byte[] rawBody) {
        try {
            paymentService.handleWebhook(eventId, rawBody, signature);
            return ResponseEntity.ok("ok");
        } catch (PaymentException e) {
            return ResponseEntity.status(e.getHttpStatus()).body(e.getMessage());
        } catch (Exception e) {
            // Non-2xx makes Razorpay retry (for up to 24h); dedupe by event id makes that safe
            logger.error("Razorpay webhook processing failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("error");
        }
    }

    /* POST /api/cancellation-requests/auto-cancel  { orderNumber, reason, additionalDetails }
       Logged-in customer cancels their own order within the window; online payments are refunded. */
    @PostMapping("/api/cancellation-requests/auto-cancel")
    public ResponseEntity<?> customerCancel(@AuthenticationPrincipal User user,
                                            @RequestBody(required = false) Map<String, Object> body) {
        if (user == null) return error(401, "Please log in to cancel an order.");
        String orderNumber = field(body, "orderNumber");
        if (orderNumber == null) return error(400, "Order number is required.");
        try {
            CancellationResponseDTO res = refundService.cancelByCustomer(user, orderNumber,
                    field(body, "reason"), field(body, "additionalDetails"));
            return ResponseEntity.ok(res);
        } catch (SecurityException e) {
            return error(403, e.getMessage());
        } catch (IllegalArgumentException e) {
            return error(400, e.getMessage());
        } catch (IllegalStateException e) {
            return error(409, e.getMessage());
        }
    }

    /* POST /api/admin/orders/{orderNumber}/retry-refund - refunds whatever is still refundable */
    @PostMapping("/api/admin/orders/{orderNumber}/retry-refund")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<?> retryRefund(@PathVariable String orderNumber, @AuthenticationPrincipal User admin) {
        return adminRefund(orderNumber, null, "Refund retried by admin", admin);
    }

    /* POST /api/admin/orders/{orderNumber}/refund  { "amount": 1500.00 (rupees, optional = full remaining), "reason": "..." } */
    @PostMapping("/api/admin/orders/{orderNumber}/refund")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<?> refund(@PathVariable String orderNumber, @AuthenticationPrincipal User admin,
                                    @RequestBody(required = false) Map<String, Object> body) {
        Long paise = null;
        String amount = field(body, "amount");
        if (amount != null) {
            try {
                paise = Math.round(Double.parseDouble(amount) * 100);
            } catch (NumberFormatException e) {
                return error(400, "Amount must be a number in rupees, e.g. 1499.50");
            }
        }
        return adminRefund(orderNumber, paise, field(body, "reason"), admin);
    }

    private ResponseEntity<?> adminRefund(String orderNumber, Long paise, String reason, User admin) {
        try {
            Refund r = refundService.adminRefund(orderNumber, paise, reason, admin != null ? admin.getEmail() : null);
            Map<String, Object> res = refundToMap(r);
            if (RefundService.REFUND_FAILED.equals(r.getStatus())) {
                res.put("success", false);
                res.put("message", "Razorpay rejected the refund: " + r.getErrorMessage());
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(res);
            }
            return ResponseEntity.ok(res);
        } catch (IllegalArgumentException e) {
            return error(400, e.getMessage());
        } catch (IllegalStateException e) {
            return error(409, e.getMessage());
        }
    }

    /* GET /api/admin/reconciliation - revenue vs refunds summary and orders needing attention */
    @GetMapping("/api/admin/reconciliation")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    @Transactional(readOnly = true)
    public Map<String, Object> reconciliation() {
        long paid = 0, cancelled = 0, refunded = 0, failedRefunds = 0;
        double revenue = 0, refundedAmount = 0;
        List<Map<String, Object>> issues = new ArrayList<>();
        List<Order> all = orderRepository.findAll();
        for (Order o : all) {
            boolean isPaid = "PAID".equalsIgnoreCase(o.getPaymentStatus());
            String rf = o.getRefundStatus() != null ? o.getRefundStatus() : "";
            if (isPaid) {
                paid++;
                revenue += o.getTotalAmount() != null ? o.getTotalAmount() : 0;
            }
            if (RefundService.isCancelled(o)) cancelled++;
            if ("REFUNDED".equals(rf) || "PARTIALLY_REFUNDED".equals(rf)) {
                refunded++;
                refundedAmount += o.getRefundAmount() != null ? o.getRefundAmount() : 0;
            }
            if ("REFUND_FAILED".equals(rf)) {
                failedRefunds++;
                issues.add(Map.of("orderNumber", o.getOrderNumber(), "issue", "Refund failed - retry from the order page"));
            }
            if (isPaid && RefundService.isCancelled(o) && ("NONE".equals(rf) || rf.isEmpty())) {
                issues.add(Map.of("orderNumber", o.getOrderNumber(), "issue", "Cancelled and paid, but no refund recorded"));
            }
            if ("PENDING_REFUND".equals(rf) && (o.getRazorpayPaymentId() == null)) {
                issues.add(Map.of("orderNumber", o.getOrderNumber(), "issue", "Manual (non-Razorpay) refund pending"));
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalOrders", all.size());
        m.put("paidOrders", paid);
        m.put("cancelledOrders", cancelled);
        m.put("refundedOrders", refunded);
        m.put("failedRefunds", failedRefunds);
        m.put("totalRevenue", revenue);
        m.put("totalRefunded", refundedAmount);
        m.put("netRevenue", revenue - refundedAmount);
        m.put("discrepancyCount", issues.size());
        m.put("discrepancies", issues);
        return m;
    }

    /* --------------------------------------------------------------- */

    private static Map<String, Object> refundToMap(Refund r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("orderNumber", r.getOrderNumber());
        m.put("razorpayRefundId", r.getRazorpayRefundId());
        m.put("refundStatus", r.getStatus());
        m.put("refundAmount", r.getAmount());
        m.put("formattedRefundAmount", "₹" + String.format(Locale.ROOT, "%.2f", r.getAmount()));
        return m;
    }

    private static ResponseEntity<ApiResponse> error(int status, String message) {
        return ResponseEntity.status(status).body(ApiResponse.error(message));
    }

    private static String field(Map<String, Object> body, String... keys) {
        if (body == null) return null;
        for (String k : keys) {
            Object v = body.get(k);
            if (v != null && !v.toString().isBlank()) return v.toString().trim();
        }
        return null;
    }
}
