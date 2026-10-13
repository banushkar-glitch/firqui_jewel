/* =====================================================
   FIRQUI JEWELS - REGISTER
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const password =
        document.getElementById("password");

    const confirmPassword =
        document.getElementById("confirmPassword");

    const passwordToggle =
        document.getElementById("passwordToggle");

    const confirmPasswordToggle =
        document.getElementById("confirmPasswordToggle");

    const registerForm =
        document.getElementById("registerForm");

    const registerMessage =
        document.getElementById("registerMessage");

    const mobile =
        document.getElementById("mobile");


    /* =================================================
       PASSWORD SHOW / HIDE
    ================================================= */

    passwordToggle.addEventListener("click", () => {

        const show =
            password.type === "password";

        password.type =
            show ? "text" : "password";

        passwordToggle.innerHTML = show
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';

    });


    /* =================================================
       CONFIRM PASSWORD SHOW / HIDE
    ================================================= */

    confirmPasswordToggle.addEventListener("click", () => {

        const show =
            confirmPassword.type === "password";

        confirmPassword.type =
            show ? "text" : "password";

        confirmPasswordToggle.innerHTML = show
            ? '<i class="fa-regular fa-eye-slash"></i>'
            : '<i class="fa-regular fa-eye"></i>';

    });


    /* =================================================
       MOBILE ONLY NUMBERS
    ================================================= */

    mobile.addEventListener("input", () => {

        mobile.value =
            mobile.value.replace(/\D/g, "");

        mobile.value =
            mobile.value.substring(0, 10);

    });


    /* =================================================
       REGISTER
    ================================================= */

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const fullName =
            document.getElementById("fullName")
                .value.trim();

        const mobileNumber =
            mobile.value.trim();

        const email =
            document.getElementById("email")
                .value.trim();

        const passwordValue =
            password.value;

        const confirmPasswordValue =
            confirmPassword.value;


        /* =================================================
           VALIDATION
        ================================================= */

        if (!fullName) {

            registerMessage.textContent =
                "Please enter your full name.";

            registerMessage.className =
                "register-message error";

            return;
        }


        if (!/^[0-9]{10}$/.test(mobileNumber)) {

            registerMessage.textContent =
                "Please enter a valid 10-digit mobile number.";

            registerMessage.className =
                "register-message error";

            return;
        }


        if (!email) {

            registerMessage.textContent =
                "Please enter your email.";

            registerMessage.className =
                "register-message error";

            return;
        }


        if (passwordValue.length < 8) {

            registerMessage.textContent =
                "Password must be at least 8 characters.";

            registerMessage.className =
                "register-message error";

            return;
        }


        if (passwordValue !== confirmPasswordValue) {

            registerMessage.textContent =
                "Passwords do not match.";

            registerMessage.className =
                "register-message error";

            return;
        }


        /* =================================================
           SPRING BOOT API
        ================================================= */

        const registerBtn = registerForm.querySelector(".register-button");
        const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";

        if (registerBtn) {
            registerBtn.disabled = true;
            registerBtn.textContent = "Creating Account...";
        }

        try {

            const response = await fetch(
                `${API_BASE}/api/auth/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        name: fullName,

                        mobileNumber: mobileNumber,

                        email: email,

                        password: passwordValue,

                        confirmPassword:
                            confirmPasswordValue

                    })
                }
            );


            let data = {};
            try {
                data = await response.json();
            } catch (err) {
                // non-JSON
            }


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Registration failed."
                );

            }


            registerMessage.textContent =
                data.message ||
                "Account created successfully!";

            registerMessage.className =
                "register-message success";


            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 1500);


        } catch (error) {

            console.error(error);


            registerMessage.textContent =
                error.message ||
                "Something went wrong.";

            registerMessage.className =
                "register-message error";

            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = "Create Account";
            }

        }

    });

});
/* =================================================
   SWITCH BACK TO LOGIN
================================================= */

const switchToLogin =
    document.getElementById("switchToLogin");

if (switchToLogin) {

    switchToLogin.addEventListener("click", () => {

        window.parent.postMessage(
            {
                type: "openLogin"
            },
            "*"
        );

    });

}
