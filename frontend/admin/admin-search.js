/**
 * FIRQUI JEWELS - Admin Global Search System
 * Enables comprehensive, multi-entity search across Products, Orders, Categories, and Collections.
 */

(function () {
    const API_BASE = window.FIRQUI_API_BASE;

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function resolveAdminImage(img) {
        if (!img || typeof img !== "string" || !img.trim()) return "";
        let clean = img.trim();

        if (clean.includes("/frontend/assets/")) {
            clean = "../assets/" + clean.split("/frontend/assets/")[1];
        } else if (clean.includes("\\frontend\\assets\\")) {
            clean = "../assets/" + clean.split("\\frontend\\assets\\")[1].replace(/\\/g, "/");
        } else if (clean.includes("/assets/")) {
            clean = "../assets/" + clean.split("/assets/")[1];
        }

        if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) return clean;
        if (clean.startsWith("/uploads/")) return API_BASE ? (API_BASE + clean) : clean;
        if (clean.startsWith("uploads/")) return API_BASE ? (API_BASE + "/" + clean) : ("/" + clean);

        if (clean.startsWith("../../assets/")) return "../assets/" + clean.substring(12);
        if (clean.startsWith("../assets/")) return clean;
        if (clean.startsWith("assets/")) return "../" + clean;
        if (clean.startsWith("/assets/")) return ".." + clean;

        return clean;
    }

    function formatPrice(val) {
        if (val === undefined || val === null || val === "") return "";
        if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
        const s = String(val).trim();
        if (s.startsWith("₹")) return s;
        const num = parseFloat(s.replace(/[^0-9.]/g, ""));
        return !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : `₹${s}`;
    }

    function injectStyles() {
        if (document.getElementById("firqui-admin-search-styles")) return;
        const style = document.createElement("style");
        style.id = "firqui-admin-search-styles";
        style.textContent = `
            .admin-search-overlay {
                position: fixed;
                inset: 0;
                z-index: 9999999;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                align-items: flex-start;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.25s ease, visibility 0.25s ease;
                padding: 40px 18px 20px;
                box-sizing: border-box;
                overflow-y: auto;
            }
            .admin-search-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .admin-search-modal {
                width: 100%;
                max-width: 880px;
                background: #0f172a;
                border: 1px solid #334155;
                border-radius: 20px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
                padding: 28px 26px;
                transform: translateY(-15px);
                transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                box-sizing: border-box;
            }
            .admin-search-overlay.active .admin-search-modal {
                transform: translateY(0);
            }
            .admin-search-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            .admin-search-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .admin-search-title i {
                font-size: 20px;
                color: #38bdf8;
            }
            .admin-search-title h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #f8fafc;
            }
            .admin-search-close {
                background: #1e293b;
                border: 1px solid #334155;
                color: #94a3b8;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: background 0.2s, color 0.2s;
            }
            .admin-search-close:hover {
                background: #ef4444;
                color: #fff;
                border-color: #ef4444;
            }
            .admin-search-input-box {
                position: relative;
                width: 100%;
                margin-bottom: 16px;
            }
            .admin-search-input-box i.input-icon {
                position: absolute;
                left: 18px;
                top: 50%;
                transform: translateY(-50%);
                color: #38bdf8;
                font-size: 16px;
            }
            .admin-search-input {
                width: 100%;
                padding: 14px 48px 14px 48px;
                background: #1e293b;
                border: 1.5px solid #334155;
                border-radius: 12px;
                font-size: 16px;
                color: #f8fafc;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
                box-sizing: border-box;
                font-family: inherit;
            }
            .admin-search-input:focus {
                border-color: #38bdf8;
                box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
            }
            .admin-search-input::placeholder {
                color: #64748b;
            }
            .admin-search-clear {
                position: absolute;
                right: 14px;
                top: 50%;
                transform: translateY(-50%);
                background: #334155;
                border: none;
                color: #cbd5e1;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 11px;
            }
            .admin-search-clear.visible {
                display: flex;
            }
            .admin-search-clear:hover {
                background: #475569;
                color: #fff;
            }
            .admin-search-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                border-bottom: 1px solid #334155;
                padding-bottom: 10px;
            }
            .admin-search-tab {
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 13px;
                font-weight: 500;
                padding: 6px 14px;
                border-radius: 8px;
                cursor: pointer;
                transition: color 0.2s, background 0.2s;
            }
            .admin-search-tab.active {
                background: rgba(56, 189, 248, 0.15);
                color: #38bdf8;
                font-weight: 600;
            }
            .admin-search-body {
                max-height: 52vh;
                overflow-y: auto;
                padding-right: 4px;
            }
            .admin-search-body::-webkit-scrollbar {
                width: 6px;
            }
            .admin-search-body::-webkit-scrollbar-thumb {
                background: #334155;
                border-radius: 6px;
            }
            .admin-search-group {
                margin-bottom: 24px;
            }
            .admin-search-group-title {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #38bdf8;
                font-weight: 700;
                margin: 0 0 10px 4px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .admin-search-items-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .admin-search-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 10px;
                padding: 10px 14px;
                text-decoration: none;
                color: inherit;
                transition: background 0.2s, border-color 0.2s, transform 0.15s;
                gap: 12px;
            }
            .admin-search-item:hover {
                background: #253349;
                border-color: #38bdf8;
                transform: translateX(3px);
            }
            .admin-search-item-left {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
            }
            .admin-search-item-thumb {
                width: 44px;
                height: 44px;
                border-radius: 8px;
                background: #0f172a;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .admin-search-item-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .admin-search-item-info {
                min-width: 0;
            }
            .admin-search-item-name {
                font-size: 14px;
                font-weight: 600;
                color: #f8fafc;
                margin: 0 0 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .admin-search-item-meta {
                font-size: 12px;
                color: #94a3b8;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .admin-search-item-right {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-shrink: 0;
            }
            .admin-search-item-badge {
                font-size: 11px;
                font-weight: 600;
                padding: 3px 8px;
                border-radius: 6px;
                background: rgba(56, 189, 248, 0.12);
                color: #38bdf8;
            }
            .admin-search-item-badge.badge-success {
                background: rgba(34, 197, 94, 0.15);
                color: #4ade80;
            }
            .admin-search-item-badge.badge-warning {
                background: rgba(234, 179, 8, 0.15);
                color: #facc15;
            }
            .admin-search-item-badge.badge-info {
                background: rgba(148, 163, 184, 0.15);
                color: #cbd5e1;
            }
            .admin-search-item-price {
                font-size: 13px;
                font-weight: 600;
                color: #f8fafc;
            }
            .admin-search-empty {
                text-align: center;
                padding: 40px 10px;
                color: #94a3b8;
            }
            .admin-search-empty i {
                font-size: 32px;
                color: #64748b;
                margin-bottom: 10px;
                display: block;
            }
            .admin-search-loading {
                text-align: center;
                padding: 35px 10px;
                color: #38bdf8;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    let overlayEl = null;
    let inputEl = null;
    let clearBtnEl = null;
    let bodyEl = null;
    let currentTab = "all";
    let debounceTimer = null;

    let cachedProducts = null;
    let cachedOrders = null;
    let cachedCategories = null;
    let cachedCollections = null;

    async function fetchAdminData() {
        const token = localStorage.getItem("firqui_admin_token") || window.FirquiAuth.token() || "";

        // 1. Products
        try {
            let res = await fetch(`${API_BASE}/api/admin/products`, {
                headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
            });
            if (!res.ok) res = await fetch(`${API_BASE}/api/products`);
            if (res.ok) {
                cachedProducts = await res.json();
            }
        } catch (_) {}

        if (!Array.isArray(cachedProducts) || cachedProducts.length === 0) {
            try {
                cachedProducts = JSON.parse(localStorage.getItem("firquiProducts") || "[]");
            } catch (_) {
                cachedProducts = [];
            }
        }

        // 2. Orders
        try {
            let res = await fetch(`${API_BASE}/api/admin/orders`, {
                headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
            });
            if (res.ok) {
                cachedOrders = await res.json();
            }
        } catch (_) {}

        if (!Array.isArray(cachedOrders) || cachedOrders.length === 0) {
            try {
                cachedOrders = JSON.parse(localStorage.getItem("firquiOrders") || "[]");
            } catch (_) {
                cachedOrders = [];
            }
        }

        // 3. Categories
        try {
            let res = await fetch(`${API_BASE}/api/categories`);
            if (res.ok) cachedCategories = await res.json();
        } catch (_) {}

        // 4. Collections
        try {
            let res = await fetch(`${API_BASE}/api/collections`);
            if (res.ok) cachedCollections = await res.json();
        } catch (_) {}
    }

    function createAdminModal() {
        if (overlayEl) return;
        injectStyles();

        overlayEl = document.createElement("div");
        overlayEl.className = "admin-search-overlay";
        overlayEl.id = "firquiAdminSearchOverlay";

        overlayEl.innerHTML = `
            <div class="admin-search-modal" role="dialog" aria-modal="true" aria-label="Admin Global Search">
                <div class="admin-search-header">
                    <div class="admin-search-title">
                        <i class="fa-solid fa-compass"></i>
                        <h3>Admin Global Search</h3>
                    </div>
                    <button class="admin-search-close" id="firquiAdminSearchClose" aria-label="Close search">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="admin-search-input-box">
                    <i class="fa-solid fa-magnifying-glass input-icon"></i>
                    <input
                        type="text"
                        class="admin-search-input"
                        id="firquiAdminSearchInput"
                        placeholder="Search products by name/SKU/category, or orders by ID/customer..."
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <button class="admin-search-clear" id="firquiAdminSearchClear" aria-label="Clear query">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="admin-search-tabs">
                    <button class="admin-search-tab active" data-tab="all">All</button>
                    <button class="admin-search-tab" data-tab="products">Products</button>
                    <button class="admin-search-tab" data-tab="orders">Orders</button>
                    <button class="admin-search-tab" data-tab="categories">Categories &amp; Collections</button>
                </div>

                <div class="admin-search-body" id="firquiAdminSearchBody">
                    <div class="admin-search-empty">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <p>Search across your complete catalogue, customer orders, and categories.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlayEl);

        inputEl = document.getElementById("firquiAdminSearchInput");
        clearBtnEl = document.getElementById("firquiAdminSearchClear");
        bodyEl = document.getElementById("firquiAdminSearchBody");
        const closeBtn = document.getElementById("firquiAdminSearchClose");

        closeBtn.addEventListener("click", closeAdminSearch);

        overlayEl.addEventListener("click", (e) => {
            if (e.target === overlayEl) closeAdminSearch();
        });

        clearBtnEl.addEventListener("click", () => {
            inputEl.value = "";
            clearBtnEl.classList.remove("visible");
            inputEl.focus();
            renderInitialState();
        });

        inputEl.addEventListener("input", () => {
            const val = inputEl.value;
            if (val.trim()) clearBtnEl.classList.add("visible");
            else clearBtnEl.classList.remove("visible");

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                executeAdminSearch(val);
            }, 250);
        });

        overlayEl.querySelectorAll(".admin-search-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                overlayEl.querySelectorAll(".admin-search-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                currentTab = tab.dataset.tab;
                executeAdminSearch(inputEl.value);
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlayEl.classList.contains("active")) {
                closeAdminSearch();
            }
        });
    }

    function renderInitialState() {
        if (!bodyEl) return;
        bodyEl.innerHTML = `
            <div class="admin-search-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>Search across your complete catalogue, customer orders, and categories.</p>
            </div>
        `;
    }

    function executeAdminSearch(rawQuery) {
        if (!bodyEl) return;
        const query = (rawQuery || "").trim().toLowerCase();

        if (!query) {
            renderInitialState();
            return;
        }

        const products = Array.isArray(cachedProducts) ? cachedProducts : [];
        const orders = Array.isArray(cachedOrders) ? cachedOrders : [];
        const categories = Array.isArray(cachedCategories) ? cachedCategories : [];
        const collections = Array.isArray(cachedCollections) ? cachedCollections : [];

        // Match Products
        const matchedProducts = [];
        if (currentTab === "all" || currentTab === "products") {
            products.forEach(p => {
                const name = (p.name || p.productName || "").toLowerCase();
                const cat = (p.category || "").toLowerCase();
                const col = (p.collection || "").toLowerCase();
                const sku = (p.sku || "").toLowerCase();
                const idStr = String(p.id !== undefined ? p.id : (p.legacyId || "")).toLowerCase();

                if (name.includes(query) || cat.includes(query) || col.includes(query) || sku.includes(query) || idStr === query) {
                    matchedProducts.push(p);
                }
            });
        }

        // Match Orders
        const matchedOrders = [];
        if (currentTab === "all" || currentTab === "orders") {
            orders.forEach(o => {
                const orderNum = (o.orderNumber || o.id || "").toLowerCase();
                const custName = (o.customerName || (o.shippingAddress && o.shippingAddress.fullName) || "").toLowerCase();
                const status = (o.orderStatus || o.status || "").toLowerCase();
                const phone = (o.customerPhone || "").toLowerCase();
                const email = (o.customerEmail || "").toLowerCase();

                if (orderNum.includes(query) || custName.includes(query) || status.includes(query) || phone.includes(query) || email.includes(query)) {
                    matchedOrders.push(o);
                }
            });
        }

        // Match Categories & Collections
        const matchedCatsCols = [];
        if (currentTab === "all" || currentTab === "categories") {
            categories.forEach(c => {
                const cName = (c.name || c.categoryName || "").toLowerCase();
                if (cName.includes(query)) {
                    matchedCatsCols.push({ type: "Category", name: c.name || c.categoryName, desc: c.description || "" });
                }
            });
            collections.forEach(col => {
                const colName = (col.name || col.title || "").toLowerCase();
                if (colName.includes(query)) {
                    matchedCatsCols.push({ type: "Collection", name: col.name || col.title, desc: col.description || "" });
                }
            });
            // If empty, also check known categories from products
            if (matchedCatsCols.length === 0) {
                const uniqueCats = new Set(products.map(p => p.category).filter(Boolean));
                uniqueCats.forEach(c => {
                    if (c.toLowerCase().includes(query)) {
                        matchedCatsCols.push({ type: "Category", name: c, desc: "Product Category" });
                    }
                });
            }
        }

        const totalResults = matchedProducts.length + matchedOrders.length + matchedCatsCols.length;

        if (totalResults === 0) {
            bodyEl.innerHTML = `
                <div class="admin-search-empty">
                    <i class="fa-regular fa-folder-open"></i>
                    <p>No matches found for "<strong>${escapeHtml(rawQuery)}</strong>".</p>
                    <p style="font-size:12px;opacity:0.6;margin-top:4px;">Try searching for a product name, SKU, category, or order number.</p>
                </div>
            `;
            return;
        }

        let html = "";

        // Group 1: Products
        if (matchedProducts.length > 0) {
            html += `
                <div class="admin-search-group">
                    <div class="admin-search-group-title">
                        <i class="fa-solid fa-gem"></i>
                        <span>Products (${matchedProducts.length})</span>
                    </div>
                    <div class="admin-search-items-list">
            `;
            matchedProducts.slice(0, 15).forEach(p => {
                const pId = p.id !== undefined ? p.id : (p.legacyId || "");
                const pName = p.name || p.productName || "Product";
                const pCat = p.category || "General";
                const pPrice = formatPrice(p.price);
                const pSku = p.sku ? `SKU: ${p.sku}` : "";
                const pStatus = (p.active === false || p.availability === "Out of Stock") ? "Inactive" : "Active";
                const badgeClass = pStatus === "Active" ? "badge-success" : "badge-warning";
                const pImg = resolveAdminImage(p.mainImage || (p.images && p.images[0]));

                const thumbHtml = pImg
                    ? `<img src="${pImg}" alt="${escapeHtml(pName)}" onerror="this.style.display='none';">`
                    : `<i class="fa-regular fa-gem" style="color:#64748b;font-size:18px;"></i>`;

                html += `
                    <a href="edit-product.html?id=${encodeURIComponent(pId)}" class="admin-search-item">
                        <div class="admin-search-item-left">
                            <div class="admin-search-item-thumb">
                                ${thumbHtml}
                            </div>
                            <div class="admin-search-item-info">
                                <h4 class="admin-search-item-name">${escapeHtml(pName)}</h4>
                                <div class="admin-search-item-meta">
                                    <span>${escapeHtml(pCat)}</span>
                                    ${pSku ? `<span>•</span><span>${escapeHtml(pSku)}</span>` : ""}
                                </div>
                            </div>
                        </div>
                        <div class="admin-search-item-right">
                            <span class="admin-search-item-badge ${badgeClass}">${pStatus}</span>
                            <span class="admin-search-item-price">${pPrice}</span>
                        </div>
                    </a>
                `;
            });
            html += `</div></div>`;
        }

        // Group 2: Orders
        if (matchedOrders.length > 0) {
            html += `
                <div class="admin-search-group">
                    <div class="admin-search-group-title">
                        <i class="fa-solid fa-bag-shopping"></i>
                        <span>Orders (${matchedOrders.length})</span>
                    </div>
                    <div class="admin-search-items-list">
            `;
            matchedOrders.slice(0, 10).forEach(o => {
                const orderNum = o.orderNumber || o.id || "";
                const custName = o.customerName || (o.shippingAddress && o.shippingAddress.fullName) || "Customer";
                const status = o.orderStatus || o.status || "Pending";
                const total = formatPrice(o.totalAmount || o.total || o.finalAmount);
                const badgeClass = status.toLowerCase() === "delivered" ? "badge-success" : (status.toLowerCase() === "cancelled" ? "badge-warning" : "badge-info");

                html += `
                    <a href="order-details.html?id=${encodeURIComponent(orderNum)}" class="admin-search-item">
                        <div class="admin-search-item-left">
                            <div class="admin-search-item-thumb">
                                <i class="fa-solid fa-receipt" style="color:#38bdf8;font-size:18px;"></i>
                            </div>
                            <div class="admin-search-item-info">
                                <h4 class="admin-search-item-name">Order #${escapeHtml(orderNum)}</h4>
                                <div class="admin-search-item-meta">
                                    <span>${escapeHtml(custName)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="admin-search-item-right">
                            <span class="admin-search-item-badge ${badgeClass}">${escapeHtml(status)}</span>
                            ${total ? `<span class="admin-search-item-price">${total}</span>` : ""}
                        </div>
                    </a>
                `;
            });
            html += `</div></div>`;
        }

        // Group 3: Categories & Collections
        if (matchedCatsCols.length > 0) {
            html += `
                <div class="admin-search-group">
                    <div class="admin-search-group-title">
                        <i class="fa-solid fa-tags"></i>
                        <span>Categories &amp; Collections (${matchedCatsCols.length})</span>
                    </div>
                    <div class="admin-search-items-list">
            `;
            matchedCatsCols.forEach(cc => {
                html += `
                    <a href="products.html?category=${encodeURIComponent(cc.name)}" class="admin-search-item">
                        <div class="admin-search-item-left">
                            <div class="admin-search-item-thumb">
                                <i class="fa-solid fa-layer-group" style="color:#e8a598;font-size:18px;"></i>
                            </div>
                            <div class="admin-search-item-info">
                                <h4 class="admin-search-item-name">${escapeHtml(cc.name)}</h4>
                                <div class="admin-search-item-meta">
                                    <span>${escapeHtml(cc.type)}</span>
                                    ${cc.desc ? `<span>•</span><span>${escapeHtml(cc.desc)}</span>` : ""}
                                </div>
                            </div>
                        </div>
                        <div class="admin-search-item-right">
                            <span class="admin-search-item-badge">View Products</span>
                        </div>
                    </a>
                `;
            });
            html += `</div></div>`;
        }

        bodyEl.innerHTML = html;
    }

    function openAdminSearch() {
        createAdminModal();
        fetchAdminData();
        overlayEl.classList.add("active");
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            if (inputEl) inputEl.focus();
        }, 150);
    }

    function closeAdminSearch() {
        if (!overlayEl) return;
        overlayEl.classList.remove("active");
        document.body.style.overflow = "";
    }

    function attachAdminSearch() {
        createAdminModal();
        const triggers = document.querySelectorAll('#searchButton, #searchBtn, [aria-label="Search"], [title="Search"], .header-icon i.fa-magnifying-glass');

        triggers.forEach(btn => {
            const clickable = btn.tagName.toLowerCase() === "button" || btn.tagName.toLowerCase() === "a" ? btn : btn.closest("button, a") || btn;
            if (clickable.dataset.firquiAdminSearchAttached) return;
            clickable.dataset.firquiAdminSearchAttached = "true";

            clickable.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                openAdminSearch();
            }, true);
        });
    }

    window.FirquiAdminSearch = {
        open: openAdminSearch,
        close: closeAdminSearch,
        refresh: fetchAdminData
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attachAdminSearch);
    } else {
        attachAdminSearch();
    }
})();
