package Firqui.service;

import Firqui.dto.UpdateProfileRequest;
import Firqui.dto.UserProfileResponse;
import Firqui.entity.User;
import Firqui.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^\\d{10}$");

    private static final Pattern PINCODE_PATTERN =
            Pattern.compile("^\\d{6}$");

    @Autowired
    private UserRepository userRepository;

    public UserProfileResponse getProfile(User currentUser) {
        if (currentUser == null) {
            throw new IllegalArgumentException("User is not authenticated.");
        }
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        return mapToResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(User currentUser, UpdateProfileRequest request) {
        if (currentUser == null) {
            throw new IllegalArgumentException("User is not authenticated.");
        }
        if (request == null) {
            throw new IllegalArgumentException("Update request cannot be empty.");
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        // 1. Validate and update Name
        if (request.getFullName() != null) {
            String name = request.getFullName().trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("Full name cannot be empty.");
            }
            user.setName(name);
        }

        // 2. Validate and update Email
        if (request.getEmail() != null) {
            String email = request.getEmail().trim().toLowerCase();
            if (email.isEmpty() || !EMAIL_PATTERN.matcher(email).matches()) {
                throw new IllegalArgumentException("Please enter a valid email address.");
            }
            if (!email.equalsIgnoreCase(user.getEmail())) {
                Optional<User> existing = userRepository.findByEmail(email);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Email is already registered by another account.");
                }
                user.setEmail(email);
            }
        }

        // 3. Validate and update Phone Number
        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim().replaceAll("[^0-9]", "");
            if (!phone.isEmpty() && !PHONE_PATTERN.matcher(phone).matches()) {
                throw new IllegalArgumentException("Please enter a valid 10-digit mobile number.");
            }
            if (!phone.isEmpty() && !phone.equals(user.getMobileNumber())) {
                Optional<User> existing = userRepository.findByMobileNumber(phone);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Phone number is already registered by another account.");
                }
                user.setMobileNumber(phone);
            }
        }

        // 4. Validate and update Pincode
        if (request.getPincode() != null) {
            String pincode = request.getPincode().trim();
            if (!pincode.isEmpty() && !PINCODE_PATTERN.matcher(pincode).matches()) {
                throw new IllegalArgumentException("Pincode must be exactly 6 digits.");
            }
            user.setPincode(pincode.isEmpty() ? null : pincode);
        }

        // 5. Update Address 1 & Address 2
        if (request.getAddress1() != null) {
            user.setAddress1(request.getAddress1().trim());
        }
        if (request.getAddress2() != null) {
            user.setAddress2(request.getAddress2().trim());
        }

        User updated = userRepository.save(user);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteAccount(User currentUser) {
        if (currentUser == null) {
            throw new IllegalArgumentException("User is not authenticated.");
        }
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found."));

        // Soft delete deactivates the account safely to preserve order and payment history
        user.setActive(false);
        userRepository.save(user);
    }

    private UserProfileResponse mapToResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getMobileNumber(),
                user.getPincode(),
                user.getAddress1(),
                user.getAddress2(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
