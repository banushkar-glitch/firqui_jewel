package Firqui.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * The login session lives in an HttpOnly cookie, so page scripts (and anything
 * injected into a page) cannot read the token. SameSite=Strict keeps other sites
 * from making requests that carry it.
 */
@Component
public class SessionCookies {

    public static final String NAME = "FIRQUI_SESSION";

    // true in production (HTTPS only); false for local http:// development
    @Value("${app.auth.cookie-secure:false}")
    private boolean secure;

    public ResponseCookie create(String token, long maxAgeMs) {
        return base(token).maxAge(Duration.ofMillis(maxAgeMs)).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    public static String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/");
    }
}
