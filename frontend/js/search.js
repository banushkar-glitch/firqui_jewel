/**
 * FIRQUI JEWELS - Global Customer Search System
 * Enables real-time, responsive, dynamic product search from every customer-facing page.
 */

(function () {
    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function resolveSearchImage(img) {
        if (!img || typeof img !== "string" || !img.trim()) return "";
        let clean = img.trim();

        if (clean.includes("/frontend/assets/")) {
            clean = "assets/" + clean.split("/frontend/assets/")[1];
        } else if (clean.includes("\\frontend\\assets\\")) {
            clean = "assets/" + clean.split("\\frontend\\assets\\")[1].replace(/\\/g, "/");
        } else if (clean.includes("/assets/")) {
            clean = "assets/" + clean.split("/assets/")[1];
        }

        if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) return clean;
        if (clean.startsWith("/uploads/")) return API_BASE ? (API_BASE + clean) : clean;
        if (clean.startsWith("uploads/")) return API_BASE ? (API_BASE + "/" + clean) : ("/" + clean);

        const isRoot = !window.location.pathname.includes("/products/") && !window.location.pathname.includes("/collection/");
        const isCollection = window.location.pathname.includes("/collection/");
        const basePrefix = isRoot ? "" : (isCollection ? "../" : "../");

        if (clean.startsWith("../../assets/")) return basePrefix + clean.substring(6);
        if (clean.startsWith("../assets/")) return basePrefix + clean.substring(3);
        if (clean.startsWith("assets/")) return basePrefix + clean;
        if (clean.startsWith("/assets/")) return basePrefix + clean.substring(1);

        return basePrefix + clean;
    }

    function getProductImage(prod) {
        if (!prod) return "";
        if (prod.mainImage && typeof prod.mainImage === "string" && prod.mainImage.trim()) {
            return resolveSearchImage(prod.mainImage);
        }
        if (Array.isArray(prod.images) && prod.images.length > 0) {
            for (const im of prod.images) {
                if (im && typeof im === "string" && im.trim()) {
                    return resolveSearchImage(im);
                }
            }
        }
        if (prod.image && typeof prod.image === "string" && prod.image.trim()) {
            return resolveSearchImage(prod.image);
        }
        if (prod.referenceImage1 && typeof prod.referenceImage1 === "string" && prod.referenceImage1.trim()) {
            return resolveSearchImage(prod.referenceImage1);
        }
        return "";
    }

    function getProductDetailsUrl(prod) {
        const isRoot = !window.location.pathname.includes("/products/") && !window.location.pathname.includes("/collection/");
        const isCollection = window.location.pathname.includes("/collection/");
        const prefix = isRoot ? "products/" : (isCollection ? "../products/" : "");

        const pId = String(prod.id !== undefined && prod.id !== null ? prod.id : (prod.legacyId || ""));
        const pName = prod.name || prod.productName || "";
        const pCategory = prod.category || "";
        const pPrice = typeof prod.price === "number" ? `₹${prod.price.toLocaleString("en-IN")}` : String(prod.price || "");
        const pImg = getProductImage(prod);
        const pDesc = prod.description || "";

        const query = new URLSearchParams();
        if (pId) query.set("id", pId);
        if (pName) query.set("name", pName);
        if (pCategory) query.set("category", pCategory);
        if (pPrice) query.set("price", pPrice);
        if (pImg) query.set("image", pImg);
        if (pDesc) query.set("description", pDesc);

        return `${prefix}product-details.html?${query.toString()}`;
    }

    function formatPrice(val) {
        if (val === undefined || val === null || val === "") return "";
        if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
        const s = String(val).trim();
        if (s.startsWith("₹")) return s;
        const num = parseFloat(s.replace(/[^0-9.]/g, ""));
        return !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : `₹${s}`;
    }

    // Injected Search Styles
    function injectStyles() {
        if (document.getElementById("firqui-search-styles")) return;
        const style = document.createElement("style");
        style.id = "firqui-search-styles";
        style.textContent = `
            .firqui-search-overlay {
                position: fixed;
                inset: 0;
                z-index: 999999;
                background: rgba(8, 45, 48, 0.88);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                display: flex;
                align-items: flex-start;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s ease;
                padding: 40px 18px 20px;
                overflow-y: auto;
                box-sizing: border-box;
            }
            .firqui-search-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            .firqui-search-modal {
                width: 100%;
                max-width: 860px;
                background: #0d3b3f;
                border: 1px solid rgba(232, 165, 152, 0.3);
                border-radius: 26px;
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
                padding: 32px 30px 34px;
                transform: translateY(-20px) scale(0.98);
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                color: #faf5ee;
                font-family: 'Inter', -apple-system, sans-serif;
                box-sizing: border-box;
            }
            .firqui-search-overlay.active .firqui-search-modal {
                transform: translateY(0) scale(1);
            }
            .firqui-search-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                margin-bottom: 22px;
                position: relative;
            }
            .firqui-search-titles span {
                font-size: 11px;
                letter-spacing: 3px;
                text-transform: uppercase;
                color: #e8a598;
                font-weight: 600;
                display: block;
                margin-bottom: 4px;
            }
            .firqui-search-titles h2 {
                margin: 0;
                font-family: 'Hurricane', 'Imprima', cursive, serif;
                font-size: 44px;
                font-weight: 400;
                line-height: 1.1;
                color: #faf5ee;
            }
            .firqui-search-close-btn {
                background: rgba(250, 245, 238, 0.1);
                border: 1px solid rgba(250, 245, 238, 0.15);
                color: #faf5ee;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: background 0.2s, transform 0.2s, color 0.2s;
                flex-shrink: 0;
            }
            .firqui-search-close-btn:hover {
                background: #e8a598;
                color: #082d30;
                transform: rotate(90deg);
            }
            .firqui-search-input-wrap {
                position: relative;
                width: 100%;
                margin-bottom: 18px;
            }
            .firqui-search-input-wrap i.search-icon {
                position: absolute;
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                color: #e8a598;
                font-size: 18px;
                pointer-events: none;
            }
            .firqui-search-input {
                width: 100%;
                padding: 16px 52px 16px 54px;
                background: rgba(255, 255, 255, 0.08);
                border: 1.5px solid rgba(232, 165, 152, 0.4);
                border-radius: 50px;
                font-size: 17px;
                color: #faf5ee;
                outline: none;
                transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
                box-sizing: border-box;
                font-family: inherit;
            }
            .firqui-search-input:focus {
                border-color: #e8a598;
                background: rgba(255, 255, 255, 0.12);
                box-shadow: 0 0 0 4px rgba(232, 165, 152, 0.18);
            }
            .firqui-search-input::placeholder {
                color: rgba(250, 245, 238, 0.5);
            }
            .firqui-search-clear-btn {
                position: absolute;
                right: 14px;
                top: 50%;
                transform: translateY(-50%);
                background: rgba(250, 245, 238, 0.15);
                border: none;
                color: #faf5ee;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: background 0.2s;
            }
            .firqui-search-clear-btn.visible {
                display: flex;
            }
            .firqui-search-clear-btn:hover {
                background: #e8a598;
                color: #082d30;
            }
            .firqui-search-chips {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 22px;
                align-items: center;
            }
            .firqui-search-chips-label {
                font-size: 12px;
                color: rgba(250, 245, 238, 0.6);
                margin-right: 4px;
            }
            .firqui-search-chip {
                background: rgba(255, 255, 255, 0.07);
                border: 1px solid rgba(232, 165, 152, 0.25);
                color: #faf5ee;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s, transform 0.15s;
            }
            .firqui-search-chip:hover {
                background: #e8a598;
                color: #082d30;
                border-color: #e8a598;
                transform: translateY(-1px);
            }
            .firqui-search-results {
                max-height: 52vh;
                overflow-y: auto;
                padding-right: 6px;
            }
            .firqui-search-results::-webkit-scrollbar {
                width: 6px;
            }
            .firqui-search-results::-webkit-scrollbar-thumb {
                background: rgba(232, 165, 152, 0.4);
                border-radius: 6px;
            }
            .firqui-search-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
            }
            @media (max-width: 640px) {
                .firqui-search-grid {
                    grid-template-columns: 1fr;
                }
                .firqui-search-modal {
                    padding: 22px 18px 24px;
                }
                .firqui-search-titles h2 {
                    font-size: 34px;
                }
            }
            .firqui-search-item {
                display: flex;
                align-items: center;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(250, 245, 238, 0.12);
                border-radius: 16px;
                padding: 12px 14px;
                text-decoration: none;
                color: inherit;
                transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
                gap: 14px;
            }
            .firqui-search-item:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: #e8a598;
                transform: translateY(-2px);
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
            }
            .firqui-search-thumb {
                width: 72px;
                height: 72px;
                border-radius: 12px;
                background: #114246;
                overflow: hidden;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .firqui-search-thumb img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s;
            }
            .firqui-search-item:hover .firqui-search-thumb img {
                transform: scale(1.08);
            }
            .firqui-search-info {
                flex: 1;
                min-width: 0;
            }
            .firqui-search-info-cat {
                font-size: 10px;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                color: #e8a598;
                font-weight: 600;
                display: block;
                margin-bottom: 2px;
            }
            .firqui-search-info-title {
                font-family: 'Imprima', Georgia, serif;
                font-size: 16px;
                color: #faf5ee;
                margin: 0 0 4px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .firqui-search-info-price {
                font-size: 14px;
                font-weight: 600;
                color: #faf5ee;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .firqui-search-info-compare {
                font-size: 11px;
                color: rgba(250, 245, 238, 0.5);
                text-decoration: line-through;
                font-weight: normal;
            }
            .firqui-search-empty {
                text-align: center;
                padding: 45px 20px;
                color: rgba(250, 245, 238, 0.7);
            }
            .firqui-search-empty i {
                font-size: 38px;
                color: #e8a598;
                margin-bottom: 12px;
                display: block;
            }
            .firqui-search-empty p {
                margin: 4px 0 0;
                font-size: 14px;
            }
            .firqui-search-loading {
                text-align: center;
                padding: 35px 20px;
                color: #e8a598;
                font-size: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    // Cached products store
    let cachedProducts = null;
    let isFetchingProducts = false;

    async function loadAllProducts() {
        if (cachedProducts && cachedProducts.length > 0) {
            return cachedProducts;
        }
        if (isFetchingProducts) return [];
        isFetchingProducts = true;

        let list = [];

        // 1. Fetch from live backend API
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            if (res.ok) {
                const apiData = await res.json();
                if (Array.isArray(apiData)) {
                    list = apiData;
                }
            }
        } catch (e) {
            console.warn("Backend /api/products offline, checking local storage:", e);
        }

        // 2. Incorporate localStorage firquiProducts (admin added/edited products)
        try {
            const localStored = JSON.parse(localStorage.getItem("firquiProducts") || "[]");
            if (Array.isArray(localStored)) {
                localStored.forEach(lp => {
                    list.push(lp);
                });
            }
        } catch (_) {}

        // 3. Fallback catalogue of Firqui Jewels products if still empty
        if (list.length === 0) {
            list = [
                { id: "1", name: "Golden Grace", category: "BRACELETS & CUFFS", price: 1499, description: "Elegant gold bracelet designed to add sophistication.", images: ["assets/Cuffs.png"] },
                { id: "2", name: "Pearl Charm", category: "BRACELETS & CUFFS", price: 1799, description: "A timeless pearl bracelet combining classic elegance.", images: ["assets/bracelets/bracelet2.jpg"] },
                { id: "3", name: "Rose Harmony", category: "BRACELETS & CUFFS", price: 1299, description: "A beautiful designer bracelet.", images: ["assets/bracelets/bracelet3.jpg"] },
                { id: "4", name: "Silver Edge", category: "BRACELETS & CUFFS", price: 999, description: "Minimal silver cuff with clean modern design.", images: ["assets/bracelets/bracelet4.jpg"] },
                { id: "5", name: "Floral Bloom", category: "BRACELETS & CUFFS", price: 1599, description: "A floral-inspired bracelet.", images: ["assets/bracelets/bracelet5.jpg"] },
                { id: "6", name: "Luxury Cuff", category: "BRACELETS & CUFFS", price: 2199, description: "Premium designer cuff featuring luxurious finish.", images: ["assets/bracelets/bracelet6.jpg"] },
                { id: "ring-1", name: "Elegant Ring", category: "RINGS", price: 2499, description: "Delicate design for everyday elegance.", images: ["assets/rings/ring1.jpg"] },
                { id: "ring-2", name: "Classic Ring", category: "RINGS", price: 2899, description: "A timeless piece with a refined finish.", images: ["assets/rings/ring2.jpg"] },
                { id: "ring-3", name: "Statement Ring", category: "RINGS", price: 3299, description: "Designed to add a sophisticated touch.", images: ["assets/rings/ring3.jpg"] },
                { id: "ring-4", name: "Floral Ring", category: "RINGS", price: 2699, description: "Inspired by delicate floral details.", images: ["assets/rings/ring4.jpg"] },
                { id: "ring-5", name: "Minimal Ring", category: "RINGS", price: 2199, description: "Simple, modern and effortlessly elegant.", images: ["assets/rings/ring5.jpg"] },
                { id: "ring-6", name: "Signature Ring", category: "RINGS", price: 3499, description: "A bold statement piece.", images: ["assets/rings/ring6.jpg"] },
                { id: "necklace-1", name: "Golden Elegance", category: "NECKLACES", price: 1499, description: "Statement Necklace bringing captivating glow.", images: ["assets/necklaces/necklace1.jpg"] },
                { id: "necklace-2", name: "Pearl Grace", category: "NECKLACES", price: 1799, description: "Classic Pearl Necklace for a majestic look.", images: ["assets/necklaces/necklace2.jpg"] },
                { id: "earring-1", name: "Golden Elegance", category: "EARRINGS", price: 1499, description: "Statement Earrings designed to impress.", images: ["assets/earrings/earring1.jpg"] },
                { id: "earring-2", name: "Pearl Drop", category: "EARRINGS", price: 1799, description: "Classic Pearl Earrings combining sophistication.", images: ["assets/earrings/earring2.jpg"] },
                { id: "brooch-1", name: "Elegant Brooch", category: "BROOCHES", price: 1899, description: "Delicate design for everyday elegance.", images: ["assets/brooches/brooch1.jpg"] },
                { id: "brooch-2", name: "Classic Brooch", category: "BROOCHES", price: 2199, description: "A timeless piece with refined finish.", images: ["assets/brooches/brooch2.jpg"] },
                { id: "pearl-1", name: "Rogue Pearl", category: "PEARLS GONE ROGUE", price: 1999, description: "Elegant Pearl Necklace that defies convention.", images: ["assets/pearls/pearl1.jpg"] },
                { id: "pearl-2", name: "Pearl Rebel", category: "PEARLS GONE ROGUE", price: 1499, description: "Statement Pearl Earrings with rebel flair.", images: ["assets/pearls/pearl2.jpg"] }
            ];
        }

        // Filter active & de-duplicate
        const seen = new Set();
        const cleanList = [];

        for (const item of list) {
            if (!item) continue;
            if (item.active === false || item.availability === "Out of Stock") continue;

            const idKey = String(item.id !== undefined && item.id !== null ? item.id : (item.legacyId || "")).trim();
            const nameKey = String(item.name || item.productName || "").trim().toLowerCase();
            const uniqueKey = idKey ? `id:${idKey}` : `name:${nameKey}`;

            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);
            cleanList.push(item);
        }

        cachedProducts = cleanList;
        isFetchingProducts = false;
        return cleanList;
    }

    // Modal Builder
    let overlayEl = null;
    let inputEl = null;
    let clearBtnEl = null;
    let resultsEl = null;
    let debounceTimer = null;

    function createSearchModal() {
        if (overlayEl) return;
        injectStyles();

        overlayEl = document.createElement("div");
        overlayEl.className = "firqui-search-overlay";
        overlayEl.id = "firquiSearchOverlay";

        overlayEl.innerHTML = `
            <div class="firqui-search-modal" role="dialog" aria-modal="true" aria-label="Search Firqui Jewels">
                <div class="firqui-search-header">
                    <div class="firqui-search-titles">
                        <span>Discover More</span>
                        <h2>Search Firqui Jewels</h2>
                    </div>
                    <button class="firqui-search-close-btn" id="firquiSearchCloseBtn" aria-label="Close search">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="firqui-search-input-wrap">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input
                        type="text"
                        class="firqui-search-input"
                        id="firquiSearchInput"
                        placeholder="Search rings, necklaces, earrings, pearls, Golden Grace..."
                        autocomplete="off"
                        spellcheck="false"
                    />
                    <button class="firqui-search-clear-btn" id="firquiSearchClearBtn" aria-label="Clear query">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="firqui-search-chips">
                    <span class="firqui-search-chips-label">Popular:</span>
                    <button type="button" class="firqui-search-chip" data-query="Rings">Rings</button>
                    <button type="button" class="firqui-search-chip" data-query="Necklaces">Necklaces</button>
                    <button type="button" class="firqui-search-chip" data-query="Earrings">Earrings</button>
                    <button type="button" class="firqui-search-chip" data-query="Bracelets & Cuffs">Bracelets &amp; Cuffs</button>
                    <button type="button" class="firqui-search-chip" data-query="Brooches">Brooches</button>
                    <button type="button" class="firqui-search-chip" data-query="Pearls">Pearls</button>
                </div>

                <div class="firqui-search-results" id="firquiSearchResults">
                    <div class="firqui-search-empty">
                        <i class="fa-solid fa-gem"></i>
                        <p>Type a product name, category, or collection to discover our jewellery.</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlayEl);

        inputEl = document.getElementById("firquiSearchInput");
        clearBtnEl = document.getElementById("firquiSearchClearBtn");
        resultsEl = document.getElementById("firquiSearchResults");
        const closeBtn = document.getElementById("firquiSearchCloseBtn");

        closeBtn.addEventListener("click", closeSearch);

        overlayEl.addEventListener("click", (e) => {
            if (e.target === overlayEl) {
                closeSearch();
            }
        });

        clearBtnEl.addEventListener("click", () => {
            inputEl.value = "";
            clearBtnEl.classList.remove("visible");
            inputEl.focus();
            renderInitialState();
        });

        inputEl.addEventListener("input", () => {
            const val = inputEl.value;
            if (val.trim()) {
                clearBtnEl.classList.add("visible");
            } else {
                clearBtnEl.classList.remove("visible");
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                executeSearch(val);
            }, 250);
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlayEl.classList.contains("active")) {
                closeSearch();
            }
        });

        overlayEl.querySelectorAll(".firqui-search-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const q = chip.dataset.query;
                inputEl.value = q;
                clearBtnEl.classList.add("visible");
                inputEl.focus();
                executeSearch(q);
            });
        });
    }

    function renderInitialState() {
        if (!resultsEl) return;
        resultsEl.innerHTML = `
            <div class="firqui-search-empty">
                <i class="fa-solid fa-gem"></i>
                <p>Type a product name, category, or collection to discover our jewellery.</p>
            </div>
        `;
    }

    async function executeSearch(rawQuery) {
        if (!resultsEl) return;
        const query = (rawQuery || "").trim().toLowerCase();

        if (!query) {
            renderInitialState();
            return;
        }

        resultsEl.innerHTML = `
            <div class="firqui-search-loading">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>Searching our collection...</span>
            </div>
        `;

        const allProducts = await loadAllProducts();

        // Search matching algorithm
        const scoredMatches = [];

        for (const p of allProducts) {
            const name = (p.name || p.productName || "").toLowerCase();
            const cat = (p.category || "").toLowerCase();
            const col = (p.collection || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            const sku = (p.sku || "").toLowerCase();
            const tags = (p.tags || "").toLowerCase();
            const mat = (p.material || "").toLowerCase();
            const gem = (p.gemstone || "").toLowerCase();

            let score = 0;

            if (name === query) {
                score += 100;
            } else if (name.startsWith(query)) {
                score += 80;
            } else if (name.includes(query)) {
                score += 60;
            }

            if (cat.includes(query) || (query.includes("ring") && cat.includes("ring")) ||
                (query.includes("neck") && cat.includes("neck")) ||
                (query.includes("ear") && cat.includes("ear")) ||
                (query.includes("brace") && cat.includes("brace")) ||
                (query.includes("cuff") && cat.includes("cuff")) ||
                (query.includes("brooch") && cat.includes("brooch")) ||
                (query.includes("pearl") && (cat.includes("pearl") || name.includes("pearl")))) {
                score += 50;
            }

            if (col.includes(query)) score += 30;
            if (sku.includes(query)) score += 25;
            if (mat.includes(query) || gem.includes(query)) score += 20;
            if (desc.includes(query)) score += 15;
            if (tags.includes(query)) score += 10;

            if (score > 0) {
                scoredMatches.push({ product: p, score });
            }
        }

        // Rank by score descending
        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches.length === 0) {
            resultsEl.innerHTML = `
                <div class="firqui-search-empty">
                    <i class="fa-regular fa-face-meh"></i>
                    <p>No products found for "<strong>${escapeHtml(rawQuery)}</strong>".</p>
                    <p style="font-size:12px;opacity:0.6;margin-top:4px;">Try searching for "ring", "pearl", "necklace", or "gold".</p>
                </div>
            `;
            return;
        }

        let html = '<div class="firqui-search-grid">';
        scoredMatches.forEach(({ product: p }) => {
            const pName = p.name || p.productName || "Product";
            const pCat = p.category || "Jewellery";
            const pPrice = formatPrice(p.price);
            const pCompare = p.comparePrice && p.comparePrice > (p.price || 0) ? formatPrice(p.comparePrice) : "";
            const pImg = getProductImage(p);
            const detailUrl = getProductDetailsUrl(p);

            const imgHtml = pImg
                ? `<img src="${pImg}" alt="${escapeHtml(pName)}" onerror="this.style.display='none';">`
                : `<i class="fa-regular fa-gem" style="color:rgba(232,165,152,0.4);font-size:22px;"></i>`;

            html += `
                <a href="${detailUrl}" class="firqui-search-item">
                    <div class="firqui-search-thumb">
                        ${imgHtml}
                    </div>
                    <div class="firqui-search-info">
                        <span class="firqui-search-info-cat">${escapeHtml(pCat)}</span>
                        <h4 class="firqui-search-info-title">${escapeHtml(pName)}</h4>
                        <div class="firqui-search-info-price">
                            <span>${pPrice}</span>
                            ${pCompare ? `<span class="firqui-search-info-compare">${pCompare}</span>` : ""}
                        </div>
                    </div>
                </a>
            `;
        });
        html += '</div>';

        resultsEl.innerHTML = html;
    }

    function openSearch() {
        createSearchModal();
        cachedProducts = null; // refresh catalogue on open to get latest admin additions
        loadAllProducts();

        overlayEl.classList.add("active");
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            if (inputEl) inputEl.focus();
        }, 150);
    }

    function closeSearch() {
        if (!overlayEl) return;
        overlayEl.classList.remove("active");
        document.body.style.overflow = "";
    }

    function attachSearchButtons() {
        createSearchModal();

        // Find all possible search trigger buttons in header
        const triggers = document.querySelectorAll(
            '#searchButton, [aria-label*="Search Collection"], [aria-label*="Search collection"], [aria-label="Search"], .header-icon-btn i.fa-magnifying-glass, .header-icon i.fa-magnifying-glass, .search-btn'
        );

        triggers.forEach(btn => {
            const clickable = btn.tagName.toLowerCase() === "button" || btn.tagName.toLowerCase() === "a" ? btn : btn.closest("button, a") || btn;
            if (clickable.dataset.firquiSearchAttached) return;
            clickable.dataset.firquiSearchAttached = "true";

            clickable.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSearch();
            }, true);
        });
    }

    // Expose globally
    window.FirquiSearch = {
        open: openSearch,
        close: closeSearch,
        refresh: () => { cachedProducts = null; loadAllProducts(); }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attachSearchButtons);
    } else {
        attachSearchButtons();
    }
})();
