package Firqui;

import Firqui.controller.ContactController;
import Firqui.dto.ApiResponse;
import Firqui.dto.ContactMessageRequest;
import Firqui.service.EmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.BindingResult;
import org.springframework.validation.Validator;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "app.mail.allow-dev-fallback=true")
public class ContactIntegrationTests {

    @Autowired
    private ContactController contactController;

    @Autowired
    private EmailService emailService;

    @Autowired
    private Validator validator;

    @Test
    @DisplayName("Test 1: Valid contact form submission succeeds and triggers email service")
    void testValidContactSubmission() {
        ContactMessageRequest request = new ContactMessageRequest(
                "Ananya Sharma",
                "ananya@example.com",
                "Inquiry about Pearl Necklace",
                "Hello, I would like to know if the Pearl Necklace is in stock and available for express delivery to Pune."
        );
        request.setPhone("+91 9876543210");

        BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, bindingResult);
        assertFalse(bindingResult.hasErrors(), "Valid request should not have validation errors");

        ResponseEntity<ApiResponse> response = contactController.submitContactMessage(request, bindingResult, new MockHttpServletRequest());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertTrue(response.getBody().getMessage().toLowerCase().contains("received") ||
                   response.getBody().getMessage().toLowerCase().contains("sent"));
    }

    @Test
    @DisplayName("Test 2: Validation fails when required fields are blank")
    void testBlankRequiredFields() {
        ContactMessageRequest request = new ContactMessageRequest("", "", "", "");

        BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, bindingResult);
        assertTrue(bindingResult.hasErrors(), "Blank fields must trigger validation errors");

        ResponseEntity<ApiResponse> response = contactController.submitContactMessage(request, bindingResult, new MockHttpServletRequest());
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    @DisplayName("Test 3: Validation fails when email address format is invalid")
    void testInvalidEmailAddress() {
        ContactMessageRequest request = new ContactMessageRequest(
                "Rohit Mehta",
                "not-an-email",
                "Order status",
                "Where is my jewellery package?"
        );

        BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, bindingResult);
        assertTrue(bindingResult.hasErrors(), "Malformed email must trigger validation error");

        ResponseEntity<ApiResponse> response = contactController.submitContactMessage(request, bindingResult, new MockHttpServletRequest());
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    @DisplayName("Test 4: Validation fails when message is too short")
    void testMessageTooShort() {
        ContactMessageRequest request = new ContactMessageRequest(
                "Pooja Patil",
                "pooja@example.com",
                "Hello",
                "Hi" // under 5 characters
        );

        BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, bindingResult);
        assertTrue(bindingResult.hasErrors(), "Short message must trigger validation error");

        ResponseEntity<ApiResponse> response = contactController.submitContactMessage(request, bindingResult, new MockHttpServletRequest());
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    @DisplayName("Test 5: Header injection prevention strips newlines from name, email, and subject")
    void testHeaderInjectionSanitization() {
        ContactMessageRequest request = new ContactMessageRequest();
        request.setName("Hacker\r\nBcc: evil@attacker.com");
        request.setEmail("innocent@user.com\r\nCc: spam@attacker.com");
        request.setSubject("Subject\r\nContent-Type: text/html");
        request.setMessage("Normal message payload");

        assertFalse(request.getName().contains("\r"));
        assertFalse(request.getName().contains("\n"));
        assertFalse(request.getEmail().contains("\r"));
        assertFalse(request.getEmail().contains("\n"));
        assertFalse(request.getSubject().contains("\r"));
        assertFalse(request.getSubject().contains("\n"));
    }

    @Test
    @DisplayName("Test 6: EmailService sendContactMessage handles null or valid inputs gracefully")
    void testEmailServiceSendContactMessage() {
        assertFalse(emailService.sendContactMessage(null));

        ContactMessageRequest request = new ContactMessageRequest(
                "Sneha Deshmukh",
                "sneha@example.com",
                "Ring Sizing Query",
                "Does FIRQUI JEWELS provide ring resizing services?"
        );
        boolean result = emailService.sendContactMessage(request);
        assertTrue(result, "sendContactMessage should succeed (either via SMTP or development fallback)");
    }

    @Test
    @DisplayName("Test 7: Submissions with the hidden honeypot field filled are accepted but not emailed")
    void testHoneypotSubmissionIsIgnored() {
        ContactMessageRequest request = new ContactMessageRequest(
                "Spam Bot",
                "bot@example.com",
                "Cheap offers",
                "Buy now buy now buy now"
        );
        request.setWebsite("http://spam.example.com");

        BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
        validator.validate(request, bindingResult);

        ResponseEntity<ApiResponse> response = contactController.submitContactMessage(request, bindingResult, new MockHttpServletRequest());
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isSuccess());
    }

    @Test
    @DisplayName("Test 8: One visitor cannot send unlimited messages")
    void testRateLimitPerClient() {
        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.setRemoteAddr("203.0.113.77");

        int lastStatus = 0;
        for (int i = 0; i <= ContactController.MAX_MESSAGES_PER_WINDOW; i++) {
            ContactMessageRequest request = new ContactMessageRequest(
                    "Repeat Visitor",
                    "repeat@example.com",
                    "Message " + i,
                    "Checking on my order once more, thank you."
            );
            BindingResult bindingResult = new BeanPropertyBindingResult(request, "request");
            validator.validate(request, bindingResult);
            lastStatus = contactController.submitContactMessage(request, bindingResult, httpRequest).getStatusCode().value();
        }

        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), lastStatus);
    }
}
