/* =====================================================
   FIRQUI JEWELS - RESET PASSWORD LOGIC
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("resetPasswordForm");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const newPasswordToggle = document.getElementById("newPasswordToggle");
    const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");
    const newPasswordError = document.getElementById("newPasswordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const submitBtn = document.getElementById("submitBtn");
    const authMessage = document.getElementById("authMessage");
    const backToLogin = document.getElementById("backToLogin");
    const resetTokenInput = document.getElementById("resetToken");

    /* =================================================
       OBTAIN TOKEN FROM URL
       Example: reset-password.html?token=ABC123
    ================================================= */
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || "";

    if (resetTokenInput) {
        resetTokenInput.value = token;
    }

    if (!token) {
        authMessage.className = "auth-message error";
        authMessage.textContent =
            "Reset token is missing or invalid. Please request a new password reset link.";
        submitBtn.disabled = true;
    }

    /* =================================================
       PASSWORD VISIBILITY TOGGLES
    ================================================= */
    setupPasswordToggle(newPasswordInput, newPasswordToggle);
    setupPasswordToggle(confirmPasswordInput, confirmPasswordToggle);

    function setupPasswordToggle(inputElem, toggleBtn) {
        if (!inputElem || !toggleBtn) return;

        toggleBtn.addEventListener("click", () => {
            const isPassword = inputElem.type === "password";
            inputElem.type = isPassword ? "text" : "password";

            toggleBtn.innerHTML = isPassword
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';

            toggleBtn.setAttribute(
                "aria-label",
                isPassword ? "Hide password" : "Show password"
            );
        });
    }

    /* =================================================
       CLEAR ERRORS ON INPUT
    ================================================= */
    newPasswordInput.addEventListener("input", () => {
        if (newPasswordError.textContent) {
            newPasswordError.textContent = "";
        }
    });

    confirmPasswordInput.addEventListener("input", () => {
        if (confirmPasswordError.textContent) {
            confirmPasswordError.textContent = "";
        }
    });

    /* =================================================
       FORM SUBMISSION
    ================================================= */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Reset error messages
        newPasswordError.textContent = "";
        confirmPasswordError.textContent = "";
        authMessage.textContent = "";
        authMessage.className = "auth-message";

        const currentToken = token || (resetTokenInput ? resetTokenInput.value.trim() : "");
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Token check
        if (!currentToken) {
            authMessage.className = "auth-message error";
            authMessage.textContent =
                "Missing reset token. Please request a new password reset link.";
            return;
        }

        // Validation
        let hasError = false;

        if (!newPassword) {
            newPasswordError.textContent = "Please enter your new password.";
            hasError = true;
        } else if (newPassword.length < 8) {
            newPasswordError.textContent = "Password must be at least 8 characters.";
            hasError = true;
        }

        if (!confirmPassword) {
            confirmPasswordError.textContent = "Please confirm your new password.";
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            confirmPasswordError.textContent = "Passwords do not match.";
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Set Loading State
        setLoading(true);

        const API_BASE = window.FIRQUI_API_BASE;

        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: currentToken,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
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
                    "Failed to reset password. The link may have expired or is invalid."
                );
            }

            // Success State
            authMessage.className = "auth-message success";
            authMessage.textContent =
                data.message ||
                "Password reset successfully! Redirecting to login...";

            // Clear inputs
            newPasswordInput.value = "";
            confirmPasswordInput.value = "";
            submitBtn.disabled = true;

            // Redirect to the EXISTING Login page
            setTimeout(() => {
                if (window.self !== window.top) {
                    window.parent.postMessage(
                        {
                            type: "openLogin"
                        },
                        "*"
                    );
                    window.location.href = "login.html?modal=true";
                } else {
                    window.location.href = "login.html";
                }
            }, 1800);

        } catch (error) {
            console.error("Reset password error:", error);

            authMessage.className = "auth-message error";
            authMessage.textContent =
                error.message ||
                "Unable to reset password. Please try again or request a new link.";

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
            submitBtn.querySelector(".btn-text").textContent = "Resetting Password...";
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");
            submitBtn.querySelector(".btn-text").textContent = "Reset Password";
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
