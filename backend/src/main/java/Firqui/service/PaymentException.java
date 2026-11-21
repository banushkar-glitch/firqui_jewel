package Firqui.service;

/** A payment/refund request that cannot be completed. httpStatus is what the API should answer with. */
public class PaymentException extends RuntimeException {

    private final int httpStatus;

    public PaymentException(int httpStatus, String message) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
