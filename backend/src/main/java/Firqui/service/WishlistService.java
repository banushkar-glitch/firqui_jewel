package Firqui.service;

import Firqui.dto.WishlistItemRequest;
import Firqui.dto.WishlistItemResponse;
import Firqui.dto.WishlistResponse;
import Firqui.entity.User;
import Firqui.entity.WishlistItem;
import Firqui.repository.WishlistItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class WishlistService {

    @Autowired
    private WishlistItemRepository wishlistItemRepository;

    /* =====================================================
       1. VIEW WISHLIST
    ====================================================== */
    public WishlistResponse getWishlist(User user) {
        List<WishlistItem> items = wishlistItemRepository.findByUserOrderByCreatedAtDesc(user);
        List<WishlistItemResponse> responseItems = items.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new WishlistResponse(responseItems, "Wishlist retrieved successfully.");
    }

    /* =====================================================
       2. ADD PRODUCT TO WISHLIST (PREVENT DUPLICATES)
    ====================================================== */
    @Transactional
    public WishlistResponse addToWishlist(User user, WishlistItemRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Product name is required.");
        }

        String name = request.getName().trim();

        // Prevent duplicate products for this user
        Optional<WishlistItem> existing = wishlistItemRepository.findByUserAndName(user, name);
        if (existing.isPresent()) {
            // Already present, return existing wishlist without creating duplicate
            return getWishlist(user);
        }

        WishlistItem newItem = new WishlistItem(
                user,
                request.getProductId(),
                name,
                request.getDescription(),
                request.getPrice(),
                request.getImage()
        );
        wishlistItemRepository.save(newItem);

        return getWishlist(user);
    }

    /* =====================================================
       3. REMOVE PRODUCT FROM WISHLIST
    ====================================================== */
    @Transactional
    public WishlistResponse removeFromWishlist(User user, Long itemId) {
        wishlistItemRepository.deleteByUserAndId(user, itemId);
        return getWishlist(user);
    }

    @Transactional
    public WishlistResponse removeFromWishlistByName(User user, String name) {
        if (name != null) {
            wishlistItemRepository.deleteByUserAndName(user, name.trim());
        }
        return getWishlist(user);
    }

    /* =====================================================
       4. CLEAR WISHLIST
    ====================================================== */
    @Transactional
    public WishlistResponse clearWishlist(User user) {
        wishlistItemRepository.deleteByUser(user);
        return getWishlist(user);
    }

    /* =====================================================
       5. CHECK IF IN WISHLIST
    ====================================================== */
    public boolean isInWishlist(User user, String name) {
        if (name == null) return false;
        return wishlistItemRepository.existsByUserAndName(user, name.trim());
    }

    /* =====================================================
       HELPER
    ====================================================== */
    private WishlistItemResponse mapToResponse(WishlistItem item) {
        return new WishlistItemResponse(
                item.getId(),
                item.getProductId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getImage()
        );
    }
}
