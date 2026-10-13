/* ==========================================================================
   FIRQUI JEWELS — MANUAL UPI PAYMENT CONTROLLER
   ========================================================================== */

/* ==========================================================================
   CONFIGURATION: ENTER YOUR ACTUAL UPI DETAILS HERE
   --------------------------------------------------------------------------
   Please add your real UPI ID and UPI QR code image path below:
   ========================================================================== */
const UPI_CONFIG = {
    // Actual UPI ID configured for FIRQUI JEWELS manual payments:
    upiId: "nehaa067@icici",

    // Actual UPI QR code image path:
    qrCodeImagePath: "../assets/QR Code.jpeg"
};

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";

    function getToken() {
        return localStorage.getItem("firqui_token");
    }

    /* =====================================================
       1. AUTHENTICATION & ORDER NUMBER VALIDATION
    ====================================================== */
    const token = getToken();
    if (!token) {
        alert("Please log in to access your payment page.");
        try {
            sessionStorage.setItem("firqui_redirect", window.location.pathname + window.location.search);
        } catch (e) {}
        window.location.href = "../authentication/login.html";
        return;
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
    const copyUpiBtn = document.getElementById("copy-upi-btn");
    const copyBtnText = document.getElementById("copy-btn-text");
    const copyToast = document.getElementById("copy-toast");

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
       3. INITIALIZE CONFIGURED UPI ID & QR IMAGE
    ====================================================== */
    if (upiIdDisplay) {
        upiIdDisplay.textContent = UPI_CONFIG.upiId;
    }
    if (upiQrImage && UPI_CONFIG.qrCodeImagePath) {
        upiQrImage.src = UPI_CONFIG.qrCodeImagePath;
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
                    const pSize = p.selectedSize ? ` • Size: ${p.selectedSize}` : "";
                    const pPrice = "₹" + Math.round(Number(p.unitPrice || p.price || 0) * pQty).toLocaleString("en-IN");

                    row.innerHTML = `
                        <img src="${imgUrl}" alt="${pName}" class="summary-item-img" onerror="this.src='../assets/Logo Pink 1.png'">
                        <div class="summary-item-info">
                            <div class="summary-item-name">${pName}</div>
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
            const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderNumber)}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
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
                    const pSize = p.selectedSize ? ` • Size: ${p.selectedSize}` : "";
                    const pPrice = "₹" + Math.round(Number(p.unitPrice || p.price || 0) * pQty).toLocaleString("en-IN");

                    row.innerHTML = `
                        <img src="${imgUrl}" alt="${pName}" class="summary-item-img" onerror="this.src='../assets/Logo Pink 1.png'">
                        <div class="summary-item-info">
                            <div class="summary-item-name">${pName}</div>
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
       5. COPY UPI ID TO CLIPBOARD
    ====================================================== */
    if (copyUpiBtn) {
        copyUpiBtn.addEventListener("click", async function () {
            const upiId = UPI_CONFIG.upiId;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(upiId);
                } else {
                    const tempInput = document.createElement("input");
                    tempInput.value = upiId;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand("copy");
                    document.body.removeChild(tempInput);
                }

                if (copyBtnText) copyBtnText.textContent = "Copied!";
                if (copyToast) copyToast.style.display = "flex";

                setTimeout(function () {
                    if (copyBtnText) copyBtnText.textContent = "Copy UPI ID";
                    if (copyToast) copyToast.style.display = "none";
                }, 2500);

            } catch (err) {
                console.warn("Clipboard write failed:", err);
                alert("UPI ID: " + upiId);
            }
        });
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

    function handleFileSelection(file) {
        clearScreenshotError();

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

        const reader = new FileReader();
        reader.onload = function (e) {
            if (previewImg) previewImg.src = e.target.result;
            if (previewFilename) previewFilename.textContent = file.name;
            if (previewFilesize) previewFilesize.textContent = formatBytes(file.size);

            if (uploadDropzone) uploadDropzone.style.display = "none";
            if (previewContainer) previewContainer.style.display = "flex";
        };
        reader.readAsDataURL(file);
    }

    function hidePreview() {
        if (previewContainer) previewContainer.style.display = "none";
        if (uploadDropzone) uploadDropzone.style.display = "block";
        if (previewImg) previewImg.src = "";
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
                    const response = await fetch(`${API_BASE}/api/orders/place-payment`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
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
                const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderNumber)}/payment`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
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
        fetchOrderDetails();
    } else if (pendingCheckout) {
        renderPendingCheckout(pendingCheckout);
    }

});
