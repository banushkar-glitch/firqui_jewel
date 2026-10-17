package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.entity.NewsletterSubscriber;
import Firqui.repository.NewsletterSubscriberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@CrossOrigin(origins = "*", maxAge = 3600)
public class NewsletterController {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");

    @Autowired
    private NewsletterSubscriberRepository subscriberRepository;

    /* =====================================================
       POST /api/newsletter/subscribe - public, from the footer form
    ====================================================== */
    @PostMapping("/api/newsletter/subscribe")
    public ResponseEntity<ApiResponse> subscribe(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String source = body.getOrDefault("source", "");
        // Same honeypot idea as the contact form: people never fill this in
        if (!body.getOrDefault("website", "").isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok("Thank you for subscribing!"));
        }
        if (email.length() > 160 || !EMAIL.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Please enter a valid email address."));
        }
        if (subscriberRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.ok(ApiResponse.ok("You're already subscribed. Thank you!"));
        }
        try {
            subscriberRepository.save(new NewsletterSubscriber(email, source.length() > 200 ? source.substring(0, 200) : source));
        } catch (DataIntegrityViolationException duplicate) {
            // Two submissions at the same moment; the first one won
            return ResponseEntity.ok(ApiResponse.ok("You're already subscribed. Thank you!"));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Thank you for subscribing!"));
    }

    /* =====================================================
       ADMIN: list, export, remove
    ====================================================== */
    @GetMapping("/api/admin/newsletter")
    public List<NewsletterSubscriber> list() {
        return subscriberRepository.findAllByOrderBySubscribedAtDesc();
    }

    @GetMapping(value = "/api/admin/newsletter/export", produces = "text/csv")
    public ResponseEntity<String> exportCsv() {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        StringBuilder csv = new StringBuilder("email,subscribed_at,source\n");
        for (NewsletterSubscriber s : subscriberRepository.findAllByOrderBySubscribedAtDesc()) {
            csv.append(s.getEmail()).append(',')
               .append(s.getSubscribedAt() != null ? s.getSubscribedAt().format(fmt) : "").append(',')
               .append(s.getSource() != null ? s.getSource().replace(",", " ") : "").append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"firqui-newsletter-subscribers.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv.toString());
    }

    @DeleteMapping("/api/admin/newsletter/{id}")
    public ResponseEntity<ApiResponse> remove(@PathVariable Long id) {
        if (!subscriberRepository.existsById(id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Subscriber not found."));
        }
        subscriberRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Subscriber removed."));
    }
}
