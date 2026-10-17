package Firqui.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.allow-dev-fallback:false}")
    private boolean allowDevFallback;

    @Value("${app.contact.admin-email:info@firquijewels.com}")
    private String adminContactEmail;

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

    public boolean sendContactMessage(Firqui.dto.ContactMessageRequest request) {
        if (request == null) return false;

        String customerName = request.getName() != null ? request.getName().trim() : "Customer";
        String customerEmail = request.getEmail() != null ? request.getEmail().trim() : "";
        String customerPhone = request.getPhone() != null && !request.getPhone().trim().isEmpty() ? request.getPhone().trim() : "Not provided";
        String customerSubject = request.getSubject() != null ? request.getSubject().trim() : "General Inquiry";
        String customerMessage = request.getMessage() != null ? request.getMessage().trim() : "";

        String submissionTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm a"));

        String subject = "New Contact Message: " + customerSubject + " – FIRQUI JEWELS";
        String targetRecipient = (adminContactEmail != null && !adminContactEmail.trim().isEmpty())
                ? adminContactEmail.trim()
                : "info@firquijewels.com";

        // Plain text version
        String plainTextBody =
                "FIRQUI JEWELS\n" +
                "New Website Contact Message\n\n" +
                "Customer Details\n" +
                "--------------------------------------------------\n" +
                "Name: " + customerName + "\n" +
                "Email: " + customerEmail + "\n" +
                "Phone: " + customerPhone + "\n" +
                "Subject: " + customerSubject + "\n" +
                "Date and time: " + submissionTime + "\n\n" +
                "Customer Message\n" +
                "--------------------------------------------------\n" +
                customerMessage + "\n\n" +
                "--------------------------------------------------\n" +
                "This message was submitted through the Contact Us page on the FIRQUI JEWELS website.\n" +
                "Click Reply to respond directly to " + customerName + " (" + customerEmail + ").\n";

        // HTML version
        String safeName = escapeHtml(customerName);
        String safeEmail = escapeHtml(customerEmail);
        String safePhone = escapeHtml(customerPhone);
        String safeSubject = escapeHtml(customerSubject);
        String safeMessage = escapeHtml(customerMessage).replace("\n", "<br>");
        String safeTime = escapeHtml(submissionTime);

        String htmlBody =
                "<!DOCTYPE html>" +
                "<html>" +
                "<head><meta charset=\"UTF-8\"><title>New Contact Message – FIRQUI JEWELS</title></head>" +
                "<body style=\"margin:0; padding:0; background-color:#FAF5EE; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#2C2C2C;\">" +
                "  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"background-color:#FAF5EE; padding:30px 15px;\">" +
                "    <tr>" +
                "      <td align=\"center\">" +
                "        <table role=\"presentation\" width=\"100%\" max-width=\"620\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"max-width:620px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 6px 20px rgba(10,55,59,0.08); border:1px solid rgba(10,55,59,0.12);\">" +
                "          <!-- HEADER -->" +
                "          <tr>" +
                "            <td style=\"background-color:#0A373B; padding:32px 30px; text-align:center;\">" +
                "              <h1 style=\"margin:0; font-size:26px; font-weight:700; color:#FAF5EE; letter-spacing:2px; text-transform:uppercase;\">FIRQUI JEWELS</h1>" +
                "              <p style=\"margin:8px 0 0; font-size:14px; color:#EC9E96; letter-spacing:1px; text-transform:uppercase; font-weight:600;\">New Website Contact Message</p>" +
                "            </td>" +
                "          </tr>" +
                "          <!-- BODY -->" +
                "          <tr>" +
                "            <td style=\"padding:32px 30px;\">" +
                "              <h2 style=\"margin:0 0 16px; font-size:16px; color:#0A373B; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #EC9E96; padding-bottom:8px;\">Customer Details</h2>" +
                "              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin-bottom:26px;\">" +
                "                <tr>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#7B6B69; width:110px;\">Name:</td>" +
                "                  <td style=\"padding:8px 0; font-size:15px; color:#0A373B; font-weight:600;\">" + safeName + "</td>" +
                "                </tr>" +
                "                <tr>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#7B6B69;\">Email:</td>" +
                "                  <td style=\"padding:8px 0; font-size:15px; color:#0A373B; font-weight:600;\"><a href=\"mailto:" + safeEmail + "\" style=\"color:#0A373B; text-decoration:none;\">" + safeEmail + "</a></td>" +
                "                </tr>" +
                "                <tr>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#7B6B69;\">Phone:</td>" +
                "                  <td style=\"padding:8px 0; font-size:15px; color:#0A373B; font-weight:600;\">" + safePhone + "</td>" +
                "                </tr>" +
                "                <tr>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#7B6B69;\">Subject:</td>" +
                "                  <td style=\"padding:8px 0; font-size:15px; color:#0A373B; font-weight:600;\">" + safeSubject + "</td>" +
                "                </tr>" +
                "                <tr>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#7B6B69;\">Date & Time:</td>" +
                "                  <td style=\"padding:8px 0; font-size:14px; color:#555555;\">" + safeTime + "</td>" +
                "                </tr>" +
                "              </table>" +
                "              <h2 style=\"margin:0 0 12px; font-size:16px; color:#0A373B; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #EC9E96; padding-bottom:8px;\">Customer Message</h2>" +
                "              <div style=\"background-color:#FAF5EE; border-left:4px solid #EC9E96; border-radius:6px; padding:18px 20px; font-size:15px; line-height:1.65; color:#2C2C2C;\">" +
                "                " + safeMessage +
                "              </div>" +
                "            </td>" +
                "          </tr>" +
                "          <!-- FOOTER -->" +
                "          <tr>" +
                "            <td style=\"background-color:#0A373B; padding:22px 30px; text-align:center; color:#FAF5EE; font-size:13px; line-height:1.6;\">" +
                "              <p style=\"margin:0;\">This message was submitted through the Contact Us page on the <strong>FIRQUI JEWELS</strong> website.</p>" +
                "              <p style=\"margin:6px 0 0; color:#EC9E96;\">To reply to the customer, simply click <strong>Reply</strong> in your email client.</p>" +
                "            </td>" +
                "          </tr>" +
                "        </table>" +
                "      </td>" +
                "    </tr>" +
                "  </table>" +
                "</body>" +
                "</html>";

        boolean sent = false;

        boolean isConfigured = mailSender != null
                && mailFrom != null && !mailFrom.trim().isEmpty()
                && mailPassword != null && !mailPassword.trim().isEmpty()
                && !mailPassword.trim().startsWith("YOUR_");

        if (isConfigured) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setTo(targetRecipient);
                helper.setSubject(subject);

                String from = mailFrom.trim();
                try {
                    helper.setFrom(from, "FIRQUI JEWELS Contact Form");
                } catch (Exception ex) {
                    helper.setFrom(from);
                }

                try {
                    helper.setReplyTo(customerEmail, customerName);
                } catch (Exception ex) {
                    helper.setReplyTo(customerEmail);
                }

                helper.setText(plainTextBody, htmlBody);
                mailSender.send(mimeMessage);
                logger.info("Contact form email sent via SMTP to {} from customer {}", targetRecipient, customerEmail);
                sent = true;
            } catch (Exception e) {
                logger.error("SMTP email dispatch failed for contact form to {}: {}", targetRecipient, e.getMessage(), e);
            }
        } else {
            logger.warn("SMTP email credentials are not fully configured in application.properties (spring.mail.password is missing or placeholder). Email was not dispatched to {}", targetRecipient);
        }

        // DEVELOPMENT-ONLY fallback when SMTP is not configured or during local testing
        if (!sent) {
            System.out.println();
            System.out.println("================================================================================");
            System.out.println(">>> [EMAIL SERVICE NOTICE: LIVE EMAIL NOT DISPATCHED]");
            System.out.println(">>> Target Recipient: " + targetRecipient);
            System.out.println(">>> Subject: " + subject);
            System.out.println(">>> Reply-To: " + customerName + " <" + customerEmail + ">");
            System.out.println(">>> Status: " + (!isConfigured ? "SMTP password is placeholder/empty in application.properties" : "SMTP connection failed"));
            System.out.println(">>> Plain-text Body:\n" + plainTextBody);
            System.out.println(">>> (Configure spring.mail properties in application.properties or environment variables for live SMTP)");
            System.out.println("================================================================================");
            System.out.println();
            if (!isConfigured && allowDevFallback) {
                sent = true;
            }
        }

        return sent;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}
