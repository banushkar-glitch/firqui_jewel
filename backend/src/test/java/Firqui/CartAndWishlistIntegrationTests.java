package Firqui;

import Firqui.dto.CartItemRequest;
import Firqui.dto.CartResponse;
import Firqui.dto.WishlistItemRequest;
import Firqui.dto.WishlistResponse;
import Firqui.entity.User;
import Firqui.repository.CartItemRepository;
import Firqui.repository.UserRepository;
import Firqui.repository.WishlistItemRepository;
import Firqui.service.CartService;
import Firqui.service.WishlistService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class CartAndWishlistIntegrationTests {

    @Autowired
    private CartService cartService;

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private WishlistItemRepository wishlistItemRepository;

    private static User testUser;

    @BeforeAll
    static void setup(@Autowired UserRepository userRepo,
                      @Autowired CartItemRepository cartRepo,
                      @Autowired WishlistItemRepository wishlistRepo) {
        testUser = userRepo.findByEmail("cart_test@firqui.com").orElseGet(() -> {
            User u = new User("Cart Tester", "cart_test@firqui.com", "9112233445", "Password123");
            return userRepo.save(u);
        });
        cartRepo.deleteByUser(testUser);
        wishlistRepo.deleteByUser(testUser);
    }

    @AfterAll
    static void teardown(@Autowired UserRepository userRepo,
                         @Autowired CartItemRepository cartRepo,
                         @Autowired WishlistItemRepository wishlistRepo) {
        if (testUser != null) {
            cartRepo.deleteByUser(testUser);
            wishlistRepo.deleteByUser(testUser);
            userRepo.delete(testUser);
        }
    }

    @Test
    @Order(1)
    void testAddToCart_andGetCart() {
        CartItemRequest req = new CartItemRequest("ring-1", "Elegant Ring", "Delicate ring", "2499", "../assets/rings/ring1.jpg", 1);
        CartResponse response = cartService.addToCart(testUser, req);

        assertTrue(response.isSuccess());
        assertEquals(1, response.getItems().size());
        assertEquals("Elegant Ring", response.getItems().get(0).getName());
        assertEquals(2499.0, response.getItems().get(0).getPrice());
        assertEquals(1, response.getItems().get(0).getQuantity());

        CartResponse fetched = cartService.getCart(testUser);
        assertEquals(1, fetched.getItems().size());
        assertEquals("Elegant Ring", fetched.getItems().get(0).getName());
    }

    @Test
    @Order(2)
    void testUpdateQuantity_andCalculateTotal() {
        CartResponse initial = cartService.getCart(testUser);
        assertFalse(initial.getItems().isEmpty());
        Long itemId = initial.getItems().get(0).getId();

        CartResponse updated = cartService.updateQuantity(testUser, itemId, 3);
        assertEquals(3, updated.getItems().get(0).getQuantity());
        assertEquals(2499.0 * 3, updated.getSubtotal());
    }

    @Test
    @Order(3)
    void testRemoveFromCart() {
        CartResponse current = cartService.getCart(testUser);
        Long itemId = current.getItems().get(0).getId();

        CartResponse afterRemove = cartService.removeFromCart(testUser, itemId);
        assertTrue(afterRemove.getItems().isEmpty());
    }

    @Test
    @Order(4)
    void testAddToWishlist_andCheck() {
        WishlistItemRequest req = new WishlistItemRequest("ring-1", "Elegant Ring", "Delicate ring", "2499", "../assets/rings/ring1.jpg");
        WishlistResponse response = wishlistService.addToWishlist(testUser, req);

        assertTrue(response.isSuccess());
        assertEquals(1, response.getItems().size());
        assertEquals("Elegant Ring", response.getItems().get(0).getName());

        assertTrue(wishlistService.isInWishlist(testUser, "Elegant Ring"));
        assertFalse(wishlistService.isInWishlist(testUser, "Non Existent Ring"));
    }

    @Test
    @Order(5)
    void testRemoveFromWishlistByName() {
        assertTrue(wishlistService.isInWishlist(testUser, "Elegant Ring"));
        WishlistResponse afterRemove = wishlistService.removeFromWishlistByName(testUser, "Elegant Ring");

        assertFalse(wishlistService.isInWishlist(testUser, "Elegant Ring"));
        assertTrue(afterRemove.getItems().isEmpty());
    }
}
