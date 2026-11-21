package Firqui.repository;

import Firqui.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {

    Optional<Refund> findByRazorpayRefundId(String razorpayRefundId);

    List<Refund> findByOrderNumberOrderByInitiatedAtDesc(String orderNumber);

    List<Refund> findByOrderIdOrderByInitiatedAtDesc(Long orderId);

    List<Refund> findByRazorpayPaymentIdOrderByInitiatedAtDesc(String razorpayPaymentId);

    boolean existsByRazorpayRefundId(String razorpayRefundId);

    boolean existsByOrderNumberAndStatus(String orderNumber, String status);
}
