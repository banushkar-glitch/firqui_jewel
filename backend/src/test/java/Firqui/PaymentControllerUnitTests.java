package Firqui;

import Firqui.controller.PaymentController;
import Firqui.dto.OrderItemRequest;
import Firqui.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class PaymentControllerUnitTests {

    private PaymentController controller;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        controller = new PaymentController();
        orderService = mock(OrderService.class);
        ReflectionTestUtils.setField(controller, "orderService", orderService);
        ReflectionTestUtils.setField(controller, "upiId", "shop@icici");
        ReflectionTestUtils.setField(controller, "payeeName", "FIRQUI JEWELS");
    }

    @Test
    @DisplayName("QR link carries the server-calculated amount, not anything from the browser")
    void upiLinkUsesServerAmount() {
        when(orderService.quoteTotal(any())).thenReturn(3498.0);

        OrderItemRequest item = new OrderItemRequest();
        PaymentController.UpiRequest request = new PaymentController.UpiRequest();
        request.setItems(List.of(item));

        ResponseEntity<?> response = controller.upiPayment(request, null);

        assertEquals(200, response.getStatusCode().value());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(3498.0, body.get("amount"));
        assertEquals("upi://pay?pa=shop%40icici&pn=FIRQUI%20JEWELS&am=3498.00&cu=INR&tn=FIRQUI%20JEWELS%20order",
                body.get("upiUri"));
    }

    @Test
    @DisplayName("Paying for an existing order requires the customer to be logged in")
    void existingOrderNeedsLogin() {
        PaymentController.UpiRequest request = new PaymentController.UpiRequest();
        request.setOrderNumber("FQ123456");

        assertEquals(401, controller.upiPayment(request, null).getStatusCode().value());
        verifyNoInteractions(orderService);
    }

    @Test
    @DisplayName("An empty or unknown cart gets a clear error instead of a QR")
    void emptyCartIsRejected() {
        when(orderService.quoteTotal(any())).thenThrow(new IllegalArgumentException("Your cart is empty. Please add items before paying."));

        PaymentController.UpiRequest request = new PaymentController.UpiRequest();
        request.setItems(List.of());

        assertEquals(400, controller.upiPayment(request, null).getStatusCode().value());
    }
}
