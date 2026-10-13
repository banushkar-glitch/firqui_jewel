package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.OrderResponse;
import Firqui.dto.OrderStatusUpdateRequest;
import Firqui.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/orders")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminOrderController {

    @Autowired
    private OrderService orderService;

    /* =====================================================
       GET /api/admin/orders - View all customer orders
    ====================================================== */
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        List<OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    /* =====================================================
       GET /api/admin/orders/{orderNumber} - View single order
    ====================================================== */
    @GetMapping("/{orderNumber}")
    public ResponseEntity<?> getOrderDetails(@PathVariable String orderNumber) {
        OrderResponse response = orderService.getAdminOrder(orderNumber);
        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, "Order not found: " + orderNumber));
        }
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       PUT & PATCH /api/admin/orders/{orderNumber}/status
    ====================================================== */
    @RequestMapping(value = "/{orderNumber}/status", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String orderNumber,
            @RequestBody OrderStatusUpdateRequest request) {

        try {
            OrderResponse updated = orderService.updateOrderStatus(orderNumber, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to update order status: " + e.getMessage()));
        }
    }

    /* =====================================================
       POST /api/admin/orders/{orderNumber}/verify - Verify or reject manual payment
    ====================================================== */
    @PostMapping("/{orderNumber}/verify")
    public ResponseEntity<?> verifyPayment(
            @PathVariable String orderNumber,
            @RequestBody Firqui.dto.PaymentVerificationRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Firqui.entity.User adminUser) {

        try {
            OrderResponse response = orderService.verifyPayment(orderNumber, request, adminUser);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to verify payment: " + e.getMessage()));
        }
    }

    /* =====================================================
       GET /api/admin/orders/{orderNumber}/screenshot - Admin view payment screenshot
    ====================================================== */
    @GetMapping("/{orderNumber}/screenshot")
    public ResponseEntity<?> getAdminPaymentScreenshot(
            @PathVariable String orderNumber,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Firqui.entity.User adminUser) {

        try {
            java.nio.file.Path filePath = orderService.getPaymentScreenshotPath(orderNumber, adminUser, true);
            if (filePath == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "No payment screenshot found for this order."));
            }

            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "Screenshot file not accessible."));
            }

            String contentType = "image/jpeg";
            String fn = filePath.getFileName().toString().toLowerCase();
            if (fn.endsWith(".png")) contentType = "image/png";
            else if (fn.endsWith(".webp")) contentType = "image/webp";

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Unable to load screenshot: " + e.getMessage()));
        }
    }
}
