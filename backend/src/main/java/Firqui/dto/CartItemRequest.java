package Firqui.dto;

public class CartItemRequest {

    private String productId;
    private String name;
    private String description;
    private String selectedSize;
    private String size;
    private String measurement;
    private Object price;
    private String image;
    private Integer quantity = 1;

    public CartItemRequest() {
    }

    public CartItemRequest(String productId, String name, String description, Object price, String image, Integer quantity) {
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.image = image;
        this.quantity = quantity;
    }

    public CartItemRequest(String productId, String name, String description, String selectedSize, Object price, String image, Integer quantity) {
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.selectedSize = selectedSize;
        this.price = price;
        this.image = image;
        this.quantity = quantity;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
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
        if (price == null) {
            return 0.0;
        }
        if (price instanceof Number) {
            return ((Number) price).doubleValue();
        }
        String cleaned = price.toString()
                .replaceAll("[^0-9.]", "")
                .trim();
        if (cleaned.isEmpty()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(cleaned);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public Object getRawPrice() {
        return price;
    }

    public void setPrice(Object price) {
        this.price = price;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public Integer getQuantity() {
        return quantity != null && quantity > 0 ? quantity : 1;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getSelectedSize() {
        if (selectedSize != null && !selectedSize.trim().isEmpty()) {
            return selectedSize.trim();
        }
        if (size != null && !size.trim().isEmpty()) {
            return size.trim();
        }
        if (measurement != null && !measurement.trim().isEmpty()) {
            return measurement.trim();
        }
        return null;
    }

    public void setSelectedSize(String selectedSize) {
        this.selectedSize = selectedSize;
    }

    public String getSize() {
        return getSelectedSize();
    }

    public void setSize(String size) {
        this.size = size;
        if (this.selectedSize == null) {
            this.selectedSize = size;
        }
    }

    public String getMeasurement() {
        return getSelectedSize();
    }

    public void setMeasurement(String measurement) {
        this.measurement = measurement;
        if (this.selectedSize == null) {
            this.selectedSize = measurement;
        }
    }
}
