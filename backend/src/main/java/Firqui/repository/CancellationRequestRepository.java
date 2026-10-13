package Firqui.repository;

import Firqui.entity.CancellationRequest;
import Firqui.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CancellationRequestRepository extends JpaRepository<CancellationRequest, Long> {

    List<CancellationRequest> findByUserOrderByCreatedAtDesc(User user);

    List<CancellationRequest> findAllByOrderByCreatedAtDesc();

    List<CancellationRequest> findByStatusOrderByCreatedAtDesc(String status);

    Optional<CancellationRequest> findTopByOrderNumberOrderByCreatedAtDesc(String orderNumber);

    boolean existsByOrderNumberAndStatus(String orderNumber, String status);

    List<CancellationRequest> findByOrderNumberOrderByCreatedAtDesc(String orderNumber);
}
