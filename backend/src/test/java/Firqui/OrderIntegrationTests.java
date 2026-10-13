package Firqui;

import Firqui.dto.*;
import Firqui.entity.Order;
import Firqui.entity.Product;
import Firqui.entity.User;
import Firqui.repository.CartItemRepository;
import Firqui.repository.OrderRepository;
import Firqui.repository.ProductRepository;
import Firqui.repository.UserRepository;
import Firqui.service.CartService;
import Firqui.service.OrderService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class OrderIntegrationTests {

    @Autowired
    private OrderService orderService;

    @Autowired
    private CartService cartService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    private static User testCustomer;
    private static String createdOrderNumber;

    @BeforeAll
    static void setup(@Autowired UserRepository userRepo,
                      @Autowired CartItemRepository cartRepo,
                      @Autowired OrderRepository orderRepo,
                      @Autowired ProductRepository prodRepo) {
        testCustomer = userRepo.findByEmail("order_tester@firqui.com").orElseGet(() -> {
            User u = new User("Order Tester", "order_tester@firqui.com", "9876500011", "Secret@123", "USER");
            u.setAddress1("Flat 101, Firqui Residency");
            u.setPincode("400001");
            return userRepo.save(u);
        });
        cartRepo.deleteAll(cartRepo.findByUserOrderByCreatedAtAsc(testCustomer));

        prodRepo.findByLegacyId("1").or(() -> prodRepo.findByNameIgnoreCase("Golden Grace")).orElseGet(() -> {
            Product p = new Product();
            p.setName("Golden Grace");
            p.setLegacyId("1");
            p.setCategory("BRACELETS & CUFFS");
            p.setPrice(1499.0);
            p.setStockQuantity(25);
            return prodRepo.save(p);
        });
    }

    @AfterAll
    static void teardown(@Autowired UserRepository userRepo,
                         @Autowired CartItemRepository cartRepo,
                         @Autowired OrderRepository orderRepo) {
        if (testCustomer != null) {
            cartRepo.deleteAll(cartRepo.findByUserOrderByCreatedAtAsc(testCustomer));
            List<Order> orders = orderRepo.findByUserOrderByCreatedAtDesc(testCustomer);
            orderRepo.deleteAll(orders);
            userRepo.delete(testCustomer);
        }
    }

    @Test
    @org.junit.jupiter.api.Order(1)
    void testCreateOrder_RecalculatesPriceAndDeductsStock() {
        // Fetch or create product before order to check stock
        Product productBefore = productRepository.findByLegacyId("1")
                .or(() -> productRepository.findByNameIgnoreCase("Golden Grace"))
                .orElseGet(() -> {
                    Product p = new Product();
                    p.setName("Golden Grace");
                    p.setLegacyId("1");
                    p.setCategory("BRACELETS & CUFFS");
                    p.setPrice(1499.0);
                    p.setStockQuantity(25);
                    return productRepository.save(p);
                });
        int initialStock = productBefore.getStockQuantity() != null ? productBefore.getStockQuantity() : 10;

        // 1. Add item to cart first
        CartItemRequest cartReq = new CartItemRequest(String.valueOf(productBefore.getId()), "Golden Grace", "Gold bracelet", "Small (6.5 in)", 1499.0, "../assets/Cuffs.png", 2);
        cartService.addToCart(testCustomer, cartReq);

        // 2. Submit order request
        ShippingAddressDTO address = new ShippingAddressDTO(
                "Order Tester",
                "9876500011",
                "order_tester@firqui.com",
                "Flat 101, Firqui Residency",
                "Marine Drive",
                "400001"
        );

        CreateOrderRequest orderReq = new CreateOrderRequest(address, "Cash on Delivery", Collections.emptyList());
        OrderResponse orderResponse = orderService.createOrder(testCustomer, orderReq);

        assertNotNull(orderResponse);
        assertNotNull(orderResponse.getOrderNumber());
        assertTrue(orderResponse.getOrderNumber().startsWith("FQ"));
        createdOrderNumber = orderResponse.getOrderNumber();

        // Subtotal must be calculated from database (product price: 1499.0 * 2 = 2998.0)
        assertEquals(2998.0, orderResponse.getTotalAmount());
        assertEquals("Processing", orderResponse.getOrderStatus());
        assertEquals("Pending", orderResponse.getPaymentStatus());
        assertEquals(1, orderResponse.getProducts().size());
        assertEquals("Golden Grace", orderResponse.getProducts().get(0).getName());
        assertEquals(2, orderResponse.getProducts().get(0).getQuantity());
        assertEquals("Small (6.5 in)", orderResponse.getProducts().get(0).getSelectedSize());

        // Stock must be deducted in database
        Product productAfter = productRepository.findById(productBefore.getId()).orElseThrow();
        assertEquals(initialStock - 2, productAfter.getStockQuantity());

        // User's cart must be cleared after order
        CartResponse cartAfter = cartService.getCart(testCustomer);
        assertTrue(cartAfter.getItems().isEmpty());
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    void testGetUserOrders_andGetAdminOrders() {
        assertNotNull(createdOrderNumber);

        // Current user orders
        List<OrderResponse> userOrders = orderService.getUserOrders(testCustomer);
        assertFalse(userOrders.isEmpty());
        assertEquals(createdOrderNumber, userOrders.get(0).getOrderNumber());

        // Admin all orders
        List<OrderResponse> allOrders = orderService.getAllOrders();
        assertTrue(allOrders.stream().anyMatch(o -> createdOrderNumber.equals(o.getOrderNumber())));

        // Admin single order
        OrderResponse singleOrder = orderService.getAdminOrder(createdOrderNumber);
        assertNotNull(singleOrder);
        assertEquals("Order Tester", singleOrder.getCustomer());
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    void testAdminUpdateOrderStatus() {
        assertNotNull(createdOrderNumber);

        OrderStatusUpdateRequest updateReq = new OrderStatusUpdateRequest("Shipped");
        updateReq.setPaymentStatus("Paid");

        OrderResponse updated = orderService.updateOrderStatus(createdOrderNumber, updateReq);
        assertEquals("Shipped", updated.getOrderStatus());
        assertEquals("Paid", updated.getPaymentStatus());
    }
}
