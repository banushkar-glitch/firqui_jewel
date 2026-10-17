package Firqui.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "newsletter_subscribers")
public class NewsletterSubscriber {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    // Page the visitor subscribed from, e.g. "/products/rings.html"
    @Column(length = 200)
    private String source;

    @Column(nullable = false)
    private LocalDateTime subscribedAt;

    public NewsletterSubscriber() {
    }

    public NewsletterSubscriber(String email, String source) {
        this.email = email;
        this.source = source;
        this.subscribedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getSubscribedAt() {
        return subscribedAt;
    }

    public void setSubscribedAt(LocalDateTime subscribedAt) {
        this.subscribedAt = subscribedAt;
    }
}
