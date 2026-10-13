package Firqui.service;

import Firqui.dto.CancellationRequestDTO;
import Firqui.dto.CancellationResponseDTO;
import Firqui.entity.*;
import Firqui.repository.CancellationRequestRepository;
import Firqui.repository.OrderRepository;
import Firqui.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CancellationRequestService {

    private static final Logger logger = LoggerFactory.getLogger(CancellationRequestService.class);

    private static final Set<String> VALID_REASONS = new HashSet<>(Arrays.asList(
            "Ordered by mistake",
            "Want to change the product",
            "Delivery is taking too long",
            "Found a better alternative",
            "Payment or pricing issue",
            "Other"
    ));

    @Autowired
    private CancellationRequestRepository cancellationRequestRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EmailService emailService;

    /* =====================================================
       1. SUBMIT CANCELLATION REQUEST (CUSTOMER)
       Order status MUST NOT change automatically upon submission.
    ====================================================== */
    @Transactional
    public CancellationResponseDTO submitCancellationRequest(User user, CancellationRequestDTO requestDto) {
        if (user == null) {
            throw new IllegalArgumentException("Authentication required to submit a cancellation request.");
        }

        if (requestDto == null || requestDto.getOrderNumber() == null || requestDto.getOrderNumber().trim().isEmpty()) {
            throw new IllegalArgumentException("Order Number is required.");
        }

        String orderNum = requestDto.getOrderNumber().trim().replace("#", "");

        if (requestDto.getReason() == null || requestDto.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Please select a reason for cancellation.");
        }

        String reason = requestDto.getReason().trim();
        if (!VALID_REASONS.contains(reason)) {
            throw new IllegalArgumentException("Invalid cancellation reason selected. Please choose a valid reason.");
        }

        if (requestDto.getAdditionalDetails() == null || requestDto.getAdditionalDetails().trim().isEmpty()) {
            throw new IllegalArgumentException("Please provide additional explanation for your cancellation request.");
        }

        String additionalDetails = requestDto.getAdditionalDetails().trim();
        if (additionalDetails.length() < 5) {
            throw new IllegalArgumentException("Please provide at least a few words explaining your reason.");
        }

        // Validate order exists and belongs to the authenticated customer
        Order order = orderRepository.findByOrderNumber(orderNum)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with number: #" + orderNum));

        if (order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized: You can only request cancellation for your own orders.");
        }

        // Validate current order status
        String currentOrderStatus = order.getOrderStatus() != null ? order.getOrderStatus() : "";
        if ("Delivered".equalsIgnoreCase(currentOrderStatus)) {
            throw new IllegalStateException("Delivered orders cannot be cancelled. Please contact customer support for returns.");
        }
        if ("Cancelled".equalsIgnoreCase(currentOrderStatus)) {
            throw new IllegalStateException("Order #" + orderNum + " is already cancelled.");
        }

        // Prevent duplicate pending cancellation requests for the same order
        if (cancellationRequestRepository.existsByOrderNumberAndStatus(orderNum, "PENDING")) {
            throw new IllegalStateException("A cancellation request for Order #" + orderNum + " is already pending admin review.");
        }

        // Create cancellation request with PENDING status
        // NOTE: Original order status (e.g. CONFIRMED, PROCESSING) is strictly PRESERVED
        CancellationRequest cancellation = new CancellationRequest(order, user, reason, additionalDetails);
        cancellation.setStatus("PENDING");
        cancellation.setRefundStatus("NOT_APPLICABLE");
        cancellation.setCreatedAt(LocalDateTime.now());

        CancellationRequest saved = cancellationRequestRepository.save(cancellation);
        logger.info("Customer {} submitted cancellation request #{} for order #{}", user.getEmail(), saved.getId(), orderNum);

        return CancellationResponseDTO.fromEntity(saved);
    }

    /* =====================================================
       2. GET CUSTOMER CANCELLATION REQUESTS
    ====================================================== */
    @Transactional(readOnly = true)
    public List<CancellationResponseDTO> getUserCancellationRequests(User user) {
        if (user == null) return Collections.emptyList();
        return cancellationRequestRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(CancellationResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CancellationResponseDTO getRequestForOrder(User user, String orderNumber) {
        if (user == null || orderNumber == null) return null;
        String cleanNum = orderNumber.trim().replace("#", "");

        Optional<CancellationRequest> opt = cancellationRequestRepository.findTopByOrderNumberOrderByCreatedAtDesc(cleanNum);
        if (opt.isEmpty()) return null;

        CancellationRequest req = opt.get();
        // Check ownership
        if (req.getUser() != null && !req.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Unauthorized access to cancellation request.");
        }

        return CancellationResponseDTO.fromEntity(req);
    }

    /* =====================================================
       3. GET ALL CANCELLATION REQUESTS (ADMIN)
    ====================================================== */
    @Transactional(readOnly = true)
    public List<CancellationResponseDTO> getAllRequestsAdmin(String statusFilter) {
        List<CancellationRequest> list;
        if (statusFilter != null && !statusFilter.trim().isEmpty() && !"ALL".equalsIgnoreCase(statusFilter.trim())) {
            list = cancellationRequestRepository.findByStatusOrderByCreatedAtDesc(statusFilter.trim().toUpperCase());
        } else {
            list = cancellationRequestRepository.findAllByOrderByCreatedAtDesc();
        }

        return list.stream()
                .map(CancellationResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /* =====================================================
       4. APPROVE CANCELLATION (ADMIN)
       Cancels order, restores inventory stock, tracks refund, dispatches email
    ====================================================== */
    @Transactional
    public CancellationResponseDTO approveCancellation(Long requestId, User adminUser, String adminNotes) {
        CancellationRequest request = cancellationRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Cancellation request not found with ID: " + requestId));

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Only PENDING cancellation requests can be approved. Current status: " + request.getStatus());
        }

        Order order = request.getOrder();
        if (order == null) {
            throw new IllegalStateException("Associated order not found for cancellation request #" + requestId);
        }

        String adminIdentifier = adminUser != null ? adminUser.getEmail() : "Administrator";

        // Mark request as APPROVED
        request.setStatus("APPROVED");
        request.setAdminNotes(adminNotes != null && !adminNotes.trim().isEmpty() ? adminNotes.trim() : "Cancellation approved by admin.");
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminIdentifier);

        // Track refund status separately
        String payStatus = order.getPaymentStatus() != null ? order.getPaymentStatus().toUpperCase() : "";
        if (payStatus.contains("PAID") || payStatus.contains("VERIF")) {
            request.setRefundStatus("PENDING_REFUND");
        } else {
            request.setRefundStatus("NOT_APPLICABLE");
        }

        // Cancel order through existing order management logic
        order.setOrderStatus("Cancelled");
        order.setUpdatedAt(LocalDateTime.now());

        // Restore stock to catalogue products
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() != null && item.getQuantity() != null) {
                    Product prod = item.getProduct();
                    int currentStock = prod.getStockQuantity() != null ? prod.getStockQuantity() : 0;
                    prod.setStockQuantity(currentStock + item.getQuantity());
                    productRepository.save(prod);
                    logger.info("Restored {} units of stock for product '{}' (New stock: {})",
                            item.getQuantity(), prod.getName(), prod.getStockQuantity());
                }
            }
        }

        orderRepository.save(order);
        CancellationRequest saved = cancellationRequestRepository.save(request);

        // Notify customer via email
        try {
            emailService.sendCancellationApprovedEmail(order, saved);
        } catch (Exception e) {
            logger.error("Failed to send cancellation approved email: {}", e.getMessage());
        }

        logger.info("Admin {} approved cancellation request #{} for order #{}", adminIdentifier, requestId, order.getOrderNumber());
        return CancellationResponseDTO.fromEntity(saved);
    }

    /* =====================================================
       5. REJECT CANCELLATION (ADMIN)
       Leaves original order active, saves rejection reason, dispatches email
    ====================================================== */
    @Transactional
    public CancellationResponseDTO rejectCancellation(Long requestId, User adminUser, String rejectionReason) {
        CancellationRequest request = cancellationRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Cancellation request not found with ID: " + requestId));

        if (!"PENDING".equalsIgnoreCase(request.getStatus())) {
            throw new IllegalStateException("Only PENDING cancellation requests can be rejected. Current status: " + request.getStatus());
        }

        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            throw new IllegalArgumentException("Admin rejection reason is required.");
        }

        Order order = request.getOrder();
        if (order == null) {
            throw new IllegalStateException("Associated order not found for cancellation request #" + requestId);
        }

        String adminIdentifier = adminUser != null ? adminUser.getEmail() : "Administrator";

        // Mark request as REJECTED
        request.setStatus("REJECTED");
        request.setAdminNotes(rejectionReason.trim());
        request.setReviewedAt(LocalDateTime.now());
        request.setReviewedBy(adminIdentifier);

        // Keep order in its current active status!

        CancellationRequest saved = cancellationRequestRepository.save(request);

        // Notify customer via email
        try {
            emailService.sendCancellationRejectedEmail(order, saved, rejectionReason.trim());
        } catch (Exception e) {
            logger.error("Failed to send cancellation rejected email: {}", e.getMessage());
        }

        logger.info("Admin {} rejected cancellation request #{} for order #{}", adminIdentifier, requestId, order.getOrderNumber());
        return CancellationResponseDTO.fromEntity(saved);
    }
}
