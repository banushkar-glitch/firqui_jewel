package Firqui;

import Firqui.controller.AdminProductController;
import Firqui.dto.ProductDTO;
import Firqui.entity.Product;
import Firqui.repository.ProductRepository;
import Firqui.service.ProductService;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ProductCrudIntegrationTests {

    @Autowired
    private AdminProductController adminProductController;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Test
    @org.junit.jupiter.api.Order(1)
    @Transactional
    void testCreateProduct_SuccessWithCollectionNone() {
        ProductDTO dto = new ProductDTO();
        dto.setName("Test Ring");
        dto.setCategory("Rings");
        dto.setCollection("None");
        dto.setPrice(5000.0);
        dto.setStockQuantity(10);
        dto.setDescription("A handcrafted test ring");
        dto.setImages(Arrays.asList("../assets/Heart Pearl Ring.png"));

        ResponseEntity<?> response = adminProductController.createProduct(dto);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());

        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(true, body.get("success"));
        assertEquals("Product created successfully", body.get("message"));

        Product created = (Product) body.get("product");
        assertNotNull(created);
        assertNotNull(created.getId());
        assertEquals("Test Ring", created.getName());
        assertEquals("RINGS", created.getCategory());
        assertNull(created.getCollection(), "Collection 'None' must be stored as null in database");

        // Verify it appears in category query for user website
        List<Product> rings = productService.getProductsByCategory("RINGS");
        assertTrue(rings.stream().anyMatch(p -> "Test Ring".equals(p.getName())));

        // Verify it does NOT appear in collection query (collection is null)
        List<Product> signatureCollection = productService.getProductsByCollection("Signature");
        assertFalse(signatureCollection.stream().anyMatch(p -> "Test Ring".equals(p.getName())));
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    void testCreateProduct_ValidationFailsOnMissingCategory() {
        ProductDTO dto = new ProductDTO();
        dto.setName("No Category Ring");
        dto.setPrice(5000.0);

        ResponseEntity<?> response = adminProductController.createProduct(dto);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @Transactional
    void testUpdateProduct_CategoryAndPriceChange() {
        ProductDTO createDto = new ProductDTO();
        createDto.setName("Mutable Jewel");
        createDto.setCategory("Rings");
        createDto.setPrice(3000.0);

        ResponseEntity<?> createRes = adminProductController.createProduct(createDto);
        @SuppressWarnings("unchecked")
        Map<String, Object> createBody = (Map<String, Object>) createRes.getBody();
        Product saved = (Product) createBody.get("product");

        // Update to Earrings and 3500.0
        ProductDTO updateDto = new ProductDTO();
        updateDto.setName("Mutable Jewel");
        updateDto.setCategory("Earrings");
        updateDto.setPrice(3500.0);

        ResponseEntity<?> updateRes = adminProductController.updateProduct(String.valueOf(saved.getId()), updateDto);
        assertEquals(HttpStatus.OK, updateRes.getStatusCode());

        @SuppressWarnings("unchecked")
        Map<String, Object> updateBody = (Map<String, Object>) updateRes.getBody();
        Product updated = (Product) updateBody.get("product");
        assertEquals("EARRINGS", updated.getCategory());
        assertEquals(3500.0, updated.getPrice());

        // Must now be under Earrings, not Rings
        List<Product> rings = productService.getProductsByCategory("RINGS");
        assertFalse(rings.stream().anyMatch(p -> p.getId().equals(saved.getId())));

        List<Product> earrings = productService.getProductsByCategory("EARRINGS");
        assertTrue(earrings.stream().anyMatch(p -> p.getId().equals(saved.getId())));
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    void testDeleteProduct_NewlyCreatedProduct() {
        ProductDTO newDto = new ProductDTO();
        newDto.setName("Deletable New Ring");
        newDto.setCategory("RINGS");
        newDto.setPrice(1999.0);
        newDto.setStockQuantity(5);
        newDto.setImages(Arrays.asList("../assets/Heart Pearl Ring.png"));

        ResponseEntity<?> createRes = adminProductController.createProduct(newDto);
        assertEquals(HttpStatus.CREATED, createRes.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) createRes.getBody();
        Product created = (Product) body.get("product");
        assertNotNull(created.getId());

        // Now delete it via AdminProductController
        ResponseEntity<?> deleteRes = adminProductController.deleteProduct(String.valueOf(created.getId()));
        assertEquals(HttpStatus.OK, deleteRes.getStatusCode());

        // Verify it is completely gone from repository
        assertFalse(productRepository.existsById(created.getId()));
        assertThrows(IllegalArgumentException.class, () -> {
            productService.getProductByIdOrLegacyId(String.valueOf(created.getId()));
        });
    }
}

