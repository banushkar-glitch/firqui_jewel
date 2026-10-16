/* =========================================================
   FIRQUI JEWELS
   EDIT PRODUCT PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       PRODUCT DATA
       TEMPORARY FRONTEND DATA
    ====================================================== */

    const products = {

        1: {
            name: "Golden Grace",

            description:
                "A beautifully crafted bracelet designed to add elegance and sophistication to every occasion.",

            measurement: "18 cm",

            gemstone: "None",

            material: "18K Gold",

            color: "Golden",

            availability: "In Stock",

            restockDate: "",

            stockQuantity: 12,

            price: 1499,

            comparePrice: 1899,

            category: "Bracelets & Cuffs",

            collection: "Signature",

            sku: "FJ-BRC-001",

            tags: "gold, bracelet, premium",

            mainImage:
                "../../assets/products/golden-grace.jpg",

            referenceImage1:
                "../../assets/products/golden-grace-1.jpg",

            referenceImage2:
                "../../assets/products/golden-grace-2.jpg",

            referenceImage3:
                "../../assets/products/golden-grace-3.jpg",

            referenceImage4:
                "../../assets/products/golden-grace-4.jpg"
        },


        2: {

            name: "Pearl Drop",

            description:
                "Elegant pearl jewellery created for a timeless and sophisticated look.",

            measurement: "16 cm",

            gemstone: "Pearl",

            material: "Sterling Silver",

            color: "White",

            availability: "In Stock",

            restockDate: "",

            stockQuantity: 8,

            price: 1899,

            comparePrice: 2299,

            category: "Earrings",

            collection: "Pearl Collection",

            sku: "FJ-EAR-002",

            tags: "pearl, earrings, elegant",

            mainImage:
                "../../assets/products/pearl-drop.jpg",

            referenceImage1:
                "../../assets/products/pearl-drop-1.jpg",

            referenceImage2:
                "../../assets/products/pearl-drop-2.jpg",

            referenceImage3:
                "../../assets/products/pearl-drop-3.jpg",

            referenceImage4:
                "../../assets/products/pearl-drop-4.jpg"
        }

    };


    /* =====================================================
       GET PRODUCT ID
    ====================================================== */

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    const productId =
        urlParams.get("id") || "1";

    let localProducts = [];
    try {
        localProducts =
            JSON.parse(
                localStorage.getItem("firquiProducts")
            ) || [];
    } catch (e) {
        localProducts = [];
    }

    let product =
        localProducts.find(p => String(p.id) === String(productId) || String(p.legacyId) === String(productId));

    if (!product) {
        product = products[productId];
    }

    /* Provide default details if loading legacy or default product */
    if (product && !product.productDetails) {
        product.productDetails = {
            description: product.description || "Carefully crafted with attention to detail, this piece is designed to complement both everyday and occasion styling.",
            highlights: [
                "Premium quality finish",
                "Comfortable for everyday wear",
                "Elegant contemporary design",
                "Suitable for gifting"
            ]
        };
    }


    /* =====================================================
       FORM ELEMENTS
    ====================================================== */

    const form =
        document.getElementById(
            "editProductForm"
        );


    const productName =
        document.getElementById(
            "productName"
        );

    const productDetailsDescription =
        document.getElementById(
            "productDetailsDescription"
        );

    const highlightsList =
        document.getElementById(
            "highlightsList"
        );

    const addHighlightBtn =
        document.getElementById(
            "addHighlightBtn"
        );

    function createHighlightRow(text = "") {
        const row =
            document.createElement("div");

        row.className =
            "highlight-row";

        const bullet =
            document.createElement("span");

        bullet.className =
            "highlight-bullet";

        bullet.textContent =
            "•";

        const input =
            document.createElement("input");

        input.type =
            "text";

        input.className =
            "highlight-input";

        input.placeholder =
            "Enter product highlight...";

        input.value =
            text;

        const removeBtn =
            document.createElement("button");

        removeBtn.type =
            "button";

        removeBtn.className =
            "remove-highlight-btn";

        removeBtn.title =
            "Remove highlight";

        removeBtn.setAttribute(
            "aria-label",
            "Remove highlight"
        );

        removeBtn.innerHTML =
            '<i class="fa-solid fa-xmark"></i> <span>Remove</span>';

        removeBtn.addEventListener(
            "click",
            () => {
                row.remove();
            }
        );

        row.appendChild(bullet);
        row.appendChild(input);
        row.appendChild(removeBtn);

        return row;
    }

    function addHighlight(text = "", shouldFocus = false) {
        if (!highlightsList) return;
        const row =
            createHighlightRow(text);
        highlightsList.appendChild(row);
        if (shouldFocus) {
            const input =
                row.querySelector(".highlight-input");
            if (input) input.focus();
        }
    }

    if (addHighlightBtn) {
        addHighlightBtn.addEventListener(
            "click",
            () => {
                addHighlight("", true);
            }
        );
    }


    const descriptionEditor =
        document.getElementById(
            "descriptionEditor"
        );


    const description =
        document.getElementById(
            "description"
        );


    const measurement =
        document.getElementById(
            "measurement"
        );


    const gemstone =
        document.getElementById(
            "gemstone"
        );


    const material =
        document.getElementById(
            "material"
        );


    const productColor =
        document.getElementById(
            "productColor"
        );


    const restockDate =
        document.getElementById(
            "restockDate"
        );


    const stockQuantity =
        document.getElementById(
            "stockQuantity"
        );


    const price =
        document.getElementById(
            "price"
        );


    const comparePrice =
        document.getElementById(
            "comparePrice"
        );


    const category =
        document.getElementById(
            "category"
        );


    const collection =
        document.getElementById(
            "collection"
        );


    const sku =
        document.getElementById(
            "sku"
        );


    const tags =
        document.getElementById(
            "tags"
        );


    /* =====================================================    /* =====================================================
       MEDIA SLOTS MANAGEMENT (IMAGES & VIDEOS)
    ====================================================== */

    const mediaSlots = {
        main: {
            input: document.getElementById("mainImage"),
            box: document.getElementById("mainUploadBox"),
            preview: document.getElementById("mainImagePreview"),
            height: "280px",
            label: "Main Product Media",
            file: null,
            url: null,
            mediaType: null,
            isRemoved: false
        },
        ref1: {
            input: document.getElementById("referenceImage1"),
            box: document.getElementById("referenceBox1"),
            preview: document.getElementById("referencePreview1"),
            height: "180px",
            label: "Reference Media 1",
            file: null,
            url: null,
            mediaType: null,
            isRemoved: false
        },
        ref2: {
            input: document.getElementById("referenceImage2"),
            box: document.getElementById("referenceBox2"),
            preview: document.getElementById("referencePreview2"),
            height: "180px",
            label: "Reference Media 2",
            file: null,
            url: null,
            mediaType: null,
            isRemoved: false
        },
        ref3: {
            input: document.getElementById("referenceImage3"),
            box: document.getElementById("referenceBox3"),
            preview: document.getElementById("referencePreview3"),
            height: "180px",
            label: "Reference Media 3",
            file: null,
            url: null,
            mediaType: null,
            isRemoved: false
        },
        ref4: {
            input: document.getElementById("referenceImage4"),
            box: document.getElementById("referenceBox4"),
            preview: document.getElementById("referencePreview4"),
            height: "180px",
            label: "Reference Media 4",
            file: null,
            url: null,
            mediaType: null,
            isRemoved: false
        }
    };

    function detectMediaType(url) {
        if (!url) return null;
        const clean = url.trim().toLowerCase();
        if (clean.contains ? clean.contains(".mp4") : clean.includes(".mp4")) return "video";
        if (clean.includes(".webm") || clean.startsWith("data:video/") || clean.includes("video/mp4") || clean.includes("video/webm")) {
            return "video";
        }
        return "image";
    }

    function validateMediaFile(file) {
        if (!file) return false;
        const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const validVideoTypes = ["video/mp4", "video/webm"];
        const lowerName = file.name.toLowerCase();

        const isImage = validImageTypes.includes(file.type) ||
            /\.(jpe?g|png|webp|gif)$/i.test(lowerName);
        const isVideo = validVideoTypes.includes(file.type) ||
            /\.(mp4|webm)$/i.test(lowerName);

        if (!isImage && !isVideo) {
            alert(`Unsupported file format: "${file.name}".\nPlease choose JPG, PNG, WEBP, GIF for images or MP4, WEBM for videos.`);
            return false;
        }

        const maxImageBytes = 10 * 1024 * 1024;
        const maxVideoBytes = 50 * 1024 * 1024;

        if (isImage && file.size > maxImageBytes) {
            alert(`Image "${file.name}" is larger than 10MB. Please select a smaller image.`);
            return false;
        }

        if (isVideo && file.size > maxVideoBytes) {
            alert(`Video "${file.name}" is larger than 50MB. Please select a smaller video.`);
            return false;
        }

        return true;
    }

    function renderSlotPreview(key) {
        const slot = mediaSlots[key];
        if (!slot || !slot.preview) return;

        const src = slot.file ? URL.createObjectURL(slot.file) : slot.url;
        if (!src || slot.isRemoved) {
            slot.preview.innerHTML = "";
            slot.preview.classList.remove("show");
            if (slot.box) slot.box.style.display = "flex";
            return;
        }

        const isVid = slot.mediaType === "video";
        slot.preview.innerHTML = "";

        let mediaEl;
        if (isVid) {
            mediaEl = document.createElement("video");
            mediaEl.src = src;
            mediaEl.controls = true;
            mediaEl.playsInline = true;
            mediaEl.preload = "metadata";
            mediaEl.style.height = slot.height;
            mediaEl.style.width = "100%";
            mediaEl.style.objectFit = "contain";
        } else {
            mediaEl = document.createElement("img");
            mediaEl.src = src;
            mediaEl.alt = slot.label + " preview";
            mediaEl.style.height = slot.height;
            mediaEl.style.width = "100%";
            mediaEl.style.objectFit = "contain";
        }

        const controlsBar = document.createElement("div");
        controlsBar.className = "media-slot-controls";

        const badge = document.createElement("span");
        badge.className = "media-badge " + (isVid ? "badge-video" : "badge-image");
        badge.textContent = isVid ? "Video" : "Image";

        const changeBtn = document.createElement("button");
        changeBtn.type = "button";
        changeBtn.className = "media-ctrl-btn media-ctrl-change";
        changeBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Change Media';
        changeBtn.title = "Replace with another image or video";
        changeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (slot.input) slot.input.click();
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "media-ctrl-btn media-ctrl-remove";
        removeBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Remove Media';
        removeBtn.title = "Remove media from this slot";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeSlotMedia(key);
        });

        controlsBar.appendChild(badge);
        controlsBar.appendChild(changeBtn);
        controlsBar.appendChild(removeBtn);

        slot.preview.appendChild(mediaEl);
        slot.preview.appendChild(controlsBar);
        slot.preview.classList.add("show");

        if (slot.box) slot.box.style.display = "none";
    }

    function removeSlotMedia(key) {
        const slot = mediaSlots[key];
        if (!slot) return;

        // If media was previously saved or selected, confirm removal before proceeding
        if ((slot.url || slot.file) && !confirm(`Are you sure you want to remove media from ${slot.label}?`)) {
            return;
        }

        if (slot.input) slot.input.value = "";
        slot.file = null;
        slot.url = null;
        slot.mediaType = null;
        slot.isRemoved = true;
        renderSlotPreview(key);
    }

    function setupSlot(key) {
        const slot = mediaSlots[key];
        if (!slot || !slot.input) return;

        slot.input.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (!validateMediaFile(file)) {
                slot.input.value = "";
                return;
            }

            const lower = file.name.toLowerCase();
            const isVid = file.type.startsWith("video/") || lower.endsWith(".mp4") || lower.endsWith(".webm");

            slot.file = file;
            slot.url = null;
            slot.mediaType = isVid ? "video" : "image";
            slot.isRemoved = false;

            renderSlotPreview(key);
        });
    }

    Object.keys(mediaSlots).forEach(setupSlot);


    /* =====================================================
       POPULATE AND LOAD PRODUCT INFORMATION
    ====================================================== */

    function setSelectValueCaseInsensitive(selectEl, value) {
        if (!selectEl || !value) return;
        const valLower = value.toString().trim().toLowerCase();
        for (let i = 0; i < selectEl.options.length; i++) {
            const opt = selectEl.options[i];
            if (opt.value.toLowerCase() === valLower || opt.text.toLowerCase() === valLower) {
                selectEl.value = opt.value;
                return;
            }
        }
        for (let i = 0; i < selectEl.options.length; i++) {
            const opt = selectEl.options[i];
            if (valLower.includes(opt.value.toLowerCase()) || opt.value.toLowerCase().includes(valLower)) {
                selectEl.value = opt.value;
                return;
            }
        }
    }

    function populateProductFields(prod) {
        if (!prod) return;
        product = prod;

        productName.value = prod.name || prod.productName || "";
        descriptionEditor.innerHTML = prod.description || "";
        description.value = prod.description || "";

        if (Array.isArray(prod.measurement)) {
            measurement.value = prod.measurement.join(", ");
        } else {
            measurement.value = prod.measurement || "";
        }

        if (productDetailsDescription) {
            productDetailsDescription.value = prod.productDetailsDescription ||
                (prod.productDetails && typeof prod.productDetails.description === "string" ? prod.productDetails.description : (prod.description || ""));
        }

        if (highlightsList) {
            highlightsList.innerHTML = "";
            let highlightsToLoad = prod.productDetailsHighlights ||
                (prod.productDetails && Array.isArray(prod.productDetails.highlights) ? prod.productDetails.highlights : []);

            if (highlightsToLoad.length === 0) {
                highlightsToLoad = [
                    "Premium quality finish",
                    "Comfortable for everyday wear",
                    "Elegant contemporary design",
                    "Suitable for gifting"
                ];
            }

            highlightsToLoad.forEach(hl => {
                addHighlight(hl);
            });
        }

        gemstone.value = prod.gemstone || "";
        material.value = prod.material || "";
        productColor.value = prod.color || prod.productColor || "";
        stockQuantity.value = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.stock || 0);
        restockDate.value = prod.restockDate || "";
        price.value = prod.price || "";
        comparePrice.value = prod.comparePrice || "";
        calculateDiscount();

        setSelectValueCaseInsensitive(category, prod.category);
        if (collection) {
            setSelectValueCaseInsensitive(collection, prod.collection);
        }
        sku.value = prod.sku || "";
        tags.value = prod.tags || "";

        // Availability radio
        const availVal = (prod.availability || "In Stock").toLowerCase();
        availabilityInputs.forEach(input => {
            if (input.value.toLowerCase() === availVal) {
                input.checked = true;
                input.closest(".availability-option")?.classList.add("selected");
            } else {
                input.closest(".availability-option")?.classList.remove("selected");
            }
        });

        // Media Slots Population (Images & Videos)
        const mainUrl = prod.mainImage || (prod.images && prod.images[0]) || null;
        mediaSlots.main.url = mainUrl;
        mediaSlots.main.mediaType = prod.mainMediaType || detectMediaType(mainUrl);
        mediaSlots.main.file = null;
        mediaSlots.main.isRemoved = false;
        renderSlotPreview("main");

        const refImgs = prod.images && prod.images.length > 1 ? prod.images.slice(1) : [];
        ["ref1", "ref2", "ref3", "ref4"].forEach((slotKey, idx) => {
            const explicitUrl = prod[`referenceImage${idx + 1}`];
            const fallbackUrl = refImgs[idx] || null;
            const url = (explicitUrl !== undefined && explicitUrl !== null) ? explicitUrl : fallbackUrl;
            const explicitType = prod[`referenceMediaType${idx + 1}`];

            mediaSlots[slotKey].url = url;
            mediaSlots[slotKey].mediaType = explicitType || detectMediaType(url);
            mediaSlots[slotKey].file = null;
            mediaSlots[slotKey].isRemoved = false;
            renderSlotPreview(slotKey);
        });
    }

    const availabilityOptions =
        document.querySelectorAll(".availability-option");

    const availabilityInputs =
        document.querySelectorAll('input[name="availability"]');

    availabilityOptions.forEach(option => {
        option.addEventListener("click", () => {
            availabilityOptions.forEach(item => {
                item.classList.remove("selected");
            });
            option.classList.add("selected");
            const radio = option.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });

    async function loadProductData() {
        const token = localStorage.getItem("firqui_token");
        let loaded = false;
        try {
            let res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
                headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
            });
            if (!res.ok) {
                res = await fetch(`${API_BASE}/api/products/${productId}`);
            }
            if (res.ok) {
                const apiData = await res.json();
                if (apiData && (apiData.id || apiData.name)) {
                    populateProductFields(apiData);
                    loaded = true;
                }
            }
        } catch (e) {
            console.warn("Backend product load warning:", e);
        }

        if (!loaded) {
            if (product) {
                populateProductFields(product);
            } else {
                alert("Product not found.");
                window.location.href = "products.html";
            }
        }
    }

    loadProductData();


    /* =====================================================
       DESCRIPTION EDITOR
    ====================================================== */

    const editorButtons =
        document.querySelectorAll(
            ".editor-toolbar button"
        );


    editorButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const command =
                        button.dataset.command;


                    document.execCommand(
                        command,
                        false,
                        null
                    );


                    descriptionEditor.focus();

                }
            );

        }
    );


    descriptionEditor.addEventListener(
        "input",
        () => {

            description.value =
                descriptionEditor.innerHTML;

        }
    );


    /* =====================================================
       DISCOUNT CALCULATION
    ====================================================== */

    const discountValue =
        document.getElementById(
            "discountValue"
        );


    function calculateDiscount() {

        const sellingPrice =
            parseFloat(
                price.value
            );


        const originalPrice =
            parseFloat(
                comparePrice.value
            );


        if (
            !sellingPrice ||
            !originalPrice ||
            originalPrice <= sellingPrice
        ) {

            discountValue.textContent =
                "0%";

            return;

        }


        const discount =
            Math.round(
                (
                    (
                        originalPrice -
                        sellingPrice
                    ) /
                    originalPrice
                ) * 100
            );


        discountValue.textContent =
            `${discount}%`;

    }


    price.addEventListener(
        "input",
        calculateDiscount
    );


    comparePrice.addEventListener(
        "input",
        calculateDiscount
    );


    calculateDiscount();


    /* =====================================================
       FORM SUBMIT
    ====================================================== */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            description.value =
                descriptionEditor.innerHTML;


            const selectedAvailability =
                document.querySelector(
                    'input[name="availability"]:checked'
                );


            const rawMeasurement =
                measurement.value.trim();

            let measurementsArray = [];

            if (rawMeasurement.includes(",")) {
                measurementsArray =
                    rawMeasurement
                        .split(",")
                        .map(m => m.trim())
                        .filter(Boolean);
            } else if (rawMeasurement) {
                measurementsArray =
                    [rawMeasurement];
            }

            const detailsDesc =
                productDetailsDescription
                    ? productDetailsDescription.value.trim()
                    : "";

            const highlightInputs =
                highlightsList
                    ? highlightsList.querySelectorAll(".highlight-input")
                    : [];

            const highlights =
                Array.from(highlightInputs)
                    .map(inp => inp.value.trim())
                    .filter(val => val.length > 0);

            const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

            // 1. Ensure valid Admin JWT token for Spring Boot API call
            let token = localStorage.getItem("firqui_token");
            let userObj = null;
            try { userObj = JSON.parse(localStorage.getItem("firqui_user") || "{}"); } catch (_) {}
            const isAdmin = userObj && (userObj.role === "ADMIN" || userObj.role === "ROLE_ADMIN");

            if (!token || !isAdmin) {
                alert("Your admin session has expired. Please log in again.");
                window.location.href = "../authentication/login.html";
                return;
            }

            // 2. Upload newly selected media files for each slot
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving media...';
            }

            try {
                for (const slotKey of ["main", "ref1", "ref2", "ref3", "ref4"]) {
                    const slot = mediaSlots[slotKey];
                    if (slot && slot.file) {
                        const fd = new FormData();
                        fd.append("file", slot.file);
                        fd.append("slot", slotKey);

                        const upRes = await fetch(`${API_BASE}/api/admin/media/upload`, {
                            method: "POST",
                            headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
                            body: fd
                        });
                        const upData = await upRes.json().catch(() => null);
                        if (!upRes.ok || !upData || !upData.success) {
                            const upErr = (upData && (upData.message || upData.error)) || `Server upload error (${upRes.status})`;
                            alert(`Failed to upload ${slot.label}.\n${upErr}`);
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = originalBtnText;
                            }
                            return; // DO NOT continue on upload failure
                        }
                        slot.url = upData.url;
                        slot.mediaType = upData.mediaType;
                        slot.file = null;
                        slot.isRemoved = false;
                    }
                }
            } catch (upNetworkErr) {
                alert(`Upload failed: ${upNetworkErr.message || "Network error"}`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
                return;
            }

            // Extract URLs and Media Types
            const mainMediaUrl = mediaSlots.main.isRemoved ? null : (mediaSlots.main.url || null);
            const mainMediaType = mediaSlots.main.isRemoved ? null : (mediaSlots.main.url ? mediaSlots.main.mediaType : null);

            const refMedia1Url = mediaSlots.ref1.isRemoved ? null : (mediaSlots.ref1.url || null);
            const refMedia1Type = mediaSlots.ref1.isRemoved ? null : (mediaSlots.ref1.url ? mediaSlots.ref1.mediaType : null);

            const refMedia2Url = mediaSlots.ref2.isRemoved ? null : (mediaSlots.ref2.url || null);
            const refMedia2Type = mediaSlots.ref2.isRemoved ? null : (mediaSlots.ref2.url ? mediaSlots.ref2.mediaType : null);

            const refMedia3Url = mediaSlots.ref3.isRemoved ? null : (mediaSlots.ref3.url || null);
            const refMedia3Type = mediaSlots.ref3.isRemoved ? null : (mediaSlots.ref3.url ? mediaSlots.ref3.mediaType : null);

            const refMedia4Url = mediaSlots.ref4.isRemoved ? null : (mediaSlots.ref4.url || null);
            const refMedia4Type = mediaSlots.ref4.isRemoved ? null : (mediaSlots.ref4.url ? mediaSlots.ref4.mediaType : null);

            let productImages = [mainMediaUrl, refMedia1Url, refMedia2Url, refMedia3Url, refMedia4Url].filter(Boolean);
            if (productImages.length === 0) {
                productImages.push("../assets/Logo Pink 1.png");
            }

            const updatedProduct = {
                ...(product || {}),
                id: productId,
                name: productName.value.trim(),
                productName: productName.value.trim(),
                description: description.value,
                measurement: measurementsArray.length > 0 ? measurementsArray : (rawMeasurement || []),
                gemstone: gemstone.value.trim(),
                material: material.value.trim(),
                color: productColor.value.trim(),
                productColor: productColor.value.trim(),
                availability: selectedAvailability ? selectedAvailability.value : "",
                restockDate: restockDate.value,
                stockQuantity: stockQuantity.value,
                price: Number(price.value) || price.value,
                comparePrice: comparePrice.value,
                category: (() => {
                    const c = category ? category.value.trim() : "";
                    return (c && c.toLowerCase() !== "none" && c.toLowerCase() !== "select category") ? c : null;
                })(),
                collection: collection.value,
                sku: sku.value.trim(),
                tags: tags.value.trim(),
                mainImage: mainMediaUrl || productImages[0],
                mainMediaType: mainMediaType,
                referenceImage1: refMedia1Url,
                referenceMediaType1: refMedia1Type,
                referenceImage2: refMedia2Url,
                referenceMediaType2: refMedia2Type,
                referenceImage3: refMedia3Url,
                referenceMediaType3: refMedia3Type,
                referenceImage4: refMedia4Url,
                referenceMediaType4: refMedia4Type,
                images: productImages,
                productDetails: {
                    description: detailsDesc,
                    highlights: highlights
                }
            };

            // Update in firquiProducts in localStorage
            let currentLocalProducts = [];
            try {
                currentLocalProducts = JSON.parse(localStorage.getItem("firquiProducts")) || [];
            } catch (e) {
                currentLocalProducts = [];
            }

            const existingIdx = currentLocalProducts.findIndex(p => String(p.id) === String(productId));
            const colVal = collection ? collection.value.trim() : "";
            const finalCollection = (colVal && colVal.toLowerCase() !== "none" && colVal.toLowerCase() !== "no collection") ? colVal : null;
            updatedProduct.collection = finalCollection;

            // Sync update with Spring Boot PostgreSQL backend API
            const updatePayload = {
                legacyId: String(productId),
                name: updatedProduct.name,
                productName: updatedProduct.name,
                description: updatedProduct.description,
                measurement: measurementsArray,
                measurements: measurementsArray,
                price: Number(price.value) || updatedProduct.price,
                comparePrice: Number(comparePrice.value) || updatedProduct.comparePrice,
                discount: parseFloat(discountValue.textContent) || null,
                category: updatedProduct.category,
                collection: updatedProduct.collection,
                sku: updatedProduct.sku,
                gemstone: updatedProduct.gemstone,
                material: updatedProduct.material,
                color: updatedProduct.color,
                productColor: updatedProduct.color,
                availability: updatedProduct.availability,
                restockDate: updatedProduct.restockDate,
                stockQuantity: Number(stockQuantity.value) || 0,
                mainImage: mainMediaUrl || productImages[0],
                mainMediaType: mainMediaType,
                referenceImage1: refMedia1Url,
                referenceMediaType1: refMedia1Type,
                referenceImage2: refMedia2Url,
                referenceMediaType2: refMedia2Type,
                referenceImage3: refMedia3Url,
                referenceMediaType3: refMedia3Type,
                referenceImage4: refMedia4Url,
                referenceMediaType4: refMedia4Type,
                images: productImages,
                productDetailsDescription: detailsDesc,
                productDetailsHighlights: highlights,
                tags: updatedProduct.tags,
                active: updatedProduct.availability !== "Out of Stock"
            };

            console.log("Updating product:", updatePayload);

            try {
                let res = await fetch(`${API_BASE}/api/admin/products/${productId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(updatePayload)
                });

                console.log("Response status:", res.status);
                let responseData = null;
                try {
                    responseData = await res.json();
                } catch (_) {}
                console.log("Response data:", responseData);

                if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 404)) {
                    res = await fetch(`${API_BASE}/api/products/${productId}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(updatePayload)
                    });
                    try {
                        responseData = await res.json();
                    } catch (_) {}
                }

                if (!res.ok) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                    }
                    const errMsg = (responseData && (responseData.message || responseData.error)) || `Server error (${res.status})`;
                    alert(`Failed to update product.\n${errMsg}`);
                    return; // DO NOT redirect
                }

                // Update local storage backup only upon successful API response
                try {
                    const cleanItem = {
                        ...updatedProduct,
                        mainImage: (updatedProduct.mainImage && !updatedProduct.mainImage.startsWith("data:")) ? updatedProduct.mainImage : "",
                        images: (updatedProduct.images || []).filter(im => !im.startsWith("data:"))
                    };
                    if (existingIdx !== -1) {
                        currentLocalProducts[existingIdx] = {
                            ...currentLocalProducts[existingIdx],
                            ...cleanItem
                        };
                    } else {
                        currentLocalProducts.push(cleanItem);
                    }
                    localStorage.setItem(
                        "firquiProducts",
                        JSON.stringify(currentLocalProducts)
                    );
                } catch (storageErr) {
                    console.warn("LocalStorage cache update ignored due to quota:", storageErr);
                    try { localStorage.removeItem("firquiProducts"); } catch (_) {}
                }

                alert("Product updated successfully!");
                window.location.href = "products.html";

            } catch (backendErr) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
                console.error("Backend API update error:", backendErr);
                alert(`Failed to update product.\n${backendErr.message || "Network error. Please check backend connection."}`);
            }

        }
    );


    /* =====================================================
       NEWSLETTER
    ====================================================== */

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
            event => {

                event.preventDefault();


                newsletterMsg.textContent =
                    "Thank you for subscribing!";


                newsletterForm.reset();

            }
        );

    }


    /* =====================================================
       HEADER BUTTONS
    ====================================================== */

    const adminButton =
        document.getElementById(
            "adminButton"
        );


    const searchButton =
        document.getElementById(
            "searchButton"
        );


    const notificationButton =
        document.getElementById(
            "notificationButton"
        );


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (adminButton) {

        adminButton.addEventListener(
            "click",
            () => {

                alert(
                    "Admin profile"
                );

            }
        );

    }


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (window.FirquiAdminSearch) {
                    window.FirquiAdminSearch.open();
                }
            }
        );

    }


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                alert(
                    "No new notifications."
                );

            }
        );

    }


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {

                const confirmLogout =
                    confirm(
                        "Are you sure you want to logout?"
                    );


                if (confirmLogout) {

                    window.location.href =
                        "../signin.html";

                }

            }
        );

    }

});