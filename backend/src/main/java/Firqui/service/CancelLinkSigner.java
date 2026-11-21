package Firqui.service;

import Firqui.entity.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

/**
 * Signed "cancel this order" links for customers without an account (guest checkout).
 *
 * Token = orderNumber.expiryEpochSeconds.HMAC_SHA256(secret, "guest-cancel|" + orderNumber + "." + expiry).
 * Only the server can create one, it is tied to one order, and it stops working when the
 * cancellation window closes. It is only ever sent to the email address on the order.
 */
@Component
public class CancelLinkSigner {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.frontend.url:http://localhost:5500}")
    private String frontendUrl;

    @Value("${app.cancellation.window-hours:24}")
    private long windowHours;

    public CancelLinkSigner() {
    }

    /** For tests. */
    public CancelLinkSigner(String secret, String frontendUrl, long windowHours) {
        this.secret = secret;
        this.frontendUrl = frontendUrl;
        this.windowHours = windowHours;
    }

    /** End of the cancellation window: payment time (or order time if unpaid) plus the window. */
    public LocalDateTime windowEnd(Order order) {
        LocalDateTime start = order.getPaymentVerifiedAt() != null ? order.getPaymentVerifiedAt() : order.getCreatedAt();
        return (start != null ? start : LocalDateTime.now()).plusHours(windowHours);
    }

    public boolean isWindowOpen(Order order) {
        return LocalDateTime.now().isBefore(windowEnd(order));
    }

    public String token(Order order) {
        long expiry = windowEnd(order).atZone(ZONE).toEpochSecond();
        String payload = order.getOrderNumber() + "." + expiry;
        return payload + "." + sign(payload);
    }

    public String link(Order order) {
        return frontendUrl.replaceAll("/+$", "") + "/authentication/cancel-order.html?token="
                + URLEncoder.encode(token(order), StandardCharsets.UTF_8);
    }

    /** Returns the order number when the token is genuine and not expired. */
    public Optional<String> verify(String token) {
        if (token == null) return Optional.empty();
        String[] parts = token.trim().split("\\.");
        if (parts.length != 3 || parts[0].isEmpty()) return Optional.empty();
        String payload = parts[0] + "." + parts[1];
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8))) {
            return Optional.empty();
        }
        try {
            long expiry = Long.parseLong(parts[1]);
            if (LocalDateTime.now().atZone(ZONE).toEpochSecond() >= expiry) return Optional.empty();
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
        return Optional.of(parts[0]);
    }

    private String sign(String payload) {
        return RazorpayGateway.hmacHex(secret, ("guest-cancel|" + payload).getBytes(StandardCharsets.UTF_8));
    }
}
