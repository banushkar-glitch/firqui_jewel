package Firqui.security;

import Firqui.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${app.jwt.secret:FirquiJewelsSecureJwtSigningSecretKeyAtLeast256BitsLongForHmacSha256Security2026}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public long getExpirationMs() {
        return jwtExpirationMs;
    }

    /** Session token for a user; "ver" ties it to the user's current password. */
    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("name", user.getName())
                .claim("role", user.getRole() != null ? user.getRole() : "USER")
                .claim("ver", user.getTokenVersion())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public String generateToken(String subject, String name, Long userId) {
        return generateToken(subject, name, userId, "USER");
    }

    public String generateToken(String subject, String name, Long userId, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        return Jwts.builder()
                .subject(subject)
                .claim("userId", userId)
                .claim("name", name)
                .claim("role", role != null ? role : "USER")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /** Verified claims, or null when the token is missing, tampered with or expired. */
    public Claims parseClaims(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public String getSubjectFromToken(String token) {
        Claims claims = parseClaims(token);
        return claims != null ? claims.getSubject() : null;
    }

    public boolean validateToken(String token) {
        return parseClaims(token) != null;
    }
}
