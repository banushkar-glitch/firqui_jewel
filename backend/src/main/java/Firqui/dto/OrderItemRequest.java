package Firqui.dto;

public class OrderItemRequest {

    private String productId;
    private String id;
    private String name;
    private String selectedSize;
    private String size;
    private String measurement;
    private Integer quantity = 1;
    private Object price;
    private String image;

    public OrderItemRequest() {
    }

    public OrderItemRequest(String productId, String name, String selectedSize, Integer quantity, Object price, String image) {
        this.productId = productId;
        this.name = name;
        this.selectedSize = selectedSize;
        this.quantity = quantity;
        this.price = price;
        this.image = image;
    }

    public String getProductId() {
        if (productId != null && !productId.trim().isEmpty()) {
            return productId.trim();
        }
        return id != null ? id.trim() : null;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getId() {
        return getProductId();
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public Integer getQuantity() {
        return quantity != null && quantity > 0 ? quantity : 1;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Object getPrice() {
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
}
