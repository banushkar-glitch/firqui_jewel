package Firqui.dto;

import java.text.NumberFormat;
import java.util.Locale;

public class CartItemResponse {

    private Long id;
    private String productId;
    private String name;
    private String description;
    private String selectedSize;
    private Double price;
    private String formattedPrice;
    private String image;
    private Integer quantity;
    private Double itemTotal;
    private String formattedItemTotal;

    public CartItemResponse() {
    }

    public CartItemResponse(Long id, String productId, String name, String description, Double price, String image, Integer quantity) {
        this(id, productId, name, description, null, price, image, quantity);
    }

    public CartItemResponse(Long id, String productId, String name, String description, String selectedSize, Double price, String image, Integer quantity) {
        this.id = id;
        this.productId = productId;
        this.name = name;
        this.description = description;
        this.selectedSize = selectedSize;
        this.price = price != null ? price : 0.0;
        this.image = image;
        this.quantity = quantity != null ? quantity : 1;
        this.itemTotal = this.price * this.quantity;

        NumberFormat formatter = NumberFormat.getIntegerInstance(new Locale("en", "IN"));
        this.formattedPrice = "₹" + formatter.format(Math.round(this.price));
        this.formattedItemTotal = "₹" + formatter.format(Math.round(this.itemTotal));
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

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getItemTotal() {
        return itemTotal;
    }

    public void setItemTotal(Double itemTotal) {
        this.itemTotal = itemTotal;
    }

    public String getFormattedItemTotal() {
        return formattedItemTotal;
    }

    public void setFormattedItemTotal(String formattedItemTotal) {
        this.formattedItemTotal = formattedItemTotal;
    }

    public String getSelectedSize() {
        return selectedSize;
    }

    public void setSelectedSize(String selectedSize) {
        this.selectedSize = selectedSize;
    }
}
