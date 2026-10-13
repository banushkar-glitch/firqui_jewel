package Firqui.dto;

import java.text.NumberFormat;
import java.util.Locale;

public class WishlistItemResponse {

    private Long id;
    private String productId;
    private String name;
    private String description;
    private Double price;
    private String formattedPrice;
    private String image;

    public WishlistItemResponse() {
    }

    public WishlistItemResponse(Long id, String productId, String name, String description, Double price, String image) {
        this.id = id;
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.price = price != null ? price : 0.0;
        this.image = image;

        NumberFormat formatter = NumberFormat.getIntegerInstance(new Locale("en", "IN"));
        this.formattedPrice = "₹" + formatter.format(Math.round(this.price));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public String getFormattedPrice() {
        return formattedPrice;
    }

    public void setFormattedPrice(String formattedPrice) {
        this.formattedPrice = formattedPrice;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }
}
