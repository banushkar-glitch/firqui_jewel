package Firqui.dto;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class OrderResponse {

    private Long id;
    private String orderId;
    private String orderNumber;
    private String status;
    private String orderStatus;
    private String paymentStatus;
    private String payment;
    private String paymentMethod;
    private String transactionId;
    private String paymentScreenshotFilename;
    private Boolean hasPaymentScreenshot = false;
    private LocalDateTime paymentSubmittedAt;
    private String formattedPaymentSubmittedAt;
    private LocalDateTime paymentVerifiedAt;
    private String formattedPaymentVerifiedAt;
    private String verifiedBy;
    private String rejectionReason;

    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private String cancellationStatus;
    private LocalDateTime cancelledAt;
    private String formattedCancelledAt;
    private String cancellationReason;
    private String cancellationDetails;
    private String refundStatus;
    private Double refundAmount = 0.0;
    private String formattedRefundAmount;
    private String razorpayRefundId;
    private LocalDateTime refundInitiatedAt;
    private String formattedRefundInitiatedAt;
    private LocalDateTime refundProcessedAt;
    private String formattedRefundProcessedAt;
    private Boolean cancellationEligible = false;
    private Long cancellationHoursRemaining = 0L;

    private Double subtotal = 0.0;
    private String formattedSubtotal;
    private Double shipping = 0.0;
    private Double shippingAmount = 0.0;
    private String formattedShipping;
    private Double discount = 0.0;
    private String formattedDiscount;
    private Double total = 0.0;
    private Double totalAmount = 0.0;
    private Double amount = 0.0;
    private String formattedTotal;

    private String orderDate;
    private String date;
    private LocalDateTime createdAt;

    private String customer;
    private Map<String, String> customerDetails;
    private String email;
    private String registeredEmail;
    private String phone;
    private Integer items = 0;

    private List<String> shippingAddressLines;
    private ShippingAddressDTO shippingAddress;
    private List<OrderItemResponse> products = new ArrayList<>();

    public OrderResponse() {
    }

    public static OrderResponse fromEntity(Firqui.entity.Order order) {
        OrderResponse response = new OrderResponse();
        if (order == null) return response;

        response.setId(order.getId());
        response.setOrderId(order.getOrderNumber());
        response.setOrderNumber(order.getOrderNumber());

        response.setStatus(order.getOrderStatus());
        response.setOrderStatus(order.getOrderStatus());
        response.setPaymentStatus(order.getPaymentStatus());
        response.setPayment(order.getPaymentStatus());
        response.setPaymentMethod(order.getPaymentMethod());
        response.setTransactionId(order.getTransactionId());
        response.setPaymentScreenshotFilename(order.getPaymentScreenshotFilename());
        response.setHasPaymentScreenshot(order.getPaymentScreenshotFilename() != null && !order.getPaymentScreenshotFilename().trim().isEmpty());
        response.setPaymentSubmittedAt(order.getPaymentSubmittedAt());
        if (order.getPaymentSubmittedAt() != null) {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);
            response.setFormattedPaymentSubmittedAt(order.getPaymentSubmittedAt().format(dtf));
        }
        response.setPaymentVerifiedAt(order.getPaymentVerifiedAt());
        if (order.getPaymentVerifiedAt() != null) {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);
            response.setFormattedPaymentVerifiedAt(order.getPaymentVerifiedAt().format(dtf));
        }
        response.setVerifiedBy(order.getVerifiedBy());
        response.setRejectionReason(order.getRejectionReason());

        response.setSubtotal(order.getSubtotal());
        response.setShipping(order.getShippingAmount());
        response.setShippingAmount(order.getShippingAmount());
        response.setDiscount(order.getDiscount());
        response.setTotal(order.getTotalAmount());
        response.setTotalAmount(order.getTotalAmount());
        response.setAmount(order.getTotalAmount());

        NumberFormat formatter = NumberFormat.getIntegerInstance(new Locale("en", "IN"));
        response.setFormattedSubtotal("₹" + formatter.format(Math.round(order.getSubtotal() != null ? order.getSubtotal() : 0.0)));
        response.setFormattedShipping(order.getShippingAmount() != null && order.getShippingAmount() > 0 ? "₹" + formatter.format(Math.round(order.getShippingAmount())) : "Free");
        response.setFormattedDiscount("₹" + formatter.format(Math.round(order.getDiscount() != null ? order.getDiscount() : 0.0)));
        response.setFormattedTotal("₹" + formatter.format(Math.round(order.getTotalAmount() != null ? order.getTotalAmount() : 0.0)));

        response.setCreatedAt(order.getCreatedAt());
        if (order.getCreatedAt() != null) {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
            String formattedDate = order.getCreatedAt().format(dtf);
            response.setOrderDate(formattedDate);
            response.setDate(formattedDate);
        } else {
            response.setOrderDate("Today");
            response.setDate("Today");
        }

        String custName = order.getShippingFullName() != null ? order.getShippingFullName()
                : (order.getUser() != null ? order.getUser().getName() : "Customer");
        String custEmail = order.getShippingEmail() != null ? order.getShippingEmail()
                : (order.getUser() != null ? order.getUser().getEmail() : "");
        String regEmail = order.getUser() != null && order.getUser().getEmail() != null
                ? order.getUser().getEmail() : custEmail;
        String custPhone = order.getShippingPhone() != null ? order.getShippingPhone()
                : (order.getUser() != null ? order.getUser().getMobileNumber() : "");

        response.setCustomer(custName);
        response.setEmail(custEmail);
        response.setRegisteredEmail(regEmail);
        response.setPhone(custPhone);

        Map<String, String> details = new HashMap<>();
        details.put("name", custName);
        details.put("email", custEmail);
        details.put("registeredEmail", regEmail);
        details.put("phone", custPhone);
        response.setCustomerDetails(details);

        List<String> addressLines = new ArrayList<>();
        if (order.getShippingFullName() != null) addressLines.add(order.getShippingFullName());
        if (order.getShippingAddress1() != null) addressLines.add(order.getShippingAddress1());
        if (order.getShippingAddress2() != null && !order.getShippingAddress2().trim().isEmpty()) {
            addressLines.add(order.getShippingAddress2());
        }
        String pinCity = "";
        if (order.getShippingPincode() != null) pinCity += "Pincode: " + order.getShippingPincode();
        if (!pinCity.isEmpty()) addressLines.add(pinCity);
        addressLines.add("India");
        response.setShippingAddressLines(addressLines);

        ShippingAddressDTO addrDto = new ShippingAddressDTO(
                order.getShippingFullName(),
                order.getShippingPhone(),
                order.getShippingEmail(),
                order.getShippingAddress1(),
                order.getShippingAddress2(),
                order.getShippingPincode()
        );
        response.setShippingAddress(addrDto);

        int totalCount = 0;
        List<OrderItemResponse> itemResponses = new ArrayList<>();
        if (order.getItems() != null) {
            for (Firqui.entity.OrderItem item : order.getItems()) {
                totalCount += (item.getQuantity() != null ? item.getQuantity() : 1);
                String cat = (item.getCategory() != null && !item.getCategory().trim().isEmpty())
                        ? item.getCategory() : "Jewellery";
                OrderItemResponse itemResp = new OrderItemResponse(
                        item.getId(),
                        item.getProductId(),
                        item.getProductName(),
                        cat,
                        item.getSelectedSize(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getSubtotal(),
                        item.getImageUrl()
                );
                itemResponses.add(itemResp);
            }
        }
        response.setItems(totalCount);
        response.setProducts(itemResponses);

        // Razorpay, Cancellation & Refund details
        response.setRazorpayOrderId(order.getRazorpayOrderId());
        response.setRazorpayPaymentId(order.getRazorpayPaymentId());
        response.setRazorpaySignature(order.getRazorpaySignature());
        response.setCancellationStatus(order.getCancellationStatus());
        response.setCancelledAt(order.getCancelledAt());
        DateTimeFormatter dtfTime = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a", Locale.ENGLISH);
        if (order.getCancelledAt() != null) {
            response.setFormattedCancelledAt(order.getCancelledAt().format(dtfTime));
        }
        response.setCancellationReason(order.getCancellationReason());
        response.setCancellationDetails(order.getCancellationDetails());

        response.setRefundStatus(order.getRefundStatus());
        response.setRefundAmount(order.getRefundAmount());
        if (order.getRefundAmount() != null && order.getRefundAmount() > 0) {
            response.setFormattedRefundAmount("₹" + formatter.format(Math.round(order.getRefundAmount())));
        } else {
            response.setFormattedRefundAmount("₹0");
        }
        response.setRazorpayRefundId(order.getRazorpayRefundId());
        response.setRefundInitiatedAt(order.getRefundInitiatedAt());
        if (order.getRefundInitiatedAt() != null) {
            response.setFormattedRefundInitiatedAt(order.getRefundInitiatedAt().format(dtfTime));
        }
        response.setRefundProcessedAt(order.getRefundProcessedAt());
        if (order.getRefundProcessedAt() != null) {
            response.setFormattedRefundProcessedAt(order.getRefundProcessedAt().format(dtfTime));
        }

        // 24-Hour Cancellation Eligibility calculation
        boolean eligible = false;
        long hoursRemaining = 0L;
        String curOrderStatus = order.getOrderStatus() != null ? order.getOrderStatus() : "";
        String curPayStatus = order.getPaymentStatus() != null ? order.getPaymentStatus() : "";
        boolean isPaid = curPayStatus.equalsIgnoreCase("PAID") || curPayStatus.equalsIgnoreCase("CONFIRMED");
        boolean isNotTerminal = !curOrderStatus.equalsIgnoreCase("Delivered")
                && !curOrderStatus.equalsIgnoreCase("Shipped")
                && !curOrderStatus.equalsIgnoreCase("Cancelled")
                && !"CANCELLED".equalsIgnoreCase(order.getCancellationStatus());

        LocalDateTime paymentTime = order.getPaymentVerifiedAt() != null ? order.getPaymentVerifiedAt()
                : (order.getPaymentSubmittedAt() != null ? order.getPaymentSubmittedAt() : order.getCreatedAt());

        if (isPaid && isNotTerminal && paymentTime != null) {
            java.time.Duration diff = java.time.Duration.between(paymentTime, LocalDateTime.now());
            long hoursElapsed = diff.toHours();
            if (hoursElapsed < 24) {
                eligible = true;
                hoursRemaining = Math.max(0, 24 - hoursElapsed);
            }
        }
        response.setCancellationEligible(eligible);
        response.setCancellationHoursRemaining(hoursRemaining);

        return response;
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOrderStatus() {
        return orderStatus;
    }

    public void setOrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getPayment() {
        return payment;
    }

    public void setPayment(String payment) {
        this.payment = payment;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public String getFormattedSubtotal() {
        return formattedSubtotal;
    }

    public void setFormattedSubtotal(String formattedSubtotal) {
        this.formattedSubtotal = formattedSubtotal;
    }

    public Double getShipping() {
        return shipping;
    }

    public void setShipping(Double shipping) {
        this.shipping = shipping;
    }

    public Double getShippingAmount() {
        return shippingAmount;
    }

    public void setShippingAmount(Double shippingAmount) {
        this.shippingAmount = shippingAmount;
    }

    public String getFormattedShipping() {
        return formattedShipping;
    }

    public void setFormattedShipping(String formattedShipping) {
        this.formattedShipping = formattedShipping;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public String getFormattedDiscount() {
        return formattedDiscount;
    }

    public void setFormattedDiscount(String formattedDiscount) {
        this.formattedDiscount = formattedDiscount;
    }

    public Double getTotal() {
        return total;
    }

    public void setTotal(Double total) {
        this.total = total;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getFormattedTotal() {
        return formattedTotal;
    }

    public void setFormattedTotal(String formattedTotal) {
        this.formattedTotal = formattedTotal;
    }

    public String getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(String orderDate) {
        this.orderDate = orderDate;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Object getCustomer() {
        // Can return customer details map if accessed as object in admin order details
        return customer;
    }

    public Map<String, String> getCustomerDetails() {
        return customerDetails;
    }

    public void setCustomer(String customer) {
        this.customer = customer;
    }

    public void setCustomerDetails(Map<String, String> customerDetails) {
        this.customerDetails = customerDetails;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRegisteredEmail() {
        return registeredEmail;
    }

    public void setRegisteredEmail(String registeredEmail) {
        this.registeredEmail = registeredEmail;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Integer getItems() {
        return items;
    }

    public void setItems(Integer items) {
        this.items = items;
    }

    public List<String> getShippingAddressLines() {
        return shippingAddressLines;
    }

    public void setShippingAddressLines(List<String> shippingAddressLines) {
        this.shippingAddressLines = shippingAddressLines;
    }

    public ShippingAddressDTO getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(ShippingAddressDTO shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public List<OrderItemResponse> getProducts() {
        return products;
    }

    public void setProducts(List<OrderItemResponse> products) {
        this.products = products;
    }

    public String getPaymentScreenshotFilename() {
        return paymentScreenshotFilename;
    }

    public void setPaymentScreenshotFilename(String paymentScreenshotFilename) {
        this.paymentScreenshotFilename = paymentScreenshotFilename;
    }

    public Boolean getHasPaymentScreenshot() {
        return hasPaymentScreenshot;
    }

    public void setHasPaymentScreenshot(Boolean hasPaymentScreenshot) {
        this.hasPaymentScreenshot = hasPaymentScreenshot;
    }

    public LocalDateTime getPaymentSubmittedAt() {
        return paymentSubmittedAt;
    }

    public void setPaymentSubmittedAt(LocalDateTime paymentSubmittedAt) {
        this.paymentSubmittedAt = paymentSubmittedAt;
    }

    public String getFormattedPaymentSubmittedAt() {
        return formattedPaymentSubmittedAt;
    }

    public void setFormattedPaymentSubmittedAt(String formattedPaymentSubmittedAt) {
        this.formattedPaymentSubmittedAt = formattedPaymentSubmittedAt;
    }

    public LocalDateTime getPaymentVerifiedAt() {
        return paymentVerifiedAt;
    }

    public void setPaymentVerifiedAt(LocalDateTime paymentVerifiedAt) {
        this.paymentVerifiedAt = paymentVerifiedAt;
    }

    public String getFormattedPaymentVerifiedAt() {
        return formattedPaymentVerifiedAt;
    }

    public void setFormattedPaymentVerifiedAt(String formattedPaymentVerifiedAt) {
        this.formattedPaymentVerifiedAt = formattedPaymentVerifiedAt;
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

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public void setRazorpayOrderId(String razorpayOrderId) {
        this.razorpayOrderId = razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public void setRazorpayPaymentId(String razorpayPaymentId) {
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public String getRazorpaySignature() {
        return razorpaySignature;
    }

    public void setRazorpaySignature(String razorpaySignature) {
        this.razorpaySignature = razorpaySignature;
    }

    public String getCancellationStatus() {
        return cancellationStatus;
    }

    public void setCancellationStatus(String cancellationStatus) {
        this.cancellationStatus = cancellationStatus;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }

    public String getFormattedCancelledAt() {
        return formattedCancelledAt;
    }

    public void setFormattedCancelledAt(String formattedCancelledAt) {
        this.formattedCancelledAt = formattedCancelledAt;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public String getCancellationDetails() {
        return cancellationDetails;
    }

    public void setCancellationDetails(String cancellationDetails) {
        this.cancellationDetails = cancellationDetails;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }

    public Double getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(Double refundAmount) {
        this.refundAmount = refundAmount;
    }

    public String getFormattedRefundAmount() {
        return formattedRefundAmount;
    }

    public void setFormattedRefundAmount(String formattedRefundAmount) {
        this.formattedRefundAmount = formattedRefundAmount;
    }

    public String getRazorpayRefundId() {
        return razorpayRefundId;
    }

    public void setRazorpayRefundId(String razorpayRefundId) {
        this.razorpayRefundId = razorpayRefundId;
    }

    public LocalDateTime getRefundInitiatedAt() {
        return refundInitiatedAt;
    }

    public void setRefundInitiatedAt(LocalDateTime refundInitiatedAt) {
        this.refundInitiatedAt = refundInitiatedAt;
    }

    public String getFormattedRefundInitiatedAt() {
        return formattedRefundInitiatedAt;
    }

    public void setFormattedRefundInitiatedAt(String formattedRefundInitiatedAt) {
        this.formattedRefundInitiatedAt = formattedRefundInitiatedAt;
    }

    public LocalDateTime getRefundProcessedAt() {
        return refundProcessedAt;
    }

    public void setRefundProcessedAt(LocalDateTime refundProcessedAt) {
        this.refundProcessedAt = refundProcessedAt;
    }

    public String getFormattedRefundProcessedAt() {
        return formattedRefundProcessedAt;
    }

    public void setFormattedRefundProcessedAt(String formattedRefundProcessedAt) {
        this.formattedRefundProcessedAt = formattedRefundProcessedAt;
    }

    public Boolean getCancellationEligible() {
        return cancellationEligible != null ? cancellationEligible : false;
    }

    public void setCancellationEligible(Boolean cancellationEligible) {
        this.cancellationEligible = cancellationEligible;
    }

    public Long getCancellationHoursRemaining() {
        return cancellationHoursRemaining != null ? cancellationHoursRemaining : 0L;
    }

    public void setCancellationHoursRemaining(Long cancellationHoursRemaining) {
        this.cancellationHoursRemaining = cancellationHoursRemaining;
    }
}
