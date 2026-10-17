package Firqui.service;

import Firqui.dto.*;
import Firqui.entity.PasswordResetToken;
import Firqui.entity.User;
import Firqui.repository.PasswordResetTokenRepository;
import Firqui.repository.UserRepository;
import Firqui.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final Pattern MOBILE_PATTERN =
            Pattern.compile("^\\d{10}$");

    // Hash of a random string, compared against when no account matches
    private volatile String dummyHash;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    @Value("${app.frontend.reset-password-url:http://localhost:5500/authentication/reset-password.html}")
    private String resetPasswordUrl;

    /* =====================================================
       1. REGISTER
    ====================================================== */
    @Transactional
    public ApiResponse register(RegisterRequest request) {
        if (request == null) {
            return ApiResponse.error("Request body cannot be empty.");
        }

        String name = request.getName() != null ? request.getName().trim() : "";
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String mobile = request.getMobileNumber() != null ? request.getMobileNumber().trim().replaceAll("[^0-9]", "") : "";
        String password = request.getPassword();
        String confirmPassword = request.getConfirmPassword();

        // 1. Validate name
        if (name.isEmpty()) {
            return ApiResponse.error("Full name is required.");
        }

        // 2. Validate email
        if (email.isEmpty() || !EMAIL_PATTERN.matcher(email).matches()) {
            return ApiResponse.error("Please enter a valid email address.");
        }

        // 3. Validate mobile number
        if (mobile.isEmpty() || !MOBILE_PATTERN.matcher(mobile).matches()) {
            return ApiResponse.error("Please enter a valid 10-digit mobile number.");
        }

        // 4. Validate password (min 8 characters only, any character type accepted)
        if (password == null || password.length() < 8) {
            return ApiResponse.error("Password must be at least 8 characters long.");
        }

        // 5. Validate confirm password & check match
        if (confirmPassword == null || !password.equals(confirmPassword)) {
            return ApiResponse.error("Passwords do not match.");
        }

        // 6. Check unique email
        if (userRepository.existsByEmail(email)) {
            return ApiResponse.error("Email address is already registered.");
        }

        // 7. Check unique mobile number
        if (userRepository.existsByMobileNumber(mobile)) {
            return ApiResponse.error("Mobile number is already registered.");
        }

        // 8. Hash password with BCrypt and save
        String hashedPassword = passwordEncoder.encode(password);
        User user = new User(name, email, mobile, hashedPassword);
        userRepository.save(user);

        return ApiResponse.ok("Registration successful! You can now log in.");
    }

    /* =====================================================
       2. LOGIN (EMAIL OR MOBILE NUMBER)
    ====================================================== */
    public LoginResponse login(LoginRequest request) {
        if (request == null) {
            return new LoginResponse(false, "Login request cannot be empty.", null, null, null);
        }

        String identifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        String password = request.getPassword();

        if (identifier.isEmpty() || password == null || password.isEmpty()) {
            return new LoginResponse(false, "Please enter your email or mobile number, and password.", null, null, null);
        }

        Optional<User> userOptional;

        // Determine if identifier is an email (contains @) or mobile number
        if (identifier.contains("@")) {
            userOptional = userRepository.findByEmail(identifier.toLowerCase());
        } else {
            String digitsOnly = identifier.replaceAll("[^0-9]", "");
            userOptional = userRepository.findByMobileNumber(digitsOnly);
        }

        // Generic authentication failure message for security
        String genericAuthError = "Invalid email/mobile number or password.";

        if (userOptional.isEmpty()) {
            // Spend the same time as a real check so response timing does not reveal which accounts exist
            if (dummyHash == null) dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
            passwordEncoder.matches(password, dummyHash);
            return new LoginResponse(false, genericAuthError, null, null, null);
        }

        User user = userOptional.get();

        // Verify password hash
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return new LoginResponse(false, genericAuthError, null, null, null);
        }

        if (Boolean.FALSE.equals(user.getActive())) {
            return new LoginResponse(false, "This account has been disabled. Please contact info@firquijewels.com.", null, null, null);
        }

        // Generate JWT token (carried in an HttpOnly cookie by AuthController)
        String token = jwtUtils.generateToken(user);

        return new LoginResponse(true, "Login successful!", token, user.getName(), user.getEmail(), user.getRole());
    }

    /* =====================================================
       3. FORGOT PASSWORD
    ====================================================== */
    @Transactional
    public ApiResponse forgotPassword(ForgotPasswordRequest request) {
        if (request == null || request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return ApiResponse.error("Please enter your registered email address.");
        }

        String email = request.getEmail().trim().toLowerCase();

        // Safe generic response to avoid user enumeration
        String genericMessage = "If an account exists for this email, a password reset link has been sent.";

        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ApiResponse.error("Please enter a valid email address.");
        }

        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Invalidate/delete previous tokens for this user
            tokenRepository.deleteAllByUser(user);

            // Generate cryptographically secure random token
            String token = UUID.randomUUID().toString().replace("-", "");
            LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(30);

            PasswordResetToken resetToken = new PasswordResetToken(token, user, expiryDate);
            tokenRepository.save(resetToken);

            // Construct Reset Password Link to existing Reset Password frontend page
            String resetLink = resetPasswordUrl + "?token=" + token;

            // Send email (or dev console fallback)
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        }

        return ApiResponse.ok(genericMessage);
    }

    /* =====================================================
       4. RESET PASSWORD
    ====================================================== */
    @Transactional
    public ApiResponse resetPassword(ResetPasswordRequest request) {
        if (request == null) {
            return ApiResponse.error("Reset password request cannot be empty.");
        }

        String tokenString = request.getToken() != null ? request.getToken().trim() : "";
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        if (tokenString.isEmpty()) {
            return ApiResponse.error("Password reset token is missing.");
        }

        Optional<PasswordResetToken> tokenOptional = tokenRepository.findByToken(tokenString);
        if (tokenOptional.isEmpty()) {
            return ApiResponse.error("Invalid password reset token.");
        }

        PasswordResetToken token = tokenOptional.get();

        if (token.isUsed()) {
            return ApiResponse.error("This password reset token has already been used. Please request a new one.");
        }

        if (token.isExpired()) {
            return ApiResponse.error("This password reset token has expired. Please request a new one.");
        }

        // Validate new password (min 8 chars, any char type allowed)
        if (newPassword == null || newPassword.length() < 8) {
            return ApiResponse.error("Password must be at least 8 characters long.");
        }

        // Validate confirm password match
        if (confirmPassword == null || !newPassword.equals(confirmPassword)) {
            return ApiResponse.error("Passwords do not match.");
        }

        // Update user password with BCrypt hash; signing out every existing session
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.bumpTokenVersion();
        userRepository.save(user);

        // Mark token as used to prevent replay attacks
        token.setUsed(true);
        tokenRepository.save(token);

        return ApiResponse.ok("Password reset successfully! You can now log in with your new password.");
    }
}
