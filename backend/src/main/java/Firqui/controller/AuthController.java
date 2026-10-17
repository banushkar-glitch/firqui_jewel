package Firqui.controller;

import Firqui.dto.*;
import Firqui.entity.User;
import Firqui.security.JwtUtils;
import Firqui.security.LoginAttemptService;
import Firqui.security.SessionCookies;
import Firqui.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private SessionCookies sessionCookies;

    @Autowired
    private LoginAttemptService loginAttempts;

    /* =====================================================
       POST /api/auth/register
    ====================================================== */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody RegisterRequest request) {
        ApiResponse response = authService.register(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /* =====================================================
       POST /api/auth/login
       The session token goes into an HttpOnly cookie and is never
       returned to page scripts.
    ====================================================== */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request, HttpServletRequest http) {
        String ip = http.getRemoteAddr();
        String identifier = request != null ? request.getIdentifier() : null;

        if (loginAttempts.isBlocked(ip, identifier)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(new LoginResponse(false,
                    "Too many failed attempts. Please wait 15 minutes or reset your password.", null, null, null));
        }

        LoginResponse response = authService.login(request);
        if (!response.isSuccess()) {
            loginAttempts.recordFailure(ip, identifier);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
        loginAttempts.recordSuccess(ip, identifier);

        String token = response.getToken();
        response.setToken(null);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookies.create(token, jwtUtils.getExpirationMs()).toString())
                .body(response);
    }

    /* =====================================================
       POST /api/auth/logout
    ====================================================== */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout() {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookies.clear().toString())
                .body(ApiResponse.ok("You have been logged out."));
    }

    /* =====================================================
       GET /api/auth/session
       Who is signed in (if anyone). Always 200, so pages can ask freely.
    ====================================================== */
    @GetMapping("/session")
    public ResponseEntity<Map<String, Object>> session(@AuthenticationPrincipal User user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", user != null);
        if (user != null) {
            body.put("name", user.getName());
            body.put("email", user.getEmail());
            body.put("role", user.getRole() != null ? user.getRole() : "USER");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }

    /* =====================================================
       POST /api/auth/forgot-password
    ====================================================== */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        ApiResponse response = authService.forgotPassword(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }

    /* =====================================================
       POST /api/auth/reset-password
    ====================================================== */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse> resetPassword(@RequestBody ResetPasswordRequest request) {
        ApiResponse response = authService.resetPassword(request);
        if (!response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
