package Firqui.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    // Empty for guest orders (no account); the delivery details hold the customer's contact
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Double subtotal = 0.0;

    private Double discount = 0.0;

    @Column(name = "shipping_amount")
    private Double shippingAmount = 0.0;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount = 0.0;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus = "Pending";

    @Column(name = "order_status", nullable = false)
    private String orderStatus = "Processing";

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "shipping_full_name")
    private String shippingFullName;

    @Column(name = "shipping_phone")
    private String shippingPhone;

    @Column(name = "shipping_email")
    private String shippingEmail;

    @Column(name = "shipping_address1")
    private String shippingAddress1;

    @Column(name = "shipping_address2")
    private String shippingAddress2;

    @Column(name = "shipping_pincode")
    private String shippingPincode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "payment_screenshot_filename")
    private String paymentScreenshotFilename;

    @Column(name = "payment_submitted_at")
    private LocalDateTime paymentSubmittedAt;

    @Column(name = "payment_verified_at")
    private LocalDateTime paymentVerifiedAt;

    @Column(name = "verified_by")
    private String verifiedBy;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "confirmation_email_sent")
    private Boolean confirmationEmailSent = false;

    @Column(name = "confirmation_email_sent_at")
    private LocalDateTime confirmationEmailSentAt;

    @Column(name = "rejection_email_sent")
    private Boolean rejectionEmailSent = false;

    @Column(name = "rejection_email_sent_at")
    private LocalDateTime rejectionEmailSentAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    public Order() {
    }

    public Order(String orderNumber, User user, Double subtotal, Double discount, Double shippingAmount,
                 Double totalAmount, String paymentMethod, String paymentStatus, String orderStatus,
                 String transactionId, String shippingFullName, String shippingPhone, String shippingEmail,
                 String shippingAddress1, String shippingAddress2, String shippingPincode) {
        this.orderNumber = orderNumber;
        this.user = user;
        this.subtotal = subtotal != null ? subtotal : 0.0;
        this.discount = discount != null ? discount : 0.0;
        this.shippingAmount = shippingAmount != null ? shippingAmount : 0.0;
        this.totalAmount = totalAmount != null ? totalAmount : 0.0;
        this.paymentMethod = paymentMethod;
        this.paymentStatus = paymentStatus != null ? paymentStatus : "Pending";
        this.orderStatus = orderStatus != null ? orderStatus : "Processing";
        this.transactionId = transactionId;
        this.shippingFullName = shippingFullName;
        this.shippingPhone = shippingPhone;
        this.shippingEmail = shippingEmail;
        this.shippingAddress1 = shippingAddress1;
        this.shippingAddress2 = shippingAddress2;
        this.shippingPincode = shippingPincode;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public Double getShippingAmount() {
        return shippingAmount;
    }

    public void setShippingAmount(Double shippingAmount) {
        this.shippingAmount = shippingAmount;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public String getShippingFullName() {
        return shippingFullName;
    }

    public void setShippingFullName(String shippingFullName) {
        this.shippingFullName = shippingFullName;
    }

    public String getShippingPhone() {
        return shippingPhone;
    }

    public void setShippingPhone(String shippingPhone) {
        this.shippingPhone = shippingPhone;
    }

    public String getShippingEmail() {
        return shippingEmail;
    }

    public void setShippingEmail(String shippingEmail) {
        this.shippingEmail = shippingEmail;
    }

    public String getShippingAddress1() {
        return shippingAddress1;
    }

    public void setShippingAddress1(String shippingAddress1) {
        this.shippingAddress1 = shippingAddress1;
    }

    public String getShippingAddress2() {
        return shippingAddress2;
    }

    public void setShippingAddress2(String shippingAddress2) {
        this.shippingAddress2 = shippingAddress2;
    }

    public String getShippingPincode() {
        return shippingPincode;
    }

    public void setShippingPincode(String shippingPincode) {
        this.shippingPincode = shippingPincode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items = items;
    }

    public String getPaymentScreenshotFilename() {
        return paymentScreenshotFilename;
    }

    public void setPaymentScreenshotFilename(String paymentScreenshotFilename) {
        this.paymentScreenshotFilename = paymentScreenshotFilename;
    }

    public LocalDateTime getPaymentSubmittedAt() {
        return paymentSubmittedAt;
    }

    public void setPaymentSubmittedAt(LocalDateTime paymentSubmittedAt) {
        this.paymentSubmittedAt = paymentSubmittedAt;
    }

    public LocalDateTime getPaymentVerifiedAt() {
        return paymentVerifiedAt;
    }

    public void setPaymentVerifiedAt(LocalDateTime paymentVerifiedAt) {
        this.paymentVerifiedAt = paymentVerifiedAt;
    }

    public String getVerifiedBy() {
        return verifiedBy;
    }

    public void setVerifiedBy(String verifiedBy) {
        this.verifiedBy = verifiedBy;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public Boolean getConfirmationEmailSent() {
        return confirmationEmailSent != null ? confirmationEmailSent : false;
    }

    public void setConfirmationEmailSent(Boolean confirmationEmailSent) {
        this.confirmationEmailSent = confirmationEmailSent;
    }

    public LocalDateTime getConfirmationEmailSentAt() {
        return confirmationEmailSentAt;
    }

    public void setConfirmationEmailSentAt(LocalDateTime confirmationEmailSentAt) {
        this.confirmationEmailSentAt = confirmationEmailSentAt;
    }

    public Boolean getRejectionEmailSent() {
        return rejectionEmailSent != null ? rejectionEmailSent : false;
    }

    public void setRejectionEmailSent(Boolean rejectionEmailSent) {
        this.rejectionEmailSent = rejectionEmailSent;
    }

    public LocalDateTime getRejectionEmailSentAt() {
        return rejectionEmailSentAt;
    }

    public void setRejectionEmailSentAt(LocalDateTime rejectionEmailSentAt) {
        this.rejectionEmailSentAt = rejectionEmailSentAt;
    }
}
