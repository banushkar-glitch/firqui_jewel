package Firqui;

import Firqui.dto.CreateOrderRequest;
import Firqui.dto.ShippingAddressDTO;
import Firqui.entity.User;
import Firqui.repository.CartItemRepository;
import Firqui.repository.UserRepository;
import Firqui.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Guests can order without an account, but a guest order only ever contains the items
 * it sends: it must never read or clear the saved cart of an account that happens to
 * share the email typed into the delivery form.
 */
public class GuestCheckoutUnitTests {

    private OrderService orderService;
    private CartItemRepository cartItemRepository;
    private UserRepository userRepository;
    private final User existingCustomer = new User("Existing Customer", "victim@example.com", "9876543210", "hash", "USER");

    @BeforeEach
    void setUp() {
        orderService = new OrderService();
        cartItemRepository = mock(CartItemRepository.class);
        userRepository = mock(UserRepository.class);
        ReflectionTestUtils.setField(orderService, "cartItemRepository", cartItemRepository);
        ReflectionTestUtils.setField(orderService, "userRepository", userRepository);
        when(userRepository.findByEmail("victim@example.com")).thenReturn(Optional.of(existingCustomer));
    }

    private CreateOrderRequest guestRequestWithoutItems() {
        ShippingAddressDTO address = new ShippingAddressDTO(
                "Someone Else", "9000000000", "victim@example.com", "1 Example Road", "", "411001");
        return new CreateOrderRequest(address, "Cash on Delivery", Collections.emptyList());
    }

    @Test
    @DisplayName("Guest order without items is rejected instead of using another account's cart")
    void guestOrderDoesNotUseExistingAccountCart() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.createOrder(null, guestRequestWithoutItems()));

        assertTrue(ex.getMessage().toLowerCase().contains("cart is empty"));
        verify(cartItemRepository, never()).findByUserOrderByCreatedAtAsc(any());
        verify(cartItemRepository, never()).deleteByUser(any());
    }

    @Test
    @DisplayName("Guests must give an email so the order confirmation can be sent")
    void guestNeedsEmail() {
        ShippingAddressDTO noEmail = new ShippingAddressDTO("Guest", "9000000001", "", "1 Example Road", "", "411001");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> orderService.createOrder(null, new CreateOrderRequest(noEmail, "Cash on Delivery", Collections.emptyList())));

        assertTrue(ex.getMessage().toLowerCase().contains("email"));
    }

    @Test
    @DisplayName("Logged-in checkout still falls back to the user's saved cart")
    void signedInOrderStillUsesOwnCart() {
        when(cartItemRepository.findByUserOrderByCreatedAtAsc(existingCustomer)).thenReturn(Collections.emptyList());

        assertThrows(IllegalArgumentException.class,
                () -> orderService.createOrder(existingCustomer, guestRequestWithoutItems()));

        verify(cartItemRepository).findByUserOrderByCreatedAtAsc(existingCustomer);
    }
}
