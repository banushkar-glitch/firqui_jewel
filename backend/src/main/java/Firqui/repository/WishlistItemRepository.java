package Firqui.repository;

import Firqui.entity.User;
import Firqui.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByUserOrderByCreatedAtDesc(User user);

    Optional<WishlistItem> findByUserAndId(User user, Long id);

    Optional<WishlistItem> findByUserAndName(User user, String name);

    Optional<WishlistItem> findByUserAndProductId(User user, String productId);

    boolean existsByUserAndName(User user, String name);

    void deleteByUser(User user);

    void deleteByUserAndId(User user, Long id);

    void deleteByUserAndName(User user, String name);
}
