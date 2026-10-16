/* =========================================================
   FIRQUI JEWELS
   ADMIN ORDERS PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       SAMPLE ORDER DATA
       FRONTEND PROTOTYPE
    ===================================================== */

    let orders = [

        {
            id: "FJ1001",
            customer: "Rahul Sharma",
            email: "rahul@example.com",
            date: "01 Oct 2026",
            items: 2,
            amount: 2998,
            payment: "Paid",
            status: "Processing"
        },

        {
            id: "FJ1002",
            customer: "Priya Patil",
            email: "priya@example.com",
            date: "30 Sep 2026",
            items: 1,
            amount: 1499,
            payment: "Paid",
            status: "Shipped"
        },

        {
            id: "FJ1003",
            customer: "Sneha Kulkarni",
            email: "sneha@example.com",
            date: "29 Sep 2026",
            items: 3,
            amount: 3499,
            payment: "Paid",
            status: "Delivered"
        },

        {
            id: "FJ1004",
            customer: "Amit Joshi",
            email: "amit@example.com",
            date: "28 Sep 2026",
            items: 1,
            amount: 1899,
            payment: "Pending",
            status: "Pending"
        },

        {
            id: "FJ1005",
            customer: "Neha Deshmukh",
            email: "neha@example.com",
            date: "27 Sep 2026",
            items: 2,
            amount: 4298,
            payment: "Paid",
            status: "Confirmed"
        },

        {
            id: "FJ1006",
            customer: "Rohan Patil",
            email: "rohan@example.com",
            date: "26 Sep 2026",
            items: 1,
            amount: 1299,
            payment: "Paid",
            status: "Delivered"
        },

        {
            id: "FJ1007",
            customer: "Snehal More",
            email: "snehal@example.com",
            date: "25 Sep 2026",
            items: 2,
            amount: 2798,
            payment: "Paid",
            status: "Shipped"
        },

        {
            id: "FJ1008",
            customer: "Akash Shah",
            email: "akash@example.com",
            date: "24 Sep 2026",
            items: 1,
            amount: 999,
            payment: "Failed",
            status: "Cancelled"
        },

        {
            id: "FJ1009",
            customer: "Anjali Singh",
            email: "anjali@example.com",
            date: "23 Sep 2026",
            items: 3,
            amount: 5197,
            payment: "Paid",
            status: "Delivered"
        },

        {
            id: "FJ1010",
            customer: "Karan Mehta",
            email: "karan@example.com",
            date: "22 Sep 2026",
            items: 1,
            amount: 1599,
            payment: "Paid",
            status: "Processing"
        },

        {
            id: "FJ1011",
            customer: "Pooja Jadhav",
            email: "pooja@example.com",
            date: "21 Sep 2026",
            items: 2,
            amount: 3198,
            payment: "Paid",
            status: "Pending"
        },

        {
            id: "FJ1012",
            customer: "Vivek Pawar",
            email: "vivek@example.com",
            date: "20 Sep 2026",
            items: 1,
            amount: 2199,
            payment: "Paid",
            status: "Shipped"
        }

    ];


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
                        ${order.customer}
                    </span>

                    <span class="customer-email">
                        ${order.email}
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

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";
    const token = localStorage.getItem("firqui_token");

    async function fetchLiveOrders() {
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE}/api/admin/orders`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const liveOrders = await response.json();
                if (liveOrders && liveOrders.length > 0) {
                    const mappedLive = liveOrders.map(o => ({
                        id: o.orderNumber || o.orderId || o.id,
                        customer: o.customer || (o.shippingAddress && o.shippingAddress.fullName) || "Customer",
                        email: o.email || "",
                        date: o.orderDate || o.date || "Today",
                        items: o.items || (o.products ? o.products.length : 1),
                        amount: Number(o.totalAmount || o.total || o.amount || 0),
                        payment: o.paymentStatus || o.payment || "Pending",
                        status: o.orderStatus || o.status || "Processing"
                    }));

                    const liveIds = new Set(mappedLive.map(x => String(x.id)));
                    const remainingProto = orders.filter(x => !liveIds.has(String(x.id)));
                    orders = [...mappedLive, ...remainingProto];

                    updateSummary();
                    renderOrders(orders);
                }
            }
        } catch (err) {
            console.warn("Unable to fetch live admin orders:", err);
        }
    }

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    updateSummary();

    renderOrders(orders);

    fetchLiveOrders();

});