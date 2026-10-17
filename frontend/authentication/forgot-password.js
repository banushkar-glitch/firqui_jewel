/* =====================================================
   FIRQUI JEWELS - FORGOT PASSWORD LOGIC
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("forgotPasswordForm");
    const emailInput = document.getElementById("email");
    const emailError = document.getElementById("emailError");
    const submitBtn = document.getElementById("submitBtn");
    const authMessage = document.getElementById("authMessage");
    const backToLogin = document.getElementById("backToLogin");

    // Email format validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* =================================================
       REAL-TIME INPUT VALIDATION
    ================================================= */
    emailInput.addEventListener("input", () => {
        if (emailError.textContent) {
            emailError.textContent = "";
        }
        if (authMessage.textContent) {
            authMessage.textContent = "";
            authMessage.className = "auth-message";
        }
    });

    /* =================================================
       SUBMIT FORGOT PASSWORD FORM
    ================================================= */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Clear previous messages
        emailError.textContent = "";
        authMessage.textContent = "";
        authMessage.className = "auth-message";

        const email = emailInput.value.trim();

        // Validation
        if (!email) {
            emailError.textContent = "Please enter your email address.";
            emailInput.focus();
            return;
        }

        if (!emailRegex.test(email)) {
            emailError.textContent = "Please enter a valid email address.";
            emailInput.focus();
            return;
        }

        // Set Loading State
        setLoading(true);

        const API_BASE = window.FIRQUI_API_BASE;

        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email
                })
            });

            let data = {};
            try {
                data = await response.json();
            } catch (err) {
                // If response is not JSON
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Unable to process request. Please verify your email and try again."
                );
            }

            // Success State
            authMessage.className = "auth-message success";
            authMessage.textContent =
                data.message ||
                "A password reset link has been sent to your email. Please check your inbox.";

            // Reset input field
            emailInput.value = "";

        } catch (error) {
            console.error("Forgot password error:", error);

            authMessage.className = "auth-message error";
            authMessage.textContent =
                error.message ||
                "Failed to send reset link. Please check your connection and try again.";

        } finally {
            setLoading(false);
        }
    });

    /* =================================================
       LOADING STATE HELPER
    ================================================= */
    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.classList.add("loading");
            submitBtn.querySelector(".btn-text").textContent = "Sending...";
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");
            submitBtn.querySelector(".btn-text").textContent = "Send Reset Link";
        }
    }

    /* =================================================
       BACK TO LOGIN (MODAL & STANDALONE SUPPORT)
    ================================================= */
    if (backToLogin) {
        backToLogin.addEventListener("click", (event) => {
            if (window.self !== window.top) {
                event.preventDefault();

                // Post message to parent frame in case modal listener is watching
                window.parent.postMessage(
                    {
                        type: "openLogin"
                    },
                    "*"
                );

                // Also navigate the current iframe
                window.location.href = "login.html?modal=true";
            }
        });
    }

});
