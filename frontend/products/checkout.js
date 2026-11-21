document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.FIRQUI_API_BASE;

    function getToken() {
        return window.FirquiAuth.token();
    }

    /* =========================================
       AUTHENTICATION CHECK (LOGIN OPTIONAL)
    ========================================= */
    const token = getToken();

    /* =========================================
       DOM ELEMENTS
    ========================================= */
    const checkoutItems = document.getElementById("checkout-items");
    const subtotalElement = document.getElementById("checkout-subtotal");
    const totalElement = document.getElementById("checkout-total");
    const checkoutForm = document.getElementById("checkout-form");
    const paymentAlert = document.getElementById("payment-alert");
    const successModal = document.getElementById("checkout-success-modal");
    const modalOrderNumber = document.getElementById("modal-order-number");
    const modalPaymentId = document.getElementById("modal-payment-id");
    const modalAmountPaid = document.getElementById("modal-amount-paid");
    const modalOrdersLink = document.getElementById("modal-orders-link");

    // Guest checkout: offer (not require) logging in
    if (checkoutForm && window.FirquiAuth && !window.FirquiAuth.isSignedIn()) {
        const note = document.createElement("p");
        note.className = "guest-checkout-note";
        note.innerHTML = 'Checking out as a guest. <a href="' + window.FirquiAuth.loginUrl() + '">Log in</a> to save your details and track orders.';
        checkoutForm.insertAdjacentElement("afterbegin", note);

        if (modalOrdersLink) {
            modalOrdersLink.href = "../index.html";
            modalOrdersLink.textContent = "Back to Home";
        }
    }
    const submitButton = checkoutForm ? checkoutForm.querySelector(".place-order-button") : null;

    let cart = [];

    /* =========================================
       ALERT HELPERS
    ========================================= */
    function showPaymentAlert(message, type) {
        if (!paymentAlert) return;
        paymentAlert.style.display = "block";
        if (type === "danger" || type === "error") {
            paymentAlert.style.background = "#fde8e8";
            paymentAlert.style.color = "#9b1c1c";
            paymentAlert.style.border = "1px solid #f8b4b4";
            paymentAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + window.FirquiHtml.escape(message);
        } else if (type === "warning") {
            paymentAlert.style.background = "#fef08a";
            paymentAlert.style.color = "#854d0e";
            paymentAlert.style.border = "1px solid #fde047";
            paymentAlert.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + window.FirquiHtml.escape(message);
        } else {
            paymentAlert.style.background = "#def7ec";
            paymentAlert.style.color = "#03543f";
            paymentAlert.style.border = "1px solid #bcf0da";
            paymentAlert.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + window.FirquiHtml.escape(message);
        }
        paymentAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function hidePaymentAlert() {
        if (paymentAlert) paymentAlert.style.display = "none";
    }

    function setButtonLoading(text) {
        if (!submitButton) return;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + (text || 'Processing...');
    }

    function resetButton() {
        if (!submitButton) return;
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa-solid fa-lock"></i> Pay with Razorpay';
    }

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
        try {
            const cachedUser = JSON.parse(localStorage.getItem("firquiCustomer")) ||
                               JSON.parse(localStorage.getItem("firqui_user"));
            if (cachedUser) {
                fillFormFields(cachedUser);
            }
        } catch (e) {}

        if (token) {
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
        if (token) {
            try {
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
        }

        try {
            cart = JSON.parse(localStorage.getItem("firquiCart")) || [];
        } catch (e) {
            cart = [];
        }

        renderCartSummary(cart);
    }

    function clearCart() {
        cart = [];
        try {
            localStorage.removeItem("firquiCart");
            sessionStorage.removeItem("firqui_pending_checkout");
        } catch (e) {}

        if (token) {
            fetch(`${API_BASE}/api/cart/items`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            }).catch(function () {});
        }
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
                    src="${window.FirquiHtml.escape(resolveImage(product.image))}"
                    alt="${window.FirquiHtml.escape(product.name || 'Product')}"
                    onerror="this.src='../assets/Logo Pink 1.png'"
                >

                <div>
                    <div class="checkout-product-name">
                        ${window.FirquiHtml.escape(product.name || '')}
                    </div>

                    ${selectedSize ? `
                    <div class="checkout-product-variant" style="font-size: 0.85rem; color: #555; margin: 2px 0;">
                        Size: ${window.FirquiHtml.escape(selectedSize)}
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
       RAZORPAY STANDARD CHECKOUT INTEGRATION
    ========================================= */
    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            hidePaymentAlert();

            if (!cart || cart.length === 0) {
                showPaymentAlert("Your cart is empty. Please add items before checking out.", "warning");
                return;
            }

            const name = document.getElementById("customer-name").value.trim();
            const phone = document.getElementById("customer-phone").value.trim();
            const email = document.getElementById("customer-email").value.trim();
            const pincode = document.getElementById("customer-pincode").value.trim();
            const address1 = document.getElementById("address-1").value.trim();
            const address2 = document.getElementById("address-2").value.trim();

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                showPaymentAlert("Please enter a valid email address for order confirmation.", "warning");
                document.getElementById("customer-email").focus();
                return;
            }

            // Save address locally
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

            // Calculate total
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

            let currentTotal = 0;
            itemsPayload.forEach(function (it) {
                currentTotal += (it.price || 0) * (it.quantity || 1);
            });

            const amountInPaise = Math.round(currentTotal * 100);
            if (amountInPaise < 100) {
                showPaymentAlert("Order total must be at least ₹1.00.", "warning");
                return;
            }

            setButtonLoading("Initiating secure payment...");

            let orderNumber = null;

            // 1. Create order in Firqui database
            try {
                const headers = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const orderCreateRes = await fetch(`${API_BASE}/api/orders`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        shippingAddress: {
                            fullName: name,
                            phone: phone,
                            email: email,
                            pincode: pincode,
                            address1: address1,
                            address2: address2
                        },
                        paymentMethod: "Razorpay",
                        items: itemsPayload
                    })
                });

                if (orderCreateRes.ok) {
                    const orderResult = await orderCreateRes.json();
                    orderNumber = orderResult.orderNumber;
                } else {
                    const errData = await orderCreateRes.json().catch(function () { return {}; });
                    throw new Error(errData.message || "Failed to place order record");
                }
            } catch (err) {
                showPaymentAlert("Could not initialize order: " + err.message, "danger");
                resetButton();
                return;
            }

            // 2. Call backend Razorpay endpoint: POST /api/create-order
            let razorpayOrderData = null;
            try {
                const rzpCreateRes = await fetch(`${API_BASE}/api/create-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // The server charges the saved order total; no amount is sent from the browser
                    body: JSON.stringify({ orderNumber: orderNumber })
                });

                if (!rzpCreateRes.ok) {
                    const errorJson = await rzpCreateRes.json().catch(function () { return {}; });
                    throw new Error(errorJson.message || ("Server returned error " + rzpCreateRes.status));
                }

                razorpayOrderData = await rzpCreateRes.json();
            } catch (err) {
                showPaymentAlert("Could not initiate Razorpay payment: " + err.message, "danger");
                resetButton();
                return;
            }

            const razorpayOrderId = razorpayOrderData.order_id || razorpayOrderData.orderId;
            const razorpayKeyId = razorpayOrderData.key_id || razorpayOrderData.keyId;

            if (!razorpayOrderId) {
                showPaymentAlert("Invalid response from payment gateway. Please try again.", "danger");
                resetButton();
                return;
            }

            // Check if Razorpay SDK script loaded
            if (typeof window.Razorpay !== "function") {
                showPaymentAlert("Razorpay checkout SDK failed to load. Please check your network connection.", "danger");
                resetButton();
                return;
            }

            // 3. Configure and open Razorpay Standard Modal
            const options = {
                key: razorpayKeyId,
                amount: razorpayOrderData.amount || amountInPaise,
                currency: razorpayOrderData.currency || "INR",
                name: "FIRQUI JEWELS",
                description: "Order #" + orderNumber,
                image: "../assets/lastfirqui.png",
                order_id: razorpayOrderId,
                prefill: {
                    name: name,
                    email: email,
                    contact: phone
                },
                theme: {
                    color: "#0A373B"
                },
                modal: {
                    ondismiss: async function () {
                        // User may have completed payment on phone right as modal was closed
                        setButtonLoading("Checking payment status with gateway...");
                        try {
                            const checkRes = await fetch(`${API_BASE}/api/orders/${orderNumber}/reconcile-payment`);
                            if (checkRes.ok) {
                                const checkData = await checkRes.json();
                                if (checkData.paid) {
                                    clearCart();
                                    renderCartSummary([]);
                                    if (modalOrderNumber) modalOrderNumber.textContent = orderNumber;
                                    if (modalPaymentId) modalPaymentId.textContent = checkData.paymentId || "Verified";
                                    if (modalAmountPaid) modalAmountPaid.textContent = formatPrice(currentTotal);
                                    if (successModal) successModal.style.display = "flex";
                                    return;
                                }
                            }
                        } catch (e) {}

                        showPaymentAlert("Payment modal closed. If your bank account was debited, please click 'Verify Payment Status' below.", "warning");
                        showStatusCheckButton(orderNumber, currentTotal);
                        resetButton();
                    }
                },
                handler: async function (response) {
                    // On success: receive razorpay_payment_id, razorpay_order_id, razorpay_signature
                    // Send all three to verify endpoint: POST /api/verify-payment
                    setButtonLoading("Verifying payment signature...");

                    try {
                        const verifyRes = await fetch(`${API_BASE}/api/verify-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderNumber: orderNumber
                            })
                        });

                        const verifyData = await verifyRes.json().catch(function () { return {}; });

                        if (verifyRes.ok && verifyData.success) {
                            // Payment confirmed and verified!
                            clearCart();
                            renderCartSummary([]);

                            if (modalOrderNumber) modalOrderNumber.textContent = orderNumber;
                            if (modalPaymentId) modalPaymentId.textContent = response.razorpay_payment_id;
                            if (modalAmountPaid) modalAmountPaid.textContent = formatPrice(currentTotal);
                            if (successModal) successModal.style.display = "flex";

                        } else {
                            // Signature mismatch or verification error
                            showPaymentAlert("Payment verification failed: " + (verifyData.message || "Invalid signature. Payment has NOT been credited."), "danger");
                            showStatusCheckButton(orderNumber, currentTotal);
                            resetButton();
                        }
                    } catch (err) {
                        showPaymentAlert("Network error while verifying payment: " + err.message, "danger");
                        showStatusCheckButton(orderNumber, currentTotal);
                        resetButton();
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            // Handle payment.failed event
            rzp.on("payment.failed", function (response) {
                const err = response.error || {};
                let reason = err.description || err.reason || err.step || "Transaction failed";
                if (reason.indexOf("registered website") !== -1 || (err.step === "payment_initiation" && razorpayKeyId.startsWith("rzp_live_"))) {
                    reason += " (Note: In Razorpay Live Mode, payments are strictly verified against your registered website domain. Testing from localhost / 127.0.0.1 is blocked by Razorpay's security risk filter. To test payments locally, use a Razorpay Test Key or test directly on your live domain).";
                }
                showPaymentAlert("Payment failed: " + reason, "danger");
                showStatusCheckButton(orderNumber, currentTotal);
                resetButton();
            });

            rzp.open();
        });
    }

    function showStatusCheckButton(ordNum, total) {
        if (!paymentAlert || !ordNum) return;
        const existingBtn = document.getElementById("reconcile-check-btn");
        if (existingBtn) existingBtn.remove();

        const btn = document.createElement("button");
        btn.id = "reconcile-check-btn";
        btn.type = "button";
        btn.style.cssText = "display: inline-block; margin-top: 10px; padding: 7px 16px; background: #0A373B; color: #fff; border: none; border-radius: 4px; font-size: 0.85rem; font-weight: 500; cursor: pointer;";
        btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Check Payment Status';
        btn.addEventListener("click", async function () {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Checking gateway...';
            try {
                const res = await fetch(`${API_BASE}/api/orders/${ordNum}/reconcile-payment`);
                const data = await res.json();
                if (data.paid) {
                    clearCart();
                    renderCartSummary([]);
                    if (modalOrderNumber) modalOrderNumber.textContent = ordNum;
                    if (modalPaymentId) modalPaymentId.textContent = data.paymentId || "Verified";
                    if (modalAmountPaid) modalAmountPaid.textContent = formatPrice(total);
                    if (successModal) successModal.style.display = "flex";
                } else {
                    showPaymentAlert(data.message || "Payment is still pending or not confirmed by Razorpay.", "warning");
                    showStatusCheckButton(ordNum, total);
                }
            } catch (e) {
                showPaymentAlert("Could not reach server: " + e.message, "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Check Payment Status';
            }
        });
        paymentAlert.appendChild(btn);
    }

    // Initialize
    loadUserProfile();
    loadCartData();

});
