/* =========================================================
   FIRQUI JEWELS
   ADMIN ORDER DETAILS
========================================================= */


/* =========================================================
   SAMPLE ORDER DATA
   TEMPORARY FRONTEND DATA
========================================================= */

// Filled from the backend for the order in the URL
const orders = {};


/* =========================================================
   DEFAULT FALLBACK ORDER
========================================================= */

// Shown until the real order arrives (or if it cannot be found)
const defaultOrder = {
    id: "Loading...",
    customer: { name: "-", email: "-", phone: "-" },
    date: "",
    payment: { status: "Pending", method: "-", transactionId: "-" },
    shippingAddress: [],
    products: [],
    shipping: 0,
    discount: 0,
    status: "Pending"
};


/* =========================================================
   GET ORDER ID FROM URL
========================================================= */

function getOrderIdFromURL() {

    const params = new URLSearchParams(
        window.location.search
    );

    return params.get("id");

}


/* =========================================================
   GET ORDER
========================================================= */

function getCurrentOrder() {

    const orderId = getOrderIdFromURL();

    let order = orders[orderId];

    if (!order) {

        order = defaultOrder;

    }

    return order;

}


/* =========================================================
   CURRENCY FORMAT
========================================================= */

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(amount);

}


/* =========================================================
   LOAD ORDER
========================================================= */

