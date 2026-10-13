package Firqui.dto;

public class OrderStatusUpdateRequest {

    private String status;
    private String orderStatus;
    private String paymentStatus;

    public OrderStatusUpdateRequest() {
    }

    public OrderStatusUpdateRequest(String status) {
        this.status = status;
        this.orderStatus = status;
    }

    public String getStatus() {
        if (status != null && !status.trim().isEmpty()) {
            return status.trim();
        }
        return orderStatus != null ? orderStatus.trim() : null;
    }

    public void setStatus(String status) {
        this.status = status;
        this.orderStatus = status;
    }

    public String getOrderStatus() {
        return getStatus();
    }

    public void setOrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
        if (this.status == null) {
            this.status = orderStatus;
        }
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
}
