/* =========================================================
   FIRQUI JEWELS
   ADMIN CUSTOMER CANCELLATION REQUESTS JAVASCRIPT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.FIRQUI_API_BASE;
    const token = window.FirquiAuth.token();

    const tableBody = document.getElementById("cancellationTableBody");
    const emptyRequests = document.getElementById("emptyRequests");
    const searchInput = document.getElementById("requestSearch");
    const statusFilter = document.getElementById("statusFilter");
    const visibleCount = document.getElementById("visibleRequestCount");

    const totalRequestsEl = document.getElementById("totalRequests");
    const pendingRequestsEl = document.getElementById("pendingRequests");
    const approvedRequestsEl = document.getElementById("approvedRequests");
    const rejectedRequestsEl = document.getElementById("rejectedRequests");

    // Sample fallback data if viewed without active backend session
    const sampleRequests = [
        {
            id: 1,
            orderId: 101,
            orderNumber: "FQ302955",
            userId: 2,
            customerName: "Abhijeet Customer",
            customerEmail: "user@firqui.com",
            customerPhone: "8888888888",
            reason: "Ordered by mistake",
            additionalDetails: "Accidentally placed order for the wrong ring size.",
            status: "APPROVED",
            adminNotes: "Approved per customer request",
            refundStatus: "PENDING_REFUND",
            orderAmount: 1499,
            formattedOrderAmount: "₹1,499",
            paymentStatus: "Pending",
            products: [
                {
                    productId: 1,
                    name: "Golden Grace Ring",
                    quantity: 1,
                    price: 1499,
                    image: "../assets/Logo Pink 1.png"
                }
            ],
            createdAt: new Date().toISOString(),
            formattedCreatedAt: "12 Oct 2026, 03:28 pm"
        },
        {
            id: 2,
            orderId: 102,
            orderNumber: "FQ244128",
            userId: 2,
            customerName: "Abhijeet Customer",
            customerEmail: "user@firqui.com",
            customerPhone: "8888888888",
            reason: "Want to change the product",
            additionalDetails: "I want to exchange for a different item in collection.",
            status: "REJECTED",
            adminNotes: "Order is already packed and dispatched for delivery.",
            refundStatus: "NOT_APPLICABLE",
            orderAmount: 1499,
            formattedOrderAmount: "₹1,499",
            paymentStatus: "Pending",
            products: [
                {
                    productId: 1,
                    name: "Golden Grace Ring",
                    quantity: 1,
                    price: 1499,
                    image: "../assets/Logo Pink 1.png"
                }
            ],
            createdAt: new Date().toISOString(),
            formattedCreatedAt: "12 Oct 2026, 03:29 pm"
        }
    ];

    let allRequests = [];

    /* =====================================================
       FETCH ALL CANCELLATION REQUESTS
    ===================================================== */
    async function loadRequests() {
        if (!token) {
            // Display prototype data so page renders gracefully
            console.log("No firqui_token in localStorage. Rendering initial requests view.");
            allRequests = sampleRequests;
            updateSummary();
            filterAndRender();
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/admin/cancellation-requests`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    console.warn("Unauthorized token, falling back to sample view.");
                    allRequests = sampleRequests;
                    updateSummary();
                    filterAndRender();
                    return;
                }
                throw new Error("Failed to load cancellation requests.");
            }

            const data = await response.json();
            allRequests = Array.isArray(data) ? data : sampleRequests;
            updateSummary();
            filterAndRender();

        } catch (err) {
            console.error("Error loading cancellation requests:", err);
            allRequests = sampleRequests;
            updateSummary();
            filterAndRender();
        }
    }

    /* =====================================================
       UPDATE SUMMARY COUNTERS
    ===================================================== */
    function updateSummary() {
        if (!Array.isArray(allRequests)) return;

        const total = allRequests.length;
        const pending = allRequests.filter(r => (r.status || "").toUpperCase() === "PENDING").length;
        const approved = allRequests.filter(r => (r.status || "").toUpperCase() === "APPROVED").length;
        const rejected = allRequests.filter(r => (r.status || "").toUpperCase() === "REJECTED").length;

        if (totalRequestsEl) totalRequestsEl.textContent = total;
        if (pendingRequestsEl) pendingRequestsEl.textContent = pending;
        if (approvedRequestsEl) approvedRequestsEl.textContent = approved;
        if (rejectedRequestsEl) rejectedRequestsEl.textContent = rejected;
    }

    /* =====================================================
       FILTER AND RENDER
    ===================================================== */
    function filterAndRender() {
        if (!Array.isArray(allRequests)) return;

        const searchTerm = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const selectedStatus = (statusFilter ? statusFilter.value : "all").toUpperCase();

        const filtered = allRequests.filter(r => {
            // Status match
            if (selectedStatus !== "ALL" && (r.status || "").toUpperCase() !== selectedStatus) {
                return false;
            }

            // Search match
            if (searchTerm) {
                const orderNum = (r.orderNumber || "").toLowerCase();
                const custName = (r.customerName || "").toLowerCase();
                const custEmail = (r.customerEmail || "").toLowerCase();
                const reason = (r.reason || "").toLowerCase();
                const explanation = (r.additionalDetails || "").toLowerCase();

                const matches = orderNum.includes(searchTerm) ||
                                custName.includes(searchTerm) ||
                                custEmail.includes(searchTerm) ||
                                reason.includes(searchTerm) ||
                                explanation.includes(searchTerm);
                if (!matches) return false;
            }

            return true;
        });

        renderTable(filtered);
    }

    /* =====================================================
       RENDER TABLE ROWS
    ===================================================== */
    function renderTable(list) {
        if (!tableBody) return;
        tableBody.innerHTML = "";

        if (visibleCount) visibleCount.textContent = list.length;

        if (list.length === 0) {
            if (emptyRequests) emptyRequests.classList.add("show");
            return;
        }

        if (emptyRequests) emptyRequests.classList.remove("show");

        list.forEach(req => {
            const row = document.createElement("tr");

            const reqId = req.id || "--";
            const orderNum = req.orderNumber || "--";
            const custName = req.customerName || "Customer";
            const custEmail = req.customerEmail || "N/A";
            const custPhone = req.customerPhone || "";
            const amount = req.formattedOrderAmount || ("₹" + Math.round(req.orderAmount || 0).toLocaleString("en-IN"));
            const dateStr = req.formattedCreatedAt || (req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN") : "Today");
            const statusUpper = (req.status || "PENDING").toUpperCase();

            // Products list thumbnail + name
            let productsHtml = "";
            if (req.products && req.products.length > 0) {
                const first = req.products[0];
                let imgSrc = first.image || "../assets/Logo Pink 1.png";
                if (imgSrc.startsWith("../../")) imgSrc = imgSrc.substring(3);
                const moreCount = req.products.length - 1;
                productsHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${imgSrc}" alt="${first.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(10, 55, 59, 0.15); flex-shrink: 0;" onerror="this.src='../assets/Logo Pink 1.png';">
                        <div>
                            <div style="font-size: 13px; font-weight: 600; color: #0A373B; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${first.name}</div>
                            <small style="color: var(--text-muted); font-size: 11px;">Qty: ${first.quantity || 1} ${moreCount > 0 ? `(+${moreCount} more)` : ""}</small>
                        </div>
                    </div>
                `;
            } else {
                productsHtml = `<span style="font-size: 12px; color: var(--text-muted);">FIRQUI Jewels</span>`;
            }

            // Status Badge
            let statusBadge = "";
            if (statusUpper === "PENDING") {
                statusBadge = `<span class="status-badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>`;
            } else if (statusUpper === "APPROVED") {
                statusBadge = `<span class="status-badge-approved"><i class="fa-solid fa-check"></i> Approved</span>`;
            } else if (statusUpper === "REJECTED") {
                statusBadge = `<span class="status-badge-rejected"><i class="fa-solid fa-xmark"></i> Rejected</span>`;
            } else {
                statusBadge = `<span class="reason-badge">${req.status}</span>`;
            }

            // Actions Column
            let actionsHtml = "";
            if (statusUpper === "PENDING") {
                actionsHtml = `
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="approve-btn" data-id="${req.id}" data-order="${orderNum}">
                            <i class="fa-solid fa-check"></i> Approve
                        </button>
                        <button type="button" class="reject-btn" data-id="${req.id}" data-order="${orderNum}">
                            <i class="fa-solid fa-xmark"></i> Reject
                        </button>
                    </div>
                `;
            } else if (statusUpper === "APPROVED") {
                let refundStatusText = "";
                if (req.refundStatus === "PENDING_REFUND") {
                    refundStatusText = `<div style="font-size: 11px; color: var(--dark-teal); font-weight: 600; margin-top: 3px;"><i class="fa-solid fa-rotate"></i> Refund: Pending (Manual UPI)</div>`;
                } else if (req.refundStatus === "REFUNDED") {
                    refundStatusText = `<div style="font-size: 11px; color: #2B8A3E; font-weight: 600; margin-top: 3px;"><i class="fa-solid fa-check"></i> Refund: Completed</div>`;
                }
                actionsHtml = `
                    <div style="font-size: 12px; color: #2B8A3E; font-weight: 600;">
                        <i class="fa-solid fa-circle-check"></i> Order Cancelled
                        ${refundStatusText}
                    </div>
                `;
            } else if (statusUpper === "REJECTED") {
                actionsHtml = `
                    <div style="font-size: 12px; color: #C92A2A;">
                        <strong>Rejected</strong>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Reason: "${req.adminNotes || "N/A"}"</div>
                    </div>
                `;
            }

            row.innerHTML = `
                <td>
                    <strong style="color: var(--dark-teal); font-size: 13px;">#REQ-${reqId}</strong>
                </td>

                <td>
                    <a href="order-details.html?id=${encodeURIComponent(orderNum)}" style="color: var(--dark-teal); font-weight: 700; text-decoration: underline; font-size: 13px;" title="View Order Details">
                        #${orderNum}
                    </a>
                </td>

                <td>
                    <div style="font-weight: 600; color: var(--dark-teal); font-size: 13px;">${custName}</div>
                    <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-imprima);">${custEmail}</div>
                    ${custPhone ? `<div style="font-size: 11px; color: rgba(44, 44, 44, 0.45);">${custPhone}</div>` : ""}
                </td>

                <td>
                    ${productsHtml}
                </td>

                <td>
                    <div style="font-weight: 700; color: var(--dark-teal); font-size: 13px;">${amount}</div>
                    <small style="font-size: 11px; color: var(--text-muted);">${req.paymentStatus || "Pending"}</small>
                </td>

                <td>
                    <span class="reason-badge">${req.reason || "N/A"}</span>
                    <div class="req-details-text">"${req.additionalDetails || ""}"</div>
                </td>

                <td>
                    <span style="font-size: 12px; color: var(--text-muted); white-space: nowrap;">${dateStr}</span>
                </td>

                <td>
                    ${statusBadge}
                </td>

                <td>
                    ${actionsHtml}
                </td>
            `;

            tableBody.appendChild(row);
        });

        attachActionListeners();
    }

    /* =====================================================
       APPROVE & REJECT ACTIONS
    ===================================================== */
    function attachActionListeners() {
        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.onclick = async function () {
                const reqId = this.dataset.id;
                const orderNum = this.dataset.order;

                if (!token) {
                    alert("Admin authentication required to perform live approvals. Please log in.");
                    window.location.href = "../authentication/login.html";
                    return;
                }

                const confirmed = confirm(
                    `Approve Cancellation Request #REQ-${reqId} for Order #${orderNum}?\n\n` +
                    `This will:\n` +
                    `• Mark the cancellation request as APPROVED\n` +
                    `• Update Order #${orderNum} status to CANCELLED\n` +
                    `• Automatically restore product inventory stock in the database\n` +
                    `• Track refund status if payment was already verified\n` +
                    `• Send cancellation approval email to the customer\n\n` +
                    `Do you want to continue?`
                );

                if (!confirmed) return;

                this.disabled = true;
                this.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Approving...`;

                try {
                    const res = await fetch(`${API_BASE}/api/admin/cancellation-requests/${reqId}/approve`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ adminNotes: "Approved by admin." })
                    });

                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || "Failed to approve cancellation.");
                    }

                    alert(`Cancellation Request #REQ-${reqId} for Order #${orderNum} successfully approved!`);
                    await loadRequests();

                } catch (err) {
                    alert("Error approving cancellation: " + err.message);
                    this.disabled = false;
                    this.innerHTML = `<i class="fa-solid fa-check"></i> Approve`;
                }
            };
        });

        document.querySelectorAll(".reject-btn").forEach(btn => {
            btn.onclick = async function () {
                const reqId = this.dataset.id;
                const orderNum = this.dataset.order;

                if (!token) {
                    alert("Admin authentication required to perform live rejections. Please log in.");
                    window.location.href = "../authentication/login.html";
                    return;
                }

                const reason = prompt(
                    `Enter the reason for rejecting cancellation of Order #${orderNum} (Required):`
                );

                if (reason === null) return; // user cancelled prompt
                if (!reason.trim()) {
                    alert("Rejection reason is required before rejecting the cancellation request.");
                    return;
                }

                const confirmed = confirm(
                    `Reject Cancellation Request #REQ-${reqId} for Order #${orderNum}?\n\n` +
                    `Reason: "${reason.trim()}"\n\n` +
                    `This will:\n` +
                    `• Mark the cancellation request as REJECTED\n` +
                    `• Keep Order #${orderNum} in its active status\n` +
                    `• Send a rejection notification email to the customer with your explanation\n\n` +
                    `Proceed with rejection?`
                );

                if (!confirmed) return;

                this.disabled = true;
                this.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...`;

                try {
                    const res = await fetch(`${API_BASE}/api/admin/cancellation-requests/${reqId}/reject`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ reason: reason.trim() })
                    });

                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || "Failed to reject cancellation.");
                    }

                    alert(`Cancellation Request #REQ-${reqId} rejected. Customer has been notified.`);
                    await loadRequests();

                } catch (err) {
                    alert("Error rejecting cancellation: " + err.message);
                    this.disabled = false;
                    this.innerHTML = `<i class="fa-solid fa-xmark"></i> Reject`;
                }
            };
        });
    }

    /* =====================================================
       EVENT LISTENERS
    ===================================================== */
    if (searchInput) searchInput.addEventListener("input", filterAndRender);
    if (statusFilter) statusFilter.addEventListener("change", filterAndRender);

    // Logout
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to log out?")) {
                localStorage.removeItem("firqui_token");
                window.location.href = "../authentication/login.html";
            }
        });
    }

    // Initial load
    loadRequests();

});
