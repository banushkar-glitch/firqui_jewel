package Firqui.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class UpdateProfileRequest {

    @JsonAlias({"name", "username"})
    private String fullName;

    private String email;

    @JsonAlias({"mobileNumber", "phone", "mobile"})
    private String phoneNumber;

    private String pincode;

    private String address1;

    private String address2;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, String email, String phoneNumber, String pincode, String address1, String address2) {
        this.fullName = fullName;
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.pincode = pincode;
        this.address1 = address1;
        this.address2 = address2;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public String getAddress1() {
        return address1;
    }

    public void setAddress1(String address1) {
        this.address1 = address1;
    }

    public String getAddress2() {
        return address2;
    }

    public void setAddress2(String address2) {
        this.address2 = address2;
    }
}
