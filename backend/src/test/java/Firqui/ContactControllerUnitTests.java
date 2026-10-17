package Firqui;

import Firqui.controller.ContactController;
import Firqui.dto.ApiResponse;
import Firqui.dto.ContactMessageRequest;
import Firqui.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.validation.BeanPropertyBindingResult;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Contact form controller without a Spring context or database, so it runs anywhere.
 */
public class ContactControllerUnitTests {

    private ContactController controller;
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        controller = new ContactController();
        emailService = mock(EmailService.class);
        ReflectionTestUtils.setField(controller, "emailService", emailService);
    }

    private ResponseEntity<ApiResponse> submit(ContactMessageRequest request, String ip) {
        MockHttpServletRequest http = new MockHttpServletRequest();
        http.setRemoteAddr(ip);
        return controller.submitContactMessage(request, new BeanPropertyBindingResult(request, "request"), http);
    }

    private ContactMessageRequest validRequest() {
        return new ContactMessageRequest("Ananya Sharma", "ananya@example.com", "Ring sizing",
                "Could you tell me which ring sizes are available?");
    }

    @Test
    @DisplayName("A delivered email returns 200")
    void deliveredEmailReturnsOk() {
        when(emailService.sendContactMessage(any())).thenReturn(true);

        ResponseEntity<ApiResponse> response = submit(validRequest(), "198.51.100.1");

        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().isSuccess());
        verify(emailService).sendContactMessage(any());
    }

    @Test
    @DisplayName("An email that could not be sent is reported as an error, not as success")
    void undeliveredEmailReturnsError() {
        when(emailService.sendContactMessage(any())).thenReturn(false);

        ResponseEntity<ApiResponse> response = submit(validRequest(), "198.51.100.2");

        assertEquals(500, response.getStatusCode().value());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    @DisplayName("A filled honeypot field is answered with success but never emailed")
    void honeypotIsNotEmailed() {
        ContactMessageRequest request = validRequest();
        request.setWebsite("http://spam.example.com");

        ResponseEntity<ApiResponse> response = submit(request, "198.51.100.3");

        assertEquals(200, response.getStatusCode().value());
        verify(emailService, never()).sendContactMessage(any());
    }

    @Test
    @DisplayName("Each visitor is limited, other visitors are unaffected")
    void rateLimitIsPerVisitor() {
        when(emailService.sendContactMessage(any())).thenReturn(true);

        for (int i = 0; i < ContactController.MAX_MESSAGES_PER_WINDOW; i++) {
            assertEquals(200, submit(validRequest(), "198.51.100.4").getStatusCode().value());
        }
        assertEquals(429, submit(validRequest(), "198.51.100.4").getStatusCode().value());
        assertEquals(200, submit(validRequest(), "198.51.100.5").getStatusCode().value());
        verify(emailService, times(ContactController.MAX_MESSAGES_PER_WINDOW + 1)).sendContactMessage(any());
    }
}
