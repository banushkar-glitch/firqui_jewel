/* ==========================================================================
   FIRQUI JEWELS — RAZORPAY STANDARD WEB CHECKOUT CONTROLLER
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.FIRQUI_API_BASE;

    function getToken() {
        return window.FirquiAuth.token();
    }

    /* =====================================================
       1. AUTHENTICATION & ORDER NUMBER VALIDATION
    ====================================================== */
    const token = getToken();

    // Guests have no profile page; the confirmation button points home
    if (!token) {
        const profileBtn = document.querySelector('.modal-buttons a[href*="profile.html"]');
        if (profileBtn) {
            profileBtn.href = "../index.html";
            profileBtn.textContent = "Back to Home";
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderNumberParam = urlParams.get("orderNumber") || urlParams.get("id") || urlParams.get("orderId");

    let pendingCheckout = null;
    try {
        pendingCheckout = JSON.parse(sessionStorage.getItem("firqui_pending_checkout"));
    } catch (e) {}

    if (!orderNumberParam && !pendingCheckout) {
        alert("Please proceed to checkout to place your order.");
        window.location.href = "checkout.html";
        return;
    }

    /* =====================================================
       2. DOM ELEMENTS
    ====================================================== */
    const displayOrderNumber = document.getElementById("display-order-number");
    const displayOrderAmount = document.getElementById("display-order-amount");
    const displayTotalAmount = document.getElementById("display-total-amount");
    const displaySubtotal = document.getElementById("display-subtotal");
    const displayOrderDate = document.getElementById("display-order-date");
    const displayPaymentStatus = document.getElementById("display-payment-status");
    const displayOrderItems = document.getElementById("display-order-items");

    const payButton = document.getElementById("pay-razorpay-btn");
    const btnText = payButton ? payButton.querySelector(".btn-text") : null;
    const btnLoader = payButton ? payButton.querySelector(".btn-loader") : null;
    const paymentAlert = document.getElementById("payment-alert");

    const confirmationModal = document.getElementById("confirmation-modal");
    const modalOrderNumber = document.getElementById("modal-order-number");
    const modalTxnId = document.getElementById("modal-txn-id");

    let currentOrderNumber = orderNumberParam || (pendingCheckout && pendingCheckout.orderNumber ? pendingCheckout.orderNumber : null);
    let payableAmount = 0;
    let customerPrefill = {
        name: "",
        email: "",
        contact: ""
    };

    /* =========================================
       HELPER FUNCTIONS
    ========================================= */
    function formatPrice(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    function showAlert(message, type) {
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

    function hideAlert() {
        if (paymentAlert) paymentAlert.style.display = "none";
    }

    function setBtnLoading(loading, message) {
        if (!payButton) return;
        payButton.disabled = loading;
        if (btnText && btnLoader) {
            btnText.style.display = loading ? "none" : "inline";
            btnLoader.style.display = loading ? "inline" : "none";
            if (message && loading) {
                btnLoader.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ' + window.FirquiHtml.escape(message);
            }
        }
    }

    function clearCart() {
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

    /* =====================================================
       3. LOAD ORDER DETAILS
    ====================================================== */
    async function loadOrderDetails() {
        if (pendingCheckout) {
            const addr = pendingCheckout.shippingAddress || {};
            customerPrefill.name = addr.fullName || "";
            customerPrefill.email = addr.email || "";
            customerPrefill.contact = addr.phone || "";

            payableAmount = pendingCheckout.total || pendingCheckout.subtotal || 0;
            if (!currentOrderNumber) {
                // Payment needs a saved order; never invent an order number in the browser
                showAlert("We couldn't find your order. Please go back to your cart and check out again.", "danger");
                if (payButton) payButton.disabled = true;
                return;
            }

            renderOrderSummary({
                orderNumber: currentOrderNumber,
                totalAmount: payableAmount,
                subtotal: pendingCheckout.subtotal || payableAmount,
                paymentStatus: "Pending",
                items: pendingCheckout.items || []
            });
            return;
        }

        if (orderNumberParam) {
            try {
                const headers = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(`${API_BASE}/api/orders/${orderNumberParam}`, { headers: headers });
                if (res.ok) {
                    const data = await res.json();
                    currentOrderNumber = data.orderNumber || orderNumberParam;
                    payableAmount = data.totalAmount || 0;
                    customerPrefill.name = data.shippingFullName || "";
                    customerPrefill.email = data.shippingEmail || "";
                    customerPrefill.contact = data.shippingPhone || "";

                    renderOrderSummary(data);
                    return;
                }
            } catch (err) {
                console.warn("Unable to fetch backend order:", err);
            }
        }

        if (displayOrderAmount) displayOrderAmount.textContent = "₹0";
    }

    function renderOrderSummary(order) {
        if (displayOrderNumber) displayOrderNumber.textContent = order.orderNumber || currentOrderNumber || "--";
        if (modalOrderNumber) modalOrderNumber.textContent = order.orderNumber || currentOrderNumber || "--";

        const amtStr = formatPrice(order.totalAmount != null ? order.totalAmount : payableAmount);
        if (displayOrderAmount) displayOrderAmount.textContent = amtStr;
        if (displayTotalAmount) displayTotalAmount.textContent = amtStr;
        if (displaySubtotal) displaySubtotal.textContent = formatPrice(order.subtotal != null ? order.subtotal : payableAmount);

        if (displayPaymentStatus) {
            const status = (order.paymentStatus || "PENDING").toUpperCase();
            displayPaymentStatus.textContent = status;
            if (status === "PAID") {
                displayPaymentStatus.className = "payment-status-badge status-paid";
                if (payButton) payButton.disabled = true;
            }
        }

        if (displayOrderDate) {
            displayOrderDate.textContent = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "Today";
        }

        if (displayOrderItems && order.items && order.items.length > 0) {
            displayOrderItems.innerHTML = "";
            order.items.forEach(function (item) {
                const itemDiv = document.createElement("div");
                itemDiv.className = "order-item-row";
                itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;";
                itemDiv.innerHTML = `
                    <div>
                        <strong>${window.FirquiHtml.escape(item.name || item.productName || 'Product')}</strong>
                        <div style="font-size: 0.8rem; color: #64748b;">Qty: ${item.quantity || 1}</div>
                    </div>
                    <div>${formatPrice(item.price || item.unitPrice || 0)}</div>
                `;
                displayOrderItems.appendChild(itemDiv);
            });
        } else if (displayOrderItems) {
            displayOrderItems.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Cart items</div>';
        }
    }

    /* =====================================================
       4. RAZORPAY CHECKOUT TRIGGER
    ====================================================== */
    if (payButton) {
        payButton.addEventListener("click", async function () {
            hideAlert();

            if (payableAmount <= 0) {
                showAlert("Invalid payable amount. Please checkout from cart again.", "danger");
                return;
            }

            const amountInPaise = Math.round(payableAmount * 100);
            if (amountInPaise < 100) {
                showAlert("Payable amount must be at least ₹1.00.", "warning");
                return;
            }

            setBtnLoading(true, "Connecting to Razorpay...");

            let razorpayOrder = null;
            try {
                // Call Step 1: POST /api/create-order
                const createRes = await fetch(`${API_BASE}/api/create-order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // The server charges the saved order total; no amount is sent from the browser
                    body: JSON.stringify({ orderNumber: currentOrderNumber })
                });

                if (!createRes.ok) {
                    const errJson = await createRes.json().catch(function () { return {}; });
                    throw new Error(errJson.message || ("Server error: " + createRes.status));
                }

                razorpayOrder = await createRes.json();
            } catch (err) {
                showAlert("Failed to initiate Razorpay order: " + err.message, "danger");
                setBtnLoading(false);
                return;
            }

            const rzpOrderId = razorpayOrder.order_id || razorpayOrder.orderId;
            const rzpKeyId = razorpayOrder.key_id || razorpayOrder.keyId;

            if (!rzpOrderId) {
                showAlert("Razorpay did not return a valid order ID.", "danger");
                setBtnLoading(false);
                return;
            }

            if (typeof window.Razorpay !== "function") {
                showAlert("Razorpay checkout SDK failed to load. Please verify your internet connection.", "danger");
                setBtnLoading(false);
                return;
            }

            // Step 2: Open Razorpay checkout modal
            const options = {
                key: rzpKeyId,
                amount: razorpayOrder.amount || amountInPaise,
                currency: razorpayOrder.currency || "INR",
                name: "FIRQUI JEWELS",
                description: "Order #" + currentOrderNumber,
                image: "../assets/lastfirqui.png",
                order_id: rzpOrderId,
                prefill: {
                    name: customerPrefill.name,
                    email: customerPrefill.email,
                    contact: customerPrefill.contact
                },
                theme: {
                    color: "#0A373B"
                },
                modal: {
                    ondismiss: async function () {
                        // In UPI flow, user might finish on phone while modal closes
                        setBtnLoading(true, "Checking status with gateway...");
                        try {
                            const checkRes = await fetch(`${API_BASE}/api/orders/${currentOrderNumber}/reconcile-payment`);
                            if (checkRes.ok) {
                                const checkData = await checkRes.json();
                                if (checkData.paid) {
                                    clearCart();
                                    if (modalOrderNumber) modalOrderNumber.textContent = currentOrderNumber;
                                    if (modalTxnId) modalTxnId.textContent = checkData.paymentId || "Verified";
                                    if (confirmationModal) confirmationModal.style.display = "flex";
                                    if (displayPaymentStatus) {
                                        displayPaymentStatus.textContent = "PAID";
                                        displayPaymentStatus.className = "payment-status-badge status-paid";
                                    }
                                    return;
                                }
                            }
                        } catch (e) {}

                        showAlert("Payment cancelled or pending confirmation. If your account was debited, click 'Check Payment Status' below.", "warning");
                        showReconcileCheckButton(currentOrderNumber);
                        setBtnLoading(false);
                    }
                },
                handler: async function (response) {
                    // Receive razorpay_payment_id, razorpay_order_id, razorpay_signature
                    // Step 3: Call backend verify endpoint: POST /api/verify-payment
                    setBtnLoading(true, "Verifying payment signature...");

                    try {
                        const verifyRes = await fetch(`${API_BASE}/api/verify-payment`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderNumber: currentOrderNumber
                            })
                        });

                        const verifyData = await verifyRes.json().catch(function () { return {}; });

                        if (verifyRes.ok && verifyData.success) {
                            // Verified!
                            clearCart();

                            if (modalOrderNumber) modalOrderNumber.textContent = currentOrderNumber;
                            if (modalTxnId) modalTxnId.textContent = response.razorpay_payment_id;
                            if (confirmationModal) confirmationModal.style.display = "flex";

                            if (displayPaymentStatus) {
                                displayPaymentStatus.textContent = "PAID";
                                displayPaymentStatus.className = "payment-status-badge status-paid";
                            }
                        } else {
                            showAlert("Signature verification failed: " + (verifyData.message || "Payment not credited."), "danger");
                            showReconcileCheckButton(currentOrderNumber);
                            setBtnLoading(false);
                        }
                    } catch (err) {
                        showAlert("Error verifying payment signature: " + err.message, "danger");
                        showReconcileCheckButton(currentOrderNumber);
                        setBtnLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            // Handle payment.failed event
            rzp.on("payment.failed", function (response) {
                const err = response.error || {};
                let desc = err.description || err.reason || err.step || "Transaction failed.";
                if (desc.indexOf("registered website") !== -1 || (err.step === "payment_initiation" && rzpKeyId.startsWith("rzp_live_"))) {
                    desc += " (Note: In Razorpay Live Mode, payments must originate from your registered website domain. Testing on localhost / 127.0.0.1 is blocked by Razorpay's security risk filter. To test payments locally, use a Razorpay Test Key or test directly on your live domain).";
                }
                showAlert("Payment failed: " + desc, "danger");
                showReconcileCheckButton(currentOrderNumber);
                setBtnLoading(false);
            });

            rzp.open();
        });
    }

    function showReconcileCheckButton(ordNum) {
        if (!paymentAlert || !ordNum) return;
        const existing = document.getElementById("reconcile-check-btn-payment");
        if (existing) existing.remove();

        const btn = document.createElement("button");
        btn.id = "reconcile-check-btn-payment";
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
                    if (modalOrderNumber) modalOrderNumber.textContent = ordNum;
                    if (modalTxnId) modalTxnId.textContent = data.paymentId || "Verified";
                    if (confirmationModal) confirmationModal.style.display = "flex";
                    if (displayPaymentStatus) {
                        displayPaymentStatus.textContent = "PAID";
                        displayPaymentStatus.className = "payment-status-badge status-paid";
                    }
                } else {
                    showAlert(data.message || "Payment is still pending or not confirmed by Razorpay.", "warning");
                    showReconcileCheckButton(ordNum);
                }
            } catch (e) {
                showAlert("Could not reach server: " + e.message, "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Check Payment Status';
            }
        });
        paymentAlert.appendChild(btn);
    }

    // Initialize
    loadOrderDetails();

});
