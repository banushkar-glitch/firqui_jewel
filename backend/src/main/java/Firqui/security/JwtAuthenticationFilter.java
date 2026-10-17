package Firqui.security;

import Firqui.entity.User;
import Firqui.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try {
            String jwt = bearerToken(request);
            if (jwt == null) {
                jwt = SessionCookies.read(request);
                // The site's own scripts always send this header. A form or link on another
                // site cannot add it without a CORS preflight, which is refused.
                if (jwt != null && !SAFE_METHODS.contains(request.getMethod())
                        && !"XMLHttpRequest".equals(request.getHeader("X-Requested-With"))) {
                    jwt = null;
                }
            }

            Claims claims = jwtUtils.parseClaims(jwt);
            if (claims != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                findUser(claims)
                        .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                        .filter(user -> tokenVersion(claims) == user.getTokenVersion())
                        .ifPresent(user -> {
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(user, null, authorities(user));
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                        });
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication", e);
        }

        filterChain.doFilter(request, response);
    }

    private Optional<User> findUser(Claims claims) {
        Object id = claims.get("userId");
        if (id instanceof Number number) {
            Optional<User> byId = userRepository.findById(number.longValue());
            if (byId.isPresent()) return byId;
        }
        String email = claims.getSubject();
        return email != null ? userRepository.findByEmail(email.toLowerCase()) : Optional.empty();
    }

    private static int tokenVersion(Claims claims) {
        Object ver = claims.get("ver");
        return ver instanceof Number number ? number.intValue() : 0;
    }

    private static List<GrantedAuthority> authorities(User user) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (user.getRole() != null && !user.getRole().trim().isEmpty()) {
            String roleStr = user.getRole().trim().toUpperCase();
            authorities.add(new SimpleGrantedAuthority(roleStr.startsWith("ROLE_") ? roleStr : "ROLE_" + roleStr));
            authorities.add(new SimpleGrantedAuthority(roleStr));
        }
        return authorities;
    }

    private static String bearerToken(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
