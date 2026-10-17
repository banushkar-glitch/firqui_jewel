package Firqui;

import Firqui.entity.User;
import Firqui.repository.UserRepository;
import Firqui.security.JwtAuthenticationFilter;
import Firqui.security.JwtUtils;
import Firqui.security.LoginAttemptService;
import Firqui.security.SessionCookies;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Session cookie handling and login throttling, without a database.
 */
public class AuthSessionUnitTests {

    private JwtUtils jwtUtils;
    private JwtAuthenticationFilter filter;
    private User customer;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", "UnitTestSigningSecretThatIsDefinitelyLongerThan256Bits!!");
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 60_000L);

        customer = new User("Asha Customer", "asha@example.com", "9000000003", "hash", "USER");
        ReflectionTestUtils.setField(customer, "id", 42L);

        UserRepository users = mock(UserRepository.class);
        when(users.findById(42L)).thenAnswer(inv -> Optional.of(customer));

        filter = new JwtAuthenticationFilter();
        ReflectionTestUtils.setField(filter, "jwtUtils", jwtUtils);
        ReflectionTestUtils.setField(filter, "userRepository", users);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Authentication run(String method, String token, boolean ajaxHeader) throws Exception {
        SecurityContextHolder.clearContext();
        MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/cart");
        request.setCookies(new Cookie(SessionCookies.NAME, token));
        if (ajaxHeader) request.addHeader("X-Requested-With", "XMLHttpRequest");
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    @DisplayName("A valid session cookie signs the customer in")
    void cookieSignsIn() throws Exception {
        Authentication auth = run("GET", jwtUtils.generateToken(customer), false);
        assertNotNull(auth);
        assertSame(customer, auth.getPrincipal());
    }

    @Test
    @DisplayName("Cookie-authenticated changes need the site's X-Requested-With header")
    void cookieWritesNeedAjaxHeader() throws Exception {
        String token = jwtUtils.generateToken(customer);
        assertNull(run("POST", token, false), "a cross-site form post must not be signed in");
        assertNotNull(run("POST", token, true));
    }

    @Test
    @DisplayName("Changing the password ends sessions issued before it")
    void oldSessionStopsAfterPasswordChange() throws Exception {
        String token = jwtUtils.generateToken(customer);
        customer.bumpTokenVersion();
        assertNull(run("GET", token, false));
        assertNotNull(run("GET", jwtUtils.generateToken(customer), false));
    }

    @Test
    @DisplayName("Deactivated accounts are signed out")
    void inactiveAccountIsRejected() throws Exception {
        String token = jwtUtils.generateToken(customer);
        customer.setActive(false);
        assertNull(run("GET", token, false));
    }

    @Test
    @DisplayName("Tampered tokens are ignored")
    void tamperedTokenIsRejected() throws Exception {
        String token = jwtUtils.generateToken(customer);
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("AA") ? "BB" : "AA");
        assertNull(run("GET", tampered, false));
    }

    @Test
    @DisplayName("Repeated wrong passwords block that account from that address for a while")
    void loginThrottling() {
        LoginAttemptService attempts = new LoginAttemptService();
        for (int i = 0; i < LoginAttemptService.MAX_FAILURES_PER_ACCOUNT; i++) {
            assertFalse(attempts.isBlocked("203.0.113.9", "asha@example.com"));
            attempts.recordFailure("203.0.113.9", "asha@example.com");
        }
        assertTrue(attempts.isBlocked("203.0.113.9", "ASHA@example.com"));
        assertFalse(attempts.isBlocked("203.0.113.9", "other@example.com"));
        assertFalse(attempts.isBlocked("198.51.100.1", "asha@example.com"));
    }
}
