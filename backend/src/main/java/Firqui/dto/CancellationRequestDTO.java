package Firqui.dto;

public class CancellationRequestDTO {

    private String orderNumber;
    private String reason;
    private String additionalDetails;

    public CancellationRequestDTO() {
    }

    public CancellationRequestDTO(String orderNumber, String reason, String additionalDetails) {
        this.orderNumber = orderNumber;
        this.reason = reason;
        this.additionalDetails = additionalDetails;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getAdditionalDetails() {
        return additionalDetails;
    }

    public void setAdditionalDetails(String additionalDetails) {
        this.additionalDetails = additionalDetails;
    }
}
