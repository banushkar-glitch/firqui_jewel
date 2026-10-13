package Firqui.dto;

import java.util.ArrayList;
import java.util.List;

public class WishlistResponse {

    private boolean success = true;
    private String message;
    private List<WishlistItemResponse> items = new ArrayList<>();
    private int totalItems = 0;

    public WishlistResponse() {
    }

    public WishlistResponse(List<WishlistItemResponse> items, String message) {
        this.items = items != null ? items : new ArrayList<>();
        this.message = message;
        this.totalItems = this.items.size();
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

    public List<WishlistItemResponse> getItems() {
        return items;
    }

    public void setItems(List<WishlistItemResponse> items) {
        this.items = items != null ? items : new ArrayList<>();
        this.totalItems = this.items.size();
    }

    public int getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(int totalItems) {
        this.totalItems = totalItems;
    }
}
