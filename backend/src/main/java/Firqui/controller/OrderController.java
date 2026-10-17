package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.CreateOrderRequest;
import Firqui.dto.OrderResponse;
import Firqui.entity.User;
import Firqui.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", maxAge = 3600)
public class OrderController {

    @Autowired
    private OrderService orderService;

    /* =====================================================
       POST /api/orders - Create new order
    ====================================================== */
    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(
            @AuthenticationPrincipal User user,
            @RequestBody CreateOrderRequest request) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Please log in to place your order."));
        }

        try {
            OrderResponse response = orderService.createOrder(user, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalStateException e) {
            // Stock conflict or business constraint
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Unable to place order: " + e.getMessage()));
        }
    }

    /* =====================================================
       GET /api/users/me/orders - Get current user orders
    ====================================================== */
    @GetMapping("/users/me/orders")
    public ResponseEntity<?> getMyOrders(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        List<OrderResponse> orders = orderService.getUserOrders(user);
        return ResponseEntity.ok(orders);
    }

    /* =====================================================
       GET /api/orders/{orderNumber} - Get single order
    ====================================================== */
    @GetMapping("/orders/{orderNumber}")
    public ResponseEntity<?> getOrder(
            @AuthenticationPrincipal User user,
            @PathVariable String orderNumber) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        OrderResponse response = orderService.getUserOrder(user, orderNumber);
        if (response == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, "Order not found with number: " + orderNumber));
        }

        return ResponseEntity.ok(response);
    }

    /* =====================================================
       PUT /api/orders/{orderNumber}/cancel - Cancel order
    ====================================================== */
    @PutMapping("/orders/{orderNumber}/cancel")
    public ResponseEntity<?> cancelOrder(
            @AuthenticationPrincipal User user,
            @PathVariable String orderNumber) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        try {
            OrderResponse response = orderService.cancelUserOrder(user, orderNumber);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to cancel order: " + e.getMessage()));
        }
    }

    /* =====================================================
       POST /api/orders/place-payment - Place new order with payment details
    ====================================================== */
    @PostMapping(value = "/orders/place-payment", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> placeOrderWithPayment(
            @AuthenticationPrincipal User user,
            @RequestPart("orderData") CreateOrderRequest request,
            @RequestParam("transactionId") String transactionId,
            @RequestParam("screenshot") org.springframework.web.multipart.MultipartFile screenshot) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Please log in to place your order."));
        }

        try {
            OrderResponse response = orderService.placeOrderWithPayment(user, request, transactionId, screenshot);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to place order: " + e.getMessage()));
        }
    }

    /* =====================================================
       POST /api/orders/{orderNumber}/payment - Submit UPI payment details
    ====================================================== */
    @PostMapping(value = "/orders/{orderNumber}/payment", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitPaymentDetails(
            @AuthenticationPrincipal User user,
            @PathVariable String orderNumber,
            @RequestParam("transactionId") String transactionId,
            @RequestParam("screenshot") org.springframework.web.multipart.MultipartFile screenshot) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        try {
            OrderResponse response = orderService.submitPaymentDetails(user, orderNumber, transactionId, screenshot);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to submit payment details: " + e.getMessage()));
        }
    }

    /* =====================================================
       GET /api/orders/{orderNumber}/screenshot - View payment screenshot (owner)
    ====================================================== */
    @GetMapping("/orders/{orderNumber}/screenshot")
    public ResponseEntity<?> getPaymentScreenshot(
            @AuthenticationPrincipal User user,
            @PathVariable String orderNumber) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        try {
            java.nio.file.Path filePath = orderService.getPaymentScreenshotPath(orderNumber, user, false);
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
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Unable to load screenshot: " + e.getMessage()));
        }
    }
}
