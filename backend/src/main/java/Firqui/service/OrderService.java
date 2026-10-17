package Firqui.service;

import Firqui.config.WebConfig;
import Firqui.dto.*;
import Firqui.entity.CartItem;
import Firqui.entity.Order;
import Firqui.entity.OrderItem;
import Firqui.entity.Product;
import Firqui.entity.User;
import Firqui.repository.CartItemRepository;
import Firqui.repository.OrderItemRepository;
import Firqui.repository.OrderRepository;
import Firqui.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EmailService emailService;

    @Autowired(required = false)
    private ShopNotificationService shopNotifications;

    @Autowired
    private Firqui.repository.UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(OrderService.class);

    /* =====================================================
       1. CREATE ORDER (TRANSACTIONAL)
    ====================================================== */
    @Transactional
    public OrderResponse createOrder(User user, CreateOrderRequest request) {
        // Validate shipping address
        ShippingAddressDTO address = request != null ? request.getShippingAddress() : null;
        if (address == null || address.getFullName() == null || address.getFullName().isEmpty()
                || address.getPhone() == null || address.getPhone().isEmpty()
                || address.getAddress1() == null || address.getAddress1().isEmpty()
                || address.getPincode() == null || address.getPincode().isEmpty()) {
            throw new IllegalArgumentException("Complete delivery information (Full Name, Phone Number, Address 1, and Pincode) is required.");
        }

        if (user == null) {
            throw new IllegalArgumentException("Please log in to place your order.");
        }

        // Gather items to order
        List<OrderItemData> itemsToProcess = new ArrayList<>();

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (OrderItemRequest reqItem : request.getItems()) {
                if (reqItem.getQuantity() != null && reqItem.getQuantity() > 0) {
                    itemsToProcess.add(new OrderItemData(
                            reqItem.getProductId(),
                            reqItem.getName(),
                            reqItem.getSelectedSize(),
                            reqItem.getQuantity(),
                            reqItem.getImage()
                    ));
                }
            }
        }

        // If items were not sent directly in request body, retrieve from user's persistent cart in DB
        if (itemsToProcess.isEmpty()) {
            List<CartItem> dbCartItems = cartItemRepository.findByUserOrderByCreatedAtAsc(user);
            for (CartItem ci : dbCartItems) {
                itemsToProcess.add(new OrderItemData(
                        ci.getProductId(),
                        ci.getName(),
                        ci.getSelectedSize(),
                        ci.getQuantity(),
                        ci.getImage()
                ));
            }
        }

        if (itemsToProcess.isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty. Please add items before placing an order.");
        }

        // Generate unique order number
        String orderNumber = generateUniqueOrderNumber();

        // Determine Payment method & initial statuses
        String rawPayment = request.getPaymentMethod() != null ? request.getPaymentMethod().trim().toLowerCase() : "";
        String paymentMethod;
        String paymentStatus;
        String orderStatus;

        if (rawPayment.contains("pay") || rawPayment.contains("card") || rawPayment.contains("upi") || rawPayment.contains("online")) {
            paymentMethod = "Pay Now";
            paymentStatus = "PENDING_PAYMENT";
            orderStatus = "CHECKOUT_PENDING";
        } else {
            paymentMethod = "Cash on Delivery";
            paymentStatus = "Pending";
            orderStatus = "Processing";
        }

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUser(user);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(paymentStatus);
        order.setOrderStatus(orderStatus);
        order.setTransactionId("Pay Now".equals(paymentMethod) ? null : "COD-" + orderNumber);

        order.setShippingFullName(address.getFullName());
        order.setShippingPhone(address.getPhone());
        order.setShippingEmail(address.getEmail() != null && !address.getEmail().trim().isEmpty() ? address.getEmail().trim() : (user != null ? user.getEmail() : ""));
        order.setShippingAddress1(address.getAddress1());
        order.setShippingAddress2(address.getAddress2());
        order.setShippingPincode(address.getPincode());

        double calculatedSubtotal = 0.0;

        // Process each item, validate from DB product, check and deduct stock
        for (OrderItemData itemData : itemsToProcess) {
            Product product = findProductByIdOrLegacyOrName(itemData.productId, itemData.name);

            if (product == null) {
                throw new IllegalArgumentException("Product not found in catalogue: " + itemData.name);
            }

            int requestedQty = itemData.quantity;

            // Stock validation
            if (product.getStockQuantity() != null && product.getStockQuantity() < requestedQty) {
                throw new IllegalStateException("Only " + product.getStockQuantity() + " items are available for " + product.getName() + ".");
            }

            // Price validation strictly from database product
            double unitPrice = product.getPrice() != null ? product.getPrice() : 0.0;
            double itemSubtotal = unitPrice * requestedQty;
            calculatedSubtotal += itemSubtotal;

            // Deduct stock in DB
            if (product.getStockQuantity() != null) {
                product.setStockQuantity(Math.max(0, product.getStockQuantity() - requestedQty));
                productRepository.save(product);
            }

            // Create OrderItem snapshot
            String itemImage = (product.getMainImage() != null && !product.getMainImage().isEmpty())
                    ? product.getMainImage() : itemData.imageUrl;
            String category = product.getCategory() != null ? product.getCategory() : "Jewellery";

            OrderItem orderItem = new OrderItem(
                    order,
                    product,
                    product.getLegacyId() != null ? product.getLegacyId() : String.valueOf(product.getId()),
                    product.getName(),
                    category,
                    itemData.selectedSize,
                    requestedQty,
                    unitPrice,
                    itemSubtotal,
                    itemImage
            );

            order.addItem(orderItem);
        }

        order.setSubtotal(calculatedSubtotal);
        order.setDiscount(0.0);
        order.setShippingAmount(0.0);
        order.setTotalAmount(calculatedSubtotal);

        // Save order and order items in PostgreSQL
        Order savedOrder = orderRepository.save(order);
        if (shopNotifications != null) shopNotifications.orderPlaced(savedOrder);

        // For Cash on Delivery, clear cart immediately. For "Pay Now", retain cart until payment submission succeeds
        if (!"Pay Now".equalsIgnoreCase(paymentMethod)) {
            cartItemRepository.deleteByUser(user);
        }

        return OrderResponse.fromEntity(savedOrder);
    }

    /* =====================================================
       1B. PLACE ORDER WITH UPI PAYMENT (TRANSACTIONAL)
    ====================================================== */
    @Transactional
    public OrderResponse placeOrderWithPayment(User user, CreateOrderRequest request, String transactionId, MultipartFile screenshot) {
        // Validate shipping address
        ShippingAddressDTO address = request != null ? request.getShippingAddress() : null;
        if (address == null || address.getFullName() == null || address.getFullName().trim().isEmpty() ||
                address.getPhone() == null || address.getPhone().trim().isEmpty() ||
                address.getAddress1() == null || address.getAddress1().trim().isEmpty() ||
                address.getPincode() == null || address.getPincode().trim().isEmpty()) {
            throw new IllegalArgumentException("Complete delivery information (Full Name, Phone Number, Address 1, and Pincode) is required.");
        }

        if (user == null) {
            throw new IllegalArgumentException("Please log in to place your order.");
        }

        // Validate Transaction ID / UTR
        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new IllegalArgumentException("UPI Transaction ID / UTR Number is required.");
        }
        String cleanTxnId = transactionId.trim();
        if (cleanTxnId.length() < 6 || cleanTxnId.length() > 60) {
            throw new IllegalArgumentException("Please enter a valid UPI Transaction ID / UTR Number (between 6 and 60 characters).");
        }

        // Validate Screenshot
        if (screenshot == null || screenshot.isEmpty()) {
            throw new IllegalArgumentException("Please upload a payment screenshot.");
        }
        long maxSize = 10L * 1024 * 1024;
        if (screenshot.getSize() > maxSize) {
            throw new IllegalArgumentException("Payment screenshot exceeds the 10MB size limit.");
        }

        // Validate image magic bytes
        byte[] header = new byte[16];
        try (InputStream is = screenshot.getInputStream()) {
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                throw new IllegalArgumentException("Invalid or corrupt screenshot file.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read screenshot file: " + e.getMessage());
        }

        String extension = null;
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            extension = ".jpg";
        } else if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
                   (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) {
            extension = ".png";
        } else if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
                   header.length >= 12 && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            extension = ".webp";
        }

        if (extension == null) {
            throw new IllegalArgumentException("Invalid file format. Please upload a JPG, JPEG, or PNG image.");
        }

        // Gather items
        List<OrderItemData> itemsToProcess = new ArrayList<>();
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            for (OrderItemRequest reqItem : request.getItems()) {
                if (reqItem.getQuantity() != null && reqItem.getQuantity() > 0) {
                    itemsToProcess.add(new OrderItemData(
                            reqItem.getProductId(),
                            reqItem.getName(),
                            reqItem.getSelectedSize(),
                            reqItem.getQuantity(),
                            reqItem.getImage()
                    ));
                }
            }
        }

        if (itemsToProcess.isEmpty()) {
            List<CartItem> dbCartItems = cartItemRepository.findByUserOrderByCreatedAtAsc(user);
            for (CartItem ci : dbCartItems) {
                itemsToProcess.add(new OrderItemData(
                        ci.getProductId(),
                        ci.getName(),
                        ci.getSelectedSize(),
                        ci.getQuantity(),
                        ci.getImage()
                ));
            }
        }

        if (itemsToProcess.isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty. Please add items before placing an order.");
        }

        String orderNumber = generateUniqueOrderNumber();

        // Save screenshot securely in private storage directory
        Path privateDir = WebConfig.getPrivatePaymentStoragePath();
        String safeFileName = UUID.randomUUID().toString().substring(0, 8) + "_" + System.currentTimeMillis() + "_" + orderNumber + extension;
        Path destination = privateDir.resolve(safeFileName).normalize();

        try (InputStream is = screenshot.getInputStream()) {
            Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to securely save payment screenshot: " + e.getMessage());
        }

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setUser(user);
        order.setPaymentMethod("Pay Now");
        order.setPaymentStatus("PENDING_VERIFICATION");
        order.setOrderStatus("PENDING_VERIFICATION");
        order.setTransactionId(cleanTxnId);
        order.setPaymentScreenshotFilename(safeFileName);
        order.setPaymentSubmittedAt(LocalDateTime.now());
        order.setShippingFullName(address.getFullName().trim());
        order.setShippingPhone(address.getPhone().trim());
        order.setShippingEmail(address.getEmail() != null && !address.getEmail().trim().isEmpty() ? address.getEmail().trim() : user.getEmail());
        order.setShippingAddress1(address.getAddress1().trim());
        order.setShippingAddress2(address.getAddress2() != null ? address.getAddress2().trim() : "");
        order.setShippingPincode(address.getPincode().trim());

        double calculatedSubtotal = 0.0;
        for (OrderItemData itemData : itemsToProcess) {
            Product product = findProductByIdOrLegacyOrName(itemData.productId, itemData.name);
            if (product == null) {
                throw new IllegalArgumentException("Product not found in catalogue: " + itemData.name);
            }
            int requestedQty = itemData.quantity;
            if (product.getStockQuantity() != null && product.getStockQuantity() < requestedQty) {
                throw new IllegalStateException("Only " + product.getStockQuantity() + " items are available for " + product.getName() + ".");
            }
            double unitPrice = product.getPrice() != null ? product.getPrice() : 0.0;
            double itemSubtotal = unitPrice * requestedQty;
            calculatedSubtotal += itemSubtotal;

            if (product.getStockQuantity() != null) {
                product.setStockQuantity(Math.max(0, product.getStockQuantity() - requestedQty));
                productRepository.save(product);
            }

            String itemImage = (product.getMainImage() != null && !product.getMainImage().isEmpty())
                    ? product.getMainImage() : itemData.imageUrl;
            String category = product.getCategory() != null ? product.getCategory() : "Jewellery";

            OrderItem orderItem = new OrderItem(
                    order,
                    product,
                    product.getLegacyId() != null ? product.getLegacyId() : String.valueOf(product.getId()),
                    product.getName(),
                    category,
                    itemData.selectedSize,
                    requestedQty,
                    unitPrice,
                    itemSubtotal,
                    itemImage
            );
            order.addItem(orderItem);
        }

        order.setSubtotal(calculatedSubtotal);
        order.setDiscount(0.0);
        order.setShippingAmount(0.0);
        order.setTotalAmount(calculatedSubtotal);

        Order savedOrder = orderRepository.save(order);
        if (shopNotifications != null) shopNotifications.orderPlaced(savedOrder);

        // Clear user database cart now that order has been placed
        try {
            cartItemRepository.deleteByUser(user);
        } catch (Exception ignored) {}

        return OrderResponse.fromEntity(savedOrder);
    }

    /* =====================================================
       2. GET ORDERS FOR CURRENT USER
    ====================================================== */
    @Transactional(readOnly = true)
    public List<OrderResponse> getUserOrders(User user) {
        if (user == null) return Collections.emptyList();
        List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(user);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getUserOrder(User user, String orderNumber) {
        if (user == null || orderNumber == null) return null;
        Optional<Order> orderOpt = orderRepository.findByOrderNumberAndUser(orderNumber.trim(), user);
        return orderOpt.map(OrderResponse::fromEntity).orElse(null);
    }

    /* =====================================================
       3. GET ALL ORDERS (ADMIN)
    ====================================================== */
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc();
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getAdminOrder(String orderNumber) {
        if (orderNumber == null) return null;
        String cleanNum = orderNumber.trim().replace("#", "");
        Optional<Order> orderOpt = orderRepository.findByOrderNumber(cleanNum);
        return orderOpt.map(OrderResponse::fromEntity).orElse(null);
    }

    /* =====================================================
       4. UPDATE ORDER STATUS (ADMIN)
    ====================================================== */
    @Transactional
    public OrderResponse updateOrderStatus(String orderNumber, OrderStatusUpdateRequest request) {
        if (orderNumber == null) {
            throw new IllegalArgumentException("Order number is required.");
        }
        String cleanNum = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findByOrderNumber(cleanNum)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with number: " + orderNumber));

        if (request != null) {
            if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
                order.setOrderStatus(request.getStatus().trim());
            }
            if (request.getPaymentStatus() != null && !request.getPaymentStatus().trim().isEmpty()) {
                order.setPaymentStatus(request.getPaymentStatus().trim());
            }
        }

        Order updated = orderRepository.save(order);
        return OrderResponse.fromEntity(updated);
    }

    /* =====================================================
       5. CANCEL ORDER (USER)
    ====================================================== */
    @Transactional
    public OrderResponse cancelUserOrder(User user, String orderNumber) {
        if (user == null || orderNumber == null) {
            throw new IllegalArgumentException("Order number is required.");
        }
        String cleanNum = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findByOrderNumberAndUser(cleanNum, user)
                .orElseThrow(() -> new IllegalArgumentException("Order not found or does not belong to user."));

        if ("Delivered".equalsIgnoreCase(order.getOrderStatus()) || "Cancelled".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Cannot cancel an order that is already " + order.getOrderStatus() + ".");
        }

        order.setOrderStatus("Cancelled");

        // Restore stock to products
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() != null && item.getQuantity() != null) {
                    Product prod = item.getProduct();
                    int currentStock = prod.getStockQuantity() != null ? prod.getStockQuantity() : 0;
                    prod.setStockQuantity(currentStock + item.getQuantity());
                    productRepository.save(prod);
                }
            }
        }

        Order updated = orderRepository.save(order);
        return OrderResponse.fromEntity(updated);
    }

    /* =====================================================
       6. SUBMIT MANUAL UPI PAYMENT DETAILS (USER)
    ====================================================== */
    @Transactional
    public OrderResponse submitPaymentDetails(User user, String orderNumber, String transactionId, MultipartFile screenshot) {
        if (user == null) {
            throw new IllegalArgumentException("User authentication required.");
        }
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Order number is required.");
        }
        String cleanNum = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findByOrderNumberAndUser(cleanNum, user)
                .orElseThrow(() -> new IllegalArgumentException("Order not found or does not belong to you: #" + orderNumber));

        if ("CONFIRMED".equalsIgnoreCase(order.getOrderStatus()) || "PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new IllegalStateException("Payment has already been verified and confirmed for this order.");
        }

        if ("Cancelled".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Cannot submit payment details for a cancelled order.");
        }

        if (transactionId == null || transactionId.trim().isEmpty()) {
            throw new IllegalArgumentException("UPI Transaction ID / UTR Number is required.");
        }
        String cleanTxnId = transactionId.trim();
        if (cleanTxnId.length() < 6 || cleanTxnId.length() > 60) {
            throw new IllegalArgumentException("Please enter a valid UPI Transaction ID / UTR Number (between 6 and 60 characters).");
        }

        if (screenshot == null || screenshot.isEmpty()) {
            throw new IllegalArgumentException("Please upload a payment screenshot.");
        }

        // Validate screenshot size (max 10MB)
        long maxSize = 10L * 1024 * 1024;
        if (screenshot.getSize() > maxSize) {
            throw new IllegalArgumentException("Payment screenshot exceeds the 10MB size limit.");
        }

        // Validate image magic bytes
        byte[] header = new byte[16];
        try (InputStream is = screenshot.getInputStream()) {
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                throw new IllegalArgumentException("Invalid or corrupt screenshot file.");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read screenshot file contents: " + e.getMessage());
        }

        String extension = null;
        // JPEG: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            extension = ".jpg";
        }
        // PNG: 89 50 4E 47
        else if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
                 (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) {
            extension = ".png";
        }
        // WEBP: RIFF ... WEBP
        else if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
                 header.length >= 12 && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            extension = ".webp";
        }

        if (extension == null) {
            throw new IllegalArgumentException("Invalid file format. Please upload a JPG, JPEG, or PNG image.");
        }

        // Save screenshot securely in private storage directory (NOT public web directory)
        Path privateDir = WebConfig.getPrivatePaymentStoragePath();
        String safeFileName = UUID.randomUUID().toString().substring(0, 8) + "_" + System.currentTimeMillis() + "_" + cleanNum + extension;
        Path destination = privateDir.resolve(safeFileName).normalize();

        try (InputStream is = screenshot.getInputStream()) {
            Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to securely save payment screenshot: " + e.getMessage());
        }

        order.setPaymentStatus("PENDING_VERIFICATION");
        order.setOrderStatus("PENDING_VERIFICATION");
        order.setTransactionId(cleanTxnId);
        order.setPaymentScreenshotFilename(safeFileName);
        order.setPaymentSubmittedAt(LocalDateTime.now());
        order.setRejectionReason(null);

        Order saved = orderRepository.save(order);
        if (shopNotifications != null) shopNotifications.paymentSubmitted(saved);

        // Clear user database cart upon successful payment submission
        try {
            cartItemRepository.deleteByUser(user);
        } catch (Exception ignored) {}

        return OrderResponse.fromEntity(saved);
    }

    /* =====================================================
       7. VERIFY OR REJECT PAYMENT (ADMIN)
    ====================================================== */
    @Transactional
    public OrderResponse verifyPayment(String orderNumber, PaymentVerificationRequest request, User adminUser) {
        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            throw new IllegalArgumentException("Order number is required.");
        }
        String cleanNum = orderNumber.trim().replace("#", "");
        Order order = orderRepository.findByOrderNumber(cleanNum)
                .orElseThrow(() -> new IllegalArgumentException("Order not found with number: " + orderNumber));

        if (request == null || request.getAction() == null || request.getAction().trim().isEmpty()) {
            throw new IllegalArgumentException("Verification action ('PAID' or 'REJECTED') is required.");
        }

        String action = request.getAction().trim().toUpperCase();
        String adminIdentifier = adminUser != null ? adminUser.getEmail() : "Administrator";

        if ("PAID".equals(action)) {
            order.setPaymentStatus("PAID");
            order.setOrderStatus("CONFIRMED");
            order.setPaymentVerifiedAt(LocalDateTime.now());
            order.setVerifiedBy(adminIdentifier);
            order.setRejectionReason(null);

            // Trigger order confirmation email idempotently
            if (!Boolean.TRUE.equals(order.getConfirmationEmailSent())) {
                try {
                    boolean emailSent = emailService.sendOrderConfirmationEmail(order);
                    if (emailSent) {
                        order.setConfirmationEmailSent(true);
                        order.setConfirmationEmailSentAt(LocalDateTime.now());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send order confirmation email for order #{}: {}", order.getOrderNumber(), e.getMessage());
                }
            }
        } else if ("REJECTED".equals(action) || "REJECT".equals(action)) {
            order.setPaymentStatus("REJECTED");
            order.setOrderStatus("REJECTED");
            String reason = (request.getRejectionReason() != null && !request.getRejectionReason().trim().isEmpty())
                    ? request.getRejectionReason().trim()
                    : "Payment could not be verified in UPI / Bank records.";
            order.setRejectionReason(reason);
            order.setPaymentVerifiedAt(LocalDateTime.now());
            order.setVerifiedBy(adminIdentifier);

            // Automatically send payment rejection email to customer's registered email
            try {
                boolean emailSent = emailService.sendPaymentRejectionEmail(order, reason);
                if (emailSent) {
                    order.setRejectionEmailSent(true);
                    order.setRejectionEmailSentAt(LocalDateTime.now());
                }
            } catch (Exception e) {
                logger.error("Failed to send payment rejection email for order #{}: {}", order.getOrderNumber(), e.getMessage());
            }
        } else {
            throw new IllegalArgumentException("Invalid verification action: " + action + ". Must be 'PAID' or 'REJECTED'.");
        }

        Order saved = orderRepository.save(order);
        return OrderResponse.fromEntity(saved);
    }

    /* =====================================================
       8. GET SECURE PAYMENT SCREENSHOT PATH
    ====================================================== */
    @Transactional(readOnly = true)
    public Path getPaymentScreenshotPath(String orderNumber, User requestingUser, boolean isAdmin) {
        if (orderNumber == null) return null;
        String cleanNum = orderNumber.trim().replace("#", "");

        Order order = orderRepository.findByOrderNumber(cleanNum)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: #" + orderNumber));

        // If not admin, must be the owner of the order
        if (!isAdmin) {
            if (requestingUser == null || order.getUser() == null || !order.getUser().getId().equals(requestingUser.getId())) {
                throw new SecurityException("Unauthorized to access payment screenshot for this order.");
            }
        }

        String filename = order.getPaymentScreenshotFilename();
        if (filename == null || filename.trim().isEmpty()) {
            return null;
        }

        Path privateDir = WebConfig.getPrivatePaymentStoragePath();
        Path filePath = privateDir.resolve(filename).normalize();

        if (!Files.exists(filePath)) {
            return null;
        }

        return filePath;
    }

    /* =====================================================
       PRICE QUOTE (for the UPI payment QR)
       Same product lookup and database prices as order placement,
       but read-only: no order is created and no stock is reserved.
    ====================================================== */
    @Transactional(readOnly = true)
    public double quoteTotal(List<OrderItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Your cart is empty. Please add items before paying.");
        }
        double total = 0.0;
        for (OrderItemRequest item : items) {
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty <= 0) continue;
            Product product = findProductByIdOrLegacyOrName(item.getProductId(), item.getName());
            if (product == null) {
                throw new IllegalArgumentException("Product not found in catalogue: " + item.getName());
            }
            if (product.getStockQuantity() != null && product.getStockQuantity() < qty) {
                throw new IllegalStateException("Only " + product.getStockQuantity() + " items are available for " + product.getName() + ".");
            }
            total += (product.getPrice() != null ? product.getPrice() : 0.0) * qty;
        }
        if (total <= 0) {
            throw new IllegalArgumentException("Your cart is empty. Please add items before paying.");
        }
        return total;
    }

    /* =====================================================
       HELPERS
    ====================================================== */
    private Product findProductByIdOrLegacyOrName(String identifier, String productName) {
        if (identifier != null && !identifier.trim().isEmpty()) {
            String cleanId = identifier.trim();

            // Try by legacy ID
            Optional<Product> prodByLegacy = productRepository.findByLegacyId(cleanId);
            if (prodByLegacy.isPresent()) return prodByLegacy.get();

            // Try by numeric ID
            try {
                Long numId = Long.parseLong(cleanId);
                Optional<Product> prodByNum = productRepository.findById(numId);
                if (prodByNum.isPresent()) return prodByNum.get();
            } catch (NumberFormatException ignored) {
            }
        }

        // Try exact name match
        if (productName != null && !productName.trim().isEmpty()) {
            List<Product> matches = productRepository.findByNameContainingIgnoreCase(productName.trim());
            for (Product p : matches) {
                if (p.getName().equalsIgnoreCase(productName.trim())) {
                    return p;
                }
            }
            if (!matches.isEmpty()) {
                return matches.get(0);
            }
        }

        return null;
    }

    private String generateUniqueOrderNumber() {
        Random rand = new Random();
        for (int i = 0; i < 20; i++) {
            long code = 100000L + (Math.abs(rand.nextLong()) % 900000L);
            String candidate = "FQ" + code;
            if (!orderRepository.existsByOrderNumber(candidate)) {
                return candidate;
            }
        }
        return "FQ" + (System.currentTimeMillis() % 1000000L);
    }

    private static class OrderItemData {
        String productId;
        String name;
        String selectedSize;
        int quantity;
        String imageUrl;

        OrderItemData(String productId, String name, String selectedSize, int quantity, String imageUrl) {
            this.productId = productId;
            this.name = name;
            this.selectedSize = selectedSize;
            this.quantity = quantity;
            this.imageUrl = imageUrl;
        }
    }

}
