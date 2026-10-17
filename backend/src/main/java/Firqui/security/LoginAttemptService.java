package Firqui.security;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Slows down password guessing: too many failed logins for one account from one
 * address, or from one address overall, block further attempts for a while.
 */
@Component
public class LoginAttemptService {

    public static final int MAX_FAILURES_PER_ACCOUNT = 5;
    public static final int MAX_FAILURES_PER_ADDRESS = 20;
    static final long WINDOW_MS = 15 * 60 * 1000L;

    private final Map<String, Deque<Long>> failures = new ConcurrentHashMap<>();

    public boolean isBlocked(String ip, String identifier) {
        return count(accountKey(ip, identifier)) >= MAX_FAILURES_PER_ACCOUNT
                || count(addressKey(ip)) >= MAX_FAILURES_PER_ADDRESS;
    }

    public void recordFailure(String ip, String identifier) {
        add(accountKey(ip, identifier));
        add(addressKey(ip));
    }

    public void recordSuccess(String ip, String identifier) {
        failures.remove(accountKey(ip, identifier));
    }

    private static String accountKey(String ip, String identifier) {
        return "acct:" + ip + ":" + (identifier == null ? "" : identifier.trim().toLowerCase());
    }

    private static String addressKey(String ip) {
        return "ip:" + ip;
    }

    private int count(String key) {
        Deque<Long> times = failures.get(key);
        if (times == null) return 0;
        synchronized (times) {
            prune(times, System.currentTimeMillis());
            return times.size();
        }
    }

    private void add(String key) {
        long now = System.currentTimeMillis();
        Deque<Long> times = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (times) {
            prune(times, now);
            times.addLast(now);
        }
        if (failures.size() > 50_000) {
            failures.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    prune(e.getValue(), now);
                    return e.getValue().isEmpty();
                }
            });
        }
    }

    private static void prune(Deque<Long> times, long now) {
        while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MS) {
            times.pollFirst();
        }
    }
}
