package Firqui.controller;

import Firqui.dto.CartItemRequest;
import Firqui.dto.CartResponse;
import Firqui.dto.UpdateQuantityRequest;
import Firqui.entity.User;
import Firqui.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    /* =====================================================
       GET /api/cart - View cart
    ====================================================== */
    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal User user) {
        CartResponse response = cartService.getCart(user);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       POST /api/cart/items - Add product to cart
    ====================================================== */
    @PostMapping(path = {"", "/items", "/add"})
    public ResponseEntity<CartResponse> addToCart(
            @AuthenticationPrincipal User user,
            @RequestBody CartItemRequest request) {
        CartResponse response = cartService.addToCart(user, request);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       PUT /api/cart/items/{id} - Update item quantity
    ====================================================== */
    @PutMapping("/items/{id}")
    public ResponseEntity<CartResponse> updateQuantity(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody UpdateQuantityRequest request) {
        int quantity = (request != null && request.getQuantity() != null) ? request.getQuantity() : 1;
        CartResponse response = cartService.updateQuantity(user, id, quantity);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/cart/items/{id} - Remove product from cart
    ====================================================== */
    @DeleteMapping("/items/{id}")
    public ResponseEntity<CartResponse> removeFromCart(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        CartResponse response = cartService.removeFromCart(user, id);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/cart/items/by-name - Remove product by name
    ====================================================== */
    @DeleteMapping("/items/by-name")
    public ResponseEntity<CartResponse> removeFromCartByName(
            @AuthenticationPrincipal User user,
            @RequestParam String name) {
        CartResponse response = cartService.removeFromCartByName(user, name);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/cart - Clear cart
    ====================================================== */
    @DeleteMapping(path = {"", "/clear"})
    public ResponseEntity<CartResponse> clearCart(@AuthenticationPrincipal User user) {
        CartResponse response = cartService.clearCart(user);
        return ResponseEntity.ok(response);
    }
}
