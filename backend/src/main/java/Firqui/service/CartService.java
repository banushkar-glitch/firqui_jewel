package Firqui.service;

import Firqui.dto.CartItemRequest;
import Firqui.dto.CartItemResponse;
import Firqui.dto.CartResponse;
import Firqui.entity.CartItem;
import Firqui.entity.User;
import Firqui.repository.CartItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CartService {

    @Autowired
    private CartItemRepository cartItemRepository;

    /* =====================================================
       1. VIEW CART
    ====================================================== */
    public CartResponse getCart(User user) {
        List<CartItem> items = cartItemRepository.findByUserOrderByCreatedAtAsc(user);
        List<CartItemResponse> responseItems = items.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new CartResponse(responseItems, "Cart retrieved successfully.");
    }

    /* =====================================================
       2. ADD PRODUCT TO CART
    ====================================================== */
    @Transactional
    public CartResponse addToCart(User user, CartItemRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Product name is required.");
        }

        String name = request.getName().trim();
        int quantityToAdd = request.getQuantity() != null && request.getQuantity() > 0 ? request.getQuantity() : 1;
        String selectedSize = request.getSelectedSize();

        // Check if product already exists in user's cart (matching size if present)
        Optional<CartItem> existingItem;
        if (selectedSize != null && !selectedSize.trim().isEmpty()) {
            existingItem = cartItemRepository.findByUserAndNameAndSelectedSize(user, name, selectedSize.trim());
        } else {
            existingItem = cartItemRepository.findByUserAndName(user, name);
        }

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantityToAdd);
            if (request.getPrice() != null && request.getPrice() > 0) {
                item.setPrice(request.getPrice());
            }
            if (request.getImage() != null && !request.getImage().trim().isEmpty()) {
                item.setImage(request.getImage());
            }
            if (selectedSize != null && !selectedSize.trim().isEmpty()) {
                item.setSelectedSize(selectedSize.trim());
            }
            cartItemRepository.save(item);
        } else {
            CartItem newItem = new CartItem(
                    user,
                    request.getProductId(),
                    name,
                    request.getDescription(),
                    selectedSize != null ? selectedSize.trim() : null,
                    request.getPrice(),
                    request.getImage(),
                    quantityToAdd
            );
            cartItemRepository.save(newItem);
        }

        return getCart(user);
    }

    /* =====================================================
       3. UPDATE QUANTITY
    ====================================================== */
    @Transactional
    public CartResponse updateQuantity(User user, Long itemId, int quantity) {
        Optional<CartItem> itemOptional = cartItemRepository.findByUserAndId(user, itemId);

        if (itemOptional.isEmpty()) {
            throw new IllegalArgumentException("Cart item not found.");
        }

        CartItem item = itemOptional.get();

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return getCart(user);
    }

    /* =====================================================
       4. REMOVE PRODUCT FROM CART
    ====================================================== */
    @Transactional
    public CartResponse removeFromCart(User user, Long itemId) {
        cartItemRepository.deleteByUserAndId(user, itemId);
        return getCart(user);
    }

    @Transactional
    public CartResponse removeFromCartByName(User user, String name) {
        if (name != null) {
            cartItemRepository.deleteByUserAndName(user, name.trim());
        }
        return getCart(user);
    }

    /* =====================================================
       5. CLEAR CART
    ====================================================== */
    @Transactional
    public CartResponse clearCart(User user) {
        cartItemRepository.deleteByUser(user);
        return getCart(user);
    }

    /* =====================================================
       HELPER
    ====================================================== */
    private CartItemResponse mapToResponse(CartItem item) {
        return new CartItemResponse(
                item.getId(),
                item.getProductId(),
                item.getName(),
                item.getDescription(),
                item.getSelectedSize(),
                item.getPrice(),
                item.getImage(),
                item.getQuantity()
        );
    }
}
