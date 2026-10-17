package Firqui.repository;

import Firqui.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByLegacyId(String legacyId);

    boolean existsByLegacyId(String legacyId);

    List<Product> findByCategoryIgnoreCase(String category);

    List<Product> findByCollectionIgnoreCase(String collection);

    List<Product> findByActiveTrue();

    List<Product> findByFeaturedTrue();

    List<Product> findByNewArrivalTrue();

    List<Product> findByNameContainingIgnoreCase(String keyword);

    Optional<Product> findByNameIgnoreCase(String name);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);
}
