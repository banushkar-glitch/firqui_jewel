document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.FIRQUI_API_BASE;

    /* =========================================
       PROFILE ELEMENTS
    ========================================= */

    const profileName = document.getElementById("profile-name");
    const profilePhone = document.getElementById("profile-phone");
    const profileEmail = document.getElementById("profile-email");
    const profilePincode = document.getElementById("profile-pincode");
    const profileAddress1 = document.getElementById("profile-address1");
    const profileAddress2 = document.getElementById("profile-address2");

    const editProfileButton = document.getElementById("edit-profile-button");
    const logoutButton = document.getElementById("logout-button");
    const ordersContainer = document.getElementById("orders-container");

    // Modal elements
    const editModal = document.getElementById("editProfileModal");
    const closeEditModalBtn = document.getElementById("closeEditModal");
    const cancelEditBtn = document.getElementById("cancelEditBtn");
    const editForm = document.getElementById("editProfileForm");
    const modalAlert = document.getElementById("modalAlert");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

    const editNameInput = document.getElementById("edit-name");
    const editPhoneInput = document.getElementById("edit-phone");
    const editEmailInput = document.getElementById("edit-email");
    const editPincodeInput = document.getElementById("edit-pincode");
    const editAddress1Input = document.getElementById("edit-address1");
    const editAddress2Input = document.getElementById("edit-address2");

    let currentUserData = null;

    /* =========================================
       AUTHENTICATION CHECK & REDIRECT
    ========================================= */

    function getToken() {
        return window.FirquiAuth.token();
    }

    function checkAuth() {
        const token = getToken();
        if (!token) {
            window.FirquiAuth.goToLogin();
            return false;
        }
        return true;
    }

    /* =========================================
       POPULATE PROFILE IN DOM
    ========================================= */

    function renderProfile(user) {
        if (!user) return;

        currentUserData = user;

        const nameVal = user.fullName || user.name;
        const phoneVal = user.phoneNumber || user.mobileNumber || user.phone;
        const emailVal = user.email;
        const pincodeVal = user.pincode;
        const address1Val = user.address1;
        const address2Val = user.address2;

        profileName.textContent = (nameVal && nameVal.trim()) ? nameVal.trim() : "Not added";
        profilePhone.textContent = (phoneVal && phoneVal.trim()) ? phoneVal.trim() : "Not added";
        profileEmail.textContent = (emailVal && emailVal.trim()) ? emailVal.trim() : "Not added";
        profilePincode.textContent = (pincodeVal && pincodeVal.trim()) ? pincodeVal.trim() : "Not added";
        profileAddress1.textContent = (address1Val && address1Val.trim()) ? address1Val.trim() : "Not added";
        profileAddress2.textContent = (address2Val && address2Val.trim()) ? address2Val.trim() : "Not added";

        // Keep local caches updated
        try {
            localStorage.setItem("firquiCustomer", JSON.stringify({
                name: nameVal || "",
                phone: phoneVal || "",
                email: emailVal || "",
                pincode: pincodeVal || "",
                address1: address1Val || "",
                address2: address2Val || ""
            }));
            localStorage.setItem("firqui_user", JSON.stringify({
                name: nameVal || "",
                email: emailVal || "",
                role: user.role || "USER"
            }));
        } catch (e) {
            console.warn("Storage sync error:", e);
        }
    }

    /* =========================================
       LOAD PROFILE FROM SPRING BOOT BACKEND
    ========================================= */

    async function loadProfile() {
        if (!checkAuth()) return;

        const token = getToken();

        // 1. Initial render from cached storage if available for instant UI response
        try {
            const cachedCustomer = JSON.parse(localStorage.getItem("firquiCustomer"));
            if (cachedCustomer) {
                renderProfile(cachedCustomer);
            }
        } catch (e) {}

        // 2. Fetch fresh authenticated profile from GET /api/users/me
        try {
            const response = await fetch(`${API_BASE}/api/users/me`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                // Session expired or ended elsewhere
                window.FirquiAuth.clear();
                window.FirquiAuth.goToLogin();
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to retrieve profile.");
            }

            const data = await response.json();
            renderProfile(data);

        } catch (error) {
            console.warn("API load error, using local data if available:", error);
            // If offline fallback data exists, keep showing it
            if (!currentUserData) {
                const cachedCustomer = JSON.parse(localStorage.getItem("firquiCustomer")) || null;
                if (cachedCustomer) {
                    renderProfile(cachedCustomer);
                } else {
                    profileName.textContent = "Not added";
                    profilePhone.textContent = "Not added";
                    profileEmail.textContent = "Not added";
                    profilePincode.textContent = "Not added";
                    profileAddress1.textContent = "Not added";
                    profileAddress2.textContent = "Not added";
                }
            }
        }
    }

    /* =========================================
       EDIT PROFILE MODAL ACTIONS
    ========================================= */

    function openEditModal() {
        if (!editModal) return;

        // Clear alert
        if (modalAlert) {
            modalAlert.style.display = "none";
            modalAlert.textContent = "";
            modalAlert.className = "modal-alert";
        }

        // Pre-fill inputs with current values
        const currentName = profileName.textContent !== "Not added" ? profileName.textContent : "";
        const currentPhone = profilePhone.textContent !== "Not added" ? profilePhone.textContent : "";
        const currentEmail = profileEmail.textContent !== "Not added" ? profileEmail.textContent : "";
        const currentPincode = profilePincode.textContent !== "Not added" ? profilePincode.textContent : "";
        const currentAddress1 = profileAddress1.textContent !== "Not added" ? profileAddress1.textContent : "";
        const currentAddress2 = profileAddress2.textContent !== "Not added" ? profileAddress2.textContent : "";

        if (editNameInput) editNameInput.value = currentName;
        if (editPhoneInput) editPhoneInput.value = currentPhone;
        if (editEmailInput) editEmailInput.value = currentEmail;
        if (editPincodeInput) editPincodeInput.value = currentPincode;
        if (editAddress1Input) editAddress1Input.value = currentAddress1;
        if (editAddress2Input) editAddress2Input.value = currentAddress2;

        editModal.classList.add("active");
        editModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (editNameInput) editNameInput.focus();
    }

    function closeEditModal() {
        if (!editModal) return;
        editModal.classList.remove("active");
        editModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (editProfileButton) {
        editProfileButton.addEventListener("click", openEditModal);
    }

    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener("click", closeEditModal);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", closeEditModal);
    }

    if (editModal) {
        editModal.addEventListener("click", function (e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }

    /* =========================================
       SAVE PROFILE (PUT /api/users/me)
    ========================================= */

    if (editForm) {
        editForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const name = editNameInput.value.trim();
            const phone = editPhoneInput.value.trim().replace(/\D/g, "");
            const email = editEmailInput.value.trim().toLowerCase();
            const pincode = editPincodeInput.value.trim();
            const address1 = editAddress1Input.value.trim();
            const address2 = editAddress2Input.value.trim();

            // Client-side validations
            if (!name) {
                showModalAlert("Please enter your full name.", "error");
                editNameInput.focus();
                return;
            }

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showModalAlert("Please enter a valid email address.", "error");
                editEmailInput.focus();
                return;
            }

            if (!phone || phone.length !== 10) {
                showModalAlert("Please enter a valid 10-digit mobile number.", "error");
                editPhoneInput.focus();
                return;
            }

            if (pincode && pincode.length !== 6) {
                showModalAlert("Pincode must be exactly 6 digits.", "error");
                editPincodeInput.focus();
                return;
            }

            if (saveProfileBtn) {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = "Saving...";
            }

            const token = getToken();

            try {
                const response = await fetch(`${API_BASE}/api/users/me`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fullName: name,
                        phoneNumber: phone,
                        email: email,
                        pincode: pincode,
                        address1: address1,
                        address2: address2
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to update profile.");
                }

                // Success
                renderProfile(data);
                showModalAlert("Profile updated successfully.", "success");

                setTimeout(function () {
                    closeEditModal();
                    if (saveProfileBtn) {
                        saveProfileBtn.disabled = false;
                        saveProfileBtn.textContent = "Save Changes";
                    }
                }, 800);

            } catch (err) {
                console.error("Profile update error:", err);

                // Fallback for demo token / offline mode
                if (token === "demo-admin-token" || token === "demo-user-token") {
                    const fallbackUser = {
                        fullName: name,
                        name: name,
                        phoneNumber: phone,
                        phone: phone,
                        email: email,
                        pincode: pincode,
                        address1: address1,
                        address2: address2
                    };
                    renderProfile(fallbackUser);
                    showModalAlert("Profile updated successfully.", "success");
                    setTimeout(function () {
                        closeEditModal();
                        if (saveProfileBtn) {
                            saveProfileBtn.disabled = false;
                            saveProfileBtn.textContent = "Save Changes";
                        }
                    }, 800);
                    return;
                }

                showModalAlert(err.message || "Error saving profile. Please try again.", "error");
                if (saveProfileBtn) {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = "Save Changes";
                }
            }
        });
    }

    function showModalAlert(message, type) {
        if (!modalAlert) return;
        modalAlert.textContent = message;
        modalAlert.className = `modal-alert ${type}`;
        modalAlert.style.display = "block";
    }

    /* =========================================
       DELETE ACCOUNT (DELETE /api/users/me)
    ========================================= */

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", async function () {
            const confirmed = confirm(
                "Are you sure you want to delete your account?\n\nThis action cannot be undone."
            );
            if (!confirmed) return;

            const token = getToken();

            try {
                const response = await fetch(`${API_BASE}/api/users/me`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (response.ok || response.status === 200) {
                    alert("Your account has been deactivated successfully.");
                }
            } catch (err) {
                console.warn("Delete API error:", err);
            }

            // The server has already cleared the session cookie
            window.FirquiAuth.clear();
            window.location.href = "../index.html";
        });
    }

    /* =========================================
       LOGOUT ACTION
    ========================================= */

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            const confirmed = confirm("Are you sure you want to log out?");
            if (!confirmed) return;

            window.FirquiAuth.logout();
        });
    }

    /* =========================================
       LOAD ORDERS (SPRING BOOT BACKEND)
    ========================================= */

    async function loadOrders() {
        if (!ordersContainer) return;

        const token = getToken();
        let orders = [];
        let cancellationMap = {};

        // 1. Fetch live orders from Spring Boot backend
        if (token) {
            try {
                const response = await fetch(`${API_BASE}/api/users/me/orders`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    orders = await response.json();
                }
            } catch (err) {
                console.warn("Backend orders fetch error, falling back to local orders:", err);
            }

            try {
                const cancelRes = await fetch(`${API_BASE}/api/cancellation-requests/my`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
                if (cancelRes.ok) {
                    const cancelList = await cancelRes.json();
                    if (Array.isArray(cancelList)) {
                        cancelList.forEach(c => {
                            if (c.orderNumber) {
                                cancellationMap[String(c.orderNumber).replace("#", "")] = c;
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn("Backend cancellation requests fetch error:", err);
            }
        }

        // 2. Fallback to cached local orders if backend returned empty and offline data exists
        if (!orders || orders.length === 0) {
            try {
                orders = JSON.parse(localStorage.getItem("firquiOrders")) || [];
            } catch (e) {
                orders = [];
            }
        }

        /* -------------------------------------
           NO ORDERS
        ------------------------------------- */
        if (!orders || orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="no-orders">
                    <i class="fa-regular fa-clipboard"></i>
                    <h3>No Orders Yet</h3>
                    <p>
                        Your order history will appear here
                        after you place an order.
                    </p>
                    <a href="../products/bracelets_cuffs.html"
                       class="shop-button">
                        Continue Shopping
                    </a>
                </div>
            `;
            return;
        }

        /* -------------------------------------
           CLEAR OLD ORDERS
        ------------------------------------- */
        ordersContainer.innerHTML = "";

        /* -------------------------------------
           DISPLAY EACH ORDER
        ------------------------------------- */
        orders.forEach(function (order, index) {
            const orderCard = document.createElement("div");
            orderCard.className = "order-card";

            const orderNum = order.orderNumber || order.orderId || order.id;
            const orderDateStr = order.orderDate || order.date || "Recent";

            /* ORDER HEADER */
            const orderHeader = document.createElement("div");
            orderHeader.className = "order-header";

            const orderIdEl = document.createElement("div");
            orderIdEl.className = "order-id";
            orderIdEl.textContent = "Order #" + orderNum;

            const orderDateEl = document.createElement("div");
            orderDateEl.className = "order-date";
            orderDateEl.textContent = "Order Date: " + orderDateStr;

            orderHeader.appendChild(orderIdEl);
            orderHeader.appendChild(orderDateEl);

            /* PRODUCTS */
            const productsContainer = document.createElement("div");
            productsContainer.className = "order-products";

            (order.products || []).forEach(function (product) {
                const productRow = document.createElement("div");
                productRow.className = "order-product";

                const productLeft = document.createElement("div");

                const productName = document.createElement("div");
                productName.className = "order-product-name";
                productName.textContent = product.name || product.productName || "FIRQUI Jewellery";

                const productQuantity = document.createElement("div");
                productQuantity.className = "order-product-quantity";
                const sizeText = product.selectedSize ? ` • Size: ${product.selectedSize}` : "";
                productQuantity.textContent = `Quantity: ${product.quantity || 1}${sizeText}`;

                productLeft.appendChild(productName);
                productLeft.appendChild(productQuantity);

                const productPrice = document.createElement("div");
                productPrice.className = "order-product-price";

                const price = Number(
                    String(product.subtotal || product.price || 0)
                        .replace("₹", "")
                        .replace(/,/g, "")
                        .trim()
                ) || 0;

                const productTotal = product.formattedSubtotal || ("₹" + Math.round(price).toLocaleString("en-IN"));
                productPrice.textContent = productTotal;

                productRow.appendChild(productLeft);
                productRow.appendChild(productPrice);

                productsContainer.appendChild(productRow);
            });

            /* ORDER INFORMATION */
            const orderInfo = document.createElement("div");
            orderInfo.className = "order-info";

            /* TOTAL */
            const totalDisplay = order.formattedTotal || ("₹" + Math.round(Number(order.totalAmount || order.total || order.amount || 0)).toLocaleString("en-IN"));
            const totalItem = document.createElement("div");
            totalItem.className = "order-info-item";
            totalItem.innerHTML = `
                <span class="order-info-label">
                    Total Amount
                </span>
                <span class="order-info-value">
                    ${totalDisplay}
                </span>
            `;

            /* PAYMENT */
            const paymentItem = document.createElement("div");
            paymentItem.className = "order-info-item";
            paymentItem.innerHTML = `
                <span class="order-info-label">
                    Payment Method
                </span>
                <span class="order-info-value">
                    ${order.paymentMethod || "Cash on Delivery"}
                </span>
            `;

            /* PAYMENT STATUS */
            const rawPayStatus = (order.paymentStatus || "Pending").toUpperCase();
            const payStatusItem = document.createElement("div");
            payStatusItem.className = "order-info-item";

            let payStatusBadgeStyle = "font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;";
            let payStatusText = order.paymentStatus || "Pending";

            if (rawPayStatus.includes("PAID")) {
                payStatusBadgeStyle += " background: #D4EDDA; color: #155724;";
            } else if (rawPayStatus.includes("VERIF")) {
                payStatusBadgeStyle += " background: #CCE5FF; color: #004085;";
                payStatusText = "Awaiting Verification";
            } else if (rawPayStatus.includes("REJECT")) {
                payStatusBadgeStyle += " background: #F8D7DA; color: #721C24;";
            } else if (rawPayStatus.includes("PAYMENT")) {
                payStatusBadgeStyle += " background: #FFF3CD; color: #856404;";
                payStatusText = "Pending Payment";
            } else {
                payStatusBadgeStyle += " background: #E2E3E5; color: #383D41;";
            }

            payStatusItem.innerHTML = `
                <span class="order-info-label">
                    Payment Status
                </span>
                <span class="order-info-value">
                    <span style="${payStatusBadgeStyle}">
                        ${payStatusText}
                    </span>
                    ${order.transactionId ? `<br><small style="color: #666; font-size: 0.75rem;">Ref: ${window.FirquiHtml.escape(order.transactionId)}</small>` : ""}
                    ${order.rejectionReason ? `<br><small style="color: #D32F2F; font-size: 0.75rem;">Reason: ${window.FirquiHtml.escape(order.rejectionReason)}</small>` : ""}
                </span>
            `;

            /* STATUS */
            const currentStatus = order.orderStatus || order.status || "Processing";
            const statusItem = document.createElement("div");
            statusItem.className = "order-info-item";
            statusItem.innerHTML = `
                <span class="order-info-label">
                    Order Status
                </span>
                <span class="order-status">
                    ${currentStatus}
                </span>
            `;

            orderInfo.appendChild(totalItem);
            orderInfo.appendChild(paymentItem);
            orderInfo.appendChild(payStatusItem);
            orderInfo.appendChild(statusItem);

            /* CANCELLATION REQUEST STATUS DISPLAY */
            const cleanOrderNum = String(orderNum).replace("#", "");
            const cancelReq = cancellationMap[cleanOrderNum];
            if (cancelReq) {
                const cancelStatusItem = document.createElement("div");
                cancelStatusItem.className = "order-info-item";

                let cBadgeStyle = "font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;";
                let cStatusText = "Cancellation Request " + cancelReq.status;

                if (cancelReq.status === "PENDING") {
                    cBadgeStyle += " background: #FFF3CD; color: #856404;";
                    cStatusText = "Cancellation Request Pending";
                } else if (cancelReq.status === "APPROVED") {
                    cBadgeStyle += " background: #D4EDDA; color: #155724;";
                    cStatusText = "Cancellation Request Approved";
                } else if (cancelReq.status === "REJECTED") {
                    cBadgeStyle += " background: #F8D7DA; color: #721C24;";
                    cStatusText = "Cancellation Request Rejected";
                }

                let refundNoteHtml = "";
                if (cancelReq.refundStatus === "PENDING_REFUND") {
                    refundNoteHtml = `<br><small style="color: #0A373B; font-weight: 600; font-size: 0.75rem;"><i class="fa-solid fa-rotate"></i> Refund Status: Processing (Manual UPI)</small>`;
                } else if (cancelReq.refundStatus === "REFUNDED") {
                    refundNoteHtml = `<br><small style="color: #155724; font-weight: 600; font-size: 0.75rem;"><i class="fa-solid fa-check-circle"></i> Refund Status: Completed</small>`;
                }

                let rejectionReasonHtml = "";
                if (cancelReq.status === "REJECTED" && cancelReq.adminNotes) {
                    rejectionReasonHtml = `<br><small style="color: #721C24; font-size: 0.75rem;">Reason: ${cancelReq.adminNotes}</small>`;
                }

                cancelStatusItem.innerHTML = `
                    <span class="order-info-label">
                        Cancellation
                    </span>
                    <span class="order-info-value">
                        <span style="${cBadgeStyle}">
                            ${cStatusText}
                        </span>
                        ${refundNoteHtml}
                        ${rejectionReasonHtml}
                    </span>
                `;
                orderInfo.appendChild(cancelStatusItem);
            }

            /* COMPLETE PAYMENT (UPI) BUTTON IF UNPAID OR REJECTED */
            if (rawPayStatus === "PENDING_PAYMENT" || rawPayStatus === "REJECTED" || rawPayStatus === "PENDING PAYMENT") {
                const payUpiBtn = document.createElement("a");
                payUpiBtn.href = `../products/payment.html?orderNumber=${encodeURIComponent(orderNum)}`;
                payUpiBtn.className = "shop-button";
                payUpiBtn.style.cssText = "display: inline-block; margin-right: 10px; margin-top: 10px; padding: 8px 16px; font-size: 0.85rem; background: #0A373B; color: #FAF5EE; text-decoration: none; border-radius: 6px; font-weight: 600;";
                payUpiBtn.innerHTML = rawPayStatus === "REJECTED"
                    ? `<i class="fa-solid fa-rotate-right"></i> Re-submit UPI Payment`
                    : `<i class="fa-solid fa-qrcode"></i> Complete UPI Payment`;
                orderInfo.appendChild(payUpiBtn);
            }

            /* CANCEL ORDER BUTTON */
            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "cancel-order-button";
            cancelButton.innerHTML = `
                <i class="fa-regular fa-circle-xmark"></i>
                Cancel Order
            `;

            // Hide Cancel Order if already Cancelled, Delivered, or if a cancellation request is already PENDING or APPROVED
            if (currentStatus === "Cancelled" || currentStatus === "Delivered" || (cancelReq && (cancelReq.status === "PENDING" || cancelReq.status === "APPROVED"))) {
                cancelButton.style.display = "none";
            }

            cancelButton.addEventListener("click", function () {
                // Save order details to sessionStorage and redirect to Contact page cancellation form
                sessionStorage.setItem("firqui_cancel_order", JSON.stringify(order));
                window.location.href = `../contact.html?action=cancel&orderNumber=${encodeURIComponent(orderNum)}`;
            });

            /* BUILD ORDER CARD */
            orderCard.appendChild(orderHeader);
            orderCard.appendChild(productsContainer);
            orderCard.appendChild(orderInfo);
            orderCard.appendChild(cancelButton);

            ordersContainer.appendChild(orderCard);
        });
    }

    /* =========================================
       INITIAL LOAD
    ========================================= */

    loadProfile();
    loadOrders();

});