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
    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

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

            // Save JWT token & user info
            if (data.token) {
                try {
                    localStorage.setItem("firqui_token", data.token);
                    localStorage.setItem("firqui_user", JSON.stringify({
                        name: data.name,
                        email: data.email,
                        role: data.role || "USER"
                    }));
                } catch (e) {
                    console.warn("localStorage not accessible", e);
                }
            }

            // Sync existing guest cart into authenticated user cart
            try {
                const localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                if (localCart.length > 0 && data.token) {
                    for (const item of localCart) {
                        try {
                            await fetch(`${API_BASE}/api/cart/items`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${data.token}`
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

            // Check for redirect return URL (e.g. checkout page)
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get("redirect") || sessionStorage.getItem("firqui_redirect");
            try { sessionStorage.removeItem("firqui_redirect"); } catch (e) {}

            let targetUrl = isAdmin ? "../admin/dashboard.html" : "../index.html";
            let redirectLabel = isAdmin ? "Admin Dashboard" : "FIRQUI JEWELS";

            if (!isAdmin && redirectParam) {
                targetUrl = redirectParam;
                if (redirectParam.includes("checkout")) {
                    redirectLabel = "Checkout";
                }
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

        window.parent.postMessage(
            {
                type: "openRegister"
            },
            "*"
        );

    });

}