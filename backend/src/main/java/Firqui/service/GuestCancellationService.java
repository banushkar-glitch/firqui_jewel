package Firqui.service;

import Firqui.entity.Order;
import Firqui.entity.OrderItem;
import Firqui.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Self-service cancellation for orders placed without logging in.
 *
 *  1. requestLink(orderNumber, email): if they match an order that can still be cancelled,
 *     the signed link is emailed to the order's address. The answer never says whether
 *     anything matched, so the form cannot be used to look up other people's orders.
 *  2. preview(token): what the link page shows (order number, items, total, deadline).
 *  3. cancel(token, ...): cancels with automatic refund, same rules as a logged-in customer.
 */
@Service
public class GuestCancellationService {

    private static final Logger logger = LoggerFactory.getLogger(GuestCancellationService.class);
    private static final long HOUR_MS = 60 * 60 * 1000L;
    static final int MAX_REQUESTS_PER_IP_PER_HOUR = 5;
    static final int MAX_EMAILS_PER_ORDER_PER_HOUR = 3;

    @Autowired private OrderRepository orderRepository;
    @Autowired private CancelLinkSigner signer;
    @Autowired private RefundService refundService;
    @Autowired(required = false) private EmailService emailService;

    private final Map<String, Deque<Long>> byIp = new ConcurrentHashMap<>();
    private final Map<String, Deque<Long>> byOrder = new ConcurrentHashMap<>();

    /** Returns false only when the caller is over the hourly limit (answer 429). */
    @Transactional(readOnly = true)
    public boolean requestLink(String orderNumber, String email, String clientIp) {
        if (!allow(byIp, clientIp == null ? "unknown" : clientIp, MAX_REQUESTS_PER_IP_PER_HOUR)) return false;
        if (orderNumber == null || email == null || orderNumber.isBlank() || email.isBlank()) return true;

        String clean = orderNumber.trim().replace("#", "").toUpperCase(Locale.ROOT);
        Optional<Order> found = orderRepository.findByOrderNumber(clean);
        if (found.isEmpty()) return true;
        Order order = found.get();

        String wanted = email.trim().toLowerCase(Locale.ROOT);
        boolean emailMatches = wanted.equals(lower(order.getShippingEmail()))
                || (order.getUser() != null && wanted.equals(lower(order.getUser().getEmail())));
        if (!emailMatches || !canCancel(order) || !allow(byOrder, clean, MAX_EMAILS_PER_ORDER_PER_HOUR)) return true;

        if (emailService != null && !emailService.sendCancelLinkEmail(order)) {
            logger.warn("Cancel link requested for order #{} but the email could not be sent", clean);
        }
        return true;
    }

    /** What the cancel page shows. Throws PaymentException(410) for an invalid or expired link. */
    @Transactional(readOnly = true)
    public Map<String, Object> preview(String token) {
        Order order = orderFor(token);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("orderNumber", order.getOrderNumber());
        m.put("orderDate", order.getCreatedAt() != null
                ? order.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")) : null);
        List<Map<String, Object>> items = new ArrayList<>();
        if (order.getItems() != null) {
            for (OrderItem it : order.getItems()) {
                Map<String, Object> i = new LinkedHashMap<>();
                i.put("name", it.getProductName());
                i.put("quantity", it.getQuantity());
                items.add(i);
            }
        }
        m.put("items", items);
        m.put("totalAmount", order.getTotalAmount());
        m.put("paidOnline", RefundService.isPaidOnline(order));
        m.put("cancellable", canCancel(order));
        m.put("status", RefundService.isCancelled(order) ? "Cancelled" : order.getOrderStatus());
        m.put("refundStatus", order.getRefundStatus());
        m.put("cancelBy", signer.windowEnd(order).format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
        return m;
    }

    /** Cancels the order named by the link; refund is issued automatically when it was paid online. */
    public Map<String, Object> cancel(String token, String reason, String details) {
        String orderNumber = signer.verify(token)
                .orElseThrow(() -> new PaymentException(410, "This cancellation link is invalid or has expired."));
        Order order = refundService.cancelByEmailLink(orderNumber, reason, details);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("orderNumber", order.getOrderNumber());
        m.put("refundStatus", order.getRefundStatus());
        m.put("refundAmount", order.getRefundAmount());
        m.put("razorpayRefundId", order.getRazorpayRefundId());
        return m;
    }

    private Order orderFor(String token) {
        String orderNumber = signer.verify(token)
                .orElseThrow(() -> new PaymentException(410, "This cancellation link is invalid or has expired."));
        return orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new PaymentException(410, "This cancellation link is invalid or has expired."));
    }

    private boolean canCancel(Order order) {
        if (RefundService.isCancelled(order) || !signer.isWindowOpen(order)) return false;
        String status = order.getOrderStatus() != null ? order.getOrderStatus() : "";
        return !"Shipped".equalsIgnoreCase(status) && !"Delivered".equalsIgnoreCase(status);
    }

    private static String lower(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean allow(Map<String, Deque<Long>> map, String key, int max) {
        long now = System.currentTimeMillis();
        Deque<Long> times = map.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > HOUR_MS) times.pollFirst();
            if (times.size() >= max) return false;
            times.addLast(now);
        }
        if (map.size() > 10_000) {
            map.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    return e.getValue().isEmpty() || now - e.getValue().peekLast() > HOUR_MS;
                }
            });
        }
        return true;
    }
}
