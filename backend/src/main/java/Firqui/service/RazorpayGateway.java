package Firqui.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin client for the Razorpay REST API (https://razorpay.com/docs/api/).
 *
 * Holds no business rules: it only talks to Razorpay and checks signatures.
 * Keys come exclusively from configuration (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
 * RAZORPAY_WEBHOOK_SECRET); there are deliberately no fallback keys in code.
 */
@Component
public class RazorpayGateway {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayGateway.class);
    private static final String API = "https://api.razorpay.com/v1";

    private final ObjectMapper json = JsonMapper.builder().build();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${razorpay.key.id:}")
    private String keyId;

    @Value("${razorpay.key.secret:}")
    private String keySecret;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    public RazorpayGateway() {
    }

    /** For tests. */
    public RazorpayGateway(String keyId, String keySecret, String webhookSecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.webhookSecret = webhookSecret;
    }

    public String getKeyId() {
        return keyId == null ? "" : keyId.trim();
    }

    public boolean isConfigured() {
        return !getKeyId().isEmpty() && keySecret != null && !keySecret.isBlank();
    }

    public boolean isWebhookConfigured() {
        return webhookSecret != null && !webhookSecret.isBlank();
    }

    /* ---------------------------------------------------------------
       API calls
    --------------------------------------------------------------- */

    /** POST /v1/orders. Receipt must be unique and at most 40 characters. */
    public JsonNode createOrder(long amountPaise, String receipt, Map<String, String> notes) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountPaise);
        body.put("currency", "INR");
        body.put("receipt", truncate(receipt, 40));
        if (notes != null && !notes.isEmpty()) body.put("notes", notes);
        return call("POST", "/orders", body, null);
    }

    /** GET /v1/payments/:id */
    public JsonNode fetchPayment(String paymentId) {
        return call("GET", "/payments/" + enc(paymentId), null, null);
    }

    /** GET /v1/orders/:id/payments, returns the "items" array. */
    public JsonNode fetchOrderPayments(String razorpayOrderId) {
        return call("GET", "/orders/" + enc(razorpayOrderId) + "/payments", null, null).path("items");
    }

    /** POST /v1/payments/:id/capture, for payments left "authorized" (auto-capture off). */
    public JsonNode capturePayment(String paymentId, long amountPaise) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountPaise);
        body.put("currency", "INR");
        return call("POST", "/payments/" + enc(paymentId) + "/capture", body, null);
    }

    /**
     * POST /v1/payments/:id/refund.
     * The idempotency key makes a retried request safe: Razorpay returns the original
     * refund instead of creating a second one, as long as the body is identical.
     */
    public JsonNode createRefund(String paymentId, long amountPaise, String receipt,
                                 Map<String, String> notes, String idempotencyKey) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountPaise);
        body.put("speed", "normal");
        body.put("receipt", truncate(receipt, 40));
        if (notes != null && !notes.isEmpty()) body.put("notes", notes);
        return call("POST", "/payments/" + enc(paymentId) + "/refund", body, idempotencyKey);
    }

    /** GET /v1/payments/:id/refunds, returns the "items" array. */
    public JsonNode fetchRefundsForPayment(String paymentId) {
        return call("GET", "/payments/" + enc(paymentId) + "/refunds?count=100", null, null).path("items");
    }

    /* ---------------------------------------------------------------
       Signatures
    --------------------------------------------------------------- */

    /** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
    public boolean verifyPaymentSignature(String razorpayOrderId, String paymentId, String signature) {
        if (isBlank(razorpayOrderId) || isBlank(paymentId) || isBlank(signature) || !isConfigured()) return false;
        String expected = hmacHex(keySecret.trim(), (razorpayOrderId.trim() + "|" + paymentId.trim())
                .getBytes(StandardCharsets.UTF_8));
        return constantTimeEquals(expected, signature.trim());
    }

    /** Webhook signature: HMAC_SHA256(raw request body, webhook_secret). Body must be the exact bytes received. */
    public boolean verifyWebhookSignature(byte[] rawBody, String signature) {
        if (rawBody == null || isBlank(signature) || !isWebhookConfigured()) return false;
        return constantTimeEquals(hmacHex(webhookSecret.trim(), rawBody), signature.trim());
    }

    public JsonNode parse(byte[] body) {
        return json.readTree(body);
    }

    /* ---------------------------------------------------------------
       Internals
    --------------------------------------------------------------- */

    /** Sends a request and returns the parsed JSON body. Overridable in tests. */
    protected JsonNode call(String method, String path, Object body, String idempotencyKey) {
        if (!isConfigured()) {
            throw new RazorpayException(0, "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).");
        }
        String auth = Base64.getEncoder().encodeToString(
                (getKeyId() + ":" + keySecret.trim()).getBytes(StandardCharsets.UTF_8));
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(API + path))
                .timeout(Duration.ofSeconds(20))
                .header("Authorization", "Basic " + auth)
                .header("Accept", "application/json");
        if (idempotencyKey != null) req.header("X-Refund-Idempotency", idempotencyKey);
        if (body != null) {
            req.header("Content-Type", "application/json")
               .method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        } else {
            req.method(method, HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> res;
        try {
            res = http.send(req.build(), HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new RazorpayException(0, "Cannot reach Razorpay: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RazorpayException(0, "Interrupted while calling Razorpay");
        }

        JsonNode node;
        try {
            node = json.readTree(res.body() == null || res.body().isEmpty() ? "{}" : res.body());
        } catch (RuntimeException e) {
            throw new RazorpayException(res.statusCode(), "Unreadable response from Razorpay (HTTP " + res.statusCode() + ")");
        }
        if (res.statusCode() < 200 || res.statusCode() >= 300) {
            String desc = node.path("error").path("description").asString("Razorpay error (HTTP " + res.statusCode() + ")");
            logger.warn("Razorpay {} {} failed: HTTP {} {}", method, path, res.statusCode(), desc);
            throw new RazorpayException(res.statusCode(), desc);
        }
        return node;
    }

    static String hmacHex(String secret, byte[] message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private static String enc(String s) {
        return URLEncoder.encode(s.trim(), StandardCharsets.UTF_8);
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    /** Any failed Razorpay call. statusCode 0 means the request never got an answer (network/timeout). */
    public static class RazorpayException extends RuntimeException {
        private final int statusCode;

        public RazorpayException(int statusCode, String message) {
            super(message);
            this.statusCode = statusCode;
        }

        public int getStatusCode() {
            return statusCode;
        }

        /** True when the outcome is unknown (the request may or may not have been applied). */
        public boolean isOutcomeUnknown() {
            return statusCode == 0 || statusCode >= 500 || statusCode == 409;
        }
    }
}
