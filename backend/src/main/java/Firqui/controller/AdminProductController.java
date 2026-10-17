package Firqui.controller;

import Firqui.dto.ApiResponse;
import Firqui.dto.ProductDTO;
import Firqui.entity.Product;
import Firqui.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/products")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AdminProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProductById(@PathVariable String id) {
        try {
            Product product = productService.getProductByIdOrLegacyId(id);
            return ResponseEntity.ok(product);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody ProductDTO productDTO) {
        try {
            Product created = productService.createProduct(productDTO);
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "Product created successfully");
            response.put("product", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to create product: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable String id, @RequestBody ProductDTO productDTO) {
        try {
            Product updated = productService.updateProduct(id, productDTO);
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", "Product updated successfully");
            response.put("product", updated);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to update product: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable String id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok(new ApiResponse(true, "Product deleted successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to delete product: " + e.getMessage()));
        }
    }

    /* =====================================================
       PATCH /{id}/status  { "status": "DRAFT" | "PUBLISHED" | "ARCHIVED" }
    ====================================================== */
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> changeStatus(@PathVariable String id, @RequestBody java.util.Map<String, String> body) {
        return respond(() -> productService.changeStatus(id, body.get("status")), "Status updated", HttpStatus.OK);
    }

    /* =====================================================
       POST /{id}/duplicate  -> new draft copy
    ====================================================== */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<?> duplicate(@PathVariable String id) {
        return respond(() -> productService.duplicateProduct(id), "Copy saved as a draft", HttpStatus.CREATED);
    }

    /* =====================================================
       PATCH /{id}/inventory  { price, comparePrice, stockQuantity, availability, restockDate }
    ====================================================== */
    @PatchMapping("/{id}/inventory")
    public ResponseEntity<?> updateInventory(@PathVariable String id, @RequestBody java.util.Map<String, Object> body) {
        return respond(() -> productService.updateInventory(id,
                number(body.get("price")),
                number(body.get("comparePrice")),
                body.containsKey("comparePrice") && body.get("comparePrice") == null,
                body.get("stockQuantity") != null ? (int) Math.round(number(body.get("stockQuantity"))) : null,
                body.get("availability") != null ? String.valueOf(body.get("availability")) : null,
                body.containsKey("restockDate") ? (body.get("restockDate") == null ? "" : String.valueOf(body.get("restockDate"))) : null),
                "Saved", HttpStatus.OK);
    }

    private static Double number(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.doubleValue();
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("\"" + s + "\" is not a number.");
        }
    }

    private ResponseEntity<?> respond(java.util.function.Supplier<Product> action, String message, HttpStatus okStatus) {
        try {
            Product product = action.get();
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("success", true);
            response.put("message", message);
            response.put("product", product);
            return ResponseEntity.status(okStatus).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiResponse(false, e.getMessage()));
        }
    }
}
