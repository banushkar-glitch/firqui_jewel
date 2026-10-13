package Firqui;

import Firqui.dto.*;
import Firqui.entity.PasswordResetToken;
import Firqui.entity.User;
import Firqui.repository.PasswordResetTokenRepository;
import Firqui.repository.UserRepository;
import Firqui.service.AuthService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AuthIntegrationTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static String capturedToken;

    @BeforeAll
    static void cleanupBeforeAll(
            @Autowired PasswordResetTokenRepository tokenRepo,
            @Autowired UserRepository userRepo,
            @Autowired Firqui.repository.CartItemRepository cartRepo,
            @Autowired Firqui.repository.WishlistItemRepository wishlistRepo) {
        userRepo.findByEmail("abhi@gmail.com").ifPresent(user -> {
            tokenRepo.findAll().stream().filter(t -> t.getUser().getId().equals(user.getId())).forEach(tokenRepo::delete);
            cartRepo.findByUserOrderByCreatedAtAsc(user).forEach(cartRepo::delete);
            wishlistRepo.findByUserOrderByCreatedAtDesc(user).forEach(wishlistRepo::delete);
            userRepo.delete(user);
        });
        userRepo.findByEmail("newemail@gmail.com").ifPresent(userRepo::delete);
    }

    /* =====================================================
       TEST 1: Register a new user. Verify PostgreSQL contains:
       Name, Email, Mobile number, BCrypt password hash.
       Verify plain password is NOT stored.
    ====================================================== */
    @Test
    @Order(1)
    void test1_registerNewUser_verifiesPostgreSqlFieldsAndBcryptHash() {
        RegisterRequest request = new RegisterRequest("Abhi", "abhi@gmail.com", "9876543210", "12345678", "12345678");
        ApiResponse response = authService.register(request);

        assertTrue(response.isSuccess(), "Registration should succeed");

        Optional<User> userOptional = userRepository.findByEmail("abhi@gmail.com");
        assertTrue(userOptional.isPresent(), "User must exist in PostgreSQL");

        User user = userOptional.get();
        assertEquals("Abhi", user.getName());
        assertEquals("abhi@gmail.com", user.getEmail());
        assertEquals("9876543210", user.getMobileNumber());

        // Verify plain password is NOT stored
        assertNotEquals("12345678", user.getPassword(), "Plain password must not be stored");

        // Verify password is a valid BCrypt hash
        assertTrue(user.getPassword().startsWith("$2a$") || user.getPassword().startsWith("$2b$") || user.getPassword().startsWith("$2y$"),
                "Password must be a BCrypt hash");
        assertTrue(passwordEncoder.matches("12345678", user.getPassword()), "BCrypt hash must match original password");
    }

    /* =====================================================
       TEST 2: Login using Email + Password. Must work.
    ====================================================== */
    @Test
    @Order(2)
    void test2_loginWithEmail_mustSucceed() {
        LoginRequest request = new LoginRequest("abhi@gmail.com", "12345678");
        LoginResponse response = authService.login(request);

        assertTrue(response.isSuccess(), "Email login should succeed");
        assertNotNull(response.getToken(), "JWT token should be returned");
        assertEquals("Abhi", response.getName());
        assertEquals("abhi@gmail.com", response.getEmail());
    }

    /* =====================================================
       TEST 3: Login using Mobile + Password. Must work.
    ====================================================== */
    @Test
    @Order(3)
    void test3_loginWithMobile_mustSucceed() {
        LoginRequest request = new LoginRequest("9876543210", "12345678");
        LoginResponse response = authService.login(request);

        assertTrue(response.isSuccess(), "Mobile login should succeed");
        assertNotNull(response.getToken(), "JWT token should be returned");
        assertEquals("Abhi", response.getName());
        assertEquals("abhi@gmail.com", response.getEmail());
    }

    /* =====================================================
       TEST 4: Login with wrong password. Must fail.
    ====================================================== */
    @Test
    @Order(4)
    void test4_loginWithWrongPassword_mustFail() {
        LoginRequest request = new LoginRequest("abhi@gmail.com", "wrongPassword");
        LoginResponse response = authService.login(request);

        assertFalse(response.isSuccess(), "Login with wrong password must fail");
        assertNull(response.getToken(), "No token should be generated on failed login");
    }

    /* =====================================================
       TEST 5: Register another user with same email. Must fail.
    ====================================================== */
    @Test
    @Order(5)
    void test5_registerDuplicateEmail_mustFail() {
        RegisterRequest request = new RegisterRequest("Duplicate", "abhi@gmail.com", "9123456780", "firqui123", "firqui123");
        ApiResponse response = authService.register(request);

        assertFalse(response.isSuccess(), "Registration with duplicate email must fail");
        assertTrue(response.getMessage().toLowerCase().contains("email"), "Error message should mention email");
    }

    /* =====================================================
       TEST 6: Register another user with same mobile. Must fail.
    ====================================================== */
    @Test
    @Order(6)
    void test6_registerDuplicateMobile_mustFail() {
        RegisterRequest request = new RegisterRequest("DuplicateMobile", "newemail@gmail.com", "9876543210", "firqui123", "firqui123");
        ApiResponse response = authService.register(request);

        assertFalse(response.isSuccess(), "Registration with duplicate mobile must fail");
        assertTrue(response.getMessage().toLowerCase().contains("mobile"), "Error message should mention mobile number");
    }

    /* =====================================================
       TEST 7: Forgot password using registered email.
       Must generate a reset token.
    ====================================================== */
    @Test
    @Order(7)
    void test7_forgotPassword_mustGenerateResetToken() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("abhi@gmail.com");
        ApiResponse response = authService.forgotPassword(request);

        assertTrue(response.isSuccess(), "Forgot password request must return success");

        User user = userRepository.findByEmail("abhi@gmail.com").orElseThrow();
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()) && !t.isUsed())
                .findFirst();

        assertTrue(tokenOpt.isPresent(), "Reset token must be stored in database");
        capturedToken = tokenOpt.get().getToken();
        assertNotNull(capturedToken, "Captured token must not be null");
        assertFalse(tokenOpt.get().isExpired(), "Token must not be expired initially");
    }

    /* =====================================================
       TEST 8: Open reset link. Reset password. Must succeed.
    ====================================================== */
    @Test
    @Order(8)
    void test8_resetPassword_mustSucceed() {
        assertNotNull(capturedToken, "Token must be available from Test 7");

        ResetPasswordRequest request = new ResetPasswordRequest(capturedToken, "NewPass@2026", "NewPass@2026");
        ApiResponse response = authService.resetPassword(request);

        assertTrue(response.isSuccess(), "Password reset should succeed");

        // Verify token is now marked as used
        PasswordResetToken usedToken = tokenRepository.findByToken(capturedToken).orElseThrow();
        assertTrue(usedToken.isUsed(), "Token must be marked as used");
    }

    /* =====================================================
       TEST 9: Login using new password and email. Must work.
    ====================================================== */
    @Test
    @Order(9)
    void test9_loginWithNewPasswordAndEmail_mustWork() {
        LoginRequest request = new LoginRequest("abhi@gmail.com", "NewPass@2026");
        LoginResponse response = authService.login(request);

        assertTrue(response.isSuccess(), "Login with new password and email must succeed");
        assertNotNull(response.getToken(), "Token must be generated");
    }

    /* =====================================================
       TEST 10: Login using new password and mobile. Must work.
    ====================================================== */
    @Test
    @Order(10)
    void test10_loginWithNewPasswordAndMobile_mustWork() {
        LoginRequest request = new LoginRequest("9876543210", "NewPass@2026");
        LoginResponse response = authService.login(request);

        assertTrue(response.isSuccess(), "Login with new password and mobile must succeed");
        assertNotNull(response.getToken(), "Token must be generated");
    }

    /* =====================================================
       TEST 11: Try old password. Must fail.
    ====================================================== */
    @Test
    @Order(11)
    void test11_loginWithOldPassword_mustFail() {
        LoginRequest emailOld = new LoginRequest("abhi@gmail.com", "12345678");
        LoginResponse emailResp = authService.login(emailOld);
        assertFalse(emailResp.isSuccess(), "Old password must fail with email");

        LoginRequest mobileOld = new LoginRequest("9876543210", "12345678");
        LoginResponse mobileResp = authService.login(mobileOld);
        assertFalse(mobileResp.isSuccess(), "Old password must fail with mobile number");
    }

    /* =====================================================
       TEST 12: Try the same reset token again. Must fail.
    ====================================================== */
    @Test
    @Order(12)
    void test12_reuseResetToken_mustFail() {
        ResetPasswordRequest request = new ResetPasswordRequest(capturedToken, "AnotherPass2026", "AnotherPass2026");
        ApiResponse response = authService.resetPassword(request);

        assertFalse(response.isSuccess(), "Reusing a used reset token must fail");
    }

    /* =====================================================
       TEST 13: Try an expired reset token. Must fail.
    ====================================================== */
    @Test
    @Order(13)
    void test13_expiredResetToken_mustFail() {
        User user = userRepository.findByEmail("abhi@gmail.com").orElseThrow();

        // Create an expired token directly
        PasswordResetToken expiredToken = new PasswordResetToken("expiredToken123", user, LocalDateTime.now().minusMinutes(5));
        tokenRepository.save(expiredToken);

        ResetPasswordRequest request = new ResetPasswordRequest("expiredToken123", "AnotherPass2026", "AnotherPass2026");
        ApiResponse response = authService.resetPassword(request);

        assertFalse(response.isSuccess(), "Expired token must fail");
        assertTrue(response.getMessage().toLowerCase().contains("expired"), "Error message should mention expiration");
    }
}
