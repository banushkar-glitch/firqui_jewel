package Firqui.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        boolean sent = false;

        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(toEmail);
                message.setSubject("FIRQUI JEWELS - Password Reset Request");
                message.setText(
                        "Hello,\n\n" +
                        "We received a request to reset your FIRQUI JEWELS account password.\n\n" +
                        "Please click the link below to set a new password:\n" +
                        resetLink + "\n\n" +
                        "This link will expire in 30 minutes.\n" +
                        "If you did not request this, please disregard this email.\n\n" +
                        "Best regards,\n" +
                        "FIRQUI JEWELS Team"
                );

                mailSender.send(message);
                logger.info("Password reset email sent to {}", toEmail);
                sent = true;
            } catch (Exception e) {
                logger.warn("SMTP email dispatch failed: {}. Falling back to console logging for development.", e.getMessage());
            }
        }

        // DEVELOPMENT-ONLY fallback when SMTP is not configured or during local testing
        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [DEVELOPMENT-ONLY EMAIL SERVICE FALLBACK]");
            System.out.println(">>> To: " + toEmail);
            System.out.println(">>> Subject: FIRQUI JEWELS - Password Reset Request");
            System.out.println(">>> Password Reset Link:");
            System.out.println(">>> " + resetLink);
            System.out.println(">>> (Configure spring.mail properties in application.properties for production SMTP)");
            System.out.println("================================================================================");
            System.out.println();
        }
    }

    public boolean sendOrderConfirmationEmail(Firqui.entity.Order order) {
        if (order == null) return false;

        String recipientEmail = order.getUser() != null && order.getUser().getEmail() != null && !order.getUser().getEmail().trim().isEmpty()
                ? order.getUser().getEmail().trim()
                : (order.getShippingEmail() != null && !order.getShippingEmail().trim().isEmpty() ? order.getShippingEmail().trim() : null);

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("No recipient email found for order #{}", order.getOrderNumber());
            return false;
        }

        String customerName = order.getUser() != null && order.getUser().getName() != null && !order.getUser().getName().trim().isEmpty()
                ? order.getUser().getName().trim()
                : (order.getShippingFullName() != null && !order.getShippingFullName().trim().isEmpty()
                    ? order.getShippingFullName().trim()
                    : "Customer");

        String orderDateStr = order.getCreatedAt() != null
                ? order.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"))
                : "Today";

        StringBuilder productsBuilder = new StringBuilder();
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            for (int i = 0; i < order.getItems().size(); i++) {
                Firqui.entity.OrderItem item = order.getItems().get(i);
                if (i > 0) productsBuilder.append(", ");
                productsBuilder.append(item.getProductName() != null ? item.getProductName() : "Jewellery");
                if (item.getSelectedSize() != null && !item.getSelectedSize().trim().isEmpty()) {
                    productsBuilder.append(" (Size: ").append(item.getSelectedSize().trim()).append(")");
                }
                productsBuilder.append(" x ").append(item.getQuantity() != null ? item.getQuantity() : 1);
            }
        } else {
            productsBuilder.append("FIRQUI Jewellery Items");
        }

        String totalStr = String.valueOf(Math.round(order.getTotalAmount() != null ? order.getTotalAmount() : 0.0));

        String subject = "Your FIRQUI JEWELS Order Is Confirmed!";

        String body = "Dear " + customerName + ",\n\n" +
                "Thank you for shopping with FIRQUI JEWELS!\n\n" +
                "Your payment has been verified successfully, and your order has been confirmed.\n\n" +
                "Order Number: " + order.getOrderNumber() + "\n\n" +
                "Order Date: " + orderDateStr + "\n\n" +
                "Order Items: " + productsBuilder.toString() + "\n\n" +
                "Total Amount: ₹" + totalStr + "\n\n" +
                "Estimated Delivery: Within 4–6 days, depending on your delivery location and shipping conditions.\n\n" +
                "We appreciate your trust in FIRQUI JEWELS and hope you love your jewellery!\n\n" +
                "Warm regards,\n" +
                "FIRQUI JEWELS Team";

        boolean sent = false;

        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);

                mailSender.send(message);
                logger.info("Order confirmation email sent via SMTP to {} for order #{}", recipientEmail, order.getOrderNumber());
                sent = true;
            } catch (Exception e) {
                logger.warn("SMTP email dispatch failed for order #{}: {}. Falling back to console logging for development.", order.getOrderNumber(), e.getMessage());
            }
        }

        // DEVELOPMENT-ONLY fallback when SMTP is not configured or during local testing
        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [DEVELOPMENT-ONLY EMAIL SERVICE FALLBACK]");
            System.out.println(">>> To: " + recipientEmail);
            System.out.println(">>> Subject: " + subject);
            System.out.println(">>> Content:\n" + body);
            System.out.println(">>> (Configure spring.mail properties in application.properties for production SMTP)");
            System.out.println("================================================================================");
            System.out.println();
            sent = true;
        }

        return sent;
    }

    public boolean sendPaymentRejectionEmail(Firqui.entity.Order order, String rejectionReason) {
        if (order == null) return false;

        String recipientEmail = order.getUser() != null && order.getUser().getEmail() != null && !order.getUser().getEmail().trim().isEmpty()
                ? order.getUser().getEmail().trim()
                : (order.getShippingEmail() != null && !order.getShippingEmail().trim().isEmpty() ? order.getShippingEmail().trim() : null);

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("No recipient email found for order #{}", order.getOrderNumber());
            return false;
        }

        String customerName = order.getUser() != null && order.getUser().getName() != null && !order.getUser().getName().trim().isEmpty()
                ? order.getUser().getName().trim()
                : (order.getShippingFullName() != null && !order.getShippingFullName().trim().isEmpty()
                    ? order.getShippingFullName().trim()
                    : "Customer");

        String reason = (rejectionReason != null && !rejectionReason.trim().isEmpty())
                ? rejectionReason.trim()
                : "Payment could not be verified in UPI / Bank records.";

        String subject = "Update Regarding Your FIRQUI JEWELS Payment";

        String body = "Dear " + customerName + ",\n\n" +
                "We were unable to verify the payment associated with your FIRQUI JEWELS order.\n\n" +
                "Order Number: " + order.getOrderNumber() + "\n\n" +
                "Payment Status: REJECTED\n\n" +
                "Reason: " + reason + "\n\n" +
                "Please review your payment details and contact our support team to resolve this issue or place a new order.\n\n" +
                "Warm regards,\n" +
                "FIRQUI JEWELS Team";

        boolean sent = false;

        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);

                mailSender.send(message);
                logger.info("Payment rejection email sent via SMTP to {} for order #{}", recipientEmail, order.getOrderNumber());
                sent = true;
            } catch (Exception e) {
                logger.warn("SMTP email dispatch failed for order #{}: {}. Falling back to console logging for development.", order.getOrderNumber(), e.getMessage());
            }
        }

        // DEVELOPMENT-ONLY fallback when SMTP is not configured or during local testing
        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [DEVELOPMENT-ONLY EMAIL SERVICE FALLBACK]");
            System.out.println(">>> To: " + recipientEmail);
            System.out.println(">>> Subject: " + subject);
            System.out.println(">>> Content:\n" + body);
            System.out.println(">>> (Configure spring.mail properties in application.properties for production SMTP)");
            System.out.println("================================================================================");
            System.out.println();
            sent = true;
        }

        return sent;
    }

    public boolean sendCancellationApprovedEmail(Firqui.entity.Order order, Firqui.entity.CancellationRequest request) {
        if (order == null) return false;

        String recipientEmail = order.getUser() != null && order.getUser().getEmail() != null && !order.getUser().getEmail().trim().isEmpty()
                ? order.getUser().getEmail().trim()
                : (order.getShippingEmail() != null && !order.getShippingEmail().trim().isEmpty() ? order.getShippingEmail().trim() : null);

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("No recipient email found for cancellation email on order #{}", order.getOrderNumber());
            return false;
        }

        String customerName = order.getUser() != null && order.getUser().getName() != null && !order.getUser().getName().trim().isEmpty()
                ? order.getUser().getName().trim()
                : (order.getShippingFullName() != null && !order.getShippingFullName().trim().isEmpty()
                    ? order.getShippingFullName().trim()
                    : "Customer");

        String refundNote = "";
        if (request != null && "PENDING_REFUND".equalsIgnoreCase(request.getRefundStatus())) {
            refundNote = "\nRefund Status: Initiated / Processing via UPI. Our team will verify and complete your refund within 2-3 business days.\n";
        }

        String subject = "FIRQUI JEWELS - Order Cancellation Approved (#" + order.getOrderNumber() + ")";
        String body = "Dear " + customerName + ",\n\n" +
                "Your cancellation request for FIRQUI JEWELS Order #" + order.getOrderNumber() + " has been approved.\n\n" +
                "Order Status: CANCELLED\n" +
                "Reason: " + (request != null ? request.getReason() : "Customer Request") + "\n" +
                refundNote + "\n" +
                "If you have any questions or require further assistance, please contact us at info@firquijewels.com or +91 9975522067.\n\n" +
                "Warm regards,\n" +
                "FIRQUI JEWELS Team";

        boolean sent = false;
        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                logger.info("Cancellation approval email sent via SMTP to {} for order #{}", recipientEmail, order.getOrderNumber());
                sent = true;
            } catch (Exception e) {
                logger.warn("SMTP email dispatch failed for cancellation approval #{}: {}. Falling back to console logging.", order.getOrderNumber(), e.getMessage());
            }
        }

        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [DEVELOPMENT-ONLY EMAIL SERVICE FALLBACK]");
            System.out.println(">>> To: " + recipientEmail);
            System.out.println(">>> Subject: " + subject);
            System.out.println(">>> Content:\n" + body);
            System.out.println("================================================================================");
            System.out.println();
            sent = true;
        }

        return sent;
    }

    public boolean sendCancellationRejectedEmail(Firqui.entity.Order order, Firqui.entity.CancellationRequest request, String rejectionReason) {
        if (order == null) return false;

        String recipientEmail = order.getUser() != null && order.getUser().getEmail() != null && !order.getUser().getEmail().trim().isEmpty()
                ? order.getUser().getEmail().trim()
                : (order.getShippingEmail() != null && !order.getShippingEmail().trim().isEmpty() ? order.getShippingEmail().trim() : null);

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            logger.warn("No recipient email found for cancellation rejection email on order #{}", order.getOrderNumber());
            return false;
        }

        String customerName = order.getUser() != null && order.getUser().getName() != null && !order.getUser().getName().trim().isEmpty()
                ? order.getUser().getName().trim()
                : (order.getShippingFullName() != null && !order.getShippingFullName().trim().isEmpty()
                    ? order.getShippingFullName().trim()
                    : "Customer");

        String reason = (rejectionReason != null && !rejectionReason.trim().isEmpty())
                ? rejectionReason.trim()
                : (request != null && request.getAdminNotes() != null ? request.getAdminNotes().trim() : "Unable to process cancellation at this stage.");

        String subject = "FIRQUI JEWELS - Update on Cancellation Request (#" + order.getOrderNumber() + ")";
        String body = "Dear " + customerName + ",\n\n" +
                "We have reviewed your cancellation request for Order #" + order.getOrderNumber() + ".\n\n" +
                "Cancellation Status: REJECTED\n" +
                "Current Order Status: " + order.getOrderStatus() + "\n" +
                "Reason: " + reason + "\n\n" +
                "Your order will continue processing for dispatch. If you have any questions, feel free to reach out to our support team.\n\n" +
                "Warm regards,\n" +
                "FIRQUI JEWELS Team";

        boolean sent = false;
        if (mailSender != null && mailFrom != null && !mailFrom.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailFrom);
                message.setTo(recipientEmail);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                logger.info("Cancellation rejection email sent via SMTP to {} for order #{}", recipientEmail, order.getOrderNumber());
                sent = true;
            } catch (Exception e) {
                logger.warn("SMTP email dispatch failed for cancellation rejection #{}: {}. Falling back to console logging.", order.getOrderNumber(), e.getMessage());
            }
        }

        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [DEVELOPMENT-ONLY EMAIL SERVICE FALLBACK]");
            System.out.println(">>> To: " + recipientEmail);
            System.out.println(">>> Subject: " + subject);
            System.out.println(">>> Content:\n" + body);
            System.out.println("================================================================================");
            System.out.println();
            sent = true;
        }

        return sent;
    }
}
