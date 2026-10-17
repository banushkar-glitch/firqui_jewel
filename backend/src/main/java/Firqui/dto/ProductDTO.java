package Firqui.dto;

import java.util.ArrayList;
import java.util.List;

public class ProductDTO {

    private Long id;
    private String legacyId;
    private String name;
    private String description;
    private Double price;
    private Double comparePrice;
    private Integer stockQuantity = 10;
    private String category;
    private String collection;
    private String sku;
    private String gemstone;
    private String material;
    private String color;
    private String productColor;
    private String availability = "In Stock";
    private String restockDate;
    private String mainImage;
    private String referenceImage1;
    private String referenceImage2;
    private String referenceImage3;
    private String referenceImage4;
    private String mainMediaType;
    private String referenceMediaType1;
    private String referenceMediaType2;
    private String referenceMediaType3;
    private String referenceMediaType4;
    private List<String> images = new ArrayList<>();
    private List<String> measurement = new ArrayList<>();
    private List<String> measurements = new ArrayList<>();
    private String productDetailsDescription;
    private List<String> productDetailsHighlights = new ArrayList<>();
    private String tags;
    private Double discount;
    private String productName;
    private Boolean active = true;
    private String status;
    private Boolean featured = false;
    private Boolean newArrival = false;

    public ProductDTO() {
    }

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

    public String getProductName() {
        return productName != null ? productName : name;
    }

    public void setProductName(String productName) {
        this.productName = productName;
        if (this.name == null) {
            this.name = productName;
        }
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
        this.discount = discount;
    }

    public String getProductColor() {
        return productColor != null ? productColor : color;
    }

    public void setProductColor(String productColor) {
        this.productColor = productColor;
        if (this.color == null) {
            this.color = productColor;
        }
    }

    public List<String> getMeasurements() {
        return measurements != null && !measurements.isEmpty() ? measurements : measurement;
    }

    public void setMeasurements(List<String> measurements) {
        this.measurements = measurements != null ? measurements : new ArrayList<>();
        if (this.measurement == null || this.measurement.isEmpty()) {
            this.measurement = this.measurements;
        }
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
