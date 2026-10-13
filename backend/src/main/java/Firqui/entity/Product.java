package Firqui.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "legacy_id")
    private String legacyId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double price;

    @Column(name = "compare_price")
    private Double comparePrice;

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 10;

    private String category;
    private String collection;
    private String sku;
    private String gemstone;
    private String material;
    private String color;
    private String availability = "In Stock";
    private String restockDate;

    @Column(name = "main_image", columnDefinition = "TEXT")
    private String mainImage;

    @Column(name = "reference_image1", columnDefinition = "TEXT")
    private String referenceImage1;

    @Column(name = "reference_image2", columnDefinition = "TEXT")
    private String referenceImage2;

    @Column(name = "reference_image3", columnDefinition = "TEXT")
    private String referenceImage3;

    @Column(name = "reference_image4", columnDefinition = "TEXT")
    private String referenceImage4;

    @Column(name = "main_media_type")
    private String mainMediaType;

    @Column(name = "reference_media_type1")
    private String referenceMediaType1;

    @Column(name = "reference_media_type2")
    private String referenceMediaType2;

    @Column(name = "reference_media_type3")
    private String referenceMediaType3;

    @Column(name = "reference_media_type4")
    private String referenceMediaType4;

    private Double discount;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", columnDefinition = "TEXT")
    private List<String> images = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_measurements", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "measurement")
    private List<String> measurement = new ArrayList<>();

    @Column(name = "details_description", columnDefinition = "TEXT")
    private String productDetailsDescription;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_highlights", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "highlight")
    private List<String> productDetailsHighlights = new ArrayList<>();

    private String tags;
    private Boolean active = true;
    private Boolean featured = false;
    private Boolean newArrival = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Product() {
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        calculateDiscount();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        calculateDiscount();
    }

    private void calculateDiscount() {
        if (this.discount == null && this.comparePrice != null && this.price != null && this.comparePrice > this.price) {
            this.discount = Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100.0 * 10.0) / 10.0;
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getLegacyId() {
        return legacyId;
    }

    public void setLegacyId(String legacyId) {
        this.legacyId = legacyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getComparePrice() {
        return comparePrice;
    }

    public void setComparePrice(Double comparePrice) {
        this.comparePrice = comparePrice;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getCollection() {
        return collection;
    }

    public void setCollection(String collection) {
        this.collection = collection;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getGemstone() {
        return gemstone;
    }

    public void setGemstone(String gemstone) {
        this.gemstone = gemstone;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getAvailability() {
        return availability;
    }

    public void setAvailability(String availability) {
        this.availability = availability;
    }

    public String getRestockDate() {
        return restockDate;
    }

    public void setRestockDate(String restockDate) {
        this.restockDate = restockDate;
    }

    public String getMainImage() {
        return mainImage;
    }

    public void setMainImage(String mainImage) {
        this.mainImage = mainImage;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images != null ? images : new ArrayList<>();
    }

    public List<String> getMeasurement() {
        return measurement;
    }

    public void setMeasurement(List<String> measurement) {
        this.measurement = measurement != null ? measurement : new ArrayList<>();
    }

    public String getProductDetailsDescription() {
        return productDetailsDescription;
    }

    public void setProductDetailsDescription(String productDetailsDescription) {
        this.productDetailsDescription = productDetailsDescription;
    }

    public List<String> getProductDetailsHighlights() {
        return productDetailsHighlights;
    }

    public void setProductDetailsHighlights(List<String> productDetailsHighlights) {
        this.productDetailsHighlights = productDetailsHighlights != null ? productDetailsHighlights : new ArrayList<>();
    }

    public String getTags() {
        return tags;
    }

    public void setTags(String tags) {
        this.tags = tags;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public Boolean getFeatured() {
        return featured;
    }

    public void setFeatured(Boolean featured) {
        this.featured = featured;
    }

    public Boolean getNewArrival() {
        return newArrival;
    }

    public void setNewArrival(Boolean newArrival) {
        this.newArrival = newArrival;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public String getProductName() {
        return name;
    }

    public void setProductName(String productName) {
        if (productName != null) {
            this.name = productName;
        }
    }

    public String getProductColor() {
        return color;
    }

    public void setProductColor(String productColor) {
        this.color = productColor;
    }

    public List<String> getMeasurements() {
        return measurement;
    }

    public void setMeasurements(List<String> measurements) {
        this.measurement = measurements != null ? measurements : new ArrayList<>();
    }

    public String getReferenceImage1() {
        return referenceImage1;
    }

    public void setReferenceImage1(String referenceImage1) {
        this.referenceImage1 = referenceImage1;
    }

    public String getReferenceImage2() {
        return referenceImage2;
    }

    public void setReferenceImage2(String referenceImage2) {
        this.referenceImage2 = referenceImage2;
    }

    public String getReferenceImage3() {
        return referenceImage3;
    }

    public void setReferenceImage3(String referenceImage3) {
        this.referenceImage3 = referenceImage3;
    }

    public String getReferenceImage4() {
        return referenceImage4;
    }

    public void setReferenceImage4(String referenceImage4) {
        this.referenceImage4 = referenceImage4;
    }

    public String getMainMediaType() {
        return mainMediaType;
    }

    public void setMainMediaType(String mainMediaType) {
        this.mainMediaType = mainMediaType;
    }

    public String getReferenceMediaType1() {
        return referenceMediaType1;
    }

    public void setReferenceMediaType1(String referenceMediaType1) {
        this.referenceMediaType1 = referenceMediaType1;
    }

    public String getReferenceMediaType2() {
        return referenceMediaType2;
    }

    public void setReferenceMediaType2(String referenceMediaType2) {
        this.referenceMediaType2 = referenceMediaType2;
    }

    public String getReferenceMediaType3() {
        return referenceMediaType3;
    }

    public void setReferenceMediaType3(String referenceMediaType3) {
        this.referenceMediaType3 = referenceMediaType3;
    }

    public String getReferenceMediaType4() {
        return referenceMediaType4;
    }

    public void setReferenceMediaType4(String referenceMediaType4) {
        this.referenceMediaType4 = referenceMediaType4;
    }
}
