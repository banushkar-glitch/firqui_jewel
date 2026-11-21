package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.service.GuestCancellationService;
import Firqui.service.PaymentException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cancellation for customers who ordered without logging in. Public, but every action
 * needs the signed link that is only ever emailed to the address on the order.
 */
@RestController
@RequestMapping("/api/guest-orders")
public class GuestOrderController {

    @Autowired
    private GuestCancellationService guestCancellations;

    /* POST /api/guest-orders/cancel-link { orderNumber, email } - emails the cancel link if they match */
    @PostMapping("/cancel-link")
    public ResponseEntity<?> requestLink(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest http) {
        boolean ok = guestCancellations.requestLink(field(body, "orderNumber"), field(body, "email"), http.getRemoteAddr());
        if (!ok) {
            return ResponseEntity.status(429).body(ApiResponse.error("Too many requests. Please try again in an hour."));
        }
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", "If that order number and email match an order that can still be cancelled, "
                + "we've emailed a cancellation link to that address. Please check your inbox (and spam folder).");
        return ResponseEntity.ok(res);
    }

    /* GET /api/guest-orders/cancel-preview?token=... - order summary for the cancel page */
    @GetMapping("/cancel-preview")
    public ResponseEntity<?> preview(@RequestParam(value = "token", required = false) String token) {
        try {
            return ResponseEntity.ok(guestCancellations.preview(token));
        } catch (PaymentException e) {
            return ResponseEntity.status(e.getHttpStatus()).body(ApiResponse.error(e.getMessage()));
        }
    }

    /* POST /api/guest-orders/cancel { token, reason, additionalDetails } */
    @PostMapping("/cancel")
    public ResponseEntity<?> cancel(@RequestBody(required = false) Map<String, Object> body) {
        try {
            return ResponseEntity.ok(guestCancellations.cancel(field(body, "token"), field(body, "reason"),
                    field(body, "additionalDetails")));
        } catch (PaymentException e) {
            return ResponseEntity.status(e.getHttpStatus()).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    private static String field(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        String v = body.get(key).toString().trim();
        return v.isEmpty() ? null : v;
    }
}
