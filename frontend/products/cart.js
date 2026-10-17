document.addEventListener("DOMContentLoaded", function () {

    const cartItemsContainer = document.getElementById("cart-items");
    const subtotalElement = document.getElementById("cart-subtotal");
    const totalElement = document.getElementById("cart-total");

    const API_BASE = window.FIRQUI_API_BASE;

    function getToken() {
        return window.FirquiAuth.token();
    }

    // Badge rendering lives in js/site-nav.js
    function updateCartBadge() {
        if (window.FirquiCartBadge) window.FirquiCartBadge.update();
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

    async function fetchCart() {
        const token = getToken();

        if (!token) {
            const localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
            if (localCart.length > 0) {
                renderLocalCart(localCart);
            } else {
                renderCart([]);
            }
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/cart`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                const localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
                if (localCart.length > 0) {
                    renderLocalCart(localCart);
                } else {
                    renderCart([]);
                }
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load cart");
            }

            const data = await response.json();
            renderCart(data.items || [], data.formattedSubtotal, data.formattedTotal);

            // Also keep localStorage in sync for consistency
            try {
                localStorage.setItem("firquiCart", JSON.stringify(data.items || []));
            } catch (e) {}

        } catch (err) {
            console.error("Cart fetch error:", err);
            // Fallback to offline localStorage if backend temporarily unavailable
            const localCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
            renderLocalCart(localCart);
        }
    }

    function renderLoginRequired() {
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <h2>Please Log In</h2>
                <p>Log in to view and manage your FIRQUI JEWELS cart.</p>

                <a href="../authentication/login.html"
                   class="continue-shopping">
                    Log In
                </a>
            </div>
        `;

        if (subtotalElement) subtotalElement.textContent = "₹0";
        if (totalElement) totalElement.textContent = "₹0";
    }

    function renderCart(cartItems, subtotalStr, totalStr) {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = "";

        if (!cartItems || cartItems.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <h2>Your Cart is Empty</h2>
                    <p>Add some beautiful FIRQUI JEWELS to your cart.</p>

                    <a href="rings.html"
                       class="continue-shopping">
                        Continue Shopping
                    </a>
                </div>
            `;

            if (subtotalElement) subtotalElement.textContent = "₹0";
            if (totalElement) totalElement.textContent = "₹0";
            return;
        }

        let calculatedSubtotal = 0;

        cartItems.forEach(function (product, index) {
            const price = getPrice(product.price);
            const qty = Number(product.quantity) || 1;
            const itemTotal = price * qty;
            calculatedSubtotal += itemTotal;

            const resolvedImg = resolveProductImage(product);
            const fallbackImg = getCategoryFallback((product.category || "") + " " + (product.name || ""));

            const cartItem = document.createElement("div");
            cartItem.className = "cart-item";

            cartItem.innerHTML = `
                <div class="cart-product-image" style="cursor: pointer;" title="View product details">
                    <img loading="lazy" decoding="async" src="${window.FirquiHtml.escape(resolvedImg)}"
                         alt="${window.FirquiHtml.escape(product.name || 'Product')}"
                         onerror="if(!this.dataset.triedFallback){this.dataset.triedFallback='1';this.src='${fallbackImg}';}else{this.src='../assets/Logo Pink 1.png';}">
                </div>

                <div class="cart-item-details">
                    <h3 style="cursor: pointer;" title="View product details">${window.FirquiHtml.escape(product.name || '')}</h3>

                    <p>${window.FirquiHtml.escape(window.FirquiHtml.text(product.description || ""))}${(product.selectedSize || product.measurement || product.size) ? ` • Size: ${window.FirquiHtml.escape(product.selectedSize || product.measurement || product.size)}` : ""}</p>

                    <div class="cart-item-price">
                        ${product.formattedPrice || formatPrice(price)}
                    </div>

                    <div class="quantity-section">
                        <button class="quantity-btn minus-btn"
                                data-id="${product.id || ''}"
                                data-index="${index}">
                            −
                        </button>

                        <span class="quantity">
                            ${qty}
                        </span>

                        <button class="quantity-btn plus-btn"
                                data-id="${product.id || ''}"
                                data-index="${index}">
                            +
                        </button>
                    </div>

                    <div class="item-total">
                        Item Total:
                        <strong>
                            ${product.formattedItemTotal || formatPrice(itemTotal)}
                        </strong>
                    </div>

                    <button class="remove-btn"
                            data-id="${product.id || ''}"
                            data-index="${index}">
                        Remove
                    </button>
                </div>
            `;

            cartItemsContainer.appendChild(cartItem);
        });

        if (subtotalElement) {
            subtotalElement.textContent = subtotalStr || formatPrice(calculatedSubtotal);
        }
        if (totalElement) {
            totalElement.textContent = totalStr || formatPrice(calculatedSubtotal);
        }

        updateCartBadge();
        attachCartEvents(cartItems);
    }

    function renderLocalCart(localCart) {
        renderCart(localCart);
    }

    function attachCartEvents(cartItems) {
        const token = getToken();

        const plusButtons = document.querySelectorAll(".plus-btn");
        const minusButtons = document.querySelectorAll(".minus-btn");
        const removeButtons = document.querySelectorAll(".remove-btn");

        plusButtons.forEach(function (button) {
            button.addEventListener("click", async function () {
                const index = Number(button.dataset.index);
                const itemId = button.dataset.id;
                const product = cartItems[index];
                if (!product) return;

                const newQty = (Number(product.quantity) || 1) + 1;

                if (token && itemId) {
                    try {
                        const response = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ quantity: newQty })
                        });
                        if (response.ok) {
                            fetchCart();
                            return;
                        }
                    } catch (e) {
                        console.error("Update quantity error:", e);
                    }
                }

                // Fallback
                product.quantity = newQty;
                saveLocalCart(cartItems);
            });
        });

        minusButtons.forEach(function (button) {
            button.addEventListener("click", async function () {
                const index = Number(button.dataset.index);
                const itemId = button.dataset.id;
                const product = cartItems[index];
                if (!product) return;

                const currentQty = Number(product.quantity) || 1;

                if (token && itemId) {
                    try {
                        if (currentQty > 1) {
                            const response = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({ quantity: currentQty - 1 })
                            });
                            if (response.ok) {
                                fetchCart();
                                return;
                            }
                        } else {
                            const response = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
                                method: "DELETE",
                                headers: {
                                    "Authorization": `Bearer ${token}`
                                }
                            });
                            if (response.ok) {
                                fetchCart();
                                return;
                            }
                        }
                    } catch (e) {
                        console.error("Minus quantity error:", e);
                    }
                }

                // Fallback
                if (currentQty > 1) {
                    product.quantity = currentQty - 1;
                } else {
                    cartItems.splice(index, 1);
                }
                saveLocalCart(cartItems);
            });
        });

        removeButtons.forEach(function (button) {
            button.addEventListener("click", async function () {
                const index = Number(button.dataset.index);
                const itemId = button.dataset.id;

                if (token && itemId) {
                    try {
                        const response = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
                            method: "DELETE",
                            headers: {
                                "Authorization": `Bearer ${token}`
                            }
                        });
                        if (response.ok) {
                            fetchCart();
                            return;
                        }
                    } catch (e) {
                        console.error("Remove item error:", e);
                    }
                }

                // Fallback
                cartItems.splice(index, 1);
                saveLocalCart(cartItems);
            });
        });

        // Product details navigation: clicking product image or title
        const cartItemElements = cartItemsContainer ? cartItemsContainer.querySelectorAll(".cart-item") : [];
        cartItemElements.forEach(function (cartItem, index) {
            const product = cartItems[index];
            if (!product) return;

            const imageContainer = cartItem.querySelector(".cart-product-image");
            if (imageContainer) {
                imageContainer.addEventListener("click", function () {
                    openProductDetails(product);
                });
            }

            const titleElement = cartItem.querySelector(".cart-item-details h3");
            if (titleElement) {
                titleElement.addEventListener("click", function () {
                    openProductDetails(product);
                });
            }
        });
    }

    function saveLocalCart(items) {
        try {
            localStorage.setItem("firquiCart", JSON.stringify(items));
        } catch (e) {}
        renderCart(items);
        updateCartBadge();
    }

    /* =====================================================
       PROCEED TO CHECKOUT BUTTON INTEGRATION
    ====================================================== */
    const checkoutButton = document.querySelector(".checkout-button");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", function () {
            // Check if cart has items
            const token = getToken();
            let currentCart = [];
            try {
                currentCart = JSON.parse(localStorage.getItem("firquiCart")) || [];
            } catch (e) {}

            const domItems = cartItemsContainer ? cartItemsContainer.querySelectorAll(".cart-item") : [];
            if (domItems.length === 0 && currentCart.length === 0) {
                alert("Your cart is empty. Please add items to your cart before proceeding to checkout.");
                return;
            }

            // Placing an order needs an account; the cart is kept and the
            // customer comes straight back to checkout after logging in
            if (!window.FirquiAuth.isSignedIn()) {
                window.FirquiAuth.goToLogin(window.location.pathname.replace(/cart\.html$/, "checkout.html"));
                return;
            }
            window.location.href = "checkout.html";
        });
    }

    // Initial Load
    updateCartBadge();
    fetchCart();

    window.addEventListener("storage", function (e) {
        if (e.key === "firquiCart") {
            updateCartBadge();
        }
    });

});