function loadOrder() {

    const order = getCurrentOrder();

    /* ---------------------------------------------
       ORDER HEADER
    --------------------------------------------- */

    document.getElementById("orderId").textContent =
        order.id;

    document.getElementById("orderDate").textContent =
        order.date;


    /* ---------------------------------------------
       CUSTOMER
    --------------------------------------------- */

    document.getElementById("customerName").textContent =
        order.customer.name;

    document.getElementById("customerEmail").textContent =
        order.customer.email;

    document.getElementById("customerPhone").textContent =
        order.customer.phone;


    /* ---------------------------------------------
       SHIPPING ADDRESS
    --------------------------------------------- */

    // Typed by the customer: escape each line before joining
    document.getElementById("shippingAddress").innerHTML =
        order.shippingAddress.map(line => window.FirquiHtml.escape(line)).join("<br>");


    /* ---------------------------------------------
       PAYMENT
    --------------------------------------------- */

    const paymentStatusEl = document.getElementById("paymentStatus");
    if (paymentStatusEl) {
        const rawStatus = (order.payment.status || "Pending").toUpperCase();
        paymentStatusEl.textContent = order.payment.status || "Pending";
        paymentStatusEl.className = "payment-badge";
        if (rawStatus.includes("PAID")) {
            paymentStatusEl.style.background = "#D4EDDA";
            paymentStatusEl.style.color = "#155724";
        } else if (rawStatus.includes("VERIF")) {
            paymentStatusEl.style.background = "#CCE5FF";
            paymentStatusEl.style.color = "#004085";
        } else if (rawStatus.includes("REJECT")) {
            paymentStatusEl.style.background = "#F8D7DA";
            paymentStatusEl.style.color = "#721C24";
        } else {
            paymentStatusEl.style.background = "rgba(84, 123, 97, 0.13)";
            paymentStatusEl.style.color = "inherit";
        }
    }

    const paymentMethodEl = document.getElementById("paymentMethod");
    if (paymentMethodEl) {
        paymentMethodEl.textContent = order.payment.method || "UPI";
    }

    const transactionIdEl = document.getElementById("transactionId");
    if (transactionIdEl) {
        transactionIdEl.textContent = order.payment.transactionId || "N/A";
    }

    // Submission timestamp
    const submittedRow = document.getElementById("paymentSubmittedRow");
    const submittedAtEl = document.getElementById("paymentSubmittedAt");
    if (submittedRow && submittedAtEl) {
        if (order.payment.submittedAt) {
            submittedRow.style.display = "flex";
            submittedAtEl.textContent = order.payment.submittedAt;
        } else {
            submittedRow.style.display = "none";
        }
    }

    // Verification history
    const verifRow = document.getElementById("verificationHistoryRow");
    const verifiedByEl = document.getElementById("verifiedByDetails");
    if (verifRow && verifiedByEl) {
        if (order.payment.verifiedBy) {
            verifRow.style.display = "flex";
            verifiedByEl.textContent = order.payment.verifiedBy + (order.payment.verifiedAt ? ` (${order.payment.verifiedAt})` : "");
        } else {
            verifRow.style.display = "none";
        }
    }

    // Rejection reason
    const rejectRow = document.getElementById("rejectionReasonRow");
    const rejectReasonEl = document.getElementById("rejectionReasonText");
    if (rejectRow && rejectReasonEl) {
        if (order.payment.rejectionReason) {
            rejectRow.style.display = "flex";
            rejectReasonEl.textContent = order.payment.rejectionReason;
        } else {
            rejectRow.style.display = "none";
        }
    }

    // Razorpay Order ID Row
    const rzpOrderRow = document.getElementById("razorpayOrderRow");
    const rzpOrderIdEl = document.getElementById("razorpayOrderId");
    if (rzpOrderRow && rzpOrderIdEl) {
        if (order.payment.razorpayOrderId) {
            rzpOrderRow.style.display = "flex";
            rzpOrderIdEl.textContent = order.payment.razorpayOrderId;
        } else {
            rzpOrderRow.style.display = "none";
        }
    }

    // Refund Details Row
    const refundDetailsRow = document.getElementById("refundDetailsRow");
    const refundBadge = document.getElementById("refundBadge");
    const refundInfoText = document.getElementById("refundInfoText");
    const retryRefundBox = document.getElementById("adminRetryRefundBox");

    // Issue refund: any Razorpay-paid order with something left to refund
    const issueRefundBox = document.getElementById("adminIssueRefundBox");
    if (issueRefundBox) {
        const paidOnline = String(order.payment.status || "").toUpperCase() === "PAID"
            && String(order.payment.razorpayPaymentId || "").startsWith("pay_");
        const refundedSoFar = Number(order.payment.refundAmount) || 0;
        const fullyRefunded = String(order.payment.refundStatus || "").toUpperCase() === "REFUNDED";
        const somethingLeft = paidOnline && !fullyRefunded && refundedSoFar < (Number(order.payment.totalAmount) || 0);
        // Refunds can only be issued within 24 hours of payment (enforced by the server too)
        issueRefundBox.style.display = somethingLeft && order.payment.refundWindowOpen ? "block" : "none";
        let windowNote = document.getElementById("refundWindowClosedNote");
        if (somethingLeft && !order.payment.refundWindowOpen) {
            if (!windowNote) {
                windowNote = document.createElement("div");
                windowNote.id = "refundWindowClosedNote";
                windowNote.style.cssText = "margin: 10px 0; font-size: 0.8rem; color: #64748b;";
                windowNote.innerHTML = '<i class="fa-solid fa-clock"></i> Refund window closed: refunds can only be issued within 24 hours of payment.';
                issueRefundBox.parentNode.insertBefore(windowNote, issueRefundBox);
            }
            windowNote.style.display = "block";
        } else if (windowNote) {
            windowNote.style.display = "none";
        }
    }

    if (refundDetailsRow && refundBadge && refundInfoText) {
        const rfStat = (order.payment.refundStatus || "").toUpperCase();
        if (rfStat === "REFUNDED" || rfStat === "PROCESSED") {
            refundDetailsRow.style.display = "flex";
            refundBadge.textContent = "REFUNDED";
            refundBadge.style.background = "#dcfce7";
            refundBadge.style.color = "#166534";
            refundInfoText.textContent = (order.payment.formattedRefundAmount || "") + (order.payment.razorpayRefundId ? ` • Ref: ${order.payment.razorpayRefundId}` : "");
            if (retryRefundBox) retryRefundBox.style.display = "none";
        } else if (rfStat === "PARTIALLY_REFUNDED") {
            refundDetailsRow.style.display = "flex";
            refundBadge.textContent = "PARTIALLY REFUNDED";
            refundBadge.style.background = "#fef9c3";
            refundBadge.style.color = "#854d0e";
            refundInfoText.textContent = (order.payment.formattedRefundAmount || "") + (order.payment.razorpayRefundId ? ` • Ref: ${order.payment.razorpayRefundId}` : "");
            if (retryRefundBox) retryRefundBox.style.display = "none";
        } else if (rfStat === "PENDING_REFUND" || rfStat === "PENDING") {
            refundDetailsRow.style.display = "flex";
            refundBadge.textContent = "REFUND PENDING";
            refundBadge.style.background = "#e0f2fe";
            refundBadge.style.color = "#0369a1";
            refundInfoText.textContent = (order.payment.formattedRefundAmount || "") + (order.payment.razorpayRefundId ? ` • Ref: ${order.payment.razorpayRefundId}` : "");
            if (retryRefundBox) retryRefundBox.style.display = "none";
        } else if (rfStat === "REFUND_FAILED" || rfStat === "FAILED") {
            refundDetailsRow.style.display = "flex";
            refundBadge.textContent = "REFUND FAILED";
            refundBadge.style.background = "#fee2e2";
            refundBadge.style.color = "#991b1b";
            refundInfoText.textContent = "Gateway error during automated refund. Click below to retry.";
            if (retryRefundBox) retryRefundBox.style.display = "block";
        } else {
            refundDetailsRow.style.display = "none";
            if (retryRefundBox) retryRefundBox.style.display = "none";
        }
    }

    // Screenshot button
    const screenshotBox = document.getElementById("adminScreenshotBox");
    if (screenshotBox) {
        screenshotBox.style.display = (order.payment.hasScreenshot) ? "block" : "none";
    }

    // Verification actions
    const adminActions = document.getElementById("adminPaymentActions");
    if (adminActions) {
        const rawStatus = (order.payment.status || "").toUpperCase();
        if (rawStatus.includes("VERIF") || rawStatus === "PENDING_VERIFICATION") {
            adminActions.style.display = "block";
        } else {
            adminActions.style.display = "none";
        }
    }


    /* ---------------------------------------------
       ORDER STATUS
    --------------------------------------------- */

    const statusSelect =
        document.getElementById("orderStatus");

    statusSelect.value = order.status;


    /* ---------------------------------------------
       PRODUCTS
    --------------------------------------------- */

    renderProducts(order);


    /* ---------------------------------------------
       SUMMARY
    --------------------------------------------- */

    calculateSummary(order);


    /* ---------------------------------------------
       TIMELINE
    --------------------------------------------- */

    updateTimeline(order.status);

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts(order) {

    const productsList =
        document.getElementById("productsList");

    productsList.innerHTML = "";


    let totalItems = 0;


    order.products.forEach(product => {

        totalItems += product.quantity;


        const productItem =
            document.createElement("div");

        productItem.className =
            "product-item";


        const imageWrapper =
            document.createElement("div");

        imageWrapper.className =
            "product-image";


        if (product.image) {

            const image =
                document.createElement("img");

            image.src = product.image;

            image.alt = product.name;

            image.onerror = function () {

                this.style.display = "none";

                imageWrapper.innerHTML =
                    '<i class="fa-regular fa-gem product-placeholder"></i>';

            };

            imageWrapper.appendChild(image);

        } else {

            imageWrapper.innerHTML =
                '<i class="fa-regular fa-gem product-placeholder"></i>';

        }


        const productInfo =
            document.createElement("div");

        productInfo.className =
            "product-info";


        productInfo.innerHTML = `

            <h4>
                ${window.FirquiHtml.escape(product.name)}
            </h4>

            <p>
                ${window.FirquiHtml.escape(product.category)}
            </p>

            <div class="product-quantity">
                Quantity: ${product.quantity}
            </div>

        `;


        const productPrice =
            document.createElement("div");

        productPrice.className =
            "product-price";


        const itemTotal =
            product.price * product.quantity;


        productPrice.textContent =
            formatCurrency(itemTotal);


        productItem.appendChild(imageWrapper);

        productItem.appendChild(productInfo);

        productItem.appendChild(productPrice);


        productsList.appendChild(productItem);

    });


    document.getElementById("itemsCount").textContent =
        `${totalItems} ${totalItems === 1 ? "Item" : "Items"}`;

}


/* =========================================================
   CALCULATE ORDER SUMMARY
========================================================= */

function calculateSummary(order) {

    let subtotal = 0;


    order.products.forEach(product => {

        subtotal +=
            product.price * product.quantity;

    });


    const shipping =
        order.shipping || 0;


    const discount =
        order.discount || 0;


    const total =
        subtotal +
        shipping -
        discount;


    document.getElementById("subtotal").textContent =
        formatCurrency(subtotal);


    document.getElementById("shipping").textContent =
        formatCurrency(shipping);


    document.getElementById("discount").textContent =
        "- " + formatCurrency(discount);


    document.getElementById("totalAmount").textContent =
        formatCurrency(total);

}


/* =========================================================
   UPDATE TIMELINE
========================================================= */

function updateTimeline(currentStatus) {

    const timelineItems =
        document.querySelectorAll(".timeline-item");


    const statusOrder = [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipped",
        "Delivered"
    ];


    const currentIndex =
        statusOrder.indexOf(currentStatus);


    timelineItems.forEach(item => {

        const itemStatus =
            item.dataset.status;


        const itemIndex =
            statusOrder.indexOf(itemStatus);


        item.classList.remove(
            "completed",
            "active"
        );


        if (
            currentIndex >= 0 &&
            itemIndex <= currentIndex
        ) {

            item.classList.add("completed");

        }


        if (
            itemStatus === currentStatus
        ) {

            item.classList.add("active");

        }

    });


    /* ---------------------------------------------
       CANCELLED ORDER
    --------------------------------------------- */

    if (currentStatus === "Cancelled") {

        timelineItems.forEach(item => {

            item.classList.remove("completed");

        });

    }

}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

async function updateOrderStatus() {

    const orderId =
        getOrderIdFromURL();

    const newStatus =
        document.getElementById("orderStatus").value;

    const API_BASE = window.FIRQUI_API_BASE;
    const token = window.FirquiAuth.token();

    if (newStatus === "Cancelled" && !confirm(
        `Cancel order #${orderId}?

` +
        `If it was paid online, the full remaining amount is refunded to the customer through Razorpay right away, ` +
        `and the items go back into stock. This cannot be undone.`)) {
        return;
    }

    if (token && orderId) {
        try {
            const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (orders[orderId]) {
                    orders[orderId].status = newStatus;
                }
                updateTimeline(newStatus);
                if (newStatus === "Cancelled") {
                    const data = await response.json().catch(function () { return {}; });
                    alert(`Order #${orderId} cancelled.` + (data.refundStatus && data.refundStatus !== "NOT_APPLICABLE"
                        ? `
Refund: ${data.refundStatus}` + (data.razorpayRefundId ? ` (${data.razorpayRefundId})` : "")
                        : ""));
                    window.location.reload();
                    return;
                }
                alert(`Order #${orderId} status successfully updated to "${newStatus}".`);
                return;
            }
            // The server refused (e.g. reopening a cancelled order): show why, don't fake success locally
            const errData = await response.json().catch(function () { return {}; });
            alert("Could not update status: " + (errData.message || ("server error " + response.status)));
            return;
        } catch (err) {
            console.warn("Backend update order status error:", err);
            alert("Could not reach the server to update the status. Please try again.");
            return;
        }
    }

    const order =
        orders[orderId];

    if (!order) {
        alert("Order not found.");
        return;
    }

    order.status =
        newStatus;

    /* ---------------------------------------------
       SAVE TEMPORARILY
       FRONTEND ONLY
    --------------------------------------------- */
    localStorage.setItem(
        `orderStatus_${orderId}`,
        newStatus
    );

    updateTimeline(newStatus);

    alert(
        `Order ${orderId} status updated to ${newStatus}.`
    );

}


