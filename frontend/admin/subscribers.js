/* =====================================================
   FIRQUI JEWELS
   ADMIN - NEWSLETTER SUBSCRIBERS
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";
    const token = localStorage.getItem("firqui_token");

    const tableBody = document.getElementById("subscribersTableBody");
    const emptyState = document.getElementById("emptySubscribers");
    const searchInput = document.getElementById("subscriberSearch");
    const visibleCount = document.getElementById("visibleSubscriberCount");
    const totalCount = document.getElementById("totalSubscribers");
    const recentCount = document.getElementById("recentSubscribers");

    let subscribers = [];

    if (!token) {
        window.location.href = "../authentication/login.html";
        return;
    }

    function authHeaders() {
        return { "Authorization": `Bearer ${token}` };
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function formatDate(value) {
        if (!value) return "-";
        const d = new Date(value);
        if (isNaN(d)) return String(value);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
            ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }

    function pageLabel(source) {
        if (!source) return "-";
        const file = source.split("/").pop().replace(".html", "").replace(/[-_]/g, " ");
        return file ? file.charAt(0).toUpperCase() + file.slice(1) : "Home";
    }

    function setEmptyMessage(title, text) {
        const h = emptyState.querySelector("h3");
        const p = emptyState.querySelector("p");
        if (h) h.textContent = title;
        if (p) p.textContent = text;
    }

    function render() {
        const q = (searchInput.value || "").trim().toLowerCase();
        const list = q ? subscribers.filter(s => s.email.toLowerCase().includes(q)) : subscribers;

        visibleCount.textContent = list.length;
        tableBody.innerHTML = "";

        if (list.length === 0) {
            if (subscribers.length > 0) setEmptyMessage("No matches", "No subscriber email matches your search.");
            emptyState.classList.add("show");
            return;
        }
        emptyState.classList.remove("show");

        list.forEach(s => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><span class="subscriber-email">${escapeHtml(s.email)}</span></td>
                <td>${escapeHtml(formatDate(s.subscribedAt))}</td>
                <td><span class="subscriber-source">${escapeHtml(pageLabel(s.source))}</span></td>
                <td>
                    <button type="button" class="subscriber-remove" data-id="${s.id}" aria-label="Remove ${escapeHtml(s.email)}" title="Remove">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>`;
            tableBody.appendChild(row);
        });
    }

    function updateSummary() {
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        totalCount.textContent = subscribers.length;
        recentCount.textContent = subscribers.filter(s => new Date(s.subscribedAt).getTime() >= monthAgo).length;
    }

    async function load() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/newsletter`, { headers: authHeaders() });
            if (res.status === 401 || res.status === 403) {
                window.location.href = "../authentication/login.html";
                return;
            }
            if (!res.ok) throw new Error("HTTP " + res.status);
            subscribers = await res.json();
            updateSummary();
            render();
        } catch (err) {
            console.warn("Unable to load subscribers:", err);
            setEmptyMessage("Could not load subscribers", "The server did not respond. Check that the backend is running, then refresh.");
            emptyState.classList.add("show");
        }
    }

    searchInput.addEventListener("input", render);

    tableBody.addEventListener("click", async function (e) {
        const btn = e.target.closest(".subscriber-remove");
        if (!btn) return;
        const sub = subscribers.find(s => String(s.id) === btn.dataset.id);
        if (!sub || !confirm(`Remove ${sub.email} from the newsletter list?`)) return;

        btn.disabled = true;
        try {
            const res = await fetch(`${API_BASE}/api/admin/newsletter/${encodeURIComponent(sub.id)}`, {
                method: "DELETE",
                headers: authHeaders()
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            subscribers = subscribers.filter(s => s.id !== sub.id);
            updateSummary();
            render();
        } catch (err) {
            alert("Could not remove this subscriber. Please try again.");
            btn.disabled = false;
        }
    });

    document.getElementById("exportSubscribers").addEventListener("click", async function () {
        try {
            const res = await fetch(`${API_BASE}/api/admin/newsletter/export`, { headers: authHeaders() });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "firqui-newsletter-subscribers.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Could not download the subscriber list. Please try again.");
        }
    });

    document.getElementById("copySubscribers").addEventListener("click", async function () {
        const text = subscribers.map(s => s.email).join(", ");
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
            setTimeout(() => { this.innerHTML = '<i class="fa-regular fa-copy"></i> Copy emails'; }, 1800);
        } catch (err) {
            prompt("Copy these emails:", text);
        }
    });

    load();
});
