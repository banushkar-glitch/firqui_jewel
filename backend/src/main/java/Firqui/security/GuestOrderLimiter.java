package Firqui.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Guest checkout needs no account, so cap how many orders one address can place
 * per hour. Enough for real shoppers, stops scripted floods of fake orders.
 */
@Component
public class GuestOrderLimiter {

    public static final int MAX_GUEST_ORDERS_PER_HOUR = 10;
    private static final long WINDOW_MS = 60 * 60 * 1000L;

    private final Map<String, Deque<Long>> recent = new ConcurrentHashMap<>();

    /** Records the attempt and returns false when this address is over the limit. */
    public boolean tryAcquire(String ip) {
        long now = System.currentTimeMillis();
        Deque<Long> times = recent.computeIfAbsent(ip == null ? "unknown" : ip, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MS) {
                times.pollFirst();
            }
            if (times.size() >= MAX_GUEST_ORDERS_PER_HOUR) {
                return false;
            }
            times.addLast(now);
        }
        if (recent.size() > 10_000) {
            recent.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    return e.getValue().isEmpty() || now - e.getValue().peekLast() > WINDOW_MS;
                }
            });
        }
        return true;
    }
}
