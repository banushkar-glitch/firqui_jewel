package Firqui;

import Firqui.entity.*;
import Firqui.repository.*;
import Firqui.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Razorpay checkout, webhook and refund rules, with the Razorpay API and the database mocked.
 */
class RazorpayPaymentFlowUnitTests {

    private static final String KEY_SECRET = "test_key_secret";
    private static final String WEBHOOK_SECRET = "test_webhook_secret";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private RazorpayGateway gateway;
    private OrderRepository orders;
    private PaymentRepository payments;
    private RefundRepository refunds;
    private WebhookEventRepository webhookEvents;
    private CancellationRequestRepository cancellations;
    private RefundService refundService;
    private RazorpayPaymentService paymentService;

    private final List<Refund> refundRows = new ArrayList<>();
    private Order order;

    @BeforeEach
    void setUp() {
        // Real signature checks, mocked HTTP calls
        gateway = spy(new RazorpayGateway("rzp_test_key", KEY_SECRET, WEBHOOK_SECRET));
        orders = mock(OrderRepository.class);
        payments = mock(PaymentRepository.class);
        refunds = mock(RefundRepository.class);
        webhookEvents = mock(WebhookEventRepository.class);
        cancellations = mock(CancellationRequestRepository.class);

        order = new Order();
        order.setId(7L);
        order.setOrderNumber("FQ123456");
        order.setTotalAmount(2499.0);
        order.setPaymentStatus("PENDING_PAYMENT");
        order.setOrderStatus("CHECKOUT_PENDING");
        order.setRazorpayOrderId("order_ABC");
        order.setCreatedAt(LocalDateTime.now());

        when(orders.findLockedByOrderNumber("FQ123456")).thenReturn(Optional.of(order));
        when(orders.findLockedByRazorpayOrderId("order_ABC")).thenReturn(Optional.of(order));
        when(orders.findLockedByRazorpayPaymentId(anyString())).thenAnswer(i ->
                i.getArgument(0).equals(order.getRazorpayPaymentId()) ? Optional.of(order) : Optional.empty());
        when(orders.save(any())).thenAnswer(i -> i.getArgument(0));
        when(payments.findByRazorpayPaymentId(anyString())).thenReturn(Optional.empty());
        when(cancellations.findTopByOrderNumberOrderByCreatedAtDesc(anyString())).thenReturn(Optional.empty());

        // In-memory refunds table
        when(refunds.saveAndFlush(any())).thenAnswer(i -> store(i.getArgument(0)));
        when(refunds.save(any())).thenAnswer(i -> store(i.getArgument(0)));
        when(refunds.findByOrderIdOrderByInitiatedAtDesc(anyLong())).thenAnswer(i -> new ArrayList<>(refundRows));
        when(refunds.findByRazorpayPaymentIdOrderByInitiatedAtDesc(anyString())).thenAnswer(i ->
                refundRows.stream().filter(r -> i.getArgument(0).equals(r.getRazorpayPaymentId())).toList());
        when(refunds.findByRazorpayRefundId(anyString())).thenReturn(Optional.empty());

        refundService = new RefundService();
        inject(refundService, "gateway", gateway);
        inject(refundService, "orderRepository", orders);
        inject(refundService, "refundRepository", refunds);
        inject(refundService, "productRepository", mock(ProductRepository.class));
        inject(refundService, "cancellationRequestRepository", cancellations);
        ReflectionTestUtils.setField(refundService, "cancellationWindowHours", 24L);

        paymentService = new RazorpayPaymentService();
        inject(paymentService, "gateway", gateway);
        inject(paymentService, "orderRepository", orders);
        inject(paymentService, "paymentRepository", payments);
        inject(paymentService, "webhookEventRepository", webhookEvents);
        inject(paymentService, "cartItemRepository", mock(CartItemRepository.class));
        inject(paymentService, "refundService", refundService);
        inject(paymentService, "transactionManager", mock(PlatformTransactionManager.class));
        ReflectionTestUtils.setField(paymentService, "checkoutExpiryMinutes", 45L);
    }

    /* ---------------- signatures ---------------- */

