package Firqui.service;

import Firqui.dto.ProductDTO;
import Firqui.entity.Product;
import Firqui.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public List<Product> getActiveProducts() {
        return productRepository.findByActiveTrue();
    }

    public Product getProductByIdOrLegacyId(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Product identifier cannot be empty.");
        }
        identifier = identifier.trim();

        // 1. Try numeric primary key ID lookup first
        try {
            Long numericId = Long.parseLong(identifier);
            Optional<Product> productById = productRepository.findById(numericId);
            if (productById.isPresent()) {
                return productById.get();
            }
        } catch (NumberFormatException ignored) {
            // Not a numeric ID, fall through
        }

        // 2. Try legacy ID lookup fallback
        Optional<Product> productByLegacy = productRepository.findByLegacyId(identifier);
        if (productByLegacy.isPresent()) {
            return productByLegacy.get();
        }

        // 3. Try name lookup fallback
        Optional<Product> productByName = productRepository.findByNameIgnoreCase(identifier);
        if (productByName.isPresent()) {
            return productByName.get();
        }

        throw new IllegalArgumentException("Product not found with identifier: " + identifier);
    }

    public static String normalizeCategory(String cat) {
        if (cat == null) return "GENERAL";
        String clean = cat.trim().toLowerCase();
        if (clean.contains("earring")) return "EARRINGS";
        if (clean.contains("ring")) return "RINGS";
        if (clean.contains("necklace")) return "NECKLACES";
        if (clean.contains("bracelet") || clean.contains("cuff") || clean.contains("bangle")) return "BRACELETS & CUFFS";
        if (clean.contains("brooch")) return "BROOCHES";
        if (clean.contains("pearl")) return "PEARLS GONE ROGUE";
        return cat.trim().toUpperCase();
    }

    public List<Product> getProductsByCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return productRepository.findByActiveTrue();
        }
        String normalized = normalizeCategory(category);
        List<Product> matches = new ArrayList<>(productRepository.findByCategoryIgnoreCase(normalized));
        if (!normalized.equalsIgnoreCase(category.trim())) {
            List<Product> rawMatches = productRepository.findByCategoryIgnoreCase(category.trim());
            for (Product p : rawMatches) {
                if (matches.stream().noneMatch(m -> m.getId().equals(p.getId()))) {
                    matches.add(p);
                }
            }
        }
        return matches.stream()
                .filter(p -> p.getActive() == null || p.getActive())
                .collect(java.util.stream.Collectors.toList());
    }

    public List<Product> getProductsByCollection(String collection) {
        if (collection == null || collection.trim().isEmpty() || collection.equalsIgnoreCase("none")) {
            return java.util.Collections.emptyList();
        }
        return productRepository.findByCollectionIgnoreCase(collection)
                .stream()
                .filter(p -> p.getActive() == null || p.getActive())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public Product createProduct(ProductDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Product data cannot be empty.");
        }
        String name = dto.getName() != null && !dto.getName().trim().isEmpty() ? dto.getName().trim() : dto.getProductName();
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Product name is required.");
        }
        if (dto.getCategory() == null || dto.getCategory().trim().isEmpty()) {
            throw new IllegalArgumentException("Category is required.");
        }
        if (dto.getPrice() == null) {
            throw new IllegalArgumentException("Price is required.");
        }
        Product product = new Product();
        mapDtoToEntity(dto, product);
        Product saved = productRepository.save(product);
        if (saved.getLegacyId() == null || saved.getLegacyId().trim().isEmpty()) {
            saved.setLegacyId(String.valueOf(saved.getId()));
            saved = productRepository.save(saved);
        }
        return saved;
    }

    public static String detectMediaType(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }
        String clean = url.trim().toLowerCase();
        if (clean.contains(".mp4") || clean.contains(".webm") ||
            clean.startsWith("data:video/") || clean.contains("video/mp4") || clean.contains("video/webm")) {
            return "video";
        }
        return "image";
    }

    public void cleanupUnsharedMedia(String mediaUrl, Long currentProductId) {
        if (mediaUrl == null || !mediaUrl.startsWith("/uploads/")) {
            return;
        }
        try {
            // Check if any other product still references this exact media URL
            String checkSql = "SELECT COUNT(*) FROM products WHERE id <> ? AND (" +
                    "main_image = ? OR reference_image1 = ? OR reference_image2 = ? OR " +
                    "reference_image3 = ? OR reference_image4 = ?)";
            Long currentId = currentProductId != null ? currentProductId : -1L;
            Integer countInProducts = jdbcTemplate.queryForObject(checkSql, Integer.class,
                    currentId, mediaUrl, mediaUrl, mediaUrl, mediaUrl, mediaUrl);

            String checkInListSql = "SELECT COUNT(*) FROM product_images WHERE product_id <> ? AND image_url = ?";
            Integer countInList = jdbcTemplate.queryForObject(checkInListSql, Integer.class, currentId, mediaUrl);

            int totalOtherReferences = (countInProducts != null ? countInProducts : 0) + (countInList != null ? countInList : 0);
            if (totalOtherReferences == 0) {
                // Safe to remove the physical file
                String fileName = mediaUrl.substring("/uploads/".length());
                java.nio.file.Path filePath = Firqui.config.WebConfig.getUploadsPath().resolve(fileName).normalize();
                if (java.nio.file.Files.exists(filePath)) {
                    java.nio.file.Files.delete(filePath);
                }
            }
        } catch (Exception ignored) {
            // Failure to cleanup must not block product updates or deletions
        }
    }

    @Transactional
    public Product updateProduct(String identifier, ProductDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Product data cannot be empty.");
        }
        Product product = getProductByIdOrLegacyId(identifier);

        // Record previous media URLs to detect removed or replaced files for cleanup
        List<String> previousMediaUrls = new ArrayList<>();
        if (product.getMainImage() != null) previousMediaUrls.add(product.getMainImage());
        if (product.getReferenceImage1() != null) previousMediaUrls.add(product.getReferenceImage1());
        if (product.getReferenceImage2() != null) previousMediaUrls.add(product.getReferenceImage2());
        if (product.getReferenceImage3() != null) previousMediaUrls.add(product.getReferenceImage3());
        if (product.getReferenceImage4() != null) previousMediaUrls.add(product.getReferenceImage4());

        mapDtoToEntity(dto, product);
        if (product.getLegacyId() == null || product.getLegacyId().trim().isEmpty()) {
            product.setLegacyId(String.valueOf(product.getId()));
        }
        Product saved = productRepository.save(product);

        // Cleanup any media that was removed or replaced and is no longer used by this product
        List<String> currentMediaUrls = new ArrayList<>(product.getImages());
        for (String oldUrl : previousMediaUrls) {
            if (!currentMediaUrls.contains(oldUrl)) {
                cleanupUnsharedMedia(oldUrl, saved.getId());
            }
        }

        return saved;
    }

    @Transactional
    public void deleteProduct(String identifier) {
        Product product = getProductByIdOrLegacyId(identifier);
        Long productId = product.getId();
        String legacyId = product.getLegacyId();

        List<String> mediaToCleanup = new ArrayList<>();
        if (product.getMainImage() != null) mediaToCleanup.add(product.getMainImage());
        if (product.getReferenceImage1() != null) mediaToCleanup.add(product.getReferenceImage1());
        if (product.getReferenceImage2() != null) mediaToCleanup.add(product.getReferenceImage2());
        if (product.getReferenceImage3() != null) mediaToCleanup.add(product.getReferenceImage3());
        if (product.getReferenceImage4() != null) mediaToCleanup.add(product.getReferenceImage4());

        // 1. Unlink historical order items referencing this product so that foreign key constraints
        // do not prevent product deletion, while preserving all order details (name, price, qty, etc.)
        if (productId != null) {
            jdbcTemplate.update("UPDATE order_items SET product_db_id = NULL WHERE product_db_id = ?", productId);
        }

        // 2. Remove references to this deleted product from cart items without touching unrelated products
        if (productId != null) {
            jdbcTemplate.update("DELETE FROM cart_items WHERE product_id = ? OR (product_id IS NOT NULL AND product_id = ?)",
                    String.valueOf(productId), legacyId != null ? legacyId : String.valueOf(productId));
        }

        // 3. Remove references to this deleted product from wishlist items without touching unrelated products
        if (productId != null) {
            jdbcTemplate.update("DELETE FROM wishlist_items WHERE product_id = ? OR (product_id IS NOT NULL AND product_id = ?)",
                    String.valueOf(productId), legacyId != null ? legacyId : String.valueOf(productId));
        }

        // 4. Permanently delete the product and its element collections (images, measurements, highlights)
        productRepository.delete(product);
        productRepository.flush();

        // 5. Cleanup unshared media files
        for (String mediaUrl : mediaToCleanup) {
            cleanupUnsharedMedia(mediaUrl, null);
        }
    }

    private void mapDtoToEntity(ProductDTO dto, Product product) {
        String name = dto.getName() != null && !dto.getName().trim().isEmpty() ? dto.getName().trim() : dto.getProductName();
        if (name != null) product.setName(name);

        if (dto.getLegacyId() != null) product.setLegacyId(dto.getLegacyId());
        if (dto.getDescription() != null) product.setDescription(dto.getDescription());
        if (dto.getPrice() != null) product.setPrice(dto.getPrice());
        if (dto.getComparePrice() != null) product.setComparePrice(dto.getComparePrice());
        if (dto.getDiscount() != null) product.setDiscount(dto.getDiscount());
        if (dto.getStockQuantity() != null) product.setStockQuantity(dto.getStockQuantity());
        if (dto.getCategory() != null) product.setCategory(normalizeCategory(dto.getCategory()));

        if (dto.getCollection() != null) {
            String col = dto.getCollection().trim();
            if (col.isEmpty() || col.equalsIgnoreCase("none") || col.equalsIgnoreCase("no collection")) {
                product.setCollection(null);
            } else {
                product.setCollection(col);
            }
        } else {
            product.setCollection(null);
        }

        if (dto.getSku() != null) product.setSku(dto.getSku());
        if (dto.getGemstone() != null) product.setGemstone(dto.getGemstone());
        if (dto.getMaterial() != null) product.setMaterial(dto.getMaterial());

        String color = dto.getColor() != null && !dto.getColor().trim().isEmpty() ? dto.getColor() : dto.getProductColor();
        if (color != null) product.setColor(color);

        if (dto.getAvailability() != null) product.setAvailability(dto.getAvailability());
        if (dto.getRestockDate() != null) product.setRestockDate(dto.getRestockDate());

        // Media slots
        product.setMainImage(dto.getMainImage());
        product.setReferenceImage1(dto.getReferenceImage1());
        product.setReferenceImage2(dto.getReferenceImage2());
        product.setReferenceImage3(dto.getReferenceImage3());
        product.setReferenceImage4(dto.getReferenceImage4());

        // Media types
        product.setMainMediaType(dto.getMainMediaType() != null ? dto.getMainMediaType() : detectMediaType(dto.getMainImage()));
        product.setReferenceMediaType1(dto.getReferenceMediaType1() != null ? dto.getReferenceMediaType1() : detectMediaType(dto.getReferenceImage1()));
        product.setReferenceMediaType2(dto.getReferenceMediaType2() != null ? dto.getReferenceMediaType2() : detectMediaType(dto.getReferenceImage2()));
        product.setReferenceMediaType3(dto.getReferenceMediaType3() != null ? dto.getReferenceMediaType3() : detectMediaType(dto.getReferenceImage3()));
        product.setReferenceMediaType4(dto.getReferenceMediaType4() != null ? dto.getReferenceMediaType4() : detectMediaType(dto.getReferenceImage4()));

        // Collect all non-empty media into images collection for backward compatibility
        List<String> combinedImages = new ArrayList<>();
        if (product.getMainImage() != null && !product.getMainImage().trim().isEmpty()) {
            combinedImages.add(product.getMainImage().trim());
        }
        if (product.getReferenceImage1() != null && !product.getReferenceImage1().trim().isEmpty()) {
            combinedImages.add(product.getReferenceImage1().trim());
        }
        if (product.getReferenceImage2() != null && !product.getReferenceImage2().trim().isEmpty()) {
            combinedImages.add(product.getReferenceImage2().trim());
        }
        if (product.getReferenceImage3() != null && !product.getReferenceImage3().trim().isEmpty()) {
            combinedImages.add(product.getReferenceImage3().trim());
        }
        if (product.getReferenceImage4() != null && !product.getReferenceImage4().trim().isEmpty()) {
            combinedImages.add(product.getReferenceImage4().trim());
        }

        // If specific slots were not set but images list was provided in DTO (e.g. older payloads or tests)
        if (combinedImages.isEmpty() && dto.getImages() != null && !dto.getImages().isEmpty()) {
            combinedImages.addAll(dto.getImages());
            if (product.getMainImage() == null && !combinedImages.isEmpty()) {
                product.setMainImage(combinedImages.get(0));
                product.setMainMediaType(detectMediaType(combinedImages.get(0)));
            }
            if (product.getReferenceImage1() == null && combinedImages.size() > 1) {
                product.setReferenceImage1(combinedImages.get(1));
                product.setReferenceMediaType1(detectMediaType(combinedImages.get(1)));
            }
            if (product.getReferenceImage2() == null && combinedImages.size() > 2) {
                product.setReferenceImage2(combinedImages.get(2));
                product.setReferenceMediaType2(detectMediaType(combinedImages.get(2)));
            }
            if (product.getReferenceImage3() == null && combinedImages.size() > 3) {
                product.setReferenceImage3(combinedImages.get(3));
                product.setReferenceMediaType3(detectMediaType(combinedImages.get(3)));
            }
            if (product.getReferenceImage4() == null && combinedImages.size() > 4) {
                product.setReferenceImage4(combinedImages.get(4));
                product.setReferenceMediaType4(detectMediaType(combinedImages.get(4)));
            }
        }
        product.setImages(combinedImages);

        List<String> measurements = dto.getMeasurement() != null && !dto.getMeasurement().isEmpty() ? dto.getMeasurement() : dto.getMeasurements();
        if (measurements != null) product.setMeasurement(measurements);

        if (dto.getProductDetailsDescription() != null) product.setProductDetailsDescription(dto.getProductDetailsDescription());
        if (dto.getProductDetailsHighlights() != null) product.setProductDetailsHighlights(dto.getProductDetailsHighlights());
        if (dto.getTags() != null) product.setTags(dto.getTags());
        if (dto.getActive() != null) product.setActive(dto.getActive());
        if (dto.getFeatured() != null) product.setFeatured(dto.getFeatured());
        if (dto.getNewArrival() != null) product.setNewArrival(dto.getNewArrival());
    }
}
