/* =====================================================
   FIRQUI JEWELS
   PRODUCT DETAILS PAGE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";

    function getToken() {
        return localStorage.getItem("firqui_token");
    }

    function requireLogin() {
        alert("Please log in to manage your Cart and Wishlist.");
        window.location.href = "../authentication/login.html";
    }

    /* =====================================================
       PRODUCT DATA
    ===================================================== */

    function resolveImage(img) {
        if (!img) return "../assets/Logo Pink 1.png";
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
        if (clean.startsWith("../")) return clean;
        if (clean.startsWith("/")) return ".." + clean;
        return "../" + clean;
    }

    function detectMediaType(url) {
        if (!url) return "image";
        const clean = url.trim().toLowerCase();
        if (clean.includes(".mp4") || clean.includes(".webm") || clean.startsWith("data:video/") || clean.includes("video/mp4") || clean.includes("video/webm")) {
            return "video";
        }
        return "image";
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

    const products = {
        // Bracelets & Cuffs
        1: {
            name: "Golden Grace",
            category: "BRACELETS & CUFFS",
            price: "₹1,499",
            description: "Elegant gold bracelet designed to add sophistication and charm to every look.",
            images: ["../assets/Cuffs.png", "../assets/page_07_image_02.png"]
        },
        2: {
            name: "Pearl Charm",
            category: "BRACELETS & CUFFS",
            price: "₹1,799",
            description: "A timeless pearl bracelet combining classic elegance with a refined contemporary finish.",
            images: ["../assets/bracelets/bracelet2.jpg", "../assets/page_07_image_02.png"]
        },
        3: {
            name: "Rose Harmony",
            category: "BRACELETS & CUFFS",
            price: "₹1,299",
            description: "A beautiful designer bracelet created to bring a soft and sophisticated touch to your style.",
            images: ["../assets/bracelets/bracelet3.jpg", "../assets/page_07_image_02.png"]
        },
        4: {
            name: "Silver Edge",
            category: "BRACELETS & CUFFS",
            price: "₹999",
            description: "Minimal silver cuff with a clean modern design that works beautifully for everyday styling.",
            images: ["../assets/bracelets/bracelet4.jpg", "../assets/page_07_image_02.png"]
        },
        5: {
            name: "Floral Bloom",
            category: "BRACELETS & CUFFS",
            price: "₹1,599",
            description: "A floral-inspired bracelet designed with delicate details for an elegant feminine finish.",
            images: ["../assets/bracelets/bracelet5.jpg", "../assets/page_07_image_02.png"]
        },
        6: {
            name: "Luxury Cuff",
            category: "BRACELETS & CUFFS",
            price: "₹2,199",
            description: "Premium designer cuff featuring a luxurious finish and statement-making contemporary style.",
            images: ["../assets/bracelets/bracelet6.jpg", "../assets/page_07_image_02.png"]
        },
        // Rings
        "ring-1": {
            name: "Elegant Ring",
            category: "RINGS",
            price: "₹2,499",
            description: "Delicate design for everyday elegance.",
            images: ["../assets/rings/ring1.jpg", "../assets/Heart Pearl Ring.png"]
        },
        "ring-2": {
            name: "Classic Ring",
            category: "RINGS",
            price: "₹2,899",
            description: "A timeless piece with a refined finish.",
            images: ["../assets/rings/ring2.jpg", "../assets/Heart Pearl Ring.png"]
        },
        "ring-3": {
            name: "Statement Ring",
            category: "RINGS",
            price: "₹3,299",
            description: "Designed to add a sophisticated touch.",
            images: ["../assets/rings/ring3.jpg", "../assets/Heart Pearl Ring.png"]
        },
        "ring-4": {
            name: "Floral Ring",
            category: "RINGS",
            price: "₹2,699",
            description: "Inspired by delicate floral details.",
            images: ["../assets/rings/ring4.jpg", "../assets/Heart Pearl Ring.png"]
        },
        "ring-5": {
            name: "Minimal Ring",
            category: "RINGS",
            price: "₹2,199",
            description: "Simple, modern and effortlessly elegant.",
            images: ["../assets/rings/ring5.jpg", "../assets/Heart Pearl Ring.png"]
        },
        "ring-6": {
            name: "Signature Ring",
            category: "RINGS",
            price: "₹3,499",
            description: "A bold statement piece designed to stand out.",
            images: ["../assets/rings/ring6.jpg", "../assets/Heart Pearl Ring.png"]
        },
        // Brooches
        "brooch-1": {
            name: "Elegant Brooch",
            category: "BROOCHES",
            price: "₹1,899",
            description: "Delicate design for everyday elegance.",
            images: ["../assets/brooches/brooch1.jpg", "../assets/page_10_image_02.png"]
        },
        "brooch-2": {
            name: "Classic Brooch",
            category: "BROOCHES",
            price: "₹2,199",
            description: "A timeless piece with a refined finish.",
            images: ["../assets/brooches/brooch2.jpg", "../assets/page_10_image_02.png"]
        },
        "brooch-3": {
            name: "Statement Brooch",
            category: "BROOCHES",
            price: "₹2,599",
            description: "Designed to add a sophisticated touch.",
            images: ["../assets/brooches/brooch3.jpg", "../assets/page_10_image_02.png"]
        },
        "brooch-4": {
            name: "Floral Brooch",
            category: "BROOCHES",
            price: "₹1,999",
            description: "Inspired by delicate floral details.",
            images: ["../assets/brooches/brooch4.jpg", "../assets/page_10_image_02.png"]
        },
        "brooch-5": {
            name: "Minimal Brooch",
            category: "BROOCHES",
            price: "₹1,699",
            description: "Simple, modern and effortlessly elegant.",
            images: ["../assets/brooches/brooch5.jpg", "../assets/page_10_image_02.png"]
        },
        "brooch-6": {
            name: "Signature Brooch",
            category: "BROOCHES",
            price: "₹2,799",
            description: "A bold statement piece designed to stand out.",
            images: ["../assets/brooches/brooch6.jpg", "../assets/page_10_image_02.png"]
        },
        // Earrings
        "earring-1": {
            name: "Golden Elegance",
            category: "EARRINGS",
            price: "₹1,499",
            description: "Statement Earrings designed to impress.",
            images: ["../assets/earrings/earring1.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        "earring-2": {
            name: "Pearl Drop",
            category: "EARRINGS",
            price: "₹1,799",
            description: "Classic Pearl Earrings combining sophistication and style.",
            images: ["../assets/earrings/earring2.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        "earring-3": {
            name: "Rose Charm",
            category: "EARRINGS",
            price: "₹1,299",
            description: "Designer Earrings with an elegant rose finish.",
            images: ["../assets/earrings/earring3.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        "earring-4": {
            name: "Silver Grace",
            category: "EARRINGS",
            price: "₹999",
            description: "Minimal Earrings crafted for daily radiance.",
            images: ["../assets/earrings/earring4.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        "earring-5": {
            name: "Floral Bloom",
            category: "EARRINGS",
            price: "₹1,599",
            description: "Floral Earrings with delicate handcrafted touches.",
            images: ["../assets/earrings/earring5.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        "earring-6": {
            name: "Luxury Drop",
            category: "EARRINGS",
            price: "₹2,199",
            description: "Premium Earrings featuring exquisite details.",
            images: ["../assets/earrings/earring6.jpg", "../assets/FE1007 Ice Cream Earrings.png"]
        },
        // Necklaces
        "necklace-1": {
            name: "Golden Elegance",
            category: "NECKLACES",
            price: "₹1,499",
            description: "Statement Necklace bringing captivating glow.",
            images: ["../assets/necklaces/necklace1.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        "necklace-2": {
            name: "Pearl Grace",
            category: "NECKLACES",
            price: "₹1,799",
            description: "Classic Pearl Necklace for a majestic look.",
            images: ["../assets/necklaces/necklace2.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        "necklace-3": {
            name: "Rose Charm",
            category: "NECKLACES",
            price: "₹1,299",
            description: "Designer Necklace with subtle rose charm.",
            images: ["../assets/necklaces/necklace3.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        "necklace-4": {
            name: "Silver Grace",
            category: "NECKLACES",
            price: "₹999",
            description: "Minimal Necklace for sleek contemporary style.",
            images: ["../assets/necklaces/necklace4.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        "necklace-5": {
            name: "Floral Bloom",
            category: "NECKLACES",
            price: "₹1,599",
            description: "Floral Necklace inspired by gentle blooms.",
            images: ["../assets/necklaces/necklace5.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        "necklace-6": {
            name: "Luxury Drop",
            category: "NECKLACES",
            price: "₹2,199",
            description: "Premium Necklace for special celebrations.",
            images: ["../assets/necklaces/necklace6.jpg", "../assets/FN1003 Ice Cream Necklace.png"]
        },
        // Pearls Gone Rogue
        "pearl-1": {
            name: "Rogue Pearl",
            category: "PEARLS GONE ROGUE",
            price: "₹1,999",
            description: "Elegant Pearl Necklace that defies convention.",
            images: ["../assets/pearls/pearl1.jpg", "../assets/page_06_image_02.png"]
        },
        "pearl-2": {
            name: "Pearl Rebel",
            category: "PEARLS GONE ROGUE",
            price: "₹1,499",
            description: "Statement Pearl Earrings with rebel flair.",
            images: ["../assets/pearls/pearl2.jpg", "../assets/page_06_image_02.png"]
        },
        "pearl-3": {
            name: "Baroque Twist",
            category: "PEARLS GONE ROGUE",
            price: "₹2,299",
            description: "Designer Pearl Bracelet with organic shapes.",
            images: ["../assets/pearls/pearl3.jpg", "../assets/page_06_image_02.png"]
        },
        "pearl-4": {
            name: "Midnight Pearl",
            category: "PEARLS GONE ROGUE",
            price: "₹1,799",
            description: "Modern Pearl Ring featuring dark undertones.",
            images: ["../assets/pearls/pearl4.jpg", "../assets/page_06_image_02.png"]
        },
        "pearl-5": {
            name: "Ocean Whisper",
            category: "PEARLS GONE ROGUE",
            price: "₹2,499",
            description: "Layered Pearl Necklace inspired by the deep sea.",
            images: ["../assets/pearls/pearl5.jpg", "../assets/page_06_image_02.png"]
        },
        "pearl-6": {
            name: "Royal Cascade",
            category: "PEARLS GONE ROGUE",
            price: "₹2,999",
            description: "Luxury Pearl Set for regal elegance.",
            images: ["../assets/pearls/pearl6.jpg", "../assets/page_06_image_02.png"]
        }
    };


    /* =====================================================
       GET PRODUCT FROM QUERY OR ID
    ===================================================== */

    const params =
        new URLSearchParams(window.location.search);

    const paramId = params.get("id");
    const paramName = params.get("name");
    const paramPrice = params.get("price");
    const paramCategory = params.get("category");
    const paramImage = params.get("image") || params.get("img");
    const paramDesc = params.get("description") || params.get("desc");
    const paramGemstone = params.get("gemstone") || params.get("gem");
    const paramMaterial = params.get("material") || params.get("mat");
    const paramColor = params.get("color") || params.get("productColor");
    const paramMeasurement = params.get("measurement") || params.get("size") || params.get("measurements");

    let localProducts = [];
    try {
        localProducts =
            JSON.parse(
                localStorage.getItem("firquiProducts")
            ) || [];
    } catch (e) {
        localProducts = [];
    }

    let product = null;

    if (paramId) {
        product =
            localProducts.find(
                p => String(p.id) === String(paramId)
            );
    }

    if (!product && paramName) {
        product =
            localProducts.find(
                p => (p.name || p.productName || "")
                    .toLowerCase()
                    .trim() === paramName.toLowerCase().trim()
            );
    }

    if (!product && paramId && products[paramId]) {
        product = { ...products[paramId] };
    }

    if (!product && paramName) {
        for (const key in products) {
            if (
                products[key].name &&
                products[key].name.toLowerCase() === paramName.toLowerCase().trim()
            ) {
                product = { ...products[key] };
                break;
            }
        }
    }

    if (!product) {
        if (paramName) {
            product = {
                id: paramId || "1",
                name: paramName,
                productName: paramName,
                category: paramCategory || "FIRQUI JEWELS",
                price: paramPrice || "₹1,499",
                description: paramDesc || "Delicate piece designed to elevate your everyday and occasion styling.",
                images: paramImage ? [resolveImage(paramImage)] : ["../assets/Logo Pink 1.png"]
            };
        } else {
            product =
                products[paramId]
                    ? { ...products[paramId] }
                    : { ...products[1] };
        }
    } else {
        if (paramCategory) product.category = paramCategory;
        if (paramPrice) product.price = paramPrice;
        if (paramDesc) product.description = paramDesc;
        if (paramImage && (!product.images || product.images.length === 0)) {
            product.images = [resolveImage(paramImage)];
        }
    }

    // Apply URL parameters if provided
    if (paramGemstone) product.gemstone = paramGemstone;
    if (paramMaterial) product.material = paramMaterial;
    if (paramColor) product.color = paramColor;
    if (paramMeasurement) {
        product.measurement = paramMeasurement.split(",").map(s => s.trim()).filter(Boolean);
    }

    let productId =
        String(product.id || paramId || "1");

    /* Default product details if not already present */
    if (!product.productDetails) {
        product.productDetails = {
            description:
                "Carefully crafted with attention to detail, this piece is designed to complement both everyday and occasion styling.",
            highlights: [
                "Premium quality finish",
                "Comfortable for everyday wear",
                "Elegant contemporary design",
                "Suitable for gifting"
            ]
        };
    }

    /* Default measurement if not already present */
    if (!product.measurement) {
        product.measurement = [
            "16 inch",
            "18 inch",
            "20 inch"
        ];
    }

    /* Default gemstone if not already present */
    if (!product.gemstone) {
        product.gemstone = (product.category && product.category.toLowerCase().includes("pearl")) ? "Freshwater Pearl" : "Moissanite";
    }

    /* Default material if not already present */
    if (!product.material) {
        product.material = "18K Gold Plated";
    }

    /* Default color if not already present */
    if (!product.color && !product.productColor) {
        product.color = "Rose Gold";
    }

    /* Normalize price string */
    if (typeof product.price === "number") {
        product.price =
            "₹" + product.price.toLocaleString("en-IN");
    } else if (
        typeof product.price === "string" &&
        !product.price.startsWith("₹")
    ) {
        product.price =
            "₹" + product.price;
    }

    // Ensure image paths are resolved for current folder
    if (product.images) {
        product.images =
            product.images.map(resolveImage);
    }


    /* =====================================================
       DYNAMIC PRODUCT DETAILS & SPECIFICATIONS HELPERS
    ===================================================== */

    let selectedMeasurement = "";
    let selectedGemstone = "";
    let selectedMaterial = "";
    let selectedColor = "";

    function parseSpecValues(val) {
        if (!val) return [];
        if (Array.isArray(val)) {
            return val.map(s => String(s).trim()).filter(Boolean);
        }
        if (typeof val === "string") {
            return val.split(",").map(s => s.trim()).filter(Boolean);
        }
        return [String(val).trim()].filter(Boolean);
    }

    function renderAvailableSizes(prod) {
        const variantOptions =
            document.getElementById("variantOptions");
        const optionGroup =
            document.getElementById("productOptionSize");

        if (!variantOptions) return;

        let sizes = parseSpecValues(prod.measurement || prod.measurements);

        variantOptions.innerHTML = "";

        if (sizes.length === 0) {
            if (optionGroup) optionGroup.style.display = "none";
            selectedMeasurement = "";
            return;
        }

        if (optionGroup) optionGroup.style.display = "";

        sizes.forEach((size, idx) => {
            const btn =
                document.createElement("button");

            btn.type =
                "button";

            btn.className =
                "variant-btn" + (idx === 0 ? " active" : "");

            btn.textContent =
                size;

            btn.setAttribute(
                "aria-label",
                `Size ${size}`
            );

            btn.addEventListener("click", () => {
                variantOptions
                    .querySelectorAll(".variant-btn")
                    .forEach(b => b.classList.remove("active"));

                btn.classList.add("active");
                selectedMeasurement = size;
            });

            variantOptions.appendChild(btn);
        });

        selectedMeasurement = sizes[0] || "";
    }

    function renderGemstoneOptions(prod) {
        const container =
            document.getElementById("gemstoneOptions");
        const optionGroup =
            document.getElementById("productOptionGemstone");

        if (!container) return;

        let items = parseSpecValues(prod.gemstone);

        container.innerHTML = "";

        if (items.length === 0) {
            if (optionGroup) optionGroup.style.display = "none";
            selectedGemstone = "";
            return;
        }

        if (optionGroup) optionGroup.style.display = "";

        items.forEach((item, idx) => {
            const btn =
                document.createElement("button");

            btn.type =
                "button";

            btn.className =
                "variant-btn" + (idx === 0 ? " active" : "");

            btn.textContent =
                item;

            btn.setAttribute(
                "aria-label",
                `Gemstone ${item}`
            );

            btn.addEventListener("click", () => {
                container
                    .querySelectorAll(".variant-btn")
                    .forEach(b => b.classList.remove("active"));

                btn.classList.add("active");
                selectedGemstone = item;
            });

            container.appendChild(btn);
        });

        selectedGemstone = items[0] || "";
    }

    function renderMaterialOptions(prod) {
        const container =
            document.getElementById("materialOptions");
        const optionGroup =
            document.getElementById("productOptionMaterial");

        if (!container) return;

        let items = parseSpecValues(prod.material);

        container.innerHTML = "";

        if (items.length === 0) {
            if (optionGroup) optionGroup.style.display = "none";
            selectedMaterial = "";
            return;
        }

        if (optionGroup) optionGroup.style.display = "";

        items.forEach((item, idx) => {
            const btn =
                document.createElement("button");

            btn.type =
                "button";

            btn.className =
                "variant-btn" + (idx === 0 ? " active" : "");

            btn.textContent =
                item;

            btn.setAttribute(
                "aria-label",
                `Material ${item}`
            );

            btn.addEventListener("click", () => {
                container
                    .querySelectorAll(".variant-btn")
                    .forEach(b => b.classList.remove("active"));

                btn.classList.add("active");
                selectedMaterial = item;
            });

            container.appendChild(btn);
        });

        selectedMaterial = items[0] || "";
    }

    function renderColorOptions(prod) {
        const container =
            document.getElementById("colorOptions");
        const optionGroup =
            document.getElementById("productOptionColor");

        if (!container) return;

        let items = parseSpecValues(prod.color || prod.productColor);

        container.innerHTML = "";

        if (items.length === 0) {
            if (optionGroup) optionGroup.style.display = "none";
            selectedColor = "";
            return;
        }

        if (optionGroup) optionGroup.style.display = "";

        items.forEach((item, idx) => {
            const btn =
                document.createElement("button");

            btn.type =
                "button";

            btn.className =
                "variant-btn" + (idx === 0 ? " active" : "");

            btn.textContent =
                item;

            btn.setAttribute(
                "aria-label",
                `Color ${item}`
            );

            btn.addEventListener("click", () => {
                container
                    .querySelectorAll(".variant-btn")
                    .forEach(b => b.classList.remove("active"));

                btn.classList.add("active");
                selectedColor = item;
            });

            container.appendChild(btn);
        });

        selectedColor = items[0] || "";
    }

    function renderAllSpecifications(prod) {
        renderAvailableSizes(prod);
        renderGemstoneOptions(prod);
        renderMaterialOptions(prod);
        renderColorOptions(prod);
    }

    function renderProductDetailsAccordion(prod) {
        const detailsContent =
            document.getElementById("productDetailsContent") ||
            document.querySelector(".details-content");

        if (!detailsContent) return;

        const details =
            prod.productDetails || {};

        let descText = "";

        if (typeof details.description === "string") {
            descText =
                details.description.trim();
        } else if (typeof details === "string") {
            descText =
                details.trim();
        }

        let highlightsList = [];

        if (Array.isArray(details.highlights)) {
            highlightsList =
                details.highlights
                    .map(h => String(h || "").trim())
                    .filter(
                        h =>
                            h.length > 0 &&
                            h !== "undefined" &&
                            h !== "null"
                    );
        }

        let html = "";

        // If Product Details description is non-empty, display it
        if (
            descText &&
            descText !== "undefined" &&
            descText !== "null" &&
            descText !== "[object Object]"
        ) {
            html += `<p id="productDetailsDesc">${descText}</p>`;
        }

        // If highlights exist, display bullet list
        if (highlightsList.length > 0) {
            html += `<ul id="productDetailsHighlights">`;
            highlightsList.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul>`;
        }

        // Set accordion content (description and highlights only)
        detailsContent.innerHTML = html;
    }


    /* =====================================================
       PRODUCT ELEMENTS
    ===================================================== */

    const productName =
        document.getElementById("productName");

    const productCategory =
        document.getElementById("productCategory");

    const productPrice =
        document.getElementById("productPrice");

    const productDescription =
        document.getElementById("productDescription");

    const mainImage =
        document.getElementById("mainProductImage");

    const thumbnailContainer =
        document.getElementById("thumbnailContainer");


    /* =====================================================
       RENDER PRODUCT INFORMATION
    ===================================================== */

    if (productName) {
        productName.textContent =
            product.name;
    }

    if (productCategory) {
        productCategory.textContent =
            product.category;
    }

    if (productPrice) {
        productPrice.textContent =
            product.price;
    }

    if (productDescription) {
        productDescription.textContent =
            product.description;
    }

    /* Render Available Sizes, Gemstone, Material, Color & Details Accordion */
    renderAllSpecifications(product);
    renderProductDetailsAccordion(product);
    loadRelatedProducts();

    if (paramId || paramName) {
        const lookup = paramId || paramName;
        fetch(`${API_BASE}/api/products/${encodeURIComponent(lookup)}`)
            .then(res => res.ok ? res.json() : null)
            .then(apiData => {
                if (apiData) {
                    if (apiData.id) {
                        productId = String(apiData.id);
                        product.id = apiData.id;
                    }
                    if (apiData.name || apiData.productName) {
                        product.name = apiData.name || apiData.productName;
                        if (productName) productName.textContent = product.name;
                    }
                    if (apiData.category) {
                        product.category = apiData.category;
                        if (productCategory) productCategory.textContent = product.category;
                    }
                    if (apiData.price !== undefined && apiData.price !== null) {
                        const num = typeof apiData.price === "number" ? apiData.price : parseFloat(apiData.price);
                        product.price = !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : String(apiData.price);
                        if (productPrice) productPrice.textContent = product.price;
                    }
                    if (apiData.description) {
                        product.description = apiData.description;
                        if (productDescription) productDescription.textContent = product.description;
                    }
                    const dynamicImgs = [];
                    if (apiData.mainImage) dynamicImgs.push(resolveImage(apiData.mainImage));
                    ["referenceImage1", "referenceImage2", "referenceImage3", "referenceImage4"].forEach(key => {
                        if (apiData[key]) {
                            const resIm = resolveImage(apiData[key]);
                            if (!dynamicImgs.includes(resIm)) dynamicImgs.push(resIm);
                        }
                    });
                    if (Array.isArray(apiData.images)) {
                        apiData.images.forEach(im => {
                            const resIm = resolveImage(im);
                            if (!dynamicImgs.includes(resIm)) dynamicImgs.push(resIm);
                        });
                    }
                    if (dynamicImgs.length > 0) {
                        product.images = dynamicImgs;
                        createThumbnails();
                    }
                    if (apiData.gemstone) {
                        product.gemstone = apiData.gemstone;
                    }
                    if (apiData.material) {
                        product.material = apiData.material;
                    }
                    if (apiData.color || apiData.productColor) {
                        product.color = apiData.color || apiData.productColor;
                    }
                    if (apiData.measurement && apiData.measurement.length > 0) {
                        product.measurement = apiData.measurement;
                    } else if (apiData.measurements) {
                        product.measurement = Array.isArray(apiData.measurements) ? apiData.measurements : apiData.measurements.split(",").map(s => s.trim()).filter(Boolean);
                    }
                    if (apiData.productDetailsDescription || (apiData.productDetailsHighlights && apiData.productDetailsHighlights.length > 0)) {
                        product.productDetails = {
                            description: apiData.productDetailsDescription,
                            highlights: apiData.productDetailsHighlights
                        };
                    }
                    renderAllSpecifications(product);
                    renderProductDetailsAccordion(product);
                    syncProductWishlist();
                    loadRelatedProducts();
                }
            })
            .catch(() => {});
    }


    /* =====================================================
       PRODUCT IMAGE GALLERY
    ===================================================== */

    let currentImageIndex = 0;

    function showImage(index) {
        if (!product.images || product.images.length === 0) {
            return;
        }

        currentImageIndex = (index + product.images.length) % product.images.length;
        const currentSrc = product.images[currentImageIndex];
        const isVid = detectMediaType(currentSrc) === "video";

        const container = document.querySelector(".main-product-image");
        if (container) {
            const existingMedia = container.querySelector("#mainProductImage");
            if (isVid) {
                if (!existingMedia || existingMedia.tagName.toLowerCase() !== "video") {
                    const videoEl = document.createElement("video");
                    videoEl.id = "mainProductImage";
                    videoEl.src = currentSrc;
                    videoEl.controls = true;
                    videoEl.playsInline = true;
                    videoEl.preload = "metadata";
                    videoEl.style.width = "100%";
                    videoEl.style.height = "100%";
                    videoEl.style.objectFit = "cover";
                    if (existingMedia) {
                        container.replaceChild(videoEl, existingMedia);
                    } else {
                        container.prepend(videoEl);
                    }
                } else {
                    existingMedia.src = currentSrc;
                }
            } else {
                if (!existingMedia || existingMedia.tagName.toLowerCase() !== "img") {
                    const imgEl = document.createElement("img");
                    imgEl.id = "mainProductImage";
                    imgEl.src = currentSrc;
                    imgEl.alt = product.name;
                    imgEl.style.width = "100%";
                    imgEl.style.height = "100%";
                    imgEl.style.objectFit = "cover";
                    if (existingMedia) {
                        container.replaceChild(imgEl, existingMedia);
                    } else {
                        container.prepend(imgEl);
                    }
                } else {
                    existingMedia.src = currentSrc;
                    existingMedia.alt = product.name;
                }
            }
        }

        document.querySelectorAll(".thumbnail").forEach((thumbnail, i) => {
            thumbnail.classList.toggle("active", i === currentImageIndex);
        });
    }


    /* =====================================================
       CREATE THUMBNAILS
    ===================================================== */

    function createThumbnails() {
        if (!thumbnailContainer) {
            return;
        }

        thumbnailContainer.innerHTML = "";

        product.images.forEach((image, index) => {
            const thumbnail = document.createElement("button");
            thumbnail.className = "thumbnail";
            thumbnail.type = "button";

            const isVid = detectMediaType(image) === "video";
            if (isVid) {
                thumbnail.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000;">
                        <video src="${image}#t=0.1" preload="metadata" muted playsinline style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"></video>
                        <span style="position: absolute; bottom: 3px; right: 3px; background: rgba(0,0,0,0.7); color: #fff; font-size: 9px; border-radius: 3px; padding: 1px 4px; z-index: 2;"><i class="fa-solid fa-video"></i></span>
                    </div>
                `;
            } else {
                thumbnail.innerHTML = `
                    <img
                        src="${image}"
                        alt="${product.name} image ${index + 1}"
                    >
                `;
            }

            thumbnail.addEventListener("click", () => {
                showImage(index);
            });

            thumbnailContainer.appendChild(thumbnail);
        });

        showImage(0);
    }

    createThumbnails();


    /* =====================================================
       PREVIOUS / NEXT IMAGE
    ===================================================== */

    const previousButton =
        document.getElementById("prevImage");

    const nextButton =
        document.getElementById("nextImage");


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                showImage(
                    currentImageIndex - 1
                );

            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                showImage(
                    currentImageIndex + 1
                );

            }
        );

    }


    /* =====================================================
       WISHLIST BACKEND INTEGRATION
    ===================================================== */

    const wishlistButton =
        document.getElementById("wishlistButton");

    const wishlistAction =
        document.getElementById("wishlistAction");

    function setWishlistUI(active) {
        if (!wishlistButton || !wishlistAction) return;

        wishlistButton.classList.toggle("active", active);
        wishlistAction.classList.toggle("active", active);

        const imageIcon = wishlistButton.querySelector("i");
        const actionIcon = wishlistAction.querySelector("i");

        if (active) {
            if (imageIcon) {
                imageIcon.classList.remove("fa-regular");
                imageIcon.classList.add("fa-solid");
            }
            if (actionIcon) {
                actionIcon.classList.remove("fa-regular");
                actionIcon.classList.add("fa-solid");
            }
        } else {
            if (imageIcon) {
                imageIcon.classList.remove("fa-solid");
                imageIcon.classList.add("fa-regular");
            }
            if (actionIcon) {
                actionIcon.classList.remove("fa-solid");
                actionIcon.classList.add("fa-regular");
            }
        }
    }

    async function syncProductWishlist() {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/wishlist/check?name=${encodeURIComponent(product.name)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWishlistUI(!!data.inWishlist);
            }
        } catch (e) {
            console.error("Wishlist check error:", e);
        }
    }

    async function toggleWishlist() {
        if (!wishlistButton || !wishlistAction) return;

        const token = getToken();
        if (!token) {
            requireLogin();
            return;
        }

        const willBeActive = !wishlistButton.classList.contains("active");
        setWishlistUI(willBeActive);

        try {
            let localW = JSON.parse(localStorage.getItem("firquiWishlist") || "[]");
            if (willBeActive) {
                if (!localW.some(i => i.name === product.name)) {
                    localW.push({
                        id: String(productId),
                        name: product.name,
                        price: product.price,
                        description: product.description,
                        image: (product.images && product.images[0]) || ""
                    });
                }
            } else {
                localW = localW.filter(i => i.name !== product.name);
            }
            localStorage.setItem("firquiWishlist", JSON.stringify(localW));
        } catch (e) {
            console.error("Local wishlist cache error:", e);
        }

        if (token) {
            if (willBeActive) {
                try {
                    await fetch(`${API_BASE}/api/wishlist/items`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            productId: String(productId),
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            image: (product.images && product.images[0]) || ""
                        })
                    });
                } catch (e) {
                    console.error("Add wishlist error:", e);
                }
            } else {
                try {
                    await fetch(`${API_BASE}/api/wishlist/items/by-name?name=${encodeURIComponent(product.name)}`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                } catch (e) {
                    console.error("Remove wishlist error:", e);
                }
            }
        }
    }

    if (wishlistButton) {
        wishlistButton.addEventListener("click", toggleWishlist);
    }

    if (wishlistAction) {
        wishlistAction.addEventListener("click", toggleWishlist);
    }

    syncProductWishlist();


    /* Variant buttons are initialized dynamically in renderAvailableSizes */


    /* =====================================================
       QUANTITY
    ===================================================== */

    let quantity = 1;


    const quantityDisplay =
        document.getElementById(
            "quantity"
        );


    const decreaseButton =
        document.getElementById(
            "decreaseQuantity"
        );


    const increaseButton =
        document.getElementById(
            "increaseQuantity"
        );


    if (decreaseButton) {

        decreaseButton.addEventListener(
            "click",
            () => {

                if (quantity > 1) {

                    quantity--;

                    if (quantityDisplay) {

                        quantityDisplay.textContent =
                            quantity;

                    }

                }

            }
        );

    }


    if (increaseButton) {

        increaseButton.addEventListener(
            "click",
            () => {

                if (quantity < 10) {

                    quantity++;

                    if (quantityDisplay) {

                        quantityDisplay.textContent =
                            quantity;

                    }

                }

            }
        );

    }


    /* =====================================================
       CART BADGE COUNTER
    ===================================================== */

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

        let badge = cartLink.querySelector(".cart-count-badge") || document.getElementById("cartCountBadge");
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

    async function syncCartBadge() {
        updateCartBadge();

        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/cart`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data.items)) {
                    try {
                        localStorage.setItem("firquiCart", JSON.stringify(data.items));
                    } catch (err) {}
                    updateCartBadge();
                }
            }
        } catch (err) {
            // Keep local count on fetch error
        }
    }

    syncCartBadge();

    window.addEventListener("storage", (e) => {
        if (e.key === "firquiCart") {
            updateCartBadge();
        }
    });

    /* =====================================================
       ADD TO CART BACKEND INTEGRATION
    ===================================================== */

    const addCartButton =
        document.getElementById(
            "addCartButton"
        );


    if (addCartButton) {

        addCartButton.addEventListener(
            "click",
            async () => {

                // Save to local cart cache and update badge immediately
                try {
                    let localC = JSON.parse(localStorage.getItem("firquiCart") || "[]");
                    const existing = localC.find(i =>
                        i.name === product.name &&
                        (i.measurement || i.size || "") === (selectedMeasurement || "") &&
                        (i.gemstone || "") === (selectedGemstone || "") &&
                        (i.material || "") === (selectedMaterial || "") &&
                        (i.color || "") === (selectedColor || "")
                    );
                    if (existing) {
                        existing.quantity = (existing.quantity || 1) + quantity;
                    } else {
                        localC.push({
                            id: String(productId),
                            name: product.name,
                            price: product.price,
                            description: product.description,
                            measurement: selectedMeasurement || "",
                            size: selectedMeasurement || "",
                            gemstone: selectedGemstone || "",
                            material: selectedMaterial || "",
                            color: selectedColor || "",
                            image: (product.images && product.images[0]) || "",
                            quantity: quantity
                        });
                    }
                    localStorage.setItem("firquiCart", JSON.stringify(localC));
                    updateCartBadge();
                } catch (e) {
                    console.error("Local cart cache error:", e);
                }

                const token = getToken();
                if (token) {
                    try {
                        let descDetails = [];
                        if (selectedMeasurement) descDetails.push(`Size: ${selectedMeasurement}`);
                        if (selectedGemstone) descDetails.push(`Gemstone: ${selectedGemstone}`);
                        if (selectedMaterial) descDetails.push(`Material: ${selectedMaterial}`);
                        if (selectedColor) descDetails.push(`Color: ${selectedColor}`);
                        const fullDesc = product.description + (descDetails.length > 0 ? ` (${descDetails.join(", ")})` : "");

                        await fetch(`${API_BASE}/api/cart/items`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                productId: String(productId),
                                name: product.name,
                                description: fullDesc,
                                price: product.price,
                                image: (product.images && product.images[0]) || "",
                                quantity: quantity
                            })
                        });
                    } catch (e) {
                        console.error("Add to cart error:", e);
                    }
                }

                const originalHTML =
                    addCartButton.innerHTML;


                addCartButton.innerHTML =
                    '<i class="fa-solid fa-check"></i> Added to Cart';


                addCartButton.style.background =
                    "#FAF5EE";


                addCartButton.style.color =
                    "#0A373B";


                setTimeout(
                    () => {

                        addCartButton.innerHTML =
                            originalHTML;


                        addCartButton.style.background =
                            "";


                        addCartButton.style.color =
                            "";

                    },
                    1500
                );

            }
        );

    }


    /* =====================================================
       PRODUCT DETAILS ACCORDION
    ===================================================== */

    const detailsBox =
        document.querySelector(
            ".details-box"
        );


    const detailsTitle =
        document.querySelector(
            ".details-title"
        );


    if (detailsBox &&
        detailsTitle) {

        detailsTitle.addEventListener(
            "click",
            () => {

                detailsBox.classList.toggle(
                    "open"
                );

            }
        );

    }


    /* =====================================================
       NEWSLETTER
    ===================================================== */

    const newsletterForm =
        document.getElementById(
            "newsletterForm"
        );


    const newsletterMsg =
        document.getElementById(
            "newsletterMsg"
        );


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();


                const emailInput =
                    newsletterForm.querySelector(
                        ".newsletter-input"
                    );


                const email =
                    emailInput.value.trim();


                if (!email) {
                    return;
                }


                if (newsletterMsg) {

                    newsletterMsg.textContent =
                        `Thank you! You are now subscribed with ${email}.`;


                    newsletterMsg.style.display =
                        "block";

                }


                newsletterForm.reset();


                setTimeout(
                    () => {

                        if (newsletterMsg) {

                            newsletterMsg.style.display =
                                "none";

                        }

                    },
                    5000
                );

            }
        );

    }


    /* =====================================================
       DYNAMIC RELATED PRODUCTS
    ===================================================== */

    function normalizeCategory(cat) {
        if (!cat) return "";
        const clean = String(cat).trim().toLowerCase();
        if (clean.includes("earring")) return "EARRINGS";
        if (clean.includes("ring")) return "RINGS";
        if (clean.includes("necklace")) return "NECKLACES";
        if (clean.includes("bracelet") || clean.includes("cuff") || clean.includes("bangle")) return "BRACELETS & CUFFS";
        if (clean.includes("brooch")) return "BROOCHES";
        if (clean.includes("pearl")) return "PEARLS GONE ROGUE";
        return clean.toUpperCase();
    }

    function isSameCategory(cat1, cat2) {
        if (!cat1 || !cat2) return false;
        const norm1 = normalizeCategory(cat1);
        const norm2 = normalizeCategory(cat2);
        if (norm1 && norm2 && norm1 === norm2) return true;
        return String(cat1).trim().toLowerCase() === String(cat2).trim().toLowerCase();
    }

    function resolveRelatedImage(img) {
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
        if (clean.startsWith("../../assets/")) return clean.substring(3);
        if (clean.startsWith("../assets/")) return clean;
        if (clean.startsWith("assets/")) return "../" + clean;
        if (clean.startsWith("/assets/")) return ".." + clean;
        if (clean.startsWith("../")) return clean;
        if (clean.startsWith("/")) return ".." + clean;
        return "../" + clean;
    }

    function getProductImage(prod) {
        if (!prod) return "";
        if (prod.mainImage && typeof prod.mainImage === "string" && prod.mainImage.trim()) {
            return resolveRelatedImage(prod.mainImage);
        }
        if (Array.isArray(prod.images) && prod.images.length > 0) {
            for (const img of prod.images) {
                if (img && typeof img === "string" && img.trim()) {
                    return resolveRelatedImage(img);
                }
            }
        }
        if (prod.image && typeof prod.image === "string" && prod.image.trim()) {
            return resolveRelatedImage(prod.image);
        }
        if (prod.referenceImage1 && typeof prod.referenceImage1 === "string" && prod.referenceImage1.trim()) {
            return resolveRelatedImage(prod.referenceImage1);
        }
        return "";
    }

    function isCurrentlyOpenedProduct(p) {
        if (!p) return false;
        const curId = String(productId || product.id || paramId || "").trim();
        const curLegacyId = String(product.legacyId || "").trim();
        const curParamId = String(paramId || "").trim();
        const curName = String(product.name || paramName || "").trim().toLowerCase();

        const pId = String(p.id !== undefined && p.id !== null ? p.id : "").trim();
        const pLegacyId = String(p.legacyId !== undefined && p.legacyId !== null ? p.legacyId : "").trim();
        const pName = String(p.name || p.productName || "").trim().toLowerCase();

        if (curId) {
            if (pId && pId === curId) return true;
            if (pLegacyId && pLegacyId === curId) return true;
        }
        if (curLegacyId) {
            if (pId && pId === curLegacyId) return true;
            if (pLegacyId && pLegacyId === curLegacyId) return true;
        }
        if (curParamId) {
            if (pId && pId === curParamId) return true;
            if (pLegacyId && pLegacyId === curParamId) return true;
        }
        if (curName && pName && curName === pName) return true;

        return false;
    }

    function formatSellingPrice(priceVal) {
        if (priceVal === undefined || priceVal === null || priceVal === "") return "₹0";
        if (typeof priceVal === "number") {
            return `₹${priceVal.toLocaleString("en-IN")}`;
        }
        const str = String(priceVal).trim();
        if (str.startsWith("₹")) return str;
        const num = parseFloat(str.replace(/[^0-9.]/g, ""));
        return !isNaN(num) ? `₹${num.toLocaleString("en-IN")}` : `₹${str}`;
    }

    function formatComparePrice(compareVal) {
        if (compareVal === undefined || compareVal === null || compareVal === "") return null;
        const num = typeof compareVal === "number" ? compareVal : parseFloat(String(compareVal).replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) {
            return `₹${num.toLocaleString("en-IN")}`;
        }
        return null;
    }

    function buildProductDetailUrl(p) {
        const pId = p.id !== undefined && p.id !== null ? String(p.id) : (p.legacyId || "");
        const pName = p.name || p.productName || "";
        const pCategory = p.category || product.category || "";
        const pPrice = formatSellingPrice(p.price);
        const pImg = getProductImage(p);
        const pDesc = p.description || "";

        const query = new URLSearchParams();
        if (pId) query.set("id", pId);
        if (pName) query.set("name", pName);
        if (pCategory) query.set("category", pCategory);
        if (pPrice) query.set("price", pPrice);
        if (pImg) query.set("image", pImg);
        if (pDesc) query.set("description", pDesc);

        return `product-details.html?${query.toString()}`;
    }

    function isItemInWishlist(pName) {
        if (!pName) return false;
        try {
            const list = JSON.parse(localStorage.getItem("firquiWishlist") || "[]");
            return list.some(item => (item.name || "").trim().toLowerCase() === pName.trim().toLowerCase());
        } catch (_) {
            return false;
        }
    }

    async function handleRelatedWishlistClick(e, relProd) {
        e.preventDefault();
        e.stopPropagation();

        const token = getToken();
        if (!token) {
            requireLogin();
            return;
        }

        const btn = e.currentTarget;
        const icon = btn.querySelector("i");
        const relName = relProd.name || relProd.productName || "Product";
        const relId = String(relProd.id || relProd.legacyId || "");
        const relPrice = formatSellingPrice(relProd.price);
        const relDesc = relProd.description || "";
        const relImg = getProductImage(relProd);

        let localW = [];
        try {
            localW = JSON.parse(localStorage.getItem("firquiWishlist") || "[]");
        } catch (_) {
            localW = [];
        }

        const alreadyIn = localW.some(i => (i.name || "").trim().toLowerCase() === relName.trim().toLowerCase());

        if (alreadyIn) {
            localW = localW.filter(i => (i.name || "").trim().toLowerCase() !== relName.trim().toLowerCase());
            try {
                localStorage.setItem("firquiWishlist", JSON.stringify(localW));
            } catch (_) {}
            if (icon) {
                icon.classList.remove("fa-solid");
                icon.classList.add("fa-regular");
            }
            if (token) {
                try {
                    await fetch(`${API_BASE}/api/wishlist/items/by-name?name=${encodeURIComponent(relName)}`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                } catch (_) {}
            }
        } else {
            localW.push({
                id: relId,
                name: relName,
                price: relPrice,
                description: relDesc,
                image: relImg
            });
            try {
                localStorage.setItem("firquiWishlist", JSON.stringify(localW));
            } catch (_) {}
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
                            productId: relId,
                            name: relName,
                            description: relDesc,
                            price: relPrice,
                            image: relImg
                        })
                    });
                } catch (_) {}
            }
        }
    }

    function renderRelatedProducts(list) {
        const grid = document.getElementById("relatedProductsGrid") || document.querySelector(".related-grid");
        if (!grid) return;

        grid.innerHTML = "";

        if (!Array.isArray(list) || list.length === 0) {
            return;
        }

        list.forEach(relProd => {
            const relId = relProd.id !== undefined && relProd.id !== null ? String(relProd.id) : (relProd.legacyId || "");
            const relName = relProd.name || relProd.productName || "Product";
            const relDesc = relProd.description || relProd.category || "";
            const relPrice = formatSellingPrice(relProd.price);
            const relComparePrice = formatComparePrice(relProd.comparePrice);
            const imgSrc = getProductImage(relProd);
            const isVid = (relProd.mainMediaType === "video") || (detectMediaType(imgSrc) === "video");
            const inWishlist = isItemInWishlist(relName);

            let mediaHtml = "";
            if (imgSrc) {
                if (isVid) {
                    mediaHtml = `<video src="${imgSrc}" autoplay muted loop playsinline onerror="this.style.display='none';" style="width:100%;height:100%;object-fit:cover;"></video>`;
                } else {
                    mediaHtml = `<img src="${imgSrc}" alt="${escapeHtml(relName)}" onerror="this.style.display='none';">`;
                }
            }

            let compareHtml = "";
            const numericPrice = typeof relProd.price === "number" ? relProd.price : parseFloat(String(relProd.price).replace(/[^0-9.]/g, ""));
            const numericCompare = typeof relProd.comparePrice === "number" ? relProd.comparePrice : parseFloat(String(relProd.comparePrice || 0).replace(/[^0-9.]/g, ""));
            if (relComparePrice && !isNaN(numericPrice) && !isNaN(numericCompare) && numericCompare > numericPrice) {
                compareHtml = `<span style="font-size:12px;color:#888;text-decoration:line-through;margin-left:6px;font-weight:normal;">${relComparePrice}</span>`;
            }

            const card = document.createElement("article");
            card.className = "related-card";
            if (relId) card.dataset.id = relId;

            const detailLink = buildProductDetailUrl(relProd);

            card.innerHTML = `
                <a href="${detailLink}">
                    <div class="related-image">
                        ${mediaHtml}
                        <span class="related-wishlist" title="Wishlist">
                            <i class="${inWishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </span>
                    </div>
                    <div class="related-info">
                        <h3>${escapeHtml(relName)}</h3>
                        <p>${escapeHtml(relDesc)}</p>
                        <strong>${relPrice}${compareHtml}</strong>
                    </div>
                </a>
            `;

            const wishlistSpan = card.querySelector(".related-wishlist");
            if (wishlistSpan) {
                wishlistSpan.addEventListener("click", (e) => handleRelatedWishlistClick(e, relProd));
            }

            grid.appendChild(card);
        });
    }

    async function loadRelatedProducts() {
        const targetCategory = product.category || paramCategory || "";
        if (!targetCategory) return;

        let candidateList = [];

        // 1. Fetch from backend API
        try {
            const normCat = normalizeCategory(targetCategory);
            let res = await fetch(`${API_BASE}/api/products/category/${encodeURIComponent(normCat)}`);
            if (res.ok) {
                const apiData = await res.json();
                if (Array.isArray(apiData) && apiData.length > 0) {
                    candidateList = apiData;
                }
            }

            if (candidateList.length === 0) {
                let allRes = await fetch(`${API_BASE}/api/products`);
                if (allRes.ok) {
                    const allData = await allRes.json();
                    if (Array.isArray(allData)) {
                        candidateList = allData.filter(p => isSameCategory(p.category, targetCategory));
                    }
                }
            }
        } catch (apiErr) {
            console.warn("Backend API for related products offline, using local cache:", apiErr);
        }

        // 2. Merge with localStorage firquiProducts (for newly added admin products or offline)
        try {
            const localStored = JSON.parse(localStorage.getItem("firquiProducts") || "[]");
            if (Array.isArray(localStored)) {
                localStored.forEach(lp => {
                    if (isSameCategory(lp.category, targetCategory)) {
                        candidateList.push(lp);
                    }
                });
            }
        } catch (_) {}

        // 3. Fallback to existing products dictionary if candidates are empty
        if (candidateList.length === 0 && typeof products === "object") {
            Object.keys(products).forEach(key => {
                const sp = products[key];
                if (sp && isSameCategory(sp.category, targetCategory)) {
                    candidateList.push({
                        id: key,
                        legacyId: key,
                        name: sp.name,
                        category: sp.category,
                        price: sp.price,
                        description: sp.description,
                        images: sp.images || []
                    });
                }
            });
        }

        // 4. Filter: Must be active, matching category, exclude current opened product, and de-duplicate
        const seen = new Set();
        const matchingRelated = [];

        for (const item of candidateList) {
            if (!item) continue;
            if (item.active === false || item.availability === "Out of Stock") continue;
            if (!isSameCategory(item.category, targetCategory)) continue;
            if (isCurrentlyOpenedProduct(item)) continue;

            const idKey = String(item.id !== undefined && item.id !== null ? item.id : (item.legacyId || "")).trim();
            const nameKey = String(item.name || item.productName || "").trim().toLowerCase();
            const uniqueKey = idKey ? `id:${idKey}` : `name:${nameKey}`;

            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);

            matchingRelated.push(item);
        }

        renderRelatedProducts(matchingRelated);
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    const searchButton =
        document.querySelector(
            '[aria-label="Search Collection"]'
        );


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (window.FirquiSearch) {
                    window.FirquiSearch.open();
                }
            }
        );

    }

});