/* =========================================================
   LOAD SAVED STATUS
========================================================= */

function loadSavedStatus() {

    const orderId =
        getOrderIdFromURL();


    if (!orderId) {
        return;
    }


    const savedStatus =
        localStorage.getItem(
            `orderStatus_${orderId}`
        );


    if (!savedStatus) {
        return;
    }


    const order =
        orders[orderId];


    if (!order) {
        return;
    }


    order.status =
        savedStatus;


    document.getElementById(
        "orderStatus"
    ).value =
        savedStatus;

}


/* =========================================================
   NEWSLETTER
========================================================= */

function setupNewsletter() {

    const newsletterForm =
        document.getElementById("newsletterForm");


    if (!newsletterForm) {
        return;
    }


    newsletterForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const email =
                document
                    .getElementById("newsletterEmail")
                    .value
                    .trim();


            if (!email) {
                return;
            }


            alert(
                "Thank you for subscribing to FIRQUI JEWELS."
            );


            newsletterForm.reset();

        }
    );

}


/* =========================================================
   HEADER BUTTONS
========================================================= */

function setupHeaderButtons() {


    const adminProfileBtn =
        document.getElementById(
            "adminProfileBtn"
        );


    const searchBtn =
        document.getElementById(
            "searchBtn"
        );


    const notificationBtn =
        document.getElementById(
            "notificationBtn"
        );


    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    /* ---------------------------------------------
       ADMIN PROFILE
    --------------------------------------------- */

    if (adminProfileBtn) {

        adminProfileBtn.addEventListener(
            "click",
            function () {

                alert(
                    "Admin Profile"
                );

            }
        );

    }


    /* ---------------------------------------------
       SEARCH
    --------------------------------------------- */

    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            function () {

                window.location.href =
                    "orders.html";

            }
        );

    }


    /* ---------------------------------------------
       NOTIFICATIONS
    --------------------------------------------- */

    if (notificationBtn) {

        notificationBtn.addEventListener(
            "click",
            function () {

                alert(
                    "You have new order notifications."
                );

            }
        );

    }


    /* ---------------------------------------------
       LOGOUT
    --------------------------------------------- */

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            function () {

                const confirmLogout =
                    confirm(
                        "Are you sure you want to logout?"
                    );


                if (confirmLogout) {

                    window.location.href = "../authentication/login.html";

                }

            }
        );

    }

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadOrder();

        loadSavedStatus();

        setupNewsletter();

        setupHeaderButtons();

        const API_BASE = window.FIRQUI_API_BASE;
        const token = window.FirquiAuth.token();
        const orderId = getOrderIdFromURL();

        if (token && orderId) {
            fetch(`${API_BASE}/api/admin/orders/${orderId}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    window.location.href = "../authentication/login.html";
                    return null;
                }
                return res.ok ? res.json() : null;
            })
            .then(data => {
                if (!data) {
                    document.getElementById("orderId").textContent = "Order not found";
                    return;
                }
                if (data) {
                    orders[orderId] = {
                        id: data.orderNumber || data.orderId,
                        customer: {
                            name: data.customer || (data.shippingAddress && data.shippingAddress.fullName) || "Customer",
                            email: data.registeredEmail || data.email || "",
                            phone: data.phone || (data.shippingAddress && data.shippingAddress.phone) || ""
                        },
                        date: data.orderDate || data.date || "Today",
                        payment: {
                            status: data.paymentStatus || data.payment || "Pending",
                            method: data.paymentMethod || "Razorpay",
                            transactionId: data.transactionId || data.razorpayPaymentId || "N/A",
                            razorpayOrderId: data.razorpayOrderId || null,
                            razorpayPaymentId: data.razorpayPaymentId || null,
                            totalAmount: data.totalAmount || 0,
                            refundWindowOpen: data.refundWindowOpen === true,
                            refundStatus: data.refundStatus || null,
                            refundAmount: data.refundAmount || null,
                            formattedRefundAmount: data.formattedRefundAmount || null,
                            razorpayRefundId: data.razorpayRefundId || null,
                            submittedAt: data.formattedPaymentSubmittedAt || data.paymentSubmittedAt || null,
                            verifiedBy: data.verifiedBy || null,
                            verifiedAt: data.formattedPaymentVerifiedAt || data.paymentVerifiedAt || null,
                            rejectionReason: data.rejectionReason || null,
                            hasScreenshot: data.hasPaymentScreenshot || !!data.paymentScreenshotFilename
                        },
                        shippingAddress: data.shippingAddressLines || [
                            data.shippingAddress && data.shippingAddress.fullName,
                            data.shippingAddress && data.shippingAddress.address1,
                            data.shippingAddress && data.shippingAddress.address2,
                            data.shippingAddress && ("Pincode: " + data.shippingAddress.pincode),
                            "India"
                        ].filter(Boolean),
                        products: (data.products || []).map(p => ({
                            name: p.name || p.productName,
                            category: p.category || "Jewellery",
                            quantity: p.quantity,
                            price: p.unitPrice || p.price,
                            image: p.image || p.imageUrl || "../../assets/Logo Pink 1.png"
                        })),
                        shipping: data.shipping || data.shippingAmount || 0,
                        discount: data.discount || 0,
                        status: data.orderStatus || data.status || "Processing"
                    };
                    loadOrder();
                    updateTimeline(orders[orderId].status);

                    // Load screenshot thumbnail if available
                    if (orders[orderId].payment.hasScreenshot) {
                        const thumbWrapper = document.getElementById("screenshotThumbnailWrapper");
                        const adminScreenshotThumb = document.getElementById("adminScreenshotThumb");
                        if (thumbWrapper && adminScreenshotThumb) {
                            fetch(`${API_BASE}/api/admin/orders/${orderId}/screenshot`, {
                                headers: { "Authorization": `Bearer ${token}` }
                            })
                            .then(res => res.ok ? res.blob() : null)
                            .then(blob => {
                                if (blob) {
                                    adminScreenshotThumb.src = URL.createObjectURL(blob);
                                    thumbWrapper.style.display = "block";
                                    adminScreenshotThumb.onclick = () => {
                                        const viewBtn = document.getElementById("viewScreenshotBtn");
                                        if (viewBtn) viewBtn.click();
                                    };
                                }
                            })
                            .catch(e => console.warn("Screenshot thumb load:", e));
                        }
                    }
                }
            })
            .catch(err => {
                console.warn("Live order details fetch error:", err);
                document.getElementById("orderId").textContent = "Could not load order";
            });
        }

        /* ---------------------------------------------
           SCREENSHOT MODAL CONTROLS
        --------------------------------------------- */
        const viewScreenshotBtn = document.getElementById("viewScreenshotBtn");
        const screenshotModal = document.getElementById("screenshotModal");
        const closeScreenshotModal = document.getElementById("closeScreenshotModal");
        const closeScreenshotBtn = document.getElementById("closeScreenshotBtn");
        const adminScreenshotImage = document.getElementById("adminScreenshotImage");
        const screenshotLoading = document.getElementById("screenshotLoading");

        if (viewScreenshotBtn) {
            viewScreenshotBtn.addEventListener("click", async function () {
                if (!screenshotModal) return;
                screenshotModal.style.display = "flex";
                if (screenshotLoading) {
                    screenshotLoading.style.display = "block";
                    screenshotLoading.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color: #0A373B;"></i><p style="margin-top: 10px; color: #555;">Loading secure screenshot...</p>`;
                }
                if (adminScreenshotImage) adminScreenshotImage.style.display = "none";

                try {
                    const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/screenshot`, {
                        headers: { "Authorization": `Bearer ${token}` }
                    });

                    if (!response.ok) {
                        throw new Error("Unable to retrieve screenshot from secure server.");
                    }

                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    if (adminScreenshotImage) {
                        adminScreenshotImage.src = objectUrl;
                        adminScreenshotImage.style.display = "block";
                    }
                    if (screenshotLoading) screenshotLoading.style.display = "none";
                } catch (err) {
                    if (screenshotLoading) {
                        screenshotLoading.innerHTML = `<p style="color: #D32F2F;"><i class="fa-solid fa-triangle-exclamation"></i> ${window.FirquiHtml.escape(err.message)}</p>`;
                    }
                }
            });
        }

        function hideScreenshotModal() {
            if (screenshotModal) screenshotModal.style.display = "none";
        }
        if (closeScreenshotModal) closeScreenshotModal.addEventListener("click", hideScreenshotModal);
        if (closeScreenshotBtn) closeScreenshotBtn.addEventListener("click", hideScreenshotModal);
        if (screenshotModal) {
            screenshotModal.addEventListener("click", function (e) {
                if (e.target === screenshotModal) hideScreenshotModal();
            });
        }

        /* ---------------------------------------------
           ADMIN PAYMENT VERIFICATION BUTTONS
        --------------------------------------------- */
        const adminMarkPaidBtn = document.getElementById("adminMarkPaidBtn");
        const adminRejectPayBtn = document.getElementById("adminRejectPayBtn");

        if (adminMarkPaidBtn) {
            adminMarkPaidBtn.addEventListener("click", async function () {
                if (!token) {
                    alert("Unauthorized: Please log in with admin credentials to perform this action.");
                    window.location.href = "../authentication/login.html";
                    return;
                }

                const currentTxnId = (orders[orderId] && orders[orderId].payment) ? orders[orderId].payment.transactionId : "N/A";
                const confirmed = confirm(
                    `Confirm Payment & Order\n\n` +
                    `Please verify that you have checked your bank / UPI statement and confirmed receipt of the UPI payment.\n\n` +
                    `Order Number: #${orderId}\n` +
                    `Transaction ID / UTR: ${currentTxnId}\n\n` +
                    `This action will:\n` +
                    `• Update payment status to PAID\n` +
                    `• Update order status to CONFIRMED\n` +
                    `• Automatically send an order-confirmation email to the customer's registered email\n\n` +
                    `Do you want to confirm this payment and order?`
                );
                if (!confirmed) return;

                adminMarkPaidBtn.disabled = true;
                adminMarkPaidBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Confirming...`;

                try {
                    const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ action: "PAID" })
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || "Failed to confirm payment and order.");
                    }

                    alert(`Order #${orderId} successfully confirmed!\nPayment status updated to PAID and order confirmation email has been dispatched to the customer.`);
                    window.location.reload();
                } catch (err) {
                    alert("Error confirming payment: " + err.message);
                    adminMarkPaidBtn.disabled = false;
                    adminMarkPaidBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> Confirm Payment & Order`;
                }
            });
        }

        if (adminRejectPayBtn) {
            adminRejectPayBtn.addEventListener("click", async function () {
                if (!token) {
                    alert("Unauthorized: Please log in with admin credentials to perform this action.");
                    window.location.href = "../authentication/login.html";
                    return;
                }

                const reason = prompt("Enter the rejection reason before continuing (required):");
                if (reason === null) return;
                if (!reason.trim()) {
                    alert("Rejection reason is required before rejecting the payment.");
                    return;
                }

                const confirmed = confirm(
                    `Reject Payment\n\n` +
                    `Are you sure you want to reject the payment for Order #${orderId}?\n\n` +
                    `Reason: "${reason.trim()}"\n\n` +
                    `This will:\n` +
                    `• Update payment status to REJECTED\n` +
                    `• Update order status to REJECTED\n` +
                    `• Automatically send a payment-rejection email to the customer's registered email\n\n` +
                    `Proceed with rejection?`
                );
                if (!confirmed) return;

                adminRejectPayBtn.disabled = true;
                adminRejectPayBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...`;

                try {
                    const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ action: "REJECTED", rejectionReason: reason.trim() })
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || "Failed to reject payment.");
                    }

                    alert(`Order #${orderId} payment marked as REJECTED.\nRejection notification email has been dispatched to the customer.`);
                    window.location.reload();
                } catch (err) {
                    alert("Error rejecting payment: " + err.message);
                    adminRejectPayBtn.disabled = false;
                    adminRejectPayBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> Reject Payment`;
                }
            });
        }

        /* ---------------------------------------------
           ADMIN RETRY RAZORPAY REFUND
        --------------------------------------------- */
        const adminRetryRefundBtn = document.getElementById("adminRetryRefundBtn");
        if (adminRetryRefundBtn) {
            adminRetryRefundBtn.addEventListener("click", async function () {
                if (!token) {
                    alert("Unauthorized: Please log in with admin credentials.");
                    window.location.href = "../authentication/login.html";
                    return;
                }
                const confirmed = confirm(
                    `Retry Razorpay Automated Refund\n\n` +
                    `Order: #${orderId}\n` +
                    `This will call Razorpay Refund API to process the refund against the payment ID.\n\n` +
                    `Proceed with refund retry?`
                );
                if (!confirmed) return;

                adminRetryRefundBtn.disabled = true;
                adminRetryRefundBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Refund...`;

                try {
                    const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/retry-refund`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || "Refund retry failed.");
                    }

                    alert(`Refund processed successfully!\nRefund ID: ${data.razorpayRefundId || 'Generated'}\nStatus: ${data.refundStatus || 'Refunded'}`);
                    window.location.reload();
                } catch (err) {
                    alert("Error retrying refund: " + err.message);
                    adminRetryRefundBtn.disabled = false;
                    adminRetryRefundBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Retry Razorpay Refund`;
                }
            });
        }

        /* ---------------------------------------------
           ADMIN ISSUE RAZORPAY REFUND (full or partial)
        --------------------------------------------- */
        const adminIssueRefundBtn = document.getElementById("adminIssueRefundBtn");
        if (adminIssueRefundBtn) {
            adminIssueRefundBtn.addEventListener("click", async function () {
                if (!token) {
                    window.location.href = "../authentication/login.html";
                    return;
                }
                const amountText = prompt(
                    `Refund order #${orderId} through Razorpay

` +
                    `Enter the amount in rupees (e.g. 1499.50),
or leave empty to refund everything still refundable:`
                );
                if (amountText === null) return;
                const reason = prompt("Reason for the refund (shown in Razorpay):", "Refund issued by Firqui Jewels");
                if (reason === null) return;

                const body = { reason: reason };
                if (amountText.trim() !== "") {
                    const amount = Number(amountText.trim());
                    if (!isFinite(amount) || amount < 1) {
                        alert("Please enter a valid amount of at least ₹1.");
                        return;
                    }
                    body.amount = amount;
                }
                if (!confirm(`Refund ${body.amount ? "₹" + body.amount : "the full remaining amount"} for order #${orderId}?`)) return;

                adminIssueRefundBtn.disabled = true;
                adminIssueRefundBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Refund...`;
                try {
                    const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/refund`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify(body)
                    });
                    const data = await response.json().catch(function () { return {}; });
                    if (!response.ok) throw new Error(data.message || "Refund failed.");
                    alert(`Refund ${data.refundStatus === "PROCESSED" ? "processed" : "initiated"}.
Refund ID: ${data.razorpayRefundId || "pending"}
Amount: ${data.formattedRefundAmount || ""}`);
                    window.location.reload();
                } catch (err) {
                    alert("Refund error: " + err.message);
                    adminIssueRefundBtn.disabled = false;
                    adminIssueRefundBtn.innerHTML = `<i class="fa-solid fa-money-bill-transfer"></i> Issue Razorpay Refund`;
                }
            });
        }

        const updateStatusBtn =
            document.getElementById(
                "updateStatusBtn"
            );

        if (updateStatusBtn) {

            updateStatusBtn.addEventListener(
                "click",
                updateOrderStatus
            );

        }

    }
);