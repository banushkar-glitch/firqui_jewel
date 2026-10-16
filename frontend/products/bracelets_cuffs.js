/* =====================================================
   FIRQUI JEWELS - BRACELETS & CUFFS PAGE
   DYNAMIC POSTGRESQL PRODUCT INTEGRATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";
    const CATEGORY = "BRACELETS & CUFFS";

    function getToken() {
        return localStorage.getItem("firqui_token");
    }

    function requireLogin() {
        alert("Please log in to manage your Cart and Wishlist.");
        window.location.href = "../authentication/login.html";
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Strip HTML tags and decode HTML entities so only pure admin text is shown
    function cleanProductDescription(description) {
        if (!description) return "";
        let text = String(description);

        // 1. Decode HTML entities (handles &lt;p data-pm-slice="1 1 []"&gt;)
        const temp = document.createElement("div");
        temp.innerHTML = text;
        text = temp.textContent || temp.innerText || text;

        // 2. Decode again if double-encoded
        if (text.includes("&lt;") || text.includes("&gt;")) {
            temp.innerHTML = text;
            text = temp.textContent || temp.innerText || text;
        }

        // 3. Strip any remaining HTML tags (<p ...>, </p>, <br>, <div>, etc.)
        text = text.replace(/<[^>]*>/g, " ");

        // 4. Decode any remaining HTML entities
        temp.innerHTML = text;
        text = temp.textContent || temp.innerText || text;

        // 5. Clean up redundant whitespace
        return text.replace(/\s+/g, " ").trim();
    }

    function resolveImage(img) {
        if (!img) return "../assets/Cuffs.png";
        if (img.startsWith("data:") || img.startsWith("http://") || img.startsWith("https://")) return img;
        if (img.startsWith("/uploads/")) return API_BASE ? (API_BASE + img) : img;
        if (img.startsWith("uploads/")) return API_BASE ? (API_BASE + "/" + img) : ("/" + img);
        if (img.startsWith("../assets/")) return img;
        if (img.startsWith("../../assets/")) return img.substring(3);
        if (img.startsWith("assets/")) return "../" + img;
        if (img.startsWith("/assets/")) return ".." + img;
        return img;
    }

    function detectMediaType(url) {
        if (!url) return "image";
        const clean = url.trim().toLowerCase();
        if (clean.includes(".mp4") || clean.includes(".webm") || clean.startsWith("data:video/") || clean.includes("video/mp4") || clean.includes("video/webm")) {
            return "video";
        }
        return "image";
    }

    const grid = document.querySelector(".products-grid");

    /* =====================================================
       RENDER DYNAMIC PRODUCT CARDS
    ===================================================== */

    function renderProducts(productList) {
        if (!grid || !Array.isArray(productList) || productList.length === 0) return;

        grid.innerHTML = "";

        productList.forEach((product, index) => {
            const card = document.createElement("article");
            card.className = "product-card";
            card.dataset.id = product.id || product.legacyId || String(index + 1);
            card.style.cursor = "pointer";

            const imgSrc = resolveImage(product.mainImage || (product.images && product.images[0]));
            const priceFormatted = Number(product.price || 0).toLocaleString("en-IN");
            const isVid = (product.mainMediaType === "video") || (detectMediaType(imgSrc) === "video");
            const description = cleanProductDescription(product.description);

            const mediaHtml = isVid
                ? `<video src="${imgSrc}" autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>`
                : `<img src="${imgSrc}" alt="${escapeHtml(product.name)}" onerror="this.src='../assets/Cuffs.png'">`;

            card.innerHTML = `
                <div class="product-image">
                    ${mediaHtml}
                    ${isVid ? '<span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;z-index:2;"><i class="fa-solid fa-video"></i></span>' : ''}
                    <button class="wishlist-btn" aria-label="Add ${escapeHtml(product.name)} to wishlist">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(description)}</p>
                    ${description ? `<a href="#" class="read-more-link">Read more</a>` : ""}
                    <div class="product-bottom">
                        <span class="price">₹${priceFormatted}</span>
                        <button class="add-cart">Add to Cart</button>
                    </div>
                </div>
            `;

            attachCardListeners(card, {
                ...product,
                mainImage: imgSrc,
                description: description
            });
            grid.appendChild(card);
        });

        syncWishlist();
        syncCart();
    }

    /* =====================================================
       CARD EVENT LISTENERS
    ===================================================== */

    function attachCardListeners(card, product) {
        const pId = String(product.id || product.legacyId || "");
        const pName = product.name || "Product";
        const pPrice = product.price !== undefined ? `₹${Number(product.price).toLocaleString("en-IN")}` : "₹0";
        const pDesc = cleanProductDescription(product.description);
        const pImg = resolveImage(product.mainImage || (product.images && product.images[0]));

        // Open the existing product details page
        function openProductDetails() {
            const query = new URLSearchParams({
                id: pId,
                name: pName,
                price: pPrice,
                category: CATEGORY,
                image: pImg,
                description: pDesc
            });

            window.location.href = `product-details.html?${query.toString()}`;
        }

        // Card navigation to details
        card.addEventListener("click", (e) => {
            if (
                e.target.closest(".wishlist-btn") ||
                e.target.closest(".add-cart") ||
                e.target.closest(".read-more-link") ||
                e.target.closest("button")
            ) {
                return;
            }

            openProductDetails();
        });

        // Read more opens product details with the full description
        const readMoreLink = card.querySelector(".read-more-link");
        if (readMoreLink) {
            readMoreLink.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openProductDetails();
            });
        }

        // Wishlist button
        const wishlistBtn = card.querySelector(".wishlist-btn");
        if (wishlistBtn) {
            wishlistBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const token = getToken();
                const willBeActive = !wishlistBtn.classList.contains("active");
                const icon = wishlistBtn.querySelector("i");

                if (willBeActive) {
                    wishlistBtn.classList.add("active");
                    if (icon) {
                        icon.classList.remove("fa-regular");
                        icon.classList.add("fa-solid");
                    }

                    if (token) {
                        try {
                            await fetch(`${API_BASE}/api/wishlist/items`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    productId: pId,
                                    name: pName,
                                    description: pDesc,
                                    price: pPrice,
                                    image: pImg
                                })
                            });
                        } catch (err) {
                            console.error("Add wishlist error:", err);
                        }
                    }

                    let wishlist = JSON.parse(localStorage.getItem("firquiWishlist")) || [];
                    if (!wishlist.some(item => item.name === pName)) {
                        wishlist.push({ productId: pId, name: pName, description: pDesc, price: pPrice, image: pImg });
                        try { localStorage.setItem("firquiWishlist", JSON.stringify(wishlist)); } catch (e) {}
                    }
                } else {
                    wishlistBtn.classList.remove("active");
                    if (icon) {
                        icon.classList.remove("fa-solid");
                        icon.classList.add("fa-regular");
                    }

                    if (token) {
                        try {
                            await fetch(`${API_BASE}/api/wishlist/items/by-name?name=${encodeURIComponent(pName)}`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${token}` }
                            });
                        } catch (err) {
                            console.error("Remove wishlist error:", err);
                        }
                    }

                    let wishlist = JSON.parse(localStorage.getItem("firquiWishlist")) || [];
                    wishlist = wishlist.filter(item => item.name !== pName);
                    try { localStorage.setItem("firquiWishlist", JSON.stringify(wishlist)); } catch (e) {}
                }
            });
        }

        // Add to Cart button
        const cartBtn = card.querySelector(".add-cart");
        if (cartBtn) {
            cartBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const token = getToken();

                if (token) {
                    try {
                        await fetch(`${API_BASE}/api/cart/items`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                productId: pId,
                                name: pName,
                                description: pDesc,
                                price: pPrice,
                                image: pImg,
                                quantity: 1
                            })
                        });
                    } catch (err) {
                        console.error("Add cart error:", err);
                    }
                }

                let localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                const existing = localCart.find(i => (pId && String(i.productId) === pId) || i.name === pName);
                if (existing) {
                    existing.quantity = (existing.quantity || 1) + 1;
                } else {
                    localCart.push({
                        productId: pId,
                        name: pName,
                        description: pDesc,
                        price: pPrice,
                        image: pImg,
                        quantity: 1
                    });
                }
                try { localStorage.setItem("firquiCart", JSON.stringify(localCart)); } catch (e) {}
                updateCartBadge();

                cartBtn.textContent = "Added ✓";
                setTimeout(() => {
                    cartBtn.textContent = "Add to Cart";
                }, 1500);
            });
        }
    }

    /* =====================================================
       SYNC WISHLIST AND CART STATE
    ===================================================== */

    async function syncWishlist() {
        const token = getToken();
        let items = JSON.parse(localStorage.getItem("firquiWishlist")) || [];

        if (token) {
            try {
                const res = await fetch(`${API_BASE}/api/wishlist`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.items)) {
                        items = data.items;
                        try { localStorage.setItem("firquiWishlist", JSON.stringify(items)); } catch (e) {}
                    }
                }
            } catch (e) {
                console.error("Wishlist sync error:", e);
            }
        }

        document.querySelectorAll(".wishlist-btn").forEach((button) => {
            const card = button.closest(".product-card");
            const name = card?.querySelector("h3")?.textContent.trim();
            const icon = button.querySelector("i");
            const isIn = items.some(item => item.name === name);

            if (isIn) {
                button.classList.add("active");
                if (icon) {
                    icon.classList.remove("fa-regular");
                    icon.classList.add("fa-solid");
                }
            } else {
                button.classList.remove("active");
                if (icon) {
                    icon.classList.remove("fa-solid");
                    icon.classList.add("fa-regular");
                }
            }
        });
    }

    function updateCartBadge() {
        let count = 0;
        try {
            const localC = JSON.parse(localStorage.getItem("firquiCart") || "[]");
            if (Array.isArray(localC)) {
                count = localC.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
            }
        } catch (e) {
            count = 0;
        }

        const cartLink =
            document.getElementById("cartHeaderButton") ||
            document.querySelector('.header-icon-btn[aria-label="Shopping Cart"]') ||
            document.querySelector('.header-icon-btn[href*="cart.html"]');

        if (!cartLink) return;

        let badge = cartLink.querySelector(".cart-count-badge");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "cart-count-badge";
            badge.id = "cartCountBadge";
            cartLink.appendChild(badge);
        }

        if (count > 0) {
            badge.textContent = count > 99 ? "99+" : String(count);
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }

    async function syncCart() {
        updateCartBadge();
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/cart`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    try {
                        localStorage.setItem("firquiCart", JSON.stringify(data.items));
                    } catch (e) {}
                    updateCartBadge();
                }
            }
        } catch (e) {
            console.error("Cart sync error:", e);
        }
    }

    /* =====================================================
       FETCH DYNAMIC PRODUCTS FROM SPRING BOOT POSTGRESQL
    ===================================================== */

    async function loadProducts() {
        try {
            let res = await fetch(`${API_BASE}/api/products/category/${encodeURIComponent(CATEGORY)}`);
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    renderProducts(list);
                    syncWishlist();
                    syncCart();
                    updateCartBadge();
                    return;
                }
            }

            // Fallback: fetch all and filter
            let allRes = await fetch(`${API_BASE}/api/products`);
            if (allRes.ok) {
                const allList = await allRes.json();
                if (Array.isArray(allList) && allList.length > 0) {
                    const filtered = allList.filter(p => {
                        const cat = (p.category || "").toUpperCase();
                        return cat.includes("BRACELET") || cat.includes("CUFF") || cat.includes("BANGLE");
                    });
                    if (filtered.length > 0) {
                        renderProducts(filtered);
                        syncWishlist();
                        syncCart();
                        updateCartBadge();
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Backend products fetch offline, falling back to existing cards:", e);
        }

        // Fallback: wire existing static cards if API is unavailable
        document.querySelectorAll(".product-card").forEach((card, index) => {
            const name = card.querySelector("h3")?.textContent.trim() || "Golden Grace";
            const price = card.querySelector(".price")?.textContent.trim() || "₹1,499";
            const descEl = card.querySelector(".product-description, .description, p");
            const desc = cleanProductDescription(descEl?.textContent || "");

            if (descEl) {
                descEl.className = "product-description";
                descEl.textContent = desc;

                if (desc && !card.querySelector(".read-more-link")) {
                    const readMore = document.createElement("a");
                    readMore.href = "#";
                    readMore.className = "read-more-link";
                    readMore.textContent = "Read more";
                    descEl.after(readMore);
                }
            }

            const img = card.querySelector("img")?.getAttribute("src") || "";

            if (card.dataset.listenersAttached === "true") return;
            card.dataset.listenersAttached = "true";

            attachCardListeners(card, {
                id: String(index + 1),
                name: name,
                price: parseFloat(price.replace(/[^0-9.]/g, "")) || 1499,
                description: desc,
                mainImage: img
            });
        });

        syncWishlist();
        syncCart();
        updateCartBadge();
    }

    window.addEventListener("storage", (e) => {
        if (e.key === "firquiCart") {
            updateCartBadge();
        }
    });

    loadProducts();

    /* =====================================================
       HEADER / NAV INTERACTIONS
    ===================================================== */

    const wishlistHeaderButton = document.getElementById("wishlistHeaderButton");
    if (wishlistHeaderButton) {
        wishlistHeaderButton.addEventListener("click", () => {
            window.location.href = "wishlist.html";
        });
    }

    const cartHeaderButton = document.getElementById("cartHeaderButton");
    if (cartHeaderButton) {
        cartHeaderButton.addEventListener("click", () => {
            window.location.href = "cart.html";
        });
    }

    const searchButton = document.getElementById("searchButton");
    if (searchButton) {
        searchButton.addEventListener("click", (e) => {
            e.preventDefault();
            if (window.FirquiSearch) {
                window.FirquiSearch.open();
            }
        });
    }

    const newsletterForm = document.getElementById("newsletterForm");
    const newsletterEmail = document.getElementById("newsletterEmail");
    const newsletterMsg = document.getElementById("newsletterMsg");
    if (newsletterForm) {
        newsletterForm.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!newsletterEmail.value.trim()) return;
            newsletterMsg.textContent = "Thank you for subscribing!";
            newsletterEmail.value = "";
            setTimeout(() => {
                newsletterMsg.textContent = "";
            }, 3000);
        });
    }
});