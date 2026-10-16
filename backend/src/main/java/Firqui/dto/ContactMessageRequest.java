package Firqui.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ContactMessageRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    @Size(max = 120, message = "Email cannot exceed 120 characters")
    private String email;

    @Size(max = 30, message = "Phone cannot exceed 30 characters")
    private String phone;

    @NotBlank(message = "Subject is required")
    @Size(min = 2, max = 150, message = "Subject must be between 2 and 150 characters")
    private String subject;

    // Honeypot: hidden on the form, so only bots fill it in
    @Size(max = 200)
    private String website;

    @NotBlank(message = "Message is required")
    @Size(min = 5, max = 5000, message = "Message must be between 5 and 5000 characters")
    private String message;

    public ContactMessageRequest() {
    }

    public ContactMessageRequest(String name, String email, String subject, String message) {
        this.name = name;
        this.email = email;
        this.subject = subject;
        this.message = message;
    }

    public String getName() {
        return name != null ? name.replaceAll("[\\r\\n]", " ").trim() : null;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email != null ? email.replaceAll("[\\r\\n]", "").trim() : null;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone != null ? phone.replaceAll("[\\r\\n]", "").trim() : null;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSubject() {
        return subject != null ? subject.replaceAll("[\\r\\n]", " ").trim() : null;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getMessage() {
        return message != null ? message.trim() : null;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }
}
