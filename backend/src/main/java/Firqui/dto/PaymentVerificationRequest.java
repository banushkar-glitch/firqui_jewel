package Firqui.dto;

public class PaymentVerificationRequest {

    private String action; // "PAID" or "REJECTED"
    private String rejectionReason;

    public PaymentVerificationRequest() {
    }

    public PaymentVerificationRequest(String action, String rejectionReason) {
        this.action = action;
        this.rejectionReason = rejectionReason;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}
