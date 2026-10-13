package Firqui.controller;

import Firqui.dto.WishlistItemRequest;
import Firqui.dto.WishlistResponse;
import Firqui.entity.User;
import Firqui.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    /* =====================================================
       GET /api/wishlist - View wishlist
    ====================================================== */
    @GetMapping
    public ResponseEntity<WishlistResponse> getWishlist(@AuthenticationPrincipal User user) {
        WishlistResponse response = wishlistService.getWishlist(user);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       POST /api/wishlist/items - Add product to wishlist
    ====================================================== */
    @PostMapping(path = {"", "/items", "/add"})
    public ResponseEntity<WishlistResponse> addToWishlist(
            @AuthenticationPrincipal User user,
            @RequestBody WishlistItemRequest request) {
        WishlistResponse response = wishlistService.addToWishlist(user, request);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/wishlist/items/{id} - Remove item from wishlist
    ====================================================== */
    @DeleteMapping("/items/{id}")
    public ResponseEntity<WishlistResponse> removeFromWishlist(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {
        WishlistResponse response = wishlistService.removeFromWishlist(user, id);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/wishlist/items/by-name - Remove item by name
    ====================================================== */
    @DeleteMapping("/items/by-name")
    public ResponseEntity<WishlistResponse> removeFromWishlistByName(
            @AuthenticationPrincipal User user,
            @RequestParam String name) {
        WishlistResponse response = wishlistService.removeFromWishlistByName(user, name);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       DELETE /api/wishlist - Clear wishlist
    ====================================================== */
    @DeleteMapping(path = {"", "/clear"})
    public ResponseEntity<WishlistResponse> clearWishlist(@AuthenticationPrincipal User user) {
        WishlistResponse response = wishlistService.clearWishlist(user);
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       GET /api/wishlist/check?name=... - Check if in wishlist
    ====================================================== */
    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> checkInWishlist(
            @AuthenticationPrincipal User user,
            @RequestParam String name) {
        boolean inWishlist = wishlistService.isInWishlist(user, name);
        return ResponseEntity.ok(Collections.singletonMap("inWishlist", inWishlist));
    }
}
