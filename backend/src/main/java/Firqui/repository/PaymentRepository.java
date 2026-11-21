package Firqui.repository;

import Firqui.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    List<Payment> findByOrderNumberOrderByCreatedAtDesc(String orderNumber);

    List<Payment> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    boolean existsByRazorpayPaymentId(String razorpayPaymentId);
}
