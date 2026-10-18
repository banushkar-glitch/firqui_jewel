/* ==========================================================================
   FIRQUI JEWELS — MANUAL UPI PAYMENT CONTROLLER
   ========================================================================== */

/* The UPI ID and the amount come from the backend (POST /api/payments/upi),
   which prices the cart from the database. The QR encodes that exact amount. */

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.FIRQUI_API_BASE;

    function getToken() {
        return window.FirquiAuth.token();
    }

    /* =====================================================
       1. AUTHENTICATION & ORDER NUMBER VALIDATION
    ====================================================== */
    const token = getToken();

    // Guests have no profile page; the confirmation email has their order details
    if (!token) {
        const profileBtn = document.querySelector('.modal-buttons a[href*="profile.html"]');
        if (profileBtn) {
            profileBtn.href = "../index.html";
            profileBtn.textContent = "Back to Home";
        }
        const notice = document.querySelector(".modal-notice");
        if (notice) notice.textContent += " We have emailed your order details to you.";
    }

    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get("orderNumber") || urlParams.get("id") || urlParams.get("orderId");

    let pendingCheckout = null;
    try {
        pendingCheckout = JSON.parse(sessionStorage.getItem("firqui_pending_checkout"));
    } catch (e) {}

    if (!orderNumber && !pendingCheckout) {
        alert("Please proceed to checkout to place your order.");
        window.location.href = "checkout.html";
        return;
    }

    /* =====================================================
       2. DOM ELEMENTS
    ====================================================== */
    // Order Summary
    const displayOrderNumber = document.getElementById("display-order-number");
    const displayOrderAmount = document.getElementById("display-order-amount");
    const displayTotalAmount = document.getElementById("display-total-amount");
    const displaySubtotal = document.getElementById("display-subtotal");
    const displayOrderDate = document.getElementById("display-order-date");
    const displayPaymentStatus = document.getElementById("display-payment-status");
    const displayOrderItems = document.getElementById("display-order-items");

    // QR & UPI ID
    const upiQrImage = document.getElementById("upi-qr-image");
    const upiIdDisplay = document.getElementById("upi-id-display");

    // Form & Upload
    const paymentForm = document.getElementById("upi-payment-form");
    const transactionIdInput = document.getElementById("transaction-id");
    const transactionIdError = document.getElementById("transaction-id-error");

    const uploadDropzone = document.getElementById("upload-dropzone");
    const screenshotInput = document.getElementById("screenshot-input");
    const chooseFileBtn = document.getElementById("choose-file-btn");
    const dropzonePrompt = document.getElementById("dropzone-prompt");

    const previewContainer = document.getElementById("screenshot-preview-container");
    const previewImg = document.getElementById("screenshot-preview-img");
    const previewFilename = document.getElementById("preview-filename");
    const previewFilesize = document.getElementById("preview-filesize");
    const replaceFileBtn = document.getElementById("replace-file-btn");
    const removeFileBtn = document.getElementById("remove-file-btn");
    const screenshotError = document.getElementById("screenshot-error");

    const paymentAlert = document.getElementById("payment-alert");
    const submitBtn = document.getElementById("submit-payment-btn");
    const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
    const btnLoader = submitBtn ? submitBtn.querySelector(".btn-loader") : null;

    // Confirmation Modal
    const confirmationModal = document.getElementById("confirmation-modal");
    const modalOrderNumber = document.getElementById("modal-order-number");
    const modalTxnId = document.getElementById("modal-txn-id");

    let currentOrder = null;
    let selectedFile = null;

    /* =====================================================
       3. UPI QR WITH A FIXED AMOUNT
    ====================================================== */
    const qrAmount = document.getElementById("qr-amount");
    const qrStatus = document.getElementById("qr-status");
    const upiAppLink = document.getElementById("upi-app-link");
    const upiAppText = document.getElementById("upi-app-text");
    let payableAmount = null;

    function rupees(amount) {
        return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function showQrError(message) {
        if (upiQrImage) upiQrImage.hidden = true;
        if (upiAppLink) upiAppLink.hidden = true;
        if (qrAmount) qrAmount.textContent = "";
        if (qrStatus) {
            qrStatus.hidden = false;
            qrStatus.classList.add("is-error");
            qrStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + message;
        }
        if (submitBtn) submitBtn.disabled = true;
    }

    // body: { items: [...] } for a new order, or { orderNumber } for an existing one
    async function loadUpiPayment(body) {
        try {
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE}/api/payments/upi`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(function () { return {}; });
            if (!res.ok || !data.upiUri) {
                throw new Error(data.message || "Could not prepare the payment QR.");
            }

            payableAmount = data.amount;
            const qr = qrcode(0, "M");
            qr.addData(data.upiUri);
            qr.make();
            upiQrImage.src = qr.createDataURL(8, 2);
            upiQrImage.hidden = false;
            if (qrStatus) qrStatus.hidden = true;

            if (qrAmount) qrAmount.textContent = "Amount to pay: " + rupees(data.amount);
            if (upiIdDisplay) upiIdDisplay.textContent = data.upiId;
            if (upiAppLink) {
                upiAppLink.href = data.upiUri;
                upiAppLink.hidden = false;
            }
            if (upiAppText) upiAppText.textContent = "Pay " + rupees(data.amount) + " in UPI app";

            // The summary shows exactly what the QR charges
            [displayOrderAmount, displayTotalAmount, displaySubtotal].forEach(function (el) {
                if (el) el.textContent = rupees(data.amount);
            });
        } catch (err) {
            console.warn("UPI QR error:", err);
            const msg = err && err.message && !/fetch|network/i.test(err.message)
                ? err.message
                : "Could not reach the server. Please check your connection and refresh this page.";
            showQrError(msg);
        }
    }

    /* =====================================================
       4. LOAD PENDING CHECKOUT OR FETCH EXISTING ORDER
    ====================================================== */
    function renderPendingCheckout(pending) {
        let total = pending.total || pending.subtotal || 0;
        if (!total && pending.items) {
            total = pending.items.reduce(function (sum, it) {
                return sum + (Number(it.price) || 0) * (Number(it.quantity) || 1);
            }, 0);
        }
        const formattedTotal = "₹" + Math.round(total).toLocaleString("en-IN");

        if (displayOrderNumber) displayOrderNumber.textContent = "Pending Payment";
        if (displayOrderAmount) displayOrderAmount.textContent = formattedTotal;
        if (displayTotalAmount) displayTotalAmount.textContent = formattedTotal;
        if (displaySubtotal) displaySubtotal.textContent = formattedTotal;
        if (displayOrderDate) displayOrderDate.textContent = "Today";

        if (displayPaymentStatus) {
            displayPaymentStatus.textContent = "PENDING_PAYMENT";
            displayPaymentStatus.className = "payment-status-badge status-pending";
        }

        if (displayOrderItems) {
            displayOrderItems.innerHTML = "";
            const items = pending.items || [];
            if (items.length === 0) {
                displayOrderItems.innerHTML = `<div class="items-loading">FIRQUI JEWELS Jewellery</div>`;
            } else {
                items.forEach(function (p) {
                    const row = document.createElement("div");
                    row.className = "summary-item-row";

                    let imgUrl = p.image || p.imageUrl || "../assets/Logo Pink 1.png";
                    if (imgUrl.startsWith("/")) imgUrl = ".." + imgUrl;

                    const pName = p.name || p.productName || "Jewellery Item";
                    const pQty = p.quantity || 1;
                    const pSize = p.selectedSize ? ` • Size: ${window.FirquiHtml.escape(p.selectedSize)}` : "";
                    const pPrice = "₹" + Math.round(Number(p.unitPrice || p.price || 0) * pQty).toLocaleString("en-IN");

                    row.innerHTML = `
                        <img src="${window.FirquiHtml.escape(imgUrl)}" alt="${window.FirquiHtml.escape(pName)}" class="summary-item-img" onerror="this.src='../assets/Logo Pink 1.png'">
                        <div class="summary-item-info">
                            <div class="summary-item-name">${window.FirquiHtml.escape(pName)}</div>
                            <div class="summary-item-sub">Qty: ${pQty}${pSize}</div>
                        </div>
                        <div class="summary-item-price">${pPrice}</div>
                    `;
                    displayOrderItems.appendChild(row);
                });
            }
        }
    }

    async function fetchOrderDetails() {
        try {
            const headers = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderNumber)}`, {
                headers: headers
            });

            if ((response.status === 401 || response.status === 403) && token) {
                alert("Session expired. Please log in again.");
                window.location.href = "../authentication/login.html";
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to locate order #" + orderNumber);
            }

            const order = await response.json();
            currentOrder = order;
            renderOrderData(order);

        } catch (error) {
            console.error("Order loading error:", error);
            showAlert("Could not load order details: " + error.message, "error");
            if (displayOrderAmount) displayOrderAmount.textContent = "Error";
            if (displayOrderItems) {
                displayOrderItems.innerHTML = `<div class="items-loading" style="color: #D32F2F;">Order details could not be loaded.</div>`;
            }
        }
    }

    function renderOrderData(order) {
        const total = order.formattedTotal || ("₹" + Math.round(Number(order.totalAmount || order.total || 0)).toLocaleString("en-IN"));
        const subtotal = order.formattedSubtotal || total;
        const ordNum = order.orderNumber || order.orderId || orderNumber;

        if (displayOrderNumber) displayOrderNumber.textContent = "#" + ordNum;
        if (displayOrderAmount) displayOrderAmount.textContent = total;
        if (displayTotalAmount) displayTotalAmount.textContent = total;
        if (displaySubtotal) displaySubtotal.textContent = subtotal;
        if (displayOrderDate) displayOrderDate.textContent = order.orderDate || order.date || "Today";

        // Payment status badge
        const status = (order.paymentStatus || "PENDING_PAYMENT").toUpperCase().replace(/\s+/g, "_");
        if (displayPaymentStatus) {
            displayPaymentStatus.textContent = order.paymentStatus || "PENDING_PAYMENT";
            displayPaymentStatus.className = "payment-status-badge";
            if (status.includes("PAID")) {
                displayPaymentStatus.classList.add("status-paid");
            } else if (status.includes("VERIF")) {
                displayPaymentStatus.classList.add("status-verification");
            } else if (status.includes("REJECT")) {
                displayPaymentStatus.classList.add("status-rejected");
            } else {
                displayPaymentStatus.classList.add("status-pending");
            }
        }

        // Render products
        if (displayOrderItems) {
            displayOrderItems.innerHTML = "";
            const items = order.products || [];
            if (items.length === 0) {
                displayOrderItems.innerHTML = `<div class="items-loading">FIRQUI JEWELS Product Order</div>`;
            } else {
                items.forEach(function (p) {
                    const row = document.createElement("div");
                    row.className = "summary-item-row";

                    let imgUrl = p.image || p.imageUrl || "../assets/Logo Pink 1.png";
                    if (imgUrl.startsWith("/")) imgUrl = ".." + imgUrl;

                    const pName = p.name || p.productName || "Jewellery Item";
                    const pQty = p.quantity || 1;
                    const pSize = p.selectedSize ? ` • Size: ${window.FirquiHtml.escape(p.selectedSize)}` : "";
                    const pPrice = "₹" + Math.round(Number(p.unitPrice || p.price || 0) * pQty).toLocaleString("en-IN");

                    row.innerHTML = `
                        <img src="${window.FirquiHtml.escape(imgUrl)}" alt="${window.FirquiHtml.escape(pName)}" class="summary-item-img" onerror="this.src='../assets/Logo Pink 1.png'">
                        <div class="summary-item-info">
                            <div class="summary-item-name">${window.FirquiHtml.escape(pName)}</div>
                            <div class="summary-item-sub">Qty: ${pQty}${pSize}</div>
                        </div>
                        <div class="summary-item-price">${pPrice}</div>
                    `;
                    displayOrderItems.appendChild(row);
                });
            }
        }

        // If order is already paid, notify customer
        if (status === "PAID") {
            showAlert("This order is already verified and marked as PAID. Thank you!", "success");
            if (submitBtn) {
                submitBtn.disabled = true;
                if (btnText) btnText.textContent = "Payment Verified & Paid";
            }
        } else if (status === "PENDING_VERIFICATION") {
            showAlert("Payment details have already been submitted and are pending verification by admin.", "success");
        } else if (status === "REJECTED" && order.rejectionReason) {
            showAlert("Previous payment submission was rejected: " + order.rejectionReason + ". Please resubmit with correct details.", "error");
        }
    }


    /* =====================================================
       6. SCREENSHOT SELECTION & PREVIEW MANAGEMENT
    ====================================================== */
    if (screenshotInput) {
        screenshotInput.addEventListener("change", function (e) {
            handleFileSelection(e.target.files ? e.target.files[0] : null);
        });
    }

    if (uploadDropzone) {
        ["dragenter", "dragover"].forEach(function (eventName) {
            uploadDropzone.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.add("drag-active");
            });
        });

        ["dragleave", "drop"].forEach(function (eventName) {
            uploadDropzone.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.remove("drag-active");
            });
        });

        uploadDropzone.addEventListener("drop", function (e) {
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });
    }

    let previewUrl = null;
    let selectionToken = 0;

    async function handleFileSelection(picked) {
        clearScreenshotError();
        const token = ++selectionToken;

        // Large phone screenshots are shrunk first so the preview and upload stay quick
        let file = picked;
        if (picked && window.FirquiImage) {
            file = await window.FirquiImage.compress(picked, { maxDimension: 2400, quality: 0.9, output: "jpeg" });
            if (token !== selectionToken) return; // a newer file was chosen meanwhile
        }

        if (!file) {
            selectedFile = null;
            hidePreview();
            return;
        }

        const validTypes = ["image/jpeg", "image/jpg", "image/png"];
        const lowerName = file.name.toLowerCase();
        const hasValidExt = lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || lowerName.endsWith(".png");

        if (!validTypes.includes(file.type) && !hasValidExt) {
            showScreenshotError("Invalid file type. Only JPG, JPEG, and PNG images are allowed.");
            selectedFile = null;
            if (screenshotInput) screenshotInput.value = "";
            hidePreview();
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showScreenshotError("Image size exceeds the 10 MB limit (" + formatBytes(file.size) + "). Please choose a smaller image.");
            selectedFile = null;
            if (screenshotInput) screenshotInput.value = "";
            hidePreview();
            return;
        }

        selectedFile = file;

        // An object URL avoids building a multi-megabyte base64 string on the main thread
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        if (previewImg) previewImg.src = previewUrl;
        if (previewFilename) previewFilename.textContent = picked.name;
        if (previewFilesize) previewFilesize.textContent = formatBytes(file.size);

        if (uploadDropzone) uploadDropzone.style.display = "none";
        if (previewContainer) previewContainer.style.display = "flex";
    }

    function hidePreview() {
        if (previewContainer) previewContainer.style.display = "none";
        if (uploadDropzone) uploadDropzone.style.display = "block";
        if (previewImg) previewImg.removeAttribute("src");
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
    }

    if (replaceFileBtn) {
        replaceFileBtn.addEventListener("click", function () {
            if (screenshotInput) screenshotInput.click();
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener("click", function () {
            selectedFile = null;
            if (screenshotInput) screenshotInput.value = "";
            hidePreview();
            clearScreenshotError();
        });
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }

    function showScreenshotError(msg) {
        if (screenshotError) screenshotError.textContent = msg;
    }

    function clearScreenshotError() {
        if (screenshotError) screenshotError.textContent = "";
    }

    /* =====================================================
       7. SUBMIT PAYMENT DETAILS (TRANSACTION ID & SCREENSHOT)
       ORDERS ARE PLACED HERE AT PAYMENT SUBMISSION!
    ====================================================== */
    if (paymentForm) {
        paymentForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            if (transactionIdError) transactionIdError.textContent = "";
            clearScreenshotError();
            hideAlert();

            const txnId = transactionIdInput ? transactionIdInput.value.trim() : "";

            let hasErrors = false;

            if (!txnId) {
                if (transactionIdError) transactionIdError.textContent = "UPI Transaction ID / UTR Number is required.";
                hasErrors = true;
            } else if (txnId.length < 6 || txnId.length > 60) {
                if (transactionIdError) transactionIdError.textContent = "Please enter a valid Transaction reference (6 to 60 characters).";
                hasErrors = true;
            }

            if (!selectedFile) {
                showScreenshotError("Please upload a payment screenshot as proof of payment.");
                hasErrors = true;
            }

            if (hasErrors) return;

            setSubmitting(true);

            // CASE A: NEW ORDER (Pending checkout from Checkout Page)
            if (pendingCheckout) {
                const formData = new FormData();
                const orderBlob = new Blob([JSON.stringify(pendingCheckout)], { type: "application/json" });
                formData.append("orderData", orderBlob);
                formData.append("transactionId", txnId);
                formData.append("screenshot", selectedFile);

                try {
                    const headers = {};
                    if (token) {
                        headers["Authorization"] = `Bearer ${token}`;
                    }
                    const response = await fetch(`${API_BASE}/api/orders/place-payment`, {
                        method: "POST",
                        headers: headers,
                        body: formData
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || "Failed to place order and submit payment details.");
                    }

                    // SUCCESS: Clear cart and pending checkout now that the order has been placed in backend!
                    try {
                        localStorage.removeItem("firquiCart");
                        sessionStorage.removeItem("firqui_pending_checkout");
                    } catch (e) {}

                    // Update UI state with created order details
                    renderOrderData(data);

                    // Show confirmation modal
                    const createdOrderNum = data.orderNumber || data.orderId || data.id;
                    if (modalOrderNumber) modalOrderNumber.textContent = "#" + createdOrderNum;
                    if (modalTxnId) modalTxnId.textContent = txnId;
                    if (confirmationModal) confirmationModal.style.display = "flex";

                } catch (err) {
                    console.error("Order placement and payment submission error:", err);
                    showAlert(err.message || "Unable to submit payment details. Please try again.", "error");
                } finally {
                    setSubmitting(false);
                }
                return;
            }

            // CASE B: EXISTING ORDER (Re-submitting from profile)
            const formData = new FormData();
            formData.append("transactionId", txnId);
            formData.append("screenshot", selectedFile);

            try {
                const headers = {};
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }
                const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderNumber)}/payment`, {
                    method: "POST",
                    headers: headers,
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to submit payment details.");
                }

                try {
                    localStorage.removeItem("firquiCart");
                } catch (e) {}

                renderOrderData(data);

                if (modalOrderNumber) modalOrderNumber.textContent = "#" + (data.orderNumber || orderNumber);
                if (modalTxnId) modalTxnId.textContent = txnId;
                if (confirmationModal) confirmationModal.style.display = "flex";

            } catch (err) {
                console.error("Payment submission error:", err);
                showAlert(err.message || "Unable to submit payment details. Please try again.", "error");
            } finally {
                setSubmitting(false);
            }
        });
    }

    function setSubmitting(loading) {
        if (!submitBtn) return;
        submitBtn.disabled = loading;
        if (btnText) btnText.style.display = loading ? "none" : "inline-flex";
        if (btnLoader) btnLoader.style.display = loading ? "inline-flex" : "none";
    }

    function showAlert(msg, type) {
        if (!paymentAlert) return;
        paymentAlert.textContent = msg;
        paymentAlert.className = `payment-alert ${type === "error" ? "alert-error" : "alert-success"}`;
        paymentAlert.style.display = "block";
    }

    function hideAlert() {
        if (!paymentAlert) return;
        paymentAlert.style.display = "none";
        paymentAlert.textContent = "";
    }

    // Initialize Page
    if (orderNumber) {
        fetchOrderDetails().then(function () {
            const status = currentOrder ? String(currentOrder.paymentStatus || currentOrder.payment || "").toUpperCase() : "";
            if (!currentOrder) return;
            if (status === "PAID" || status === "PENDING_VERIFICATION") {
                showQrError("Payment for this order has already been submitted.");
                return;
            }
            loadUpiPayment({ orderNumber: currentOrder.orderNumber || orderNumber });
        });
    } else if (pendingCheckout) {
        renderPendingCheckout(pendingCheckout);
        loadUpiPayment({ items: pendingCheckout.items || [] });
    }

});
