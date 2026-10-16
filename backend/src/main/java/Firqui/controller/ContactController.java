package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.ContactMessageRequest;
import Firqui.service.EmailService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ContactController {

    private static final Logger logger = LoggerFactory.getLogger(ContactController.class);

    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<ApiResponse> submitContactMessage(
            @Valid @RequestBody ContactMessageRequest request,
            BindingResult bindingResult
    ) {
        if (bindingResult.hasErrors()) {
            String errorMessage = bindingResult.getAllErrors().get(0).getDefaultMessage();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(errorMessage != null ? errorMessage : "Invalid contact form data."));
        }

        try {
            boolean sent = emailService.sendContactMessage(request);
            if (sent) {
                return ResponseEntity.ok(ApiResponse.ok("Thank you! Your message has been received. We will get back to you shortly."));
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
}
