/* =====================================================
   FIRQUI JEWELS - LOGIN
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput =
        document.getElementById("password");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const loginForm =
        document.getElementById("loginForm");

    const loginMessage =
        document.getElementById("loginMessage");


    /* =================================================
       SHOW / HIDE PASSWORD
    ================================================= */

    passwordToggle.addEventListener("click", () => {

        const isPassword =
            passwordInput.type === "password";

        passwordInput.type =
            isPassword ? "text" : "password";

        passwordToggle.innerHTML = isPassword
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';

        passwordToggle.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );

    });


    /* =================================================
       LOGIN FORM
    ================================================= */

    const loginButton = loginForm.querySelector(".login-button");
    const API_BASE = window.FIRQUI_API_BASE;

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const identifier =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        if (!identifier || !password) {
            loginMessage.textContent =
                "Please enter your email or mobile number, and password.";
            loginMessage.className = "login-message error";
            return;
        }

        // Loading state
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }

        loginMessage.textContent = "";
        loginMessage.className = "login-message";

        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                })
            });

            let data = {};
            try {
                data = await response.json();
            } catch (err) {
                // Non-JSON response
            }

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Invalid email/mobile number or password."
                );
            }

            // The session itself is an HttpOnly cookie set by the server;
            // only the name and role are kept for the header
            window.FirquiAuth.setUser({ name: data.name, email: data.email, role: data.role || "USER" });

            // Sync existing guest cart into authenticated user cart
            try {
                const localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                if (localCart.length > 0) {
                    for (const item of localCart) {
                        try {
                            await fetch(`${API_BASE}/api/cart/items`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    productId: item.productId || item.id,
                                    name: item.name,
                                    description: item.description,
                                    price: item.price,
                                    image: item.image,
                                    quantity: item.quantity || 1,
                                    selectedSize: item.selectedSize || item.measurement || item.size || null
                                })
                            });
                        } catch (errSync) {
                            console.warn("Cart sync item error", errSync);
                        }
                    }
                }
            } catch (e) {
                console.warn("Cart sync error", e);
            }

            // Backend determines role (ROLE_ADMIN or ROLE_USER)
            const roleStr = String(data.role || "").toUpperCase();
            const isAdmin = roleStr === "ADMIN" || roleStr === "ROLE_ADMIN";

            // Return to the page that asked for login; only pages on this site are allowed
            const urlParams = new URLSearchParams(window.location.search);
            let redirectParam = urlParams.get("next") || urlParams.get("redirect") || sessionStorage.getItem("firqui_redirect");
            try { sessionStorage.removeItem("firqui_redirect"); } catch (e) {}
            if (redirectParam && !/^(\/|\.\.?\/|[a-z]+:)/i.test(redirectParam)) {
                // Older links used "checkout.html" relative to /products/
                redirectParam = "../products/" + redirectParam;
            }
            const safeTarget = window.FirquiAuth.safeNext(redirectParam);
            const adminTarget = safeTarget && safeTarget.indexOf("/admin/") !== -1;

            let targetUrl = isAdmin ? "../admin/dashboard.html" : "../index.html";
            let redirectLabel = isAdmin ? "Admin Dashboard" : "FIRQUI JEWELS";

            if (safeTarget && (isAdmin || !adminTarget)) {
                targetUrl = safeTarget;
                redirectLabel = safeTarget.includes("checkout") ? "Checkout" : "your page";
            }

            loginMessage.textContent = `Login successful! Redirecting to ${redirectLabel}...`;
            loginMessage.className = "login-message success";

            // Redirect to appropriate page
            setTimeout(() => {
                if (window.self !== window.top) {
                    window.parent.location.href = targetUrl;
                } else {
                    window.location.href = targetUrl;
                }
            }, 1000);

        } catch (error) {
            console.error("Login error:", error);

            loginMessage.textContent =
                error.message || "Invalid email/mobile number or password.";
            loginMessage.className = "login-message error";

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Login";
            }
        }
    });

});
/* =================================================
   LOGIN → REGISTER
================================================= */

const openRegister =
    document.getElementById("openRegister");

if (openRegister) {

    openRegister.addEventListener("click", (event) => {

        event.preventDefault();

        // Inside the home page pop-up, let the page swap to the register form
        if (window.self !== window.top) {
            window.parent.postMessage({ type: "openRegister" }, window.location.origin);
            return;
        }
        // Standalone page: go to register, keeping where to return afterwards
        window.location.href = "register.html" + window.location.search;

    });

}
/* =====================================================
   ALREADY SIGNED IN: skip the form
===================================================== */
if (window.self === window.top && window.FirquiAuth) {
    window.FirquiAuth.refresh().then(function (user) {
        if (!user) return;
        const next = window.FirquiAuth.safeNext(new URLSearchParams(window.location.search).get("next"));
        window.location.replace(next || (window.FirquiAuth.isAdminRole(user.role) ? "../admin/dashboard.html" : "../index.html"));
    });
}
