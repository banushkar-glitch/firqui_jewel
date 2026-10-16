document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

    function getToken() {
        return localStorage.getItem("firqui_token");
    }

    /* =========================================
       AUTHENTICATION CHECK
    ========================================= */
    const token = getToken();
    if (!token) {
        try {
            sessionStorage.setItem("firqui_redirect", "checkout.html");
        } catch (e) {}
        alert("Please log in to proceed with checkout.");
        window.location.href = "../authentication/login.html?redirect=../products/checkout.html";
        return;
    }

    /* =========================================
       DOM ELEMENTS
    ========================================= */
    const checkoutItems = document.getElementById("checkout-items");
    const subtotalElement = document.getElementById("checkout-subtotal");
    const totalElement = document.getElementById("checkout-total");
    const checkoutForm = document.getElementById("checkout-form");
    const submitButton = checkoutForm ? checkoutForm.querySelector(".place-order-button") : null;

    let cart = [];

    /* =========================================
       PRICE HELPERS
    ========================================= */
    function getPrice(priceText) {
        if (typeof priceText === "number") return priceText;
        return Number(
            String(priceText || "")
                .replace("₹", "")
                .replace(/,/g, "")
                .trim()
        ) || 0;
    }

    function formatPrice(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    function resolveImage(img) {
        if (!img) return "../assets/Logo Pink 1.png";
        if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
        if (img.startsWith("../")) return img;
        if (img.startsWith("/")) return ".." + img;
        return "../" + img;
    }

    /* =========================================
       PRE-FILL LOGGED-IN USER INFORMATION
    ========================================= */
    async function loadUserProfile() {
        // 1. Initial pre-fill from cached data if present
        try {
            const cachedUser = JSON.parse(localStorage.getItem("firquiCustomer")) ||
                               JSON.parse(localStorage.getItem("firqui_user"));
            if (cachedUser) {
                fillFormFields(cachedUser);
            }
        } catch (e) {}

        // 2. Fetch fresh profile from Spring Boot backend (GET /api/users/me)
        try {
            const response = await fetch(`${API_BASE}/api/users/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const profile = await response.json();
                fillFormFields(profile);
            }
        } catch (err) {
            console.warn("Unable to fetch user profile for checkout prefill:", err);
        }
    }

    function fillFormFields(user) {
        if (!user) return;
        const nameField = document.getElementById("customer-name");
        const phoneField = document.getElementById("customer-phone");
        const emailField = document.getElementById("customer-email");
        const pincodeField = document.getElementById("customer-pincode");
        const addr1Field = document.getElementById("address-1");
        const addr2Field = document.getElementById("address-2");

        const nameVal = user.fullName || user.name || "";
        const phoneVal = user.phoneNumber || user.mobileNumber || user.phone || "";
        const emailVal = user.email || "";
        const pincodeVal = user.pincode || "";
        const addr1Val = user.address1 || "";
        const addr2Val = user.address2 || "";

        if (nameField && !nameField.value && nameVal) nameField.value = nameVal;
        if (phoneField && !phoneField.value && phoneVal) phoneField.value = phoneVal;
        if (emailField && !emailField.value && emailVal) emailField.value = emailVal;
        if (pincodeField && !pincodeField.value && pincodeVal) pincodeField.value = pincodeVal;
        if (addr1Field && !addr1Field.value && addr1Val) addr1Field.value = addr1Val;
        if (addr2Field && !addr2Field.value && addr2Val) addr2Field.value = addr2Val;
    }

    /* =========================================
       LOAD CART DATA
    ========================================= */
    async function loadCartData() {
        try {
            // First try fetching live cart from authenticated user backend
            const response = await fetch(`${API_BASE}/api/cart`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    cart = data.items;
                    renderCartSummary(cart);
                    return;
                }
            }
        } catch (err) {
            console.warn("Backend cart fetch error, falling back to local cart:", err);
        }

        // Fallback to localStorage if backend cart is not populated yet
        try {
            cart = JSON.parse(localStorage.getItem("firquiCart")) || [];
        } catch (e) {
            cart = [];
        }

        renderCartSummary(cart);
    }

    /* =========================================
       DISPLAY CART PRODUCTS & TOTALS
    ========================================= */
    function renderCartSummary(items) {
        if (!checkoutItems) return;
        checkoutItems.innerHTML = "";

        let subtotal = 0;

        if (!items || items.length === 0) {
            checkoutItems.innerHTML = `
                <p class="empty-checkout">
                    Your cart is empty. <a href="rings.html" style="color: #0A373B; text-decoration: underline;">Shop now</a>
                </p>
            `;
            if (subtotalElement) subtotalElement.textContent = "₹0";
            if (totalElement) totalElement.textContent = "₹0";
            if (submitButton) submitButton.disabled = true;
            return;
        }

        if (submitButton) submitButton.disabled = false;

        items.forEach(function (product) {
            const price = getPrice(product.price);
            const qty = Number(product.quantity) || 1;
            const itemTotal = price * qty;
            subtotal += itemTotal;

            const selectedSize = product.selectedSize || product.measurement || product.size;

            const item = document.createElement("div");
            item.className = "checkout-product";

            item.innerHTML = `
                <img
                    src="${resolveImage(product.image)}"
                    alt="${product.name || 'Product'}"
                    onerror="this.src='../assets/Logo Pink 1.png'"
                >

                <div>
                    <div class="checkout-product-name">
                        ${product.name || ''}
                    </div>

                    ${selectedSize ? `
                    <div class="checkout-product-variant" style="font-size: 0.85rem; color: #555; margin: 2px 0;">
                        Size: ${selectedSize}
                    </div>` : ""}

                    <div class="checkout-product-quantity">
                        Qty: ${qty}
                    </div>
                </div>

                <div class="checkout-product-price">
                    ${formatPrice(itemTotal)}
                </div>
            `;

            checkoutItems.appendChild(item);
        });

        if (subtotalElement) subtotalElement.textContent = formatPrice(subtotal);
        if (totalElement) totalElement.textContent = formatPrice(subtotal);
    }

    /* =========================================
       HANDLE ORDER SUBMISSION
    ========================================= */
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!cart || cart.length === 0) {
                alert("Your cart is empty. Please add a product before checkout.");
                return;
            }

            const name = document.getElementById("customer-name").value.trim();
            const phone = document.getElementById("customer-phone").value.trim();
            const email = document.getElementById("customer-email").value.trim();
            const pincode = document.getElementById("customer-pincode").value.trim();
            const address1 = document.getElementById("address-1").value.trim();
            const address2 = document.getElementById("address-2").value.trim();

            const selectedPayment = document.querySelector('input[name="payment"]:checked');
            if (!selectedPayment) {
                alert("Please select a payment method.");
                return;
            }

            // Save customer address in local storage for future visits
            try {
                localStorage.setItem("firquiCustomer", JSON.stringify({
                    name: name,
                    phone: phone,
                    email: email,
                    pincode: pincode,
                    address1: address1,
                    address2: address2
                }));
            } catch (e) {}

            const paymentMethodStr = selectedPayment.value === "pay-now" ? "Pay Now" : "Cash on Delivery";

            // Prepare items payload with productId, size, and quantities
            const itemsPayload = cart.map(function (p) {
                return {
                    productId: p.productId || p.id,
                    id: p.productId || p.id,
                    name: p.name,
                    selectedSize: p.selectedSize || p.measurement || p.size || null,
                    quantity: Number(p.quantity) || 1,
                    price: getPrice(p.price),
                    image: p.image
                };
            });

            // Calculate total for order summary display
            let currentTotal = 0;
            itemsPayload.forEach(function (it) {
                currentTotal += (it.price || 0) * (it.quantity || 1);
            });

            const pendingCheckout = {
                shippingAddress: {
                    fullName: name,
                    phone: phone,
                    email: email,
                    pincode: pincode,
                    address1: address1,
                    address2: address2
                },
                paymentMethod: "Pay Now",
                items: itemsPayload,
                subtotal: currentTotal,
                total: currentTotal
            };

            // Save pending checkout in session storage
            sessionStorage.setItem("firqui_pending_checkout", JSON.stringify(pendingCheckout));

            // Smoothly navigate directly to payment page — order is placed upon clicking Submit Payment Details
            window.location.href = "payment.html";
        });
    }

    // Initialize
    loadUserProfile();
    loadCartData();

});