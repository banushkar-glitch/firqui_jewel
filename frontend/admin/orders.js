/* =========================================================
   FIRQUI JEWELS
   ADMIN ORDERS PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       SAMPLE ORDER DATA
       FRONTEND PROTOTYPE
    ===================================================== */

    // Filled from the backend; no sample data, so the admin only ever sees real orders
    let orders = [];


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const tableBody =
        document.getElementById("ordersTableBody");

    const emptyOrders =
        document.getElementById("emptyOrders");

    const orderSearch =
        document.getElementById("orderSearch");

    const statusFilter =
        document.getElementById("statusFilter");

    const paymentFilter =
        document.getElementById("paymentFilter");

    const visibleOrderCount =
        document.getElementById("visibleOrderCount");

    const totalOrders =
        document.getElementById("totalOrders");

    const pendingOrders =
        document.getElementById("pendingOrders");

    const shippedOrders =
        document.getElementById("shippedOrders");

    const deliveredOrders =
        document.getElementById("deliveredOrders");


    /* =====================================================
       FORMAT CURRENCY
    ===================================================== */

    function formatCurrency(amount) {

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amount);

    }


    /* =====================================================
       GET STATUS CLASS
    ===================================================== */

    function getStatusClass(status) {

        const statusClasses = {
            "Pending": "status-pending",
            "Confirmed": "status-confirmed",
            "Processing": "status-processing",
            "Shipped": "status-shipped",
            "Delivered": "status-delivered",
            "Cancelled": "status-cancelled"
        };

        return statusClasses[status] || "";

    }


    /* =====================================================
       GET PAYMENT CLASS
    ===================================================== */

    function getPaymentClass(payment) {

        const paymentClasses = {
            "Paid": "payment-paid",
            "PAID": "payment-paid",
            "Pending": "payment-pending",
            "PENDING_PAYMENT": "payment-pending",
            "Pending Payment": "payment-pending",
            "Pending Verification": "payment-verification",
            "PENDING_VERIFICATION": "payment-verification",
            "Failed": "payment-failed",
            "Rejected": "payment-failed",
            "REJECTED": "payment-failed"
        };

        return paymentClasses[payment] || "payment-pending";

    }


    /* =====================================================
       UPDATE SUMMARY
    ===================================================== */

    function updateSummary() {

        const pending = orders.filter(
            order => order.status === "Pending"
        ).length;

        const shipped = orders.filter(
            order => order.status === "Shipped"
        ).length;

        const delivered = orders.filter(
            order => order.status === "Delivered"
        ).length;


        totalOrders.textContent = orders.length;

        pendingOrders.textContent = pending;

        shippedOrders.textContent = shipped;

        deliveredOrders.textContent = delivered;

    }


    /* =====================================================
       RENDER ORDERS
    ===================================================== */

    function renderOrders(orderList) {

        tableBody.innerHTML = "";


        /* ================================================
           EMPTY STATE
        ================================================= */

        if (orderList.length === 0) {

            emptyOrders.classList.add("show");

            visibleOrderCount.textContent = "0";

            return;

        }


        emptyOrders.classList.remove("show");


        visibleOrderCount.textContent =
            orderList.length;


        /* ================================================
           CREATE TABLE ROWS
        ================================================= */

        orderList.forEach(order => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>

                    <span class="order-id">
                        #${order.id}
                    </span>

                </td>


                <td>

                    <span class="customer-name">
                        ${window.FirquiHtml.escape(order.customer)}
                    </span>

                    <span class="customer-email">
                        ${window.FirquiHtml.escape(order.email)}
                    </span>

                </td>


                <td>

                    <span class="order-date">
                        ${order.date}
                    </span>

                </td>


                <td>

                    <span class="order-items">
                        ${order.items}
                        ${order.items === 1 ? "Item" : "Items"}
                    </span>

                </td>


                <td>

                    <span class="order-amount">
                        ${formatCurrency(order.amount)}
                    </span>

                </td>


                <td>

                    <span class="payment-badge ${getPaymentClass(order.payment)}">
                        ${order.payment}
                    </span>
                    ${order.transactionId && order.transactionId !== "N/A" ? `<br><small style="color: #64748b; font-size: 11px; font-family: monospace;">${window.FirquiHtml.escape(order.transactionId)}</small>` : ""}
                    ${order.refundStatus === "REFUNDED" ? `<br><span style="color: #166534; font-size: 10px; font-weight: 700; background: #dcfce7; padding: 1px 5px; border-radius: 3px;">REFUNDED</span>` : ""}
                    ${order.refundStatus === "PENDING_REFUND" ? `<br><span style="color: #0369a1; font-size: 10px; font-weight: 700; background: #e0f2fe; padding: 1px 5px; border-radius: 3px;">REFUND PENDING</span>` : ""}

                </td>


                <td>

                    <span class="status-badge ${getStatusClass(order.status)}">
                        ${order.status}
                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="view-order-btn"
                        data-order-id="${order.id}"
                    >

                        <i class="fa-regular fa-eye"></i>

                        View

                    </button>

                </td>

            `;


            tableBody.appendChild(row);

        });


        attachViewButtons();

    }


    /* =====================================================
       FILTER ORDERS
    ===================================================== */

    function filterOrders() {

        const searchValue =
            orderSearch.value
                .trim()
                .toLowerCase();

        const selectedStatus =
            statusFilter.value;

        const selectedPayment =
            paymentFilter.value;


        const filteredOrders =
            orders.filter(order => {


                /* ==========================================
                   SEARCH
                ========================================== */

                const matchesSearch =
                    order.id
                        .toLowerCase()
                        .includes(searchValue)

                    ||

                    order.customer
                        .toLowerCase()
                        .includes(searchValue)

                    ||

                    order.email
                        .toLowerCase()
                        .includes(searchValue);


                /* ==========================================
                   STATUS
                ========================================== */

                const matchesStatus =
                    selectedStatus === "all"
                    ||
                    order.status === selectedStatus;


                /* ==========================================
                   PAYMENT
                ========================================== */

                const matchesPayment =
                    selectedPayment === "all"
                    ||
                    order.payment === selectedPayment;


                return (
                    matchesSearch
                    &&
                    matchesStatus
                    &&
                    matchesPayment
                );

            });


        renderOrders(filteredOrders);

    }


    /* =====================================================
       VIEW ORDER
    ===================================================== */

    function attachViewButtons() {

        const buttons =
            document.querySelectorAll(
                ".view-order-btn"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const orderId =
                        button.dataset.orderId;


                    /*
                       Order details page will be
                       connected here later.
                    */

                    window.location.href =
                        `order-details.html?id=${orderId}`;

                }
            );

        });

    }


    /* =====================================================
       SEARCH EVENT
    ===================================================== */

    if (orderSearch) {

        orderSearch.addEventListener(
            "input",
            filterOrders
        );

    }


    /* =====================================================
       STATUS FILTER EVENT
    ===================================================== */

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            filterOrders
        );

    }


    /* =====================================================
       PAYMENT FILTER EVENT
    ===================================================== */

    if (paymentFilter) {

        paymentFilter.addEventListener(
            "change",
            filterOrders
        );

    }


    /* =====================================================
       NEWSLETTER
    ===================================================== */

    const newsletterForm =
        document.getElementById(
            "newsletterForm"
        );

    const newsletterEmail =
        document.getElementById(
            "newsletterEmail"
        );

    const newsletterMsg =
        document.getElementById(
            "newsletterMsg"
        );


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const email =
                    newsletterEmail.value.trim();


                if (!email) {

                    newsletterMsg.textContent =
                        "Please enter your email.";

                    return;

                }


                newsletterMsg.textContent =
                    "Thank you for subscribing!";


                newsletterForm.reset();

            }
        );

    }


    /* =====================================================
       ADMIN BUTTON
    ===================================================== */

    const adminButton =
        document.getElementById(
            "adminButton"
        );


    if (adminButton) {

        adminButton.addEventListener(
            "click",
            () => {

                alert(
                    "Admin profile section will be connected later."
                );

            }
        );

    }


    /* =====================================================
       SEARCH BUTTON
    ===================================================== */

    const searchButton =
        document.getElementById(
            "searchButton"
        );


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (window.FirquiAdminSearch) {
                    window.FirquiAdminSearch.open();
                } else if (orderSearch) {
                    orderSearch.focus();
                }
            }
        );

    }


    /* =====================================================
       NOTIFICATION BUTTON
    ===================================================== */

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                alert(
                    "You have new order notifications."
                );

            }
        );

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

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


    /* =====================================================
       LIVE BACKEND ORDERS INTEGRATION
    ===================================================== */

    const API_BASE = window.FIRQUI_API_BASE;
    const token = window.FirquiAuth.token();

    async function fetchLiveOrders() {
        if (!token) {
            window.location.href = "../authentication/login.html";
            return;
        }
        try {
            const response = await fetch(`${API_BASE}/api/admin/orders`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                window.location.href = "../authentication/login.html";
                return;
            }
            if (!response.ok) throw new Error("HTTP " + response.status);

            const liveOrders = await response.json();
            orders = (Array.isArray(liveOrders) ? liveOrders : []).map(o => ({
                id: o.orderNumber || o.orderId || o.id,
                customer: o.customer || (o.shippingAddress && o.shippingAddress.fullName) || "Customer",
                email: o.email || "",
                date: o.orderDate || o.date || "",
                items: o.items || (o.products ? o.products.length : 1),
                amount: Number(o.totalAmount || o.total || o.amount || 0),
                payment: o.paymentStatus || o.payment || "Pending",
                paymentMethod: o.paymentMethod || "Razorpay",
                transactionId: o.transactionId || o.razorpayPaymentId || null,
                refundStatus: o.refundStatus || null,
                status: o.orderStatus || o.status || "Processing"
            }));

            updateSummary();
            renderOrders(orders);
        } catch (err) {
            console.warn("Unable to fetch live admin orders:", err);
            const empty = document.getElementById("emptyOrders");
            if (empty) {
                const h = empty.querySelector("h3");
                const p = empty.querySelector("p");
                if (h) h.textContent = "Could not load orders";
                if (p) p.textContent = "The server did not respond. Check that the backend is running, then refresh.";
            }
        }
    }

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    updateSummary();

    renderOrders(orders);

    fetchLiveOrders();

    /* =====================================================
       PAYMENT & REFUND RECONCILIATION MODAL
    ===================================================== */
    const reconcileBtn = document.getElementById("reconcileBtn");
    const reconciliationModal = document.getElementById("reconciliationModal");
    const closeReconcileBtn = document.getElementById("closeReconcileBtn");
    const reconciliationContent = document.getElementById("reconciliationContent");

    if (reconcileBtn && reconciliationModal) {
        reconcileBtn.addEventListener("click", async () => {
            reconciliationModal.style.display = "flex";
            if (!token) {
                reconciliationContent.innerHTML = `<p style="color: #991b1b;">Unauthorized: Please log in with admin account.</p>`;
                return;
            }

            reconciliationContent.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color: #0A373B;"></i>
                    <p style="margin-top: 10px;">Reconciling Razorpay transactions with PostgreSQL orders...</p>
                </div>
            `;

            try {
                const res = await fetch(`${API_BASE}/api/admin/reconciliation`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("HTTP " + res.status);
                const data = await res.json();

                const formatR = (val) => "₹" + Math.round(val || 0).toLocaleString("en-IN");

                let discHtml = "";
                if (data.discrepancies && data.discrepancies.length > 0) {
                    discHtml = `
                        <div style="margin-top: 16px; padding: 12px; background: #fee2e2; border-radius: 8px; border: 1px solid #fecaca;">
                            <strong style="color: #991b1b; display: block; margin-bottom: 6px;"><i class="fa-solid fa-triangle-exclamation"></i> Discrepancies Found (${data.discrepancyCount}):</strong>
                            <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 0.85rem;">
                                ${data.discrepancies.map(d => `<li><strong>Order #${d.orderNumber}:</strong> ${d.issue}</li>`).join("")}
                            </ul>
                        </div>
                    `;
                } else {
                    discHtml = `
                        <div style="margin-top: 16px; padding: 12px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; color: #065f46; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-circle-check"></i>
                            <strong>All orders and Razorpay payments are 100% reconciled and consistent.</strong>
                        </div>
                    `;
                }

                reconciliationContent.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px;">
                        <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">TOTAL ORDERS</span>
                            <h4 style="margin: 4px 0 0; color: #0A373B; font-size: 1.2rem;">${data.totalOrders || 0}</h4>
                        </div>
                        <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">PAID ORDERS</span>
                            <h4 style="margin: 4px 0 0; color: #059669; font-size: 1.2rem;">${data.paidOrders || 0}</h4>
                        </div>
                        <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">REFUNDED</span>
                            <h4 style="margin: 4px 0 0; color: #0284c7; font-size: 1.2rem;">${data.refundedOrders || 0}</h4>
                        </div>
                        <div style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">FAILED REFUNDS</span>
                            <h4 style="margin: 4px 0 0; color: #dc2626; font-size: 1.2rem;">${data.failedRefunds || 0}</h4>
                        </div>
                    </div>

                    <div style="background: #fff; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span>Gross Captured Revenue:</span>
                            <strong>${formatR(data.totalRevenue)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #b91c1c;">
                            <span>Total Refunds Processed:</span>
                            <strong>- ${formatR(data.totalRefunded)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0 4px; border-top: 1px dashed #cbd5e1; font-size: 1rem; color: #0A373B;">
                            <span><strong>Net Settled Revenue:</strong></span>
                            <strong>${formatR(data.netRevenue)}</strong>
                        </div>
                    </div>

                    ${discHtml}
                `;
            } catch (err) {
                reconciliationContent.innerHTML = `<p style="color: #991b1b;"><i class="fa-solid fa-triangle-exclamation"></i> Reconciliation fetch failed: ${err.message}</p>`;
            }
        });

        if (closeReconcileBtn) {
            closeReconcileBtn.addEventListener("click", () => {
                reconciliationModal.style.display = "none";
            });
        }
        reconciliationModal.addEventListener("click", (e) => {
            if (e.target === reconciliationModal) reconciliationModal.style.display = "none";
        });
    }

});