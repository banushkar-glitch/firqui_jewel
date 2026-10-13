package Firqui.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class RegisterRequest {

    @JsonAlias({"fullName", "username"})
    private String name;

    private String email;

    @JsonAlias({"mobile", "phone", "phoneNumber"})
    private String mobileNumber;

    private String password;

    private String confirmPassword;

    public RegisterRequest() {
    }

    public RegisterRequest(String name, String email, String mobileNumber, String password, String confirmPassword) {
        this.name = name;
        this.email = email;
        this.mobileNumber = mobileNumber;
        this.password = password;
        this.confirmPassword = confirmPassword;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getConfirmPassword() {
        return confirmPassword;
    }

    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }
}
