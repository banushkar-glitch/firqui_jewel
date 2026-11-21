package Firqui.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "refunds", indexes = {
        @Index(name = "idx_refunds_order_id", columnList = "order_id"),
        @Index(name = "idx_refunds_razorpay_payment_id", columnList = "razorpay_payment_id"),
        @Index(name = "idx_refunds_razorpay_refund_id", columnList = "razorpay_refund_id")
})
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "order_number", nullable = false)
    private String orderNumber;

    @Column(name = "razorpay_payment_id", nullable = false)
    private String razorpayPaymentId;

    @Column(name = "razorpay_refund_id", length = 100)
    private String razorpayRefundId;

    @Column(name = "amount", nullable = false)
    private Double amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency = "INR";

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "status", nullable = false, length = 30)
    private String status; // "PROCESSED", "PENDING", "FAILED"

    @Column(name = "initiated_at", nullable = false)
    private LocalDateTime initiatedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "initiated_by", length = 100)
    private String initiatedBy; // "AUTO_CUSTOMER_CANCELLATION", admin email, or "ADMIN"

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    public Refund() {
    }

    public Refund(Order order, String orderNumber, String razorpayPaymentId, String razorpayRefundId,
                  Double amount, String currency, String reason, String status, String initiatedBy) {
        this.order = order;
        this.orderNumber = orderNumber;
        this.razorpayPaymentId = razorpayPaymentId;
        this.razorpayRefundId = razorpayRefundId;
        this.amount = amount;
        this.currency = currency != null ? currency : "INR";
        this.reason = reason;
        this.status = status;
        this.initiatedBy = initiatedBy;
        this.initiatedAt = LocalDateTime.now();
        if ("PROCESSED".equalsIgnoreCase(status)) {
            this.processedAt = LocalDateTime.now();
        }
    }

    @PrePersist
    protected void onCreate() {
        if (this.initiatedAt == null) {
            this.initiatedAt = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public String getRazorpayRefundId() {
        return razorpayRefundId;
    }

    public void setRazorpayRefundId(String razorpayRefundId) {
        this.razorpayRefundId = razorpayRefundId;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getInitiatedAt() {
        return initiatedAt;
    }

    public void setInitiatedAt(LocalDateTime initiatedAt) {
        this.initiatedAt = initiatedAt;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(LocalDateTime processedAt) {
        this.processedAt = processedAt;
    }

    public String getInitiatedBy() {
        return initiatedBy;
    }

    public void setInitiatedBy(String initiatedBy) {
        this.initiatedBy = initiatedBy;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
