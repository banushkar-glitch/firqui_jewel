package Firqui.repository;

import Firqui.entity.CartItem;
import Firqui.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUserOrderByCreatedAtAsc(User user);

    Optional<CartItem> findByUserAndId(User user, Long id);

    Optional<CartItem> findByUserAndName(User user, String name);

    Optional<CartItem> findByUserAndNameAndSelectedSize(User user, String name, String selectedSize);

    Optional<CartItem> findByUserAndProductId(User user, String productId);

    Optional<CartItem> findByUserAndProductIdAndSelectedSize(User user, String productId, String selectedSize);

    void deleteByUser(User user);

    void deleteByUserAndId(User user, Long id);

    void deleteByUserAndName(User user, String name);
}
