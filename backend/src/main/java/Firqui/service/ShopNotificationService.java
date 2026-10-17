package Firqui.service;

import Firqui.entity.CancellationRequest;
import Firqui.entity.Order;
import Firqui.entity.OrderItem;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.task.TaskExecutor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Emails the shop (app.contact.admin-email, i.e. info@firquijewels.com) when something needs attention:
 * a new order, a payment to verify, or a cancellation request.
 *
 * The message is built straight away (while the order and its items are loaded) but only sent after
 * the surrounding transaction commits, on a background thread, so checkout never waits on the mail
 * server and a mail outage can never roll back an order.
 */
@Service
public class ShopNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(ShopNotificationService.class);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired(required = false)
    private TaskExecutor taskExecutor;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.contact.admin-email:info@firquijewels.com}")
    private String shopEmail;

    @Value("${app.frontend.url:http://localhost:5500}")
    private String frontendUrl;

    /* =====================================================
       PUBLIC EVENTS
    ===================================================== */

    public void orderPlaced(Order order) {
        if (order == null) return;
        boolean awaitingPayment = order.getTransactionId() != null && !order.getTransactionId().isBlank();
        String headline = awaitingPayment ? "New order - payment to verify" : "New order received";
        send("New order #" + order.getOrderNumber() + " - " + rupees(order.getTotalAmount()),
                headline, order, awaitingPayment
                        ? "The customer has submitted a UPI payment. Check the screenshot and transaction ID, then verify or reject the payment in the admin panel."
                        : "A new order has been placed.");
    }

    public void paymentSubmitted(Order order) {
        if (order == null) return;
        send("Payment submitted for order #" + order.getOrderNumber(),
                "Payment to verify", order,
                "The customer has submitted UPI payment details for this order. Check the screenshot and transaction ID, then verify or reject the payment in the admin panel.");
    }

    public void cancellationRequested(CancellationRequest request) {
        if (request == null || request.getOrder() == null) return;
        String note = "Reason: " + safe(request.getReason())
                + (request.getAdditionalDetails() != null && !request.getAdditionalDetails().isBlank()
                    ? "\nDetails: " + request.getAdditionalDetails().trim() : "")
                + "\n\nApprove or reject it under Cancellation Requests in the admin panel.";
        send("Cancellation requested for order #" + request.getOrder().getOrderNumber(),
                "Cancellation request", request.getOrder(), note);
    }

    /* =====================================================
       MESSAGE
    ===================================================== */

    private void send(String subject, String headline, Order order, String note) {
        String adminLink = frontendUrl.replaceAll("/+$", "") + "/admin/order-details.html?id=" + order.getOrderNumber();
        String text = buildText(headline, order, note, adminLink);
        String html = buildHtml(headline, order, note, adminLink);
        String replyTo = order.getShippingEmail() != null && !order.getShippingEmail().isBlank()
                ? order.getShippingEmail().trim()
                : (order.getUser() != null ? order.getUser().getEmail() : null);

        Runnable dispatch = () -> deliver(subject, text, html, replyTo);
        Runnable inBackground = () -> {
            if (taskExecutor != null) taskExecutor.execute(dispatch);
            else dispatch.run();
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    inBackground.run();
                }
            });
        } else {
            inBackground.run();
        }
    }

    private void deliver(String subject, String text, String html, String replyTo) {
        boolean configured = mailSender != null
                && mailFrom != null && !mailFrom.isBlank()
                && mailPassword != null && !mailPassword.isBlank()
                && !mailPassword.trim().startsWith("YOUR_");
        if (!configured) {
            logger.warn("Shop notification NOT sent (SMTP not configured): {}", subject);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(shopEmail.trim());
            helper.setFrom(mailFrom.trim(), "FIRQUI JEWELS Website");
            if (replyTo != null && !replyTo.isBlank()) helper.setReplyTo(replyTo.trim());
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.send(message);
            logger.info("Shop notification sent to {}: {}", shopEmail, subject);
        } catch (Exception e) {
            logger.error("Shop notification FAILED ({}): {}", subject, e.getMessage());
        }
    }

    private String buildText(String headline, Order order, String note, String adminLink) {
        StringBuilder sb = new StringBuilder();
        sb.append("FIRQUI JEWELS - ").append(headline).append("\n\n");
        sb.append(note).append("\n\n");
        sb.append("Order: #").append(order.getOrderNumber()).append("\n");
        sb.append("Placed: ").append(when(order.getCreatedAt())).append("\n");
        sb.append("Status: ").append(safe(order.getOrderStatus())).append(" / payment ").append(safe(order.getPaymentStatus())).append("\n");
        sb.append("Payment method: ").append(safe(order.getPaymentMethod())).append("\n");
        if (order.getTransactionId() != null && !order.getTransactionId().isBlank()) {
            sb.append("UPI transaction ID: ").append(order.getTransactionId()).append("\n");
        }
        sb.append("\nItems\n");
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                sb.append("- ").append(safe(item.getProductName()));
                if (item.getSelectedSize() != null && !item.getSelectedSize().isBlank()) sb.append(" (").append(item.getSelectedSize()).append(")");
                sb.append(" x").append(item.getQuantity() != null ? item.getQuantity() : 1)
                  .append("  ").append(rupees(item.getSubtotal())).append("\n");
            }
        }
        sb.append("Total: ").append(rupees(order.getTotalAmount())).append("\n\n");
        sb.append("Customer\n");
        sb.append(safe(order.getShippingFullName())).append("\n");
        sb.append(safe(order.getShippingPhone())).append("\n");
        sb.append(safe(order.getShippingEmail())).append("\n");
        sb.append(address(order, "\n")).append("\n\n");
        sb.append("Open in admin: ").append(adminLink).append("\n");
        return sb.toString();
    }

    private String buildHtml(String headline, Order order, String note, String adminLink) {
        StringBuilder rows = new StringBuilder();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                String size = item.getSelectedSize() != null && !item.getSelectedSize().isBlank()
                        ? "<br><span style=\"color:#7B6B69;font-size:12px;\">" + esc(item.getSelectedSize()) + "</span>" : "";
                rows.append("<tr>")
                    .append("<td style=\"padding:8px 0;border-bottom:1px solid #EFE6DC;\">").append(esc(item.getProductName())).append(size).append("</td>")
                    .append("<td style=\"padding:8px 0;border-bottom:1px solid #EFE6DC;text-align:center;\">").append(item.getQuantity() != null ? item.getQuantity() : 1).append("</td>")
                    .append("<td style=\"padding:8px 0;border-bottom:1px solid #EFE6DC;text-align:right;\">").append(esc(rupees(item.getSubtotal()))).append("</td>")
                    .append("</tr>");
            }
        }
        String txn = order.getTransactionId() != null && !order.getTransactionId().isBlank()
                ? row("UPI transaction ID", order.getTransactionId()) : "";

        return "<!DOCTYPE html><html><body style=\"margin:0;padding:24px 12px;background:#FAF5EE;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#2C2C2C;\">"
                + "<table role=\"presentation\" width=\"100%\" style=\"max-width:620px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E7DCCF;\">"
                + "<tr><td style=\"background:#0A373B;padding:22px 26px;\">"
                + "<div style=\"color:#EC9E96;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;\">FIRQUI JEWELS</div>"
                + "<div style=\"color:#FAF5EE;font-size:22px;font-weight:700;margin-top:6px;\">" + esc(headline) + "</div>"
                + "<div style=\"color:#FAF5EE;opacity:.85;margin-top:4px;\">Order #" + esc(order.getOrderNumber()) + " &middot; " + esc(rupees(order.getTotalAmount())) + "</div>"
                + "</td></tr>"
                + "<tr><td style=\"padding:22px 26px;\">"
                + "<p style=\"margin:0 0 18px;line-height:1.55;\">" + esc(note).replace("\n", "<br>") + "</p>"
                + "<table width=\"100%\" style=\"font-size:14px;margin-bottom:18px;\">"
                + row("Placed", when(order.getCreatedAt()))
                + row("Status", safe(order.getOrderStatus()) + " / payment " + safe(order.getPaymentStatus()))
                + row("Payment method", safe(order.getPaymentMethod()))
                + txn
                + "</table>"
                + "<table width=\"100%\" style=\"font-size:14px;border-collapse:collapse;\">"
                + "<tr><th align=\"left\" style=\"padding-bottom:6px;color:#7B6B69;font-weight:600;\">Item</th><th style=\"padding-bottom:6px;color:#7B6B69;font-weight:600;\">Qty</th><th align=\"right\" style=\"padding-bottom:6px;color:#7B6B69;font-weight:600;\">Amount</th></tr>"
                + rows
                + "<tr><td colspan=\"2\" style=\"padding-top:10px;font-weight:700;\">Total</td><td style=\"padding-top:10px;text-align:right;font-weight:700;\">" + esc(rupees(order.getTotalAmount())) + "</td></tr>"
                + "</table>"
                + "<h3 style=\"margin:24px 0 8px;font-size:14px;color:#0A373B;text-transform:uppercase;letter-spacing:1px;\">Customer</h3>"
                + "<p style=\"margin:0;line-height:1.6;\">" + esc(safe(order.getShippingFullName())) + "<br>"
                + esc(safe(order.getShippingPhone())) + "<br>" + esc(safe(order.getShippingEmail())) + "<br>"
                + esc(address(order, ", ")) + "</p>"
                + "<p style=\"margin:26px 0 4px;\"><a href=\"" + esc(adminLink) + "\" style=\"display:inline-block;background:#0A373B;color:#FAF5EE;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;\">Open order in admin</a></p>"
                + "</td></tr></table></body></html>";
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    private static String row(String label, String value) {
        return "<tr><td style=\"padding:3px 0;color:#7B6B69;width:150px;\">" + esc(label) + "</td><td style=\"padding:3px 0;\">" + esc(value) + "</td></tr>";
    }

    private static String address(Order order, String sep) {
        StringBuilder sb = new StringBuilder(safe(order.getShippingAddress1()));
        if (order.getShippingAddress2() != null && !order.getShippingAddress2().isBlank()) sb.append(sep).append(order.getShippingAddress2().trim());
        if (order.getShippingPincode() != null && !order.getShippingPincode().isBlank()) sb.append(sep).append(order.getShippingPincode().trim());
        return sb.toString();
    }

    private static String rupees(Double amount) {
        return "Rs. " + String.format(Locale.ENGLISH, "%,.0f", amount != null ? amount : 0.0);
    }

    private static String when(LocalDateTime time) {
        return time != null ? time.format(WHEN) : "-";
    }

    private static String safe(String s) {
        return s != null && !s.isBlank() ? s.trim() : "-";
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