    @Test
    void checkoutSignatureMustMatch() {
        String good = hmac(KEY_SECRET, "order_ABC|pay_1");
        assertTrue(gateway.verifyPaymentSignature("order_ABC", "pay_1", good));
        assertFalse(gateway.verifyPaymentSignature("order_ABC", "pay_2", good));
        assertFalse(gateway.verifyPaymentSignature("order_ABC", "pay_1", "deadbeef"));
    }

    @Test
    void forgedCallbackIsRejectedWithoutTouchingTheOrder() {
        PaymentException e = assertThrows(PaymentException.class,
                () -> paymentService.confirmCheckout("order_ABC", "pay_1", "forged"));
        assertEquals(400, e.getHttpStatus());
        assertEquals("PENDING_PAYMENT", order.getPaymentStatus());
        verify(gateway, never()).fetchPayment(anyString());
    }

    /* ---------------- checkout ---------------- */

    @Test
    void startCheckoutReusesRazorpayOrderAndUsesDatabaseAmount() {
        Map<String, Object> res = paymentService.startCheckout("FQ123456");
        assertEquals("order_ABC", res.get("order_id"));
        assertEquals(249900L, res.get("amount"));
        verify(gateway, never()).createOrder(anyLong(), anyString(), any());
    }

    @Test
    void startCheckoutCreatesRazorpayOrderForTrustedTotal() {
        order.setRazorpayOrderId(null);
        doReturn(json("{\"id\":\"order_NEW\",\"amount\":249900}")).when(gateway).createOrder(anyLong(), anyString(), any());
        Map<String, Object> res = paymentService.startCheckout("FQ123456");
        verify(gateway).createOrder(eq(249900L), eq("FQ123456"), any());
        assertEquals("order_NEW", res.get("order_id"));
        assertEquals("order_NEW", order.getRazorpayOrderId());
    }

    @Test
    void paidOrderCannotStartCheckoutAgain() {
        order.setPaymentStatus("PAID");
        assertEquals(409, assertThrows(PaymentException.class, () -> paymentService.startCheckout("FQ123456")).getHttpStatus());
    }

    @Test
    void capturedPaymentMarksOrderPaid() {
        doReturn(payment("pay_1", "captured", 249900)).when(gateway).fetchPayment("pay_1");
        RazorpayPaymentService.Outcome out = paymentService.confirmCheckout("order_ABC", "pay_1", hmac(KEY_SECRET, "order_ABC|pay_1"));
        assertTrue(out.paid());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals("CONFIRMED", order.getOrderStatus());
        assertEquals("pay_1", order.getRazorpayPaymentId());
        assertEquals("UPI (cust@okhdfc)", order.getPaymentMethod());
        verify(payments).save(any(Payment.class));
    }

    @Test
    void authorizedPaymentIsCapturedThenMarkedPaid() {
        doReturn(payment("pay_1", "authorized", 249900)).when(gateway).fetchPayment("pay_1");
        doReturn(payment("pay_1", "captured", 249900)).when(gateway).capturePayment("pay_1", 249900L);
        assertTrue(paymentService.confirmCheckout("order_ABC", "pay_1", hmac(KEY_SECRET, "order_ABC|pay_1")).paid());
        verify(gateway).capturePayment("pay_1", 249900L);
    }

    @Test
    void amountMismatchIsRejected() {
        doReturn(payment("pay_1", "captured", 100)).when(gateway).fetchPayment("pay_1");
        assertThrows(PaymentException.class,
                () -> paymentService.confirmCheckout("order_ABC", "pay_1", hmac(KEY_SECRET, "order_ABC|pay_1")));
        assertEquals("PENDING_PAYMENT", order.getPaymentStatus());
    }

    @Test
    void paymentForAnotherRazorpayOrderIsRejected() {
        JsonNode other = json("{\"id\":\"pay_1\",\"order_id\":\"order_OTHER\",\"status\":\"captured\",\"amount\":249900,\"currency\":\"INR\"}");
        doReturn(other).when(gateway).fetchPayment("pay_1");
        assertThrows(PaymentException.class,
                () -> paymentService.confirmCheckout("order_ABC", "pay_1", hmac(KEY_SECRET, "order_ABC|pay_1")));
    }

