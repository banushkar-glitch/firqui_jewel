package Firqui;

import Firqui.entity.Order;
import Firqui.repository.OrderRepository;
import Firqui.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Signed cancel links and the "email me a cancel link" form for guest orders. */
class GuestCancellationUnitTests {

    private CancelLinkSigner signer;
    private OrderRepository orders;
    private EmailService email;
    private RefundService refunds;
    private GuestCancellationService service;
    private Order order;

    @BeforeEach
    void setUp() {
        signer = new CancelLinkSigner("test-secret-at-least-32-characters-long!!", "https://firquijewels.com", 24);
        orders = mock(OrderRepository.class);
        email = mock(EmailService.class);
        refunds = mock(RefundService.class);

        order = new Order();
        order.setOrderNumber("FQ123456");
        order.setShippingEmail("Guest@Example.com");
        order.setTotalAmount(2499.0);
        order.setPaymentStatus("PAID");
        order.setOrderStatus("CONFIRMED");
        order.setRazorpayPaymentId("pay_1");
        order.setCreatedAt(LocalDateTime.now().minusHours(1));
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(1));
        when(orders.findByOrderNumber("FQ123456")).thenReturn(Optional.of(order));
        when(email.sendCancelLinkEmail(any())).thenReturn(true);

        service = new GuestCancellationService();
        ReflectionTestUtils.setField(service, "orderRepository", orders);
        ReflectionTestUtils.setField(service, "signer", signer);
        ReflectionTestUtils.setField(service, "refundService", refunds);
        ReflectionTestUtils.setField(service, "emailService", email);
    }

    /* ---------------- signed links ---------------- */

    @Test
    void genuineLinkResolvesToItsOrder() {
        assertEquals(Optional.of("FQ123456"), signer.verify(signer.token(order)));
        assertTrue(signer.link(order).startsWith("https://firquijewels.com/authentication/cancel-order.html?token="));
    }

    @Test
    void tamperedOrForgedLinksAreRejected() {
        String token = signer.token(order);
        assertTrue(signer.verify(token.replace("FQ123456", "FQ654321")).isEmpty(), "other order number");
        char last = token.charAt(token.length() - 1);
        assertTrue(signer.verify(token.substring(0, token.length() - 1) + (last == '0' ? '1' : '0')).isEmpty(), "changed signature");
        String[] p = token.split("\\.");
        assertTrue(signer.verify(p[0] + "." + (Long.parseLong(p[1]) + 86400) + "." + p[2]).isEmpty(), "extended expiry");
        assertTrue(signer.verify("garbage").isEmpty());
        assertTrue(signer.verify(null).isEmpty());
        CancelLinkSigner otherKey = new CancelLinkSigner("a-completely-different-secret-value-123", "https://x", 24);
        assertTrue(otherKey.verify(token).isEmpty(), "signed with another secret");
    }

    @Test
    void linkExpiresWhenTheWindowCloses() {
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(25));
        assertTrue(signer.verify(signer.token(order)).isEmpty());
        assertFalse(signer.isWindowOpen(order));
    }

    /* ---------------- "email me a link" form ---------------- */

    @Test
    void matchingEmailSendsLinkCaseInsensitively() {
        assertTrue(service.requestLink("fq123456", "  guest@example.COM ", "1.1.1.1"));
        verify(email).sendCancelLinkEmail(order);
    }

    @Test
    void wrongEmailSendsNothingButLooksTheSame() {
        assertTrue(service.requestLink("FQ123456", "attacker@example.com", "1.1.1.1"));
        verify(email, never()).sendCancelLinkEmail(any());
    }

    @Test
    void unknownOrderSendsNothingButLooksTheSame() {
        assertTrue(service.requestLink("FQ999999", "guest@example.com", "1.1.1.1"));
        verify(email, never()).sendCancelLinkEmail(any());
    }

    @Test
    void noLinkForOrdersThatCanNoLongerBeCancelled() {
        order.setOrderStatus("Shipped");
        service.requestLink("FQ123456", "guest@example.com", "1.1.1.1");
        order.setOrderStatus("CONFIRMED");
        order.setPaymentVerifiedAt(LocalDateTime.now().minusHours(30));
        service.requestLink("FQ123456", "guest@example.com", "1.1.1.2");
        verify(email, never()).sendCancelLinkEmail(any());
    }

    @Test
    void requestsAreRateLimitedPerAddressAndPerOrder() {
        for (int i = 0; i < 5; i++) assertTrue(service.requestLink("FQ999999", "x@example.com", "9.9.9.9"));
        assertFalse(service.requestLink("FQ999999", "x@example.com", "9.9.9.9"), "6th request from one address");

        for (int i = 0; i < 6; i++) service.requestLink("FQ123456", "guest@example.com", "10.0.0." + i);
        verify(email, times(3)).sendCancelLinkEmail(order);
    }

    /* ---------------- cancelling ---------------- */

    @Test
    void cancelWithValidLinkCancelsThatOrder() {
        when(refunds.cancelByEmailLink(eq("FQ123456"), any(), any())).thenReturn(order);
        Map<String, Object> res = service.cancel(signer.token(order), "Ordered by mistake", null);
        assertEquals("FQ123456", res.get("orderNumber"));
        verify(refunds).cancelByEmailLink("FQ123456", "Ordered by mistake", null);
    }

    @Test
    void cancelWithBadLinkIsRefused() {
        PaymentException e = assertThrows(PaymentException.class, () -> service.cancel("FQ123456.999.bad", "x", null));
        assertEquals(410, e.getHttpStatus());
        verify(refunds, never()).cancelByEmailLink(any(), any(), any());
    }

    @Test
    void previewShowsOrderWithoutPersonalDetails() {
        Map<String, Object> p = service.preview(signer.token(order));
        assertEquals("FQ123456", p.get("orderNumber"));
        assertEquals(true, p.get("cancellable"));
        assertFalse(p.containsKey("email") || p.containsKey("shippingAddress") || p.containsKey("phone"));
    }
}
