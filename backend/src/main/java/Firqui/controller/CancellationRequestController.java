package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.CancellationRequestDTO;
import Firqui.dto.CancellationResponseDTO;
import Firqui.entity.User;
import Firqui.service.CancellationRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cancellation-requests")
@CrossOrigin(origins = "*", maxAge = 3600)
public class CancellationRequestController {

    @Autowired
    private CancellationRequestService cancellationRequestService;

    /* =====================================================
       POST /api/cancellation-requests - Submit cancellation request
    ====================================================== */
    @PostMapping
    public ResponseEntity<?> submitRequest(
            @AuthenticationPrincipal User user,
            @RequestBody CancellationRequestDTO requestDto) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in to submit a cancellation request."));
        }

        try {
            CancellationResponseDTO response = cancellationRequestService.submitCancellationRequest(user, requestDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to submit cancellation request: " + e.getMessage()));
        }
    }

    /* =====================================================
       GET /api/cancellation-requests/my - Get authenticated user requests
    ====================================================== */
    @GetMapping("/my")
    public ResponseEntity<?> getMyRequests(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        List<CancellationResponseDTO> list = cancellationRequestService.getUserCancellationRequests(user);
        return ResponseEntity.ok(list);
    }

    /* =====================================================
       GET /api/cancellation-requests/order/{orderNumber} - Get request for specific order
    ====================================================== */
    @GetMapping("/order/{orderNumber}")
    public ResponseEntity<?> getRequestForOrder(
            @AuthenticationPrincipal User user,
            @PathVariable String orderNumber) {

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "Authentication required. Please log in."));
        }

        try {
            CancellationResponseDTO response = cancellationRequestService.getRequestForOrder(user, orderNumber);
            if (response == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "No cancellation request found for order #" + orderNumber));
            }
            return ResponseEntity.ok(response);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to retrieve request: " + e.getMessage()));
        }
    }
}
