package Firqui.repository;

import Firqui.entity.Order;
import Firqui.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByUserOrderByCreatedAtDesc(User user);

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByOrderNumberAndUser(String orderNumber, User user);

    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);

    List<Order> findAllByOrderByCreatedAtDesc();

    boolean existsByOrderNumber(String orderNumber);

    /* Row-locking reads (SELECT ... FOR UPDATE) so that the checkout callback, the webhook
       and refunds never update the same order at the same time. Use inside a transaction. */

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findLockedByOrderNumber(String orderNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findLockedByRazorpayOrderId(String razorpayOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Order> findLockedByRazorpayPaymentId(String razorpayPaymentId);

    /** Online-payment orders still waiting for payment that were created before the given time. */
    List<Order> findByPaymentStatusAndCreatedAtBefore(String paymentStatus, LocalDateTime createdBefore);
}
