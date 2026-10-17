package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.OrderItemRequest;
import Firqui.dto.OrderResponse;
import Firqui.entity.User;
import Firqui.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds the UPI payment link shown as a QR code on the payment page.
 *
 * The amount always comes from the server (database prices, or the saved order total),
 * never from the browser, and is embedded in the link as "am=", which UPI apps
 * show as a fixed amount the payer cannot edit.
 */
@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PaymentController {

    @Autowired
    private OrderService orderService;

    @Value("${app.upi.id:nehaa067@icici}")
    private String upiId;

    @Value("${app.upi.payee-name:FIRQUI JEWELS}")
    private String payeeName;

    public static class UpiRequest {
        private List<OrderItemRequest> items;
        private String orderNumber;

        public List<OrderItemRequest> getItems() { return items; }
        public void setItems(List<OrderItemRequest> items) { this.items = items; }
        public String getOrderNumber() { return orderNumber; }
        public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    }

    /* =====================================================
       POST /api/payments/upi
       { "items": [...] }        -> new order: total of the cart at today's prices
       { "orderNumber": "FQ.." } -> existing unpaid order of the signed-in customer
    ====================================================== */
    @PostMapping("/upi")
    public ResponseEntity<?> upiPayment(@RequestBody UpiRequest request, @AuthenticationPrincipal User user) {
        double amount;
        String note;
        try {
            if (request.getOrderNumber() != null && !request.getOrderNumber().isBlank()) {
                if (user == null) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Please log in to pay for this order."));
                }
                OrderResponse order = orderService.getUserOrder(user, request.getOrderNumber().trim());
                if (order == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Order not found."));
                }
                amount = order.getTotalAmount() != null ? order.getTotalAmount() : 0.0;
                note = "FIRQUI JEWELS order " + order.getOrderNumber();
            } else {
                amount = orderService.quoteTotal(request.getItems());
                note = "FIRQUI JEWELS order";
            }
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }

        if (amount <= 0) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Nothing to pay for this order."));
        }

        String formattedAmount = String.format(Locale.ROOT, "%.2f", amount);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", true);
        body.put("amount", Math.round(amount * 100) / 100.0);
        body.put("upiId", upiId);
        body.put("payeeName", payeeName);
        body.put("upiUri", buildUpiUri(upiId, payeeName, formattedAmount, note));
        return ResponseEntity.ok(body);
    }

    static String buildUpiUri(String vpa, String name, String amount, String note) {
        return "upi://pay?pa=" + enc(vpa)
                + "&pn=" + enc(name)
                + "&am=" + amount
                + "&cu=INR"
                + "&tn=" + enc(note);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
