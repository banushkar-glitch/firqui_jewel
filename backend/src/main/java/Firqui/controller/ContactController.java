package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.ContactMessageRequest;
import Firqui.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ContactController {

    private static final Logger logger = LoggerFactory.getLogger(ContactController.class);

    // The form is public, so cap how many emails one visitor can trigger
    public static final int MAX_MESSAGES_PER_WINDOW = 5;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private static final String SUCCESS_MESSAGE = "Thank you! Your message has been received. We will get back to you shortly.";

    private final Map<String, Deque<Long>> recentByClient = new ConcurrentHashMap<>();

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<ApiResponse> submitContactMessage(
            @Valid @RequestBody ContactMessageRequest request,
            BindingResult bindingResult,
            HttpServletRequest httpRequest
    ) {
        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getAllErrors().get(0).getDefaultMessage();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(errorMessage != null ? errorMessage : "Invalid contact form data."));
        }

        // Honeypot field is hidden from people; a filled one means a bot. Pretend it worked.
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            logger.info("Ignored contact form submission with honeypot field filled");
            return ResponseEntity.ok(ApiResponse.ok(SUCCESS_MESSAGE));
        }

        if (!allowSubmission(httpRequest != null ? httpRequest.getRemoteAddr() : "unknown")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.error("You've sent several messages in a short time. Please wait a few minutes or email info@firquijewels.com."));
        }

        try {
            boolean sent = emailService.sendContactMessage(request);
            if (sent) {
                return ResponseEntity.ok(ApiResponse.ok(SUCCESS_MESSAGE));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(ApiResponse.error("Unable to send message at this moment. Please try again later or email info@firquijewels.com."));
            }
        } catch (Exception ex) {
            logger.error("Error processing contact form message: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An error occurred while submitting your message. Please try again later."));
        }
    }

    private boolean allowSubmission(String clientKey) {
        long now = System.currentTimeMillis();
        Deque<Long> times = recentByClient.computeIfAbsent(clientKey, key -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > WINDOW_MS) {
                times.pollFirst();
            }
            if (times.size() >= MAX_MESSAGES_PER_WINDOW) {
                return false;
            }
            times.addLast(now);
        }
        // Drop idle entries now and then so the map cannot grow without bound
        if (recentByClient.size() > 10_000) {
            recentByClient.entrySet().removeIf(entry -> {
                synchronized (entry.getValue()) {
                    return entry.getValue().isEmpty() || now - entry.getValue().peekLast() > WINDOW_MS;
                }
            });
        }
        return true;
    }
}
