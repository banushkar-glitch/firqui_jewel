package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.CancellationResponseDTO;
import Firqui.entity.User;
import Firqui.service.CancellationRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cancellation-requests")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
public class AdminCancellationController {

    @Autowired
    private CancellationRequestService cancellationRequestService;

    /* =====================================================
       GET /api/admin/cancellation-requests - List all requests
    ====================================================== */
    @GetMapping
    public ResponseEntity<?> getAllRequests(@RequestParam(value = "status", required = false) String status) {
        List<CancellationResponseDTO> list = cancellationRequestService.getAllRequestsAdmin(status);
        return ResponseEntity.ok(list);
    }

    /* =====================================================
       POST /api/admin/cancellation-requests/{id}/approve
    ====================================================== */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User adminUser) {

        String notes = body != null ? body.get("adminNotes") : null;
        try {
            CancellationResponseDTO result = cancellationRequestService.approveCancellation(id, adminUser, notes);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to approve cancellation request: " + e.getMessage()));
        }
    }

    /* =====================================================
       POST /api/admin/cancellation-requests/{id}/reject
    ====================================================== */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User adminUser) {

        String reason = body != null ? (body.get("reason") != null ? body.get("reason") : body.get("rejectionReason")) : null;
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Rejection reason is required."));
        }

        try {
            CancellationResponseDTO result = cancellationRequestService.rejectCancellation(id, adminUser, reason);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to reject cancellation request: " + e.getMessage()));
        }
    }
}
