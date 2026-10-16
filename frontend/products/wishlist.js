document.addEventListener("DOMContentLoaded", function () {

    const wishlistContainer = document.getElementById("wishlist-items");
    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

    function getToken() {
        return localStorage.getItem("firqui_token");
    }

    // Badge rendering lives in js/site-nav.js
    function updateCartBadge() {
        if (window.FirquiCartBadge) window.FirquiCartBadge.update();
    }

    async function syncCartBadge() {
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

    function getPrice(priceText) {
        if (typeof priceText === "number") return priceText;
        return Number(
            String(priceText || "")
                .replace(/[^0-9.]/g, "")
                .trim()
        ) || 0;
    }

    function formatPrice(amount) {
        return "₹" + Math.round(Number(amount) || 0).toLocaleString("en-IN");
    }

    function resolveImage(img) {
        return resolveProductImage(img);
    }

    const CATALOG_PRODUCTS = {
        // Bracelets & Cuffs
        "1": { id: "1", name: "Golden Grace", category: "BRACELETS & CUFFS", price: "₹1,499", description: "Elegant gold bracelet designed to add sophistication and charm to every look.", image: "../assets/Cuffs.png" },
        "2": { id: "2", name: "Pearl Charm", category: "BRACELETS & CUFFS", price: "₹1,799", description: "A timeless pearl bracelet combining classic elegance with a refined contemporary finish.", image: "../assets/page_07_image_02.png" },
        "3": { id: "3", name: "Rose Harmony", category: "BRACELETS & CUFFS", price: "₹1,299", description: "A beautiful designer bracelet created to bring a soft and sophisticated touch to your style.", image: "../assets/page_07_image_02.png" },
        "4": { id: "4", name: "Silver Edge", category: "BRACELETS & CUFFS", price: "₹999", description: "Minimal silver cuff with a clean modern design that works beautifully for everyday styling.", image: "../assets/Cuffs.png" },
        "5": { id: "5", name: "Floral Bloom", category: "BRACELETS & CUFFS", price: "₹1,599", description: "A floral-inspired bracelet designed with delicate details for an elegant feminine finish.", image: "../assets/page_07_image_02.png" },
        "6": { id: "6", name: "Luxury Cuff", category: "BRACELETS & CUFFS", price: "₹2,199", description: "Premium designer cuff featuring a luxurious finish and statement-making contemporary style.", image: "../assets/Cuffs.png" },

        // Rings
        "ring-1": { id: "ring-1", name: "Elegant Ring", category: "RINGS", price: "₹2,499", description: "Delicate design for everyday elegance.", image: "../assets/Heart Pearl Ring.png" },
        "ring-2": { id: "ring-2", name: "Classic Ring", category: "RINGS", price: "₹2,899", description: "A timeless piece with a refined finish.", image: "../assets/Heart Pearl Ring.png" },
        "ring-3": { id: "ring-3", name: "Statement Ring", category: "RINGS", price: "₹3,299", description: "Designed to add a sophisticated touch.", image: "../assets/Heart Pearl Ring.png" },
        "ring-4": { id: "ring-4", name: "Floral Ring", category: "RINGS", price: "₹2,699", description: "Inspired by delicate floral details.", image: "../assets/Heart Pearl Ring.png" },
        "ring-5": { id: "ring-5", name: "Minimal Ring", category: "RINGS", price: "₹2,199", description: "Simple, modern and effortlessly elegant.", image: "../assets/Heart Pearl Ring.png" },
        "ring-6": { id: "ring-6", name: "Signature Ring", category: "RINGS", price: "₹3,499", description: "A bold statement piece designed to stand out.", image: "../assets/Heart Pearl Ring.png" },

        // Brooches
        "brooch-1": { id: "brooch-1", name: "Elegant Brooch", category: "BROOCHES", price: "₹1,899", description: "Delicate design for everyday elegance.", image: "../assets/page_10_image_02.png" },
        "brooch-2": { id: "brooch-2", name: "Classic Brooch", category: "BROOCHES", price: "₹2,199", description: "A timeless piece with a refined finish.", image: "../assets/page_10_image_02.png" },
        "brooch-3": { id: "brooch-3", name: "Statement Brooch", category: "BROOCHES", price: "₹2,599", description: "Designed to add a sophisticated touch.", image: "../assets/page_10_image_02.png" },
        "brooch-4": { id: "brooch-4", name: "Floral Brooch", category: "BROOCHES", price: "₹1,999", description: "Inspired by delicate floral details.", image: "../assets/page_10_image_02.png" },
        "brooch-5": { id: "brooch-5", name: "Minimal Brooch", category: "BROOCHES", price: "₹1,699", description: "Simple, modern and effortlessly elegant.", image: "../assets/page_10_image_02.png" },
        "brooch-6": { id: "brooch-6", name: "Signature Brooch", category: "BROOCHES", price: "₹2,799", description: "A bold statement piece designed to stand out.", image: "../assets/page_10_image_02.png" },

        // Earrings
        "earring-1": { id: "earring-1", name: "Golden Elegance", category: "EARRINGS", price: "₹1,499", description: "Statement Earrings designed to impress.", image: "../assets/FE1007 Ice Cream Earrings.png" },
        "earring-2": { id: "earring-2", name: "Pearl Drop", category: "EARRINGS", price: "₹1,799", description: "Classic Pearl Earrings combining sophistication and style.", image: "../assets/FE1007 Ice Cream Earrings.png" },
        "earring-3": { id: "earring-3", name: "Rose Charm", category: "EARRINGS", price: "₹1,299", description: "Designer Earrings with an elegant rose finish.", image: "../assets/FE1007 Ice Cream Earrings.png" },
        "earring-4": { id: "earring-4", name: "Silver Grace", category: "EARRINGS", price: "₹999", description: "Minimal Earrings crafted for daily radiance.", image: "../assets/FE1007 Ice Cream Earrings.png" },
        "earring-5": { id: "earring-5", name: "Floral Bloom", category: "EARRINGS", price: "₹1,599", description: "Floral Earrings with delicate handcrafted touches.", image: "../assets/FE1007 Ice Cream Earrings.png" },
        "earring-6": { id: "earring-6", name: "Luxury Drop", category: "EARRINGS", price: "₹2,199", description: "Premium Earrings featuring exquisite details.", image: "../assets/FE1007 Ice Cream Earrings.png" },

        // Necklaces
        "necklace-1": { id: "necklace-1", name: "Golden Elegance", category: "NECKLACES", price: "₹1,499", description: "Statement Necklace bringing captivating glow.", image: "../assets/FN1003 Ice Cream Necklace.png" },
        "necklace-2": { id: "necklace-2", name: "Pearl Grace", category: "NECKLACES", price: "₹1,799", description: "Classic Pearl Necklace for a majestic look.", image: "../assets/FN1003 Ice Cream Necklace.png" },
        "necklace-3": { id: "necklace-3", name: "Rose Charm", category: "NECKLACES", price: "₹1,299", description: "Designer Necklace with subtle rose charm.", image: "../assets/FN1003 Ice Cream Necklace.png" },
        "necklace-4": { id: "necklace-4", name: "Silver Grace", category: "NECKLACES", price: "₹999", description: "Minimal Necklace for sleek contemporary style.", image: "../assets/FN1003 Ice Cream Necklace.png" },
        "necklace-5": { id: "necklace-5", name: "Floral Bloom", category: "NECKLACES", price: "₹1,599", description: "Floral Necklace inspired by gentle blooms.", image: "../assets/FN1003 Ice Cream Necklace.png" },
        "necklace-6": { id: "necklace-6", name: "Luxury Drop", category: "NECKLACES", price: "₹2,199", description: "Premium Necklace for special celebrations.", image: "../assets/FN1003 Ice Cream Necklace.png" },

        // Pearls Gone Rogue
        "pearl-1": { id: "pearl-1", name: "Rogue Pearl", category: "PEARLS GONE ROGUE", price: "₹1,999", description: "Elegant Pearl Necklace that defies convention.", image: "../assets/page_06_image_02.png" },
        "pearl-2": { id: "pearl-2", name: "Pearl Rebel", category: "PEARLS GONE ROGUE", price: "₹1,499", description: "Statement Pearl Earrings with rebel flair.", image: "../assets/page_06_image_02.png" },
        "pearl-3": { id: "pearl-3", name: "Baroque Twist", category: "PEARLS GONE ROGUE", price: "₹2,299", description: "Designer Pearl Bracelet with organic shapes.", image: "../assets/page_06_image_02.png" },
        "pearl-4": { id: "pearl-4", name: "Midnight Pearl", category: "PEARLS GONE ROGUE", price: "₹1,799", description: "Modern Pearl Ring featuring dark undertones.", image: "../assets/page_06_image_02.png" },
        "pearl-5": { id: "pearl-5", name: "Ocean Whisper", category: "PEARLS GONE ROGUE", price: "₹2,499", description: "Layered Pearl Necklace inspired by the deep sea.", image: "../assets/page_06_image_02.png" },
        "pearl-6": { id: "pearl-6", name: "Royal Cascade", category: "PEARLS GONE ROGUE", price: "₹2,999", description: "Luxury Pearl Set for regal elegance.", image: "../assets/page_06_image_02.png" }
    };

    function getCategoryFallback(categoryOrName) {
        const text = String(categoryOrName || "").toLowerCase();
        if (text.includes("ring")) return "../assets/Heart Pearl Ring.png";
        if (text.includes("pearl") || text.includes("rogue")) return "../assets/page_06_image_02.png";
        if (text.includes("cuff") || text.includes("bracelet")) return "../assets/Cuffs.png";
        if (text.includes("earring")) return "../assets/FE1007 Ice Cream Earrings.png";
        if (text.includes("necklace")) return "../assets/FN1003 Ice Cream Necklace.png";
        if (text.includes("brooch")) return "../assets/page_10_image_02.png";
        return "../assets/Heart Pearl Ring.png";
    }

    function isDummyOrBrokenPath(img) {
        if (!img || typeof img !== "string") return true;
        const lower = img.trim().toLowerCase();
        if (!lower) return true;
        if (lower.includes("/rings/") ||
            lower.includes("/pearls/") ||
            lower.includes("/brooches/") ||
            lower.includes("/earrings/") ||
            lower.includes("/necklaces/") ||
            lower.includes("/bracelets/")) {
            return true;
        }
        if (lower.includes("logo pink 1.png")) {
            return true;
        }
        return false;
    }

    function normalizePath(img) {
        if (!img || typeof img !== "string") return "";
        img = img.trim();
        if (img.startsWith("data:") || img.startsWith("http://") || img.startsWith("https://")) return img;

        if (img.startsWith("/uploads/") || img.startsWith("uploads/")) {
            const clean = img.startsWith("/") ? img.substring(1) : img;
            if (window.location.protocol === "file:") {
                return "../../" + clean;
            }
            return API_BASE ? (API_BASE + "/" + clean) : ("../../" + clean);
        }
        if (img.startsWith("../../uploads/")) return img;
        if (img.startsWith("../uploads/")) return "../" + img;

        if (img.startsWith("../assets/")) return img;
        if (img.startsWith("../../assets/")) return img.substring(3);
        if (img.startsWith("assets/")) return "../" + img;
        if (img.startsWith("/assets/")) return ".." + img;

        if (!img.includes("/")) return "../assets/" + img;
        return img;
    }

    function findProductInfo(product) {
        if (!product) return null;
        const pId = String(product.productId || product.id || "").trim();
        const pName = String(product.name || "").trim().toLowerCase();

        try {
            const raw = JSON.parse(localStorage.getItem("firquiProducts"));
            const list = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : []);
            if (pId) {
                const found = list.find(p => String(p.id) === pId || String(p.legacyId) === pId);
                if (found) return found;
            }
            if (pName) {
                const found = list.find(p => (p.name || p.productName || "").trim().toLowerCase() === pName);
                if (found) return found;
            }
        } catch (e) {}

        if (pId && CATALOG_PRODUCTS[pId]) {
            return CATALOG_PRODUCTS[pId];
        }
        if (pName) {
            for (const key in CATALOG_PRODUCTS) {
                if (CATALOG_PRODUCTS[key].name.toLowerCase() === pName) {
                    return CATALOG_PRODUCTS[key];
                }
            }
        }

        return null;
    }

    function inferCategory(product) {
        const text = ((product?.category || "") + " " + (product?.name || "")).toLowerCase();
        if (text.includes("ring")) return "RINGS";
        if (text.includes("pearl") || text.includes("rogue")) return "PEARLS GONE ROGUE";
        if (text.includes("cuff") || text.includes("bracelet")) return "BRACELETS & CUFFS";
        if (text.includes("earring")) return "EARRINGS";
        if (text.includes("necklace")) return "NECKLACES";
        if (text.includes("brooch")) return "BROOCHES";
        return "FIRQUI JEWELS";
    }

    function resolveProductImage(product) {
        if (!product) return "../assets/Heart Pearl Ring.png";

        if (typeof product === "string") {
            if (!isDummyOrBrokenPath(product)) return normalizePath(product);
            return getCategoryFallback(product);
        }

        const rawImg = product.image || product.mainImage || (product.images && product.images[0]);
        if (rawImg && !isDummyOrBrokenPath(rawImg)) {
            return normalizePath(rawImg);
        }

        const info = findProductInfo(product);
        if (info) {
            const candidate = info.mainImage || (info.images && info.images.find(im => !isDummyOrBrokenPath(im))) || info.image;
            if (candidate && !isDummyOrBrokenPath(candidate)) {
                return normalizePath(candidate);
            }
            if (info.category || info.name) {
                return getCategoryFallback(info.category || info.name);
            }
        }

        return getCategoryFallback((product.category || "") + " " + (product.name || ""));
    }

    function openProductDetails(product) {
        if (!product) return;
        const info = findProductInfo(product);
        const pId = String((info && (info.id || info.legacyId)) || product.productId || product.id || "").trim();
        const pName = (info && (info.name || info.productName)) || product.name || "FIRQUI JEWELS";
        const pPrice = product.formattedPrice || (info && (info.price ? (typeof info.price === "number" ? "₹" + info.price.toLocaleString("en-IN") : String(info.price)) : "")) || formatPrice(getPrice(product.price));
        const pCategory = (info && info.category) || product.category || inferCategory(product) || "FIRQUI JEWELS";
        const pDesc = (info && info.description) || product.description || "";
        const pImg = resolveProductImage(product);

        const query = new URLSearchParams();
        if (pId) query.set("id", pId);
        if (pName) query.set("name", pName);
        if (pPrice) query.set("price", pPrice);
        if (pCategory) query.set("category", pCategory);
        if (pImg) query.set("image", pImg);
        if (pDesc) query.set("description", pDesc);

        window.location.href = `product-details.html?${query.toString()}`;
    }

    /* =========================================
       FETCH WISHLIST FROM BACKEND
    ========================================= */

    async function fetchWishlist() {
        const token = getToken();

        if (!token) {
            const localWishlist = JSON.parse(localStorage.getItem("firquiWishlist")) || [];
            if (localWishlist.length > 0) {
                renderWishlist(localWishlist);
            } else {
                renderWishlist([]);
            }
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/wishlist`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                const localWishlist = JSON.parse(localStorage.getItem("firquiWishlist")) || [];
                if (localWishlist.length > 0) {
                    renderWishlist(localWishlist);
                } else {
                    renderWishlist([]);
                }
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load wishlist");
            }

            const data = await response.json();
            renderWishlist(data.items || []);

            try {
                localStorage.setItem("firquiWishlist", JSON.stringify(data.items || []));
            } catch (e) {}

        } catch (err) {
            console.error("Wishlist fetch error:", err);
            const localWishlist = JSON.parse(localStorage.getItem("firquiWishlist")) || [];
            renderWishlist(localWishlist);
        }
    }

    function renderLoginRequired() {
        if (!wishlistContainer) return;

        wishlistContainer.innerHTML = `
            <div class="empty-wishlist">
                <div class="empty-heart">♡</div>
                <h2>Please Log In</h2>
                <p>Log in to view your favourite FIRQUI JEWELS saved for later.</p>

                <a href="../authentication/login.html"
                   class="continue-shopping">
                    Log In
                </a>
            </div>
        `;
    }

    /* =========================================
       DISPLAY WISHLIST
    ========================================= */

    function renderWishlist(wishlistItems) {
        if (!wishlistContainer) return;
        wishlistContainer.innerHTML = "";

        if (!wishlistItems || wishlistItems.length === 0) {
            wishlistContainer.innerHTML = `
                <div class="empty-wishlist">
                    <div class="empty-heart">♡</div>
                    <h2>Your Wishlist is Empty</h2>
                    <p>Save your favourite FIRQUI JEWELS and find them here.</p>

                    <a href="rings.html"
                       class="continue-shopping">
                        Explore Jewellery
                    </a>
                </div>
            `;
            return;
        }

        wishlistItems.forEach(function (product, index) {
            const wishlistCard = document.createElement("article");
            wishlistCard.className = "wishlist-card";

            const displayPrice = product.formattedPrice || formatPrice(getPrice(product.price));
            const resolvedImg = resolveProductImage(product);
            const fallbackImg = getCategoryFallback((product.category || "") + " " + (product.name || ""));

            wishlistCard.innerHTML = `
                <div class="wishlist-image">
                    <img loading="lazy" decoding="async" src="${resolvedImg}"
                         alt="${product.name || 'Product'}"
                         style="cursor: pointer;"
                         title="View product details"
                         onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${fallbackImg}';}else{this.src='../assets/Logo Pink 1.png';}">

                    <button
                        class="wishlist-remove"
                        data-id="${product.id || ''}"
                        data-index="${index}"
                        aria-label="Remove from wishlist">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>

                <div class="wishlist-details">
                    <h3 style="cursor: pointer;" title="View product details">${product.name || ''}</h3>

                    <p class="wishlist-description">
                        ${product.description || ""}
                    </p>

                    <div class="wishlist-bottom">
                        <span class="wishlist-price">
                            ${displayPrice}
                        </span>

                        <button
                            class="wishlist-add-cart"
                            data-id="${product.id || ''}"
                            data-index="${index}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;

            wishlistContainer.appendChild(wishlistCard);
        });

        attachWishlistEvents(wishlistItems);
    }

    /* =========================================
       WISHLIST BUTTON EVENTS
    ========================================= */

    function attachWishlistEvents(wishlistItems) {
        const token = getToken();

        const removeButtons = document.querySelectorAll(".wishlist-remove");
        const addCartButtons = document.querySelectorAll(".wishlist-add-cart");

        removeButtons.forEach(function (button) {
            button.addEventListener("click", async function (e) {
                e.stopPropagation();
                const index = Number(button.dataset.index);
                const itemId = button.dataset.id;

                if (token && itemId) {
                    try {
                        const response = await fetch(`${API_BASE}/api/wishlist/items/${itemId}`, {
                            method: "DELETE",
                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        });
                        if (response.ok) {
                            fetchWishlist();
                            return;
                        }
                    } catch (e) {
                        console.error("Remove from wishlist error:", e);
                    }
                }

                // Fallback
                wishlistItems.splice(index, 1);
                try {
                    localStorage.setItem("firquiWishlist", JSON.stringify(wishlistItems));
                } catch (e) {}
                renderWishlist(wishlistItems);
            });
        });

        addCartButtons.forEach(function (button) {
            button.addEventListener("click", async function (e) {
                e.stopPropagation();
                const index = Number(button.dataset.index);
                const product = wishlistItems[index];
                if (!product) return;

                const resolvedImg = resolveProductImage(product);

                if (token) {
                    try {
                        const response = await fetch(`${API_BASE}/api/cart/items`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                productId: product.productId || String(product.id || ""),
                                name: product.name,
                                description: product.description || "",
                                price: product.price,
                                image: resolvedImg,
                                quantity: 1
                            })
                        });

                        if (response.ok) {
                            try {
                                let cart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                                const existingProduct = cart.find(item => item.name === product.name);
                                if (existingProduct) {
                                    existingProduct.quantity = (existingProduct.quantity || 1) + 1;
                                } else {
                                    cart.push({
                                        id: product.productId || String(product.id || ""),
                                        name: product.name,
                                        price: product.price,
                                        description: product.description || "",
                                        image: resolvedImg,
                                        quantity: 1
                                    });
                                }
                                localStorage.setItem("firquiCart", JSON.stringify(cart));
                                updateCartBadge();
                            } catch (e) {}

                            button.textContent = "Added ✓";
                            setTimeout(function () {
                                button.textContent = "Add to Cart";
                            }, 1000);
                            return;
                        }
                    } catch (e) {
                        console.error("Add to cart from wishlist error:", e);
                    }
                }

                // Fallback for non-logged in or offline
                let cart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                const existingProduct = cart.find(function (item) {
                    return item.name === product.name;
                });

                if (existingProduct) {
                    existingProduct.quantity += 1;
                } else {
                    cart.push({
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        image: resolvedImg,
                        quantity: 1
                    });
                }

                localStorage.setItem("firquiCart", JSON.stringify(cart));
                updateCartBadge();

                button.textContent = "Added ✓";
                setTimeout(function () {
                    button.textContent = "Add to Cart";
                }, 1000);
            });
        });

        // Product details navigation: clicking product image or title
        const wishlistCardElements = wishlistContainer ? wishlistContainer.querySelectorAll(".wishlist-card") : [];
        wishlistCardElements.forEach(function (card, index) {
            const product = wishlistItems[index];
            if (!product) return;

            const imgEl = card.querySelector(".wishlist-image img");
            if (imgEl) {
                imgEl.addEventListener("click", function () {
                    openProductDetails(product);
                });
            }

            const titleEl = card.querySelector(".wishlist-details h3");
            if (titleEl) {
                titleEl.addEventListener("click", function () {
                    openProductDetails(product);
                });
            }
        });
    }

    /* =========================================
       START
    ========================================= */

    fetchWishlist();
    syncCartBadge();

    window.addEventListener("storage", function (e) {
        if (e.key === "firquiCart") {
            updateCartBadge();
        }
    });

});