    @Test
    void failedPaymentLeavesOrderPayable() {
        doReturn(payment("pay_1", "failed", 249900)).when(gateway).fetchPayment("pay_1");
        assertFalse(paymentService.confirmCheckout("order_ABC", "pay_1", hmac(KEY_SECRET, "order_ABC|pay_1")).paid());
        assertEquals("PENDING_PAYMENT", order.getPaymentStatus());
    }

    @Test
    void secondPaymentForPaidOrderIsRefunded() {
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment(anyString());
        doReturn(json("{\"id\":\"rfnd_dup\",\"status\":\"processed\",\"amount\":249900}"))
                .when(gateway).createRefund(eq("pay_2"), eq(249900L), anyString(), any(), anyString(), anyString());
        doReturn(payment("pay_2", "captured", 249900)).when(gateway).fetchPayment("pay_2");

        RazorpayPaymentService.Outcome out = paymentService.confirmCheckout("order_ABC", "pay_2", hmac(KEY_SECRET, "order_ABC|pay_2"));
        assertTrue(out.paid());
        assertEquals("pay_1", order.getRazorpayPaymentId());
        verify(gateway).createRefund(eq("pay_2"), eq(249900L), anyString(), any(), anyString(), anyString());
        assertEquals("NONE", order.getRefundStatus(), "refund of the duplicate does not count against the order");
    }

    @Test
    void paymentArrivingAfterExpiryIsRefundedInFull() {
        order.setOrderStatus("Cancelled");
        order.setCancellationStatus("CANCELLED");
        order.setPaymentStatus("EXPIRED");
        doReturn(json("{\"id\":\"rfnd_late\",\"status\":\"processed\",\"amount\":249900}"))
                .when(gateway).createRefund(eq("pay_late"), eq(249900L), anyString(), any(), anyString(), anyString());
        doReturn(payment("pay_late", "captured", 249900)).when(gateway).fetchPayment("pay_late");

        RazorpayPaymentService.Outcome out = paymentService.confirmCheckout("order_ABC", "pay_late", hmac(KEY_SECRET, "order_ABC|pay_late"));
        assertFalse(out.paid());
        assertEquals("Cancelled", order.getOrderStatus());
        assertEquals("REFUNDED", order.getRefundStatus());
    }

    /* ---------------- webhook ---------------- */

    @Test
    void webhookWithBadSignatureIsRejected() {
        byte[] body = capturedEvent("pay_1").getBytes(StandardCharsets.UTF_8);
        assertEquals(400, assertThrows(PaymentException.class,
                () -> paymentService.handleWebhook("evt_1", body, "bad")).getHttpStatus());
    }

    @Test
    void webhookCapturedMarksPaidAndIsRecordedByEventId() {
        byte[] body = capturedEvent("pay_1").getBytes(StandardCharsets.UTF_8);
        paymentService.handleWebhook("evt_1", body, hmac(WEBHOOK_SECRET, body));
        assertEquals("PAID", order.getPaymentStatus());
        ArgumentCaptor<WebhookEvent> saved = ArgumentCaptor.forClass(WebhookEvent.class);
        verify(webhookEvents).save(saved.capture());
        assertEquals("evt_1", saved.getValue().getEventId());
        assertEquals("PROCESSED", saved.getValue().getStatus());
    }

    @Test
    void duplicateWebhookEventIsSkipped() {
        when(webhookEvents.existsByEventId("evt_1")).thenReturn(true);
        byte[] body = capturedEvent("pay_1").getBytes(StandardCharsets.UTF_8);
        paymentService.handleWebhook("evt_1", body, hmac(WEBHOOK_SECRET, body));
        assertEquals("PENDING_PAYMENT", order.getPaymentStatus());
        verify(webhookEvents, never()).save(any());
    }

    @Test
    void refundProcessedWebhookUpdatesOrder() {
        markPaid("pay_1");
        Refund pending = new Refund(order, "FQ123456", "pay_1", "rfnd_1", 2499.0, "INR", "x", RefundService.REFUND_PENDING, "CUSTOMER");
        store(pending);
        String event = "{\"event\":\"refund.processed\",\"payload\":{\"refund\":{\"entity\":"
                + "{\"id\":\"rfnd_1\",\"payment_id\":\"pay_1\",\"amount\":249900,\"status\":\"processed\"}}}}";
        byte[] body = event.getBytes(StandardCharsets.UTF_8);
        paymentService.handleWebhook("evt_r1", body, hmac(WEBHOOK_SECRET, body));
        assertEquals(RefundService.REFUND_PROCESSED, pending.getStatus());
        assertEquals("REFUNDED", order.getRefundStatus());
    }

