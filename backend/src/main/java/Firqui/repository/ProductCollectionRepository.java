package Firqui.repository;

import Firqui.entity.ProductCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductCollectionRepository extends JpaRepository<ProductCollection, Long> {

    Optional<ProductCollection> findByNameIgnoreCase(String name);

    Optional<ProductCollection> findBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);
}
