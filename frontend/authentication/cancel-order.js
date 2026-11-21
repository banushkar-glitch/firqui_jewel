/* =====================================================
   FIRQUI JEWELS - cancel an order without an account
   1. No token: ask for order number + email, server emails a signed link.
   2. With ?token=...: show the order and let the customer confirm.
===================================================== */
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const API_BASE = window.FIRQUI_API_BASE || "";
    const message = document.getElementById("authMessage");
    const requestForm = document.getElementById("requestForm");
    const cancelForm = document.getElementById("cancelForm");
    const summary = document.getElementById("orderSummary");
    const token = new URLSearchParams(window.location.search).get("token");

    function show(text, kind) {
        message.textContent = text;
        message.className = "auth-message" + (kind ? " " + kind : "");
    }

    function loading(button, on) {
        button.disabled = on;
        button.classList.toggle("loading", on);
    }

    function rupees(value) {
        return "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }

    async function readJson(res) {
        try { return await res.json(); } catch (e) { return {}; }
    }

    /* ---------- Step 1: request a link ---------- */
    if (!token) {
        requestForm.hidden = false;
        requestForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const orderNumber = document.getElementById("orderNumber").value.trim();
            const email = document.getElementById("email").value.trim();
            if (!orderNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                show("Please enter your order number and the email address you used for the order.", "error");
                return;
            }
            const button = document.getElementById("requestBtn");
            loading(button, true);
            try {
                const res = await fetch(`${API_BASE}/api/guest-orders/cancel-link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderNumber: orderNumber, email: email })
                });
                const data = await readJson(res);
                if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
                show(data.message, "success");
                requestForm.reset();
            } catch (err) {
                show(err.message, "error");
            } finally {
                loading(button, false);
            }
        });
        return;
    }

    /* ---------- Step 2: opened from the emailed link ---------- */
    document.getElementById("intro").textContent = "Check your order below and confirm to cancel it.";

    function renderSummary(order) {
        summary.textContent = "";
        const rows = [
            ["Order", "#" + order.orderNumber],
            ["Placed", order.orderDate || "-"],
            ["Total", rupees(order.totalAmount)],
            ["Cancel before", order.cancelBy || "-"]
        ];
        rows.forEach(function (r) {
            const row = document.createElement("div");
            row.className = "row";
            const label = document.createElement("span");
            label.textContent = r[0];
            const value = document.createElement("strong");
            value.textContent = r[1];
            row.appendChild(label);
            row.appendChild(value);
            summary.appendChild(row);
        });
        if (order.items && order.items.length) {
            const list = document.createElement("ul");
            order.items.forEach(function (it) {
                const li = document.createElement("li");
                li.textContent = (it.name || "Item") + " × " + (it.quantity || 1);
                list.appendChild(li);
            });
            summary.appendChild(list);
        }
    }

    (async function loadOrder() {
        try {
            const res = await fetch(`${API_BASE}/api/guest-orders/cancel-preview?token=${encodeURIComponent(token)}`);
            const data = await readJson(res);
            if (!res.ok) throw new Error(data.message || "This cancellation link is invalid or has expired.");

            if (!data.cancellable) {
                show(data.status === "Cancelled"
                    ? `Order #${data.orderNumber} is already cancelled.` + (data.refundStatus && data.refundStatus !== "NOT_APPLICABLE" && data.refundStatus !== "NONE" ? ` Refund status: ${data.refundStatus}.` : "")
                    : `Order #${data.orderNumber} can no longer be cancelled online. Please contact us for help.`, "error");
                return;
            }

            renderSummary(data);
            if (!data.paidOnline) {
                const note = document.createElement("p");
                note.className = "cancel-note";
                note.textContent = "No online payment was taken for this order, so no refund is needed.";
                summary.appendChild(note);
            }
            cancelForm.hidden = false;
        } catch (err) {
            show(err.message + " You can request a new link below.", "error");
            requestForm.hidden = false;
        }
    })();

    cancelForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!confirm("Cancel this order? This cannot be undone.")) return;
        const button = document.getElementById("cancelBtn");
        loading(button, true);
        try {
            const res = await fetch(`${API_BASE}/api/guest-orders/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: token,
                    reason: document.getElementById("reason").value,
                    additionalDetails: document.getElementById("details").value.trim()
                })
            });
            const data = await readJson(res);
            if (!res.ok) throw new Error(data.message || "Could not cancel the order. Please try again.");

            cancelForm.hidden = true;
            const refunded = data.refundStatus && !["NOT_APPLICABLE", "NONE"].includes(data.refundStatus);
            let text = `Order #${data.orderNumber} has been cancelled.`;
            if (data.refundStatus === "REFUND_FAILED") {
                text += " Your refund is being processed by our team - we'll email you once it's done.";
            } else if (refunded) {
                text += ` Your refund of ${rupees(data.refundAmount)} has been sent to your original payment method.`
                    + " Most banks show it within minutes; some take up to 5-7 working days.";
            }
            show(text + " A confirmation email is on its way.", "success");
        } catch (err) {
            show(err.message, "error");
            loading(button, false);
        }
    });
});