    /* ---------------- refunds ---------------- */

    @Test
    void customerCancelRefundsFullAmount() {
        User user = user(1L);
        order.setUser(user);
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doReturn(json("{\"id\":\"rfnd_1\",\"status\":\"pending\",\"amount\":249900}"))
                .when(gateway).createRefund(eq("pay_1"), eq(249900L), anyString(), any(), startsWith("firqui-refund-"), anyString());
        when(cancellations.save(any())).thenAnswer(i -> i.getArgument(0));

        refundService.cancelByCustomer(user, "FQ123456", "Ordered by mistake", "details here");
        assertEquals("Cancelled", order.getOrderStatus());
        assertEquals("PENDING_REFUND", order.getRefundStatus());
        assertEquals("rfnd_1", order.getRazorpayRefundId());
    }

    @Test
    void customerCannotCancelSomeoneElsesOrder() {
        order.setUser(user(1L));
        markPaid("pay_1");
        assertThrows(SecurityException.class, () -> refundService.cancelByCustomer(user(2L), "FQ123456", "x", "y"));
        verify(gateway, never()).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void gatewayRejectionStillCancelsAndMarksRefundFailed() {
        User user = user(1L);
        order.setUser(user);
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doThrow(new RazorpayGateway.RazorpayException(400, "Insufficient balance"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
        when(cancellations.save(any())).thenAnswer(i -> i.getArgument(0));

        refundService.cancelByCustomer(user, "FQ123456", "Ordered by mistake", "details here");
        assertEquals("Cancelled", order.getOrderStatus());
        assertEquals("REFUND_FAILED", order.getRefundStatus());
    }

    @Test
    void partialRefundsCannotExceedAmountPaid() {
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doAnswer(i -> json("{\"id\":\"rfnd_" + refundRows.size() + "\",\"status\":\"processed\",\"amount\":" + i.getArgument(1) + "}"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());

        refundService.adminRefund("FQ123456", 200000L, "partial", "admin@x");
        assertEquals("PARTIALLY_REFUNDED", order.getRefundStatus());
        assertThrows(IllegalArgumentException.class, () -> refundService.adminRefund("FQ123456", 50000L, "too much", "admin@x"));
        refundService.adminRefund("FQ123456", null, "rest", "admin@x");
        assertEquals("REFUNDED", order.getRefundStatus());
        assertEquals(2499.0, order.getRefundAmount(), 0.001);
        assertThrows(IllegalStateException.class, () -> refundService.adminRefund("FQ123456", null, "again", "admin@x"));
    }

    @Test
    void retryFindsRefundThatAlreadyHappenedInsteadOfRefundingTwice() {
        markPaid("pay_1");
        // First attempt timed out: outcome unknown
        doThrow(new RazorpayGateway.RazorpayException(0, "timeout"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        refundService.adminRefund("FQ123456", null, "first", "admin@x");
        Refund first = refundRows.get(0);
        assertEquals(RefundService.REFUND_PENDING, first.getStatus());

        // Razorpay did create it; the retry's sync finds it and there is nothing left to refund
        doReturn(json("[{\"id\":\"rfnd_real\",\"payment_id\":\"pay_1\",\"amount\":249900,\"status\":\"processed\","
                + "\"notes\":{\"firqui_refund_id\":\"" + first.getId() + "\"}}]")).when(gateway).fetchRefundsForPayment("pay_1");
        assertThrows(IllegalStateException.class, () -> refundService.adminRefund("FQ123456", null, "retry", "admin@x"));
        assertEquals("rfnd_real", first.getRazorpayRefundId());
        assertEquals("REFUNDED", order.getRefundStatus());
        verify(gateway, times(1)).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
    }

    /* ---------------- 24-hour refund window ---------------- */

    @Test
    void adminRefundIsBlockedAfter24HoursFromPayment() {
        markPaid("pay_1");
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(25));
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> refundService.adminRefund("FQ123456", null, "late", "admin@x"));
        assertTrue(e.getMessage().contains("24 hours"));
        verify(gateway, never()).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void adminRefundIsAllowedWithin24Hours() {
        markPaid("pay_1");
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(23));
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doReturn(json("{\"id\":\"rfnd_ok\",\"status\":\"processed\",\"amount\":249900}"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
        refundService.adminRefund("FQ123456", null, "in time", "admin@x");
        assertEquals("REFUNDED", order.getRefundStatus());
    }

    @Test
    void retryStillWorksAfter24HoursForAnOrderCancelledInTime() {
        markPaid("pay_1");
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(30));
        order.setOrderStatus("Cancelled");
        order.setCancellationStatus("CANCELLED");
        order.setRefundStatus("REFUND_FAILED");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doReturn(json("{\"id\":\"rfnd_retry\",\"status\":\"processed\",\"amount\":249900}"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
        refundService.retryRefund("FQ123456", "admin@x");
        assertEquals("REFUNDED", order.getRefundStatus());
    }

    @Test
    void retryCannotBeUsedToRefundAnActiveOrderAfterTheWindow() {
        markPaid("pay_1");
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(30));
        assertThrows(IllegalStateException.class, () -> refundService.retryRefund("FQ123456", "admin@x"));
        verify(gateway, never()).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), anyString());
    }

    /* ---------------- instant refunds ---------------- */

    @Test
    void refundsAskRazorpayForInstantSpeed() {
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doReturn(json("{\"id\":\"rfnd_i\",\"status\":\"processed\",\"amount\":249900,\"speed_processed\":\"instant\"}"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), eq("optimum"));
        refundService.adminRefund("FQ123456", null, "instant", "admin@x");
        verify(gateway).createRefund(eq("pay_1"), eq(249900L), anyString(), any(), anyString(), eq("optimum"));
        assertEquals("REFUNDED", order.getRefundStatus());
    }

    @Test
    void instantNotSupportedFallsBackToNormalSpeedWithNewKey() {
        markPaid("pay_1");
        doReturn(json("[]")).when(gateway).fetchRefundsForPayment("pay_1");
        doThrow(new RazorpayGateway.RazorpayException(400, "Instant refund not supported for the payment"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), anyString(), eq("optimum"));
        doReturn(json("{\"id\":\"rfnd_n\",\"status\":\"pending\",\"amount\":249900}"))
                .when(gateway).createRefund(anyString(), anyLong(), anyString(), any(), endsWith("-normal"), eq("normal"));
        refundService.adminRefund("FQ123456", null, "fallback", "admin@x");
        assertEquals("rfnd_n", order.getRazorpayRefundId());
        assertEquals("PENDING_REFUND", order.getRefundStatus());
    }

    /* ---------------- helpers ---------------- */

    private Refund store(Refund r) {
        if (r.getId() == null) {
            r.setId((long) (refundRows.size() + 100));
            refundRows.add(0, r);
        }
        return r;
    }

    private void markPaid(String paymentId) {
        order.setPaymentStatus("PAID");
        order.setOrderStatus("CONFIRMED");
        order.setRazorpayPaymentId(paymentId);
        order.setPaymentVerifiedAt(LocalDateTime.now());
    }

    private static User user(long id) {
        User u = new User();
        u.setId(id);
        u.setEmail("u" + id + "@example.com");
        return u;
    }

    private static JsonNode payment(String id, String status, long amount) {
        return json("{\"id\":\"" + id + "\",\"order_id\":\"order_ABC\",\"status\":\"" + status + "\",\"amount\":" + amount
                + ",\"currency\":\"INR\",\"method\":\"upi\",\"vpa\":\"cust@okhdfc\"}");
    }

    private static String capturedEvent(String paymentId) {
        return "{\"entity\":\"event\",\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":"
                + payment(paymentId, "captured", 249900) + "}}}";
    }

    private static JsonNode json(String s) {
        return JSON.readTree(s);
    }

    private static String hmac(String secret, String message) {
        return hmac(secret, message.getBytes(StandardCharsets.UTF_8));
    }

    private static String hmac(String secret, byte[] message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void inject(Object target, String field, Object value) {
        ReflectionTestUtils.setField(target, field, value);
    }
}
