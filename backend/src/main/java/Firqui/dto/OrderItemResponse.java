package Firqui.dto;

import java.text.NumberFormat;
import java.util.Locale;

public class OrderItemResponse {

    private Long id;
    private String productId;
    private String productName;
    private String name;
    private String category;
    private String selectedSize;
    private Integer quantity;
    private Double unitPrice;
    private Double price;
    private String formattedPrice;
    private Double subtotal;
    private String formattedSubtotal;
    private String image;
    private String imageUrl;

    public OrderItemResponse() {
    }

    public OrderItemResponse(Long id, String productId, String productName, String category,
                             String selectedSize, Integer quantity, Double unitPrice,
                             Double subtotal, String imageUrl) {
        this.id = id;
        this.productId = productId;
        this.productName = productName;
        this.name = productName;
        this.category = category;
        this.selectedSize = selectedSize;
        this.quantity = quantity != null ? quantity : 1;
        this.unitPrice = unitPrice != null ? unitPrice : 0.0;
        this.price = this.unitPrice;
        this.subtotal = subtotal != null ? subtotal : (this.unitPrice * this.quantity);
        this.imageUrl = imageUrl;
        this.image = imageUrl;

        NumberFormat formatter = NumberFormat.getIntegerInstance(new Locale("en", "IN"));
        this.formattedPrice = "₹" + formatter.format(Math.round(this.unitPrice));
        this.formattedSubtotal = "₹" + formatter.format(Math.round(this.subtotal));
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

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
        this.name = productName;
    }

    public String getName() {
        return name != null ? name : productName;
    }

    public void setName(String name) {
        this.name = name;
        this.productName = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSelectedSize() {
        return selectedSize;
    }

    public void setSelectedSize(String selectedSize) {
        this.selectedSize = selectedSize;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
        this.price = unitPrice;
    }

    public Double getPrice() {
        return price != null ? price : unitPrice;
    }

    public void setPrice(Double price) {
        this.price = price;
        this.unitPrice = price;
    }

    public String getFormattedPrice() {
        return formattedPrice;
    }

    public void setFormattedPrice(String formattedPrice) {
        this.formattedPrice = formattedPrice;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public String getFormattedSubtotal() {
        return formattedSubtotal;
    }

    public void setFormattedSubtotal(String formattedSubtotal) {
        this.formattedSubtotal = formattedSubtotal;
    }

    public String getImage() {
        return image != null ? image : imageUrl;
    }

    public void setImage(String image) {
        this.image = image;
        this.imageUrl = image;
    }

    public String getImageUrl() {
        return imageUrl != null ? imageUrl : image;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        this.image = imageUrl;
    }
}
