package Firqui.dto;

import Firqui.entity.CancellationRequest;
import Firqui.entity.Order;
import Firqui.entity.OrderItem;
import Firqui.entity.User;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class CancellationResponseDTO {

    private Long id;
    private String orderNumber;
    private Long orderId;

    private String customerName;
    private String customerEmail;
    private String customerPhone;

    private List<ProductSummary> products = new ArrayList<>();
    private Double orderAmount = 0.0;
    private String formattedOrderAmount;
    private String paymentStatus;
    private String paymentMethod;
    private String orderStatus;

    private String reason;
    private String additionalDetails;
    private String status; // PENDING, APPROVED, REJECTED
    private String refundStatus; // NOT_APPLICABLE, PENDING_REFUND, REFUNDED
    private String adminNotes;

    private LocalDateTime createdAt;
    private String formattedCreatedAt;
    private LocalDateTime reviewedAt;
    private String formattedReviewedAt;
    private String reviewedBy;

    public CancellationResponseDTO() {
    }

    public static CancellationResponseDTO fromEntity(CancellationRequest entity) {
        if (entity == null) return null;

        CancellationResponseDTO dto = new CancellationResponseDTO();
        dto.setId(entity.getId());
        dto.setOrderNumber(entity.getOrderNumber());
        dto.setReason(entity.getReason());
        dto.setAdditionalDetails(entity.getAdditionalDetails());
        dto.setStatus(entity.getStatus());
        dto.setRefundStatus(entity.getRefundStatus());
        dto.setAdminNotes(entity.getAdminNotes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setReviewedAt(entity.getReviewedAt());
        dto.setReviewedBy(entity.getReviewedBy());

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        if (entity.getCreatedAt() != null) {
            dto.setFormattedCreatedAt(entity.getCreatedAt().format(fmt));
        }
        if (entity.getReviewedAt() != null) {
            dto.setFormattedReviewedAt(entity.getReviewedAt().format(fmt));
        }

        User u = entity.getUser();
        if (u != null) {
            dto.setCustomerName(u.getName() != null ? u.getName() : "Customer");
            dto.setCustomerEmail(u.getEmail());
            dto.setCustomerPhone(u.getMobileNumber());
        }

        Order o = entity.getOrder();
        if (o != null) {
            dto.setOrderId(o.getId());
            dto.setOrderAmount(o.getTotalAmount());
            if (o.getTotalAmount() != null) {
                dto.setFormattedOrderAmount("₹" + Math.round(o.getTotalAmount()));
            }
            dto.setPaymentStatus(o.getPaymentStatus());
            dto.setPaymentMethod(o.getPaymentMethod());
            dto.setOrderStatus(o.getOrderStatus());

            if (dto.getCustomerName() == null && o.getShippingFullName() != null) {
                dto.setCustomerName(o.getShippingFullName());
            }
            if (dto.getCustomerEmail() == null && o.getShippingEmail() != null) {
                dto.setCustomerEmail(o.getShippingEmail());
            }
            if (dto.getCustomerPhone() == null && o.getShippingPhone() != null) {
                dto.setCustomerPhone(o.getShippingPhone());
            }

            if (o.getItems() != null) {
                for (OrderItem item : o.getItems()) {
                    dto.getProducts().add(new ProductSummary(
                            item.getProductName(),
                            item.getImageUrl(),
                            item.getQuantity(),
                            item.getUnitPrice(),
                            item.getSubtotal()
                    ));
                }
            }
        }

        return dto;
    }

    public static class ProductSummary {
        private String name;
        private String image;
        private Integer quantity;
        private Double unitPrice;
        private Double subtotal;

        public ProductSummary() {}

        public ProductSummary(String name, String image, Integer quantity, Double unitPrice, Double subtotal) {
            this.name = name;
            this.image = image;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.subtotal = subtotal;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getImage() { return image; }
        public void setImage(String image) { this.image = image; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public Double getUnitPrice() { return unitPrice; }
        public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }
        public Double getSubtotal() { return subtotal; }
        public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
    public List<ProductSummary> getProducts() { return products; }
    public void setProducts(List<ProductSummary> products) { this.products = products; }
    public Double getOrderAmount() { return orderAmount; }
    public void setOrderAmount(Double orderAmount) { this.orderAmount = orderAmount; }
    public String getFormattedOrderAmount() { return formattedOrderAmount; }
    public void setFormattedOrderAmount(String formattedOrderAmount) { this.formattedOrderAmount = formattedOrderAmount; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getAdditionalDetails() { return additionalDetails; }
    public void setAdditionalDetails(String additionalDetails) { this.additionalDetails = additionalDetails; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getFormattedCreatedAt() { return formattedCreatedAt; }
    public void setFormattedCreatedAt(String formattedCreatedAt) { this.formattedCreatedAt = formattedCreatedAt; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public String getFormattedReviewedAt() { return formattedReviewedAt; }
    public void setFormattedReviewedAt(String formattedReviewedAt) { this.formattedReviewedAt = formattedReviewedAt; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
}
