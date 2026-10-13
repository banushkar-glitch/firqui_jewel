package Firqui.dto;

public class ShippingAddressDTO {

    private String fullName;
    private String name;
    private String phone;
    private String phoneNumber;
    private String mobileNumber;
    private String email;
    private String address1;
    private String address2;
    private String pincode;

    public ShippingAddressDTO() {
    }

    public ShippingAddressDTO(String fullName, String phone, String email, String address1, String address2, String pincode) {
        this.fullName = fullName;
        this.name = fullName;
        this.phone = phone;
        this.phoneNumber = phone;
        this.mobileNumber = phone;
        this.email = email;
        this.address1 = address1;
        this.address2 = address2;
        this.pincode = pincode;
    }

    public String getFullName() {
        if (fullName != null && !fullName.trim().isEmpty()) {
            return fullName.trim();
        }
        return name != null ? name.trim() : "";
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
        this.name = fullName;
    }

    public String getName() {
        return getFullName();
    }

    public void setName(String name) {
        setFullName(name);
    }

    public String getPhone() {
        if (phone != null && !phone.trim().isEmpty()) {
            return phone.trim();
        }
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            return phoneNumber.trim();
        }
        return mobileNumber != null ? mobileNumber.trim() : "";
    }

    public void setPhone(String phone) {
        this.phone = phone;
        this.phoneNumber = phone;
        this.mobileNumber = phone;
    }

    public String getPhoneNumber() {
        return getPhone();
    }

    public void setPhoneNumber(String phoneNumber) {
        setPhone(phoneNumber);
    }

    public String getMobileNumber() {
        return getPhone();
    }

    public void setMobileNumber(String mobileNumber) {
        setPhone(mobileNumber);
    }

    public String getEmail() {
        return email != null ? email.trim() : "";
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAddress1() {
        return address1 != null ? address1.trim() : "";
    }

    public void setAddress1(String address1) {
        this.address1 = address1;
    }

    public String getAddress2() {
        return address2 != null ? address2.trim() : "";
    }

    public void setAddress2(String address2) {
        this.address2 = address2;
    }

    public String getPincode() {
        return pincode != null ? pincode.trim() : "";
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }
}
