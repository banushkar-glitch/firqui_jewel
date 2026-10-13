package Firqui.dto;

public class WishlistItemRequest {

    private String productId;
    private String name;
    private String description;
    private Object price;
    private String image;

    public WishlistItemRequest() {
    }

    public WishlistItemRequest(String productId, String name, String description, Object price, String image) {
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.image = image;
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
}
