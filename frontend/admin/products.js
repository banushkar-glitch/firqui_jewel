/* =====================================================
   FIRQUI JEWELS
   ADMIN PRODUCTS LIST
   Live data only. Per product: edit, quick-edit price/stock,
   duplicate, publish / archive / restore, delete (drafts & archived).
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.FIRQUI_API_BASE || "";
    const esc = (v) => window.FirquiHtml.escape(v);
    const $ = (id) => document.getElementById(id);

    const tableBody = $("productsTableBody");
    const searchInput = $("productSearch");
    const clearSearch = $("clearSearch");
    const categoryFilter = $("categoryFilter");
    const collectionFilter = $("collectionFilter");
    const statusFilter = $("statusFilter");
    const productCount = $("productCount");
    const emptyState = $("emptyState");

    let products = [];
    let editingId = null;

    const STATUS_LABEL = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

    /* =====================================================
       HELPERS
    ===================================================== */
    function rupees(n) {
        return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }

    function statusOf(p) {
        return p.status || (p.active === false ? "ARCHIVED" : "PUBLISHED");
    }

    function titleCase(s) {
        return String(s || "").toLowerCase().replace(/(^|[\s&-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    }

    function imageUrl(p) {
        const url = p.mainImage || (p.images && p.images[0]) || "";
        if (!url || p.mainMediaType === "video") return "";
        if (url.startsWith("/uploads/")) return API_BASE + url;
        return url;
    }

    function stockCell(p) {
        const stock = Number(p.stockQuantity || 0);
        if (p.availability === "Arriving Soon") return '<span class="stock-low">Pre-order</span>';
        if (p.availability === "Out of Stock" || stock === 0) return '<span class="stock-out">Out of stock</span>';
        return `<span class="${stock <= 5 ? "stock-low" : "stock-good"}">${stock} in stock</span>`;
    }

    function toast(message, isError) {
        let el = $("productsToast");
        if (!el) {
            el = document.createElement("div");
            el.id = "productsToast";
            el.className = "pl-toast";
            el.setAttribute("role", "status");
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.toggle("is-error", !!isError);
        el.classList.add("show");
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove("show"), 3500);
    }

    async function api(path, options) {
        const res = await fetch(`${API_BASE}${path}`, options);
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
            window.FirquiAuth.goToLogin();
            throw new Error("Please log in again.");
        }
        if (!res.ok || data.success === false) {
            throw new Error(data.message || data.error || `Server error (${res.status})`);
        }
        return data;
    }

    /* =====================================================
       FILTER OPTIONS
    ===================================================== */
    function fillOptions(select, names, allLabel) {
        const current = select.value;
        select.innerHTML = `<option value="all">${esc(allLabel)}</option>` +
            names.map(n => `<option value="${esc(n.toLowerCase())}">${esc(titleCase(n))}</option>`).join("");
        if (Array.from(select.options).some(o => o.value === current)) select.value = current;
    }

    statusFilter.innerHTML = `
        <option value="all">All statuses</option>
        <option value="PUBLISHED">Published</option>
        <option value="DRAFT">Drafts</option>
        <option value="ARCHIVED">Archived</option>`;

    /* =====================================================
       RENDER
    ===================================================== */
    function filtered() {
        const q = searchInput.value.trim().toLowerCase();
        const cat = categoryFilter.value;
        const col = collectionFilter.value;
        const st = statusFilter.value;
        return products.filter(p => {
            if (cat !== "all" && String(p.category || "").toLowerCase() !== cat) return false;
            if (col !== "all" && String(p.collection || "").toLowerCase() !== col) return false;
            if (st !== "all" && statusOf(p) !== st) return false;
            if (q && !`${p.name} ${p.sku || ""} ${p.category || ""} ${p.collection || ""}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }

    function actionButtons(p) {
        const s = statusOf(p);
        const buttons = [
            `<a class="table-action" href="product-form.html?id=${encodeURIComponent(p.id)}" title="Edit" aria-label="Edit ${esc(p.name)}"><i class="fa-regular fa-pen-to-square"></i></a>`,
            `<button type="button" class="table-action" data-act="quick" title="Quick edit price and stock" aria-label="Quick edit ${esc(p.name)}"><i class="fa-solid fa-bolt"></i></button>`,
            `<button type="button" class="table-action" data-act="duplicate" title="Duplicate as draft" aria-label="Duplicate ${esc(p.name)}"><i class="fa-regular fa-copy"></i></button>`
        ];
        if (s === "PUBLISHED") {
            buttons.push(`<button type="button" class="table-action" data-act="archive" title="Archive (hide from shop)" aria-label="Archive ${esc(p.name)}"><i class="fa-solid fa-box-archive"></i></button>`);
        } else {
            buttons.push(`<button type="button" class="table-action" data-act="publish" title="${s === "ARCHIVED" ? "Restore to shop" : "Publish"}" aria-label="Publish ${esc(p.name)}"><i class="fa-solid fa-cloud-arrow-up"></i></button>`);
            buttons.push(`<button type="button" class="table-action delete-btn" data-act="delete" title="Delete permanently" aria-label="Delete ${esc(p.name)}"><i class="fa-regular fa-trash-can"></i></button>`);
        }
        return buttons.join("");
    }

    function rowHtml(p) {
        const s = statusOf(p);
        const img = imageUrl(p);
        return `
            <td>
                <div class="product-info">
                    <div class="product-image">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<i class="fa-solid fa-gem"></i>'}</div>
                    <div>
                        <strong>${esc(p.name)}</strong>
                        <small>${esc(p.sku || "No SKU")}</small>
                    </div>
                </div>
            </td>
            <td>${esc(p.category ? titleCase(p.category) : "-")}</td>
            <td>${esc(p.collection || "-")}</td>
            <td><strong>${rupees(p.price)}</strong>${p.comparePrice ? `<br><s class="pl-compare">${rupees(p.comparePrice)}</s>` : ""}</td>
            <td>${stockCell(p)}</td>
            <td><span class="pl-status is-${s.toLowerCase()}">${STATUS_LABEL[s] || s}</span></td>
            <td class="pl-actions">${actionButtons(p)}</td>`;
    }

    function quickEditHtml(p) {
        const avail = p.availability || "In Stock";
        const opt = (v) => `<option value="${v}" ${avail === v ? "selected" : ""}>${v}</option>`;
        return `
            <td colspan="7">
                <form class="pl-quick" data-id="${esc(p.id)}">
                    <strong class="pl-quick-name">${esc(p.name)}</strong>
                    <label>Price (₹)<input type="number" name="price" min="0" step="0.01" value="${esc(p.price || "")}" required></label>
                    <label>Compare-at (₹)<input type="number" name="comparePrice" min="0" step="0.01" value="${esc(p.comparePrice || "")}" placeholder="Optional"></label>
                    <label>Stock<input type="number" name="stockQuantity" min="0" step="1" value="${esc(p.stockQuantity != null ? p.stockQuantity : 0)}"></label>
                    <label>Availability<select name="availability">${opt("In Stock")}${opt("Arriving Soon")}${opt("Out of Stock")}</select></label>
                    <label class="pl-quick-restock" ${avail === "Arriving Soon" ? "" : "hidden"}>Restock date<input type="date" name="restockDate" value="${esc(p.restockDate || "")}"></label>
                    <div class="pl-quick-buttons">
                        <button type="submit" class="pl-quick-save">Save</button>
                        <button type="button" class="pl-quick-cancel">Cancel</button>
                    </div>
                    <p class="pl-quick-error" role="alert"></p>
                </form>
            </td>`;
    }

    function render() {
        const list = filtered();
        productCount.textContent = list.length;
        tableBody.innerHTML = "";
        emptyState.classList.toggle("show", list.length === 0);
        list.forEach(p => {
            const row = document.createElement("tr");
            row.dataset.id = p.id;
            row.className = "pl-row is-" + statusOf(p).toLowerCase();
            row.innerHTML = String(p.id) === String(editingId) ? quickEditHtml(p) : rowHtml(p);
            tableBody.appendChild(row);
        });
        const quick = tableBody.querySelector(".pl-quick input[name='price']");
        if (quick) quick.focus();
    }

    /* =====================================================
       LOAD
    ===================================================== */
    async function load() {
        try {
            const res = await fetch(`${API_BASE}/api/admin/products`);
            if (res.status === 401 || res.status === 403) { window.FirquiAuth.goToLogin(); return; }
            if (!res.ok) throw new Error();
            products = (await res.json()).sort((a, b) => (b.id || 0) - (a.id || 0));
            fillOptions(categoryFilter, [...new Set(products.map(p => p.category).filter(Boolean))].sort(), "All categories");
            fillOptions(collectionFilter, [...new Set(products.map(p => p.collection).filter(Boolean))].sort(), "All collections");
            render();
        } catch (e) {
            emptyState.classList.add("show");
            const h = emptyState.querySelector("h3");
            const t = emptyState.querySelector("p");
            if (h) h.textContent = "Could not load products";
            if (t) t.textContent = "Check that the backend is running, then refresh.";
        }
    }

    function replaceProduct(updated) {
        const i = products.findIndex(p => String(p.id) === String(updated.id));
        if (i >= 0) products[i] = updated; else products.unshift(updated);
    }

    /* =====================================================
       ACTIONS
    ===================================================== */
    tableBody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-act]");
        if (btn) {
            const id = btn.closest("tr").dataset.id;
            const p = products.find(x => String(x.id) === String(id));
            if (!p) return;
            const act = btn.dataset.act;
            btn.disabled = true;
            try {
                if (act === "quick") {
                    editingId = id;
                    render();
                } else if (act === "duplicate") {
                    const data = await api(`/api/admin/products/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
                    replaceProduct(data.product);
                    render();
                    toast(`Copied as a draft: "${data.product.name}". Edit it to change photos or details.`);
                } else if (act === "archive") {
                    if (!confirm(`Archive "${p.name}"? It disappears from the shop; past orders keep their details. You can restore it later.`)) return;
                    const data = await api(`/api/admin/products/${encodeURIComponent(id)}/status`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ARCHIVED" })
                    });
                    replaceProduct(data.product); render(); toast(`"${p.name}" archived.`);
                } else if (act === "publish") {
                    const data = await api(`/api/admin/products/${encodeURIComponent(id)}/status`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PUBLISHED" })
                    });
                    replaceProduct(data.product); render(); toast(`"${p.name}" is now in the shop.`);
                } else if (act === "delete") {
                    if (!confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return;
                    await api(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
                    products = products.filter(x => String(x.id) !== String(id));
                    render(); toast(`"${p.name}" deleted.`);
                }
            } catch (err) {
                // e.g. publishing an incomplete draft: say what is missing and offer the full form
                toast(err.message + (act === "publish" ? " Open the product to complete it." : ""), true);
            } finally {
                btn.disabled = false;
            }
            return;
        }
        if (e.target.closest(".pl-quick-cancel")) {
            editingId = null;
            render();
        }
    });

    tableBody.addEventListener("change", (e) => {
        if (e.target.name === "availability") {
            const restock = e.target.closest(".pl-quick").querySelector(".pl-quick-restock");
            restock.hidden = e.target.value !== "Arriving Soon";
        }
    });

    tableBody.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && editingId) { editingId = null; render(); }
    });

    tableBody.addEventListener("submit", async (e) => {
        const formEl = e.target.closest(".pl-quick");
        if (!formEl) return;
        e.preventDefault();
        const id = formEl.dataset.id;
        const f = formEl.elements;
        const errorEl = formEl.querySelector(".pl-quick-error");
        const save = formEl.querySelector(".pl-quick-save");
        errorEl.textContent = "";
        save.disabled = true;
        try {
            const body = {
                price: f.price.value,
                comparePrice: f.comparePrice.value === "" ? null : f.comparePrice.value,
                stockQuantity: f.stockQuantity.value === "" ? 0 : f.stockQuantity.value,
                availability: f.availability.value,
                restockDate: f.availability.value === "Arriving Soon" ? (f.restockDate.value || null) : null
            };
            const data = await api(`/api/admin/products/${encodeURIComponent(id)}/inventory`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
            });
            replaceProduct(data.product);
            editingId = null;
            render();
            toast(`Saved "${data.product.name}".`);
        } catch (err) {
            errorEl.textContent = err.message;
            save.disabled = false;
        }
    });

    /* =====================================================
       FILTERS
    ===================================================== */
    searchInput.addEventListener("input", () => {
        clearSearch.classList.toggle("show", searchInput.value.length > 0);
        render();
    });
    clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        clearSearch.classList.remove("show");
        render();
        searchInput.focus();
    });
    [categoryFilter, collectionFilter, statusFilter].forEach(s => s.addEventListener("change", render));

    // ?status=DRAFT links straight to a filtered view
    const wanted = new URLSearchParams(location.search).get("status");
    if (wanted && STATUS_LABEL[wanted.toUpperCase()]) statusFilter.value = wanted.toUpperCase();

    load();
});
