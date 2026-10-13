package Firqui.dto;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class CartResponse {

    private boolean success = true;
    private String message;
    private List<CartItemResponse> items = new ArrayList<>();
    private Double subtotal = 0.0;
    private String formattedSubtotal = "₹0";
    private Double total = 0.0;
    private String formattedTotal = "₹0";
    private int totalItems = 0;

    public CartResponse() {
    }

    public CartResponse(List<CartItemResponse> items, String message) {
        this.items = items != null ? items : new ArrayList<>();
        this.message = message;
        calculateTotals();
    }

    public void calculateTotals() {
        double sum = 0.0;
        int count = 0;
        for (CartItemResponse item : this.items) {
            sum += item.getItemTotal();
            count += item.getQuantity();
        }
        this.subtotal = sum;
        this.total = sum;
        this.totalItems = count;

        NumberFormat formatter = NumberFormat.getIntegerInstance(new Locale("en", "IN"));
        this.formattedSubtotal = "₹" + formatter.format(Math.round(this.subtotal));
        this.formattedTotal = "₹" + formatter.format(Math.round(this.total));
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<CartItemResponse> getItems() {
        return items;
    }

    public void setItems(List<CartItemResponse> items) {
        this.items = items;
        calculateTotals();
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

    public Double getTotal() {
        return total;
    }

    public void setTotal(Double total) {
        this.total = total;
    }

    public String getFormattedTotal() {
        return formattedTotal;
    }

    public void setFormattedTotal(String formattedTotal) {
        this.formattedTotal = formattedTotal;
    }

    public int getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(int totalItems) {
        this.totalItems = totalItems;
    }
}
