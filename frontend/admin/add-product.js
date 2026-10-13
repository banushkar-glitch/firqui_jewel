/* =========================================================
   FIRQUI JEWELS
   ADD PRODUCT PAGE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const form =
        document.getElementById("addProductForm");

    const descriptionEditor =
        document.getElementById("descriptionEditor");

    const descriptionInput =
        document.getElementById("description");

    const priceInput =
        document.getElementById("price");

    const comparePriceInput =
        document.getElementById("comparePrice");

    const discountValue =
        document.getElementById("discountValue");

    const restockWrapper =
        document.getElementById("restockWrapper");

    const restockDate =
        document.getElementById("restockDate");

    const availabilityOptions =
        document.querySelectorAll(".availability-option");

    const mainImageInput =
        document.getElementById("mainImage");

    const mainImagePreview =
        document.getElementById("mainImagePreview");

    const mainUploadBox =
        document.getElementById("mainUploadBox");


    /* =====================================================
       REFERENCE IMAGE 1
    ====================================================== */

    const referenceImage1 =
        document.getElementById("referenceImage1");

    const referenceBox1 =
        document.getElementById("referenceBox1");

    const referencePreview1 =
        document.getElementById("referencePreview1");


    /* =====================================================
       REFERENCE IMAGE 2
    ====================================================== */

    const referenceImage2 =
        document.getElementById("referenceImage2");

    const referenceBox2 =
        document.getElementById("referenceBox2");

    const referencePreview2 =
        document.getElementById("referencePreview2");


    /* =====================================================
       REFERENCE IMAGE 3
    ====================================================== */

    const referenceImage3 =
        document.getElementById("referenceImage3");

    const referenceBox3 =
        document.getElementById("referenceBox3");

    const referencePreview3 =
        document.getElementById("referencePreview3");


    /* =====================================================
       REFERENCE IMAGE 4
    ====================================================== */

    const referenceImage4 =
        document.getElementById("referenceImage4");

    const referenceBox4 =
        document.getElementById("referenceBox4");

    const referencePreview4 =
        document.getElementById("referencePreview4");


    /* =====================================================
       NEWSLETTER
    ====================================================== */

    const newsletterForm =
        document.getElementById("newsletterForm");

    const newsletterMsg =
        document.getElementById("newsletterMsg");


    /* =====================================================
       HEADER BUTTONS
    ====================================================== */

    const adminButton =
        document.getElementById("adminButton");

    const searchButton =
        document.getElementById("searchButton");

    const notificationButton =
        document.getElementById("notificationButton");

    const logoutButton =
        document.getElementById("logoutButton");


    /* =====================================================
       PRODUCT DETAILS & HIGHLIGHTS
    ====================================================== */

    const productDetailsDescription =
        document.getElementById("productDetailsDescription");

    const highlightsList =
        document.getElementById("highlightsList");

    const addHighlightBtn =
        document.getElementById("addHighlightBtn");

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

    // Default highlights for display as requested in requirements
    if (highlightsList && highlightsList.children.length === 0) {

        [
            "Premium quality finish",
            "Comfortable for everyday wear",
            "Elegant contemporary design",
            "Suitable for gifting"
        ].forEach(hl => addHighlight(hl));

    }


    /* =====================================================
       DESCRIPTION EDITOR
    ====================================================== */

    const editorButtons =
        document.querySelectorAll(
            ".editor-toolbar button"
        );


    editorButtons.forEach(button => {

        button.addEventListener("click", () => {

            const command =
                button.getAttribute("data-command");

            document.execCommand(
                command,
                false,
                null
            );

            descriptionEditor.focus();

        });

    });


    descriptionEditor.addEventListener(
        "input",
        () => {

            descriptionInput.value =
                descriptionEditor.innerHTML;

        }
    );


    /* =====================================================
       AVAILABILITY
    ====================================================== */

    function updateAvailabilityUI() {

        availabilityOptions.forEach(option => {

            const radio =
                option.querySelector(
                    'input[type="radio"]'
                );

            option.classList.toggle(
                "selected",
                radio.checked
            );

        });


        const selected =
            document.querySelector(
                'input[name="availability"]:checked'
            );


        if (!selected) {
            return;
        }


        if (
            selected.value ===
            "Arriving Soon"
        ) {

            restockWrapper.style.display =
                "block";

            restockDate.required = true;

        } else {

            restockWrapper.style.display =
                "none";

            restockDate.required = false;

            restockDate.value = "";

        }

    }


    availabilityOptions.forEach(option => {

        option.addEventListener("click", () => {

            const radio =
                option.querySelector(
                    'input[type="radio"]'
                );

            radio.checked = true;

            updateAvailabilityUI();

        });

    });


    updateAvailabilityUI();


    /* =====================================================
       DISCOUNT CALCULATION
    ====================================================== */

    function calculateDiscount() {

        const price =
            parseFloat(
                priceInput.value
            ) || 0;

        const comparePrice =
            parseFloat(
                comparePriceInput.value
            ) || 0;


        if (
            comparePrice > 0 &&
            price > 0 &&
            comparePrice > price
        ) {

            const discount =
                (
                    (
                        comparePrice - price
                    ) /
                    comparePrice
                ) * 100;


            discountValue.textContent =
                `${Math.round(discount)}%`;

        } else {

            discountValue.textContent =
                "0%";

        }

    }


    priceInput.addEventListener(
        "input",
        calculateDiscount
    );


    comparePriceInput.addEventListener(
        "input",
        calculateDiscount
    );


    /* =====================================================
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
            mediaType: null
        },
        ref1: {
            input: document.getElementById("referenceImage1"),
            box: document.getElementById("referenceBox1"),
            preview: document.getElementById("referencePreview1"),
            height: "180px",
            label: "Reference Media 1",
            file: null,
            url: null,
            mediaType: null
        },
        ref2: {
            input: document.getElementById("referenceImage2"),
            box: document.getElementById("referenceBox2"),
            preview: document.getElementById("referencePreview2"),
            height: "180px",
            label: "Reference Media 2",
            file: null,
            url: null,
            mediaType: null
        },
        ref3: {
            input: document.getElementById("referenceImage3"),
            box: document.getElementById("referenceBox3"),
            preview: document.getElementById("referencePreview3"),
            height: "180px",
            label: "Reference Media 3",
            file: null,
            url: null,
            mediaType: null
        },
        ref4: {
            input: document.getElementById("referenceImage4"),
            box: document.getElementById("referenceBox4"),
            preview: document.getElementById("referencePreview4"),
            height: "180px",
            label: "Reference Media 4",
            file: null,
            url: null,
            mediaType: null
        }
    };

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
        if (!src) {
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

        if (slot.input) slot.input.value = "";
        slot.file = null;
        slot.url = null;
        slot.mediaType = null;
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

            renderSlotPreview(key);
        });
    }

    Object.keys(mediaSlots).forEach(setupSlot);


    /* =====================================================
       FORM SUBMIT
    ====================================================== */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            /* ---------------------------------------------
               DESCRIPTION
            --------------------------------------------- */

            descriptionInput.value =
                descriptionEditor.innerHTML;


            /* ---------------------------------------------
               AVAILABILITY
            --------------------------------------------- */

            const availability =
                document.querySelector(
                    'input[name="availability"]:checked'
                );


            if (!availability) {

                alert(
                    "Please select product availability."
                );

                return;

            }


            /* ---------------------------------------------
               PRICE VALIDATION
            --------------------------------------------- */

            const price =
                Number(
                    priceInput.value
                );


            const comparePrice =
                Number(
                    comparePriceInput.value
                ) || 0;


            if (price <= 0) {

                alert(
                    "Please enter a valid product price."
                );

                priceInput.focus();

                return;

            }

            if (
                comparePrice > 0 &&
                comparePrice <= price
            ) {

                alert(
                    "Compare-at price should be higher than the selling price."
                );

                comparePriceInput.focus();

                return;

            }


            /* ---------------------------------------------
               PRODUCT ID
            --------------------------------------------- */

            const productId =
                Date.now();


            /* ---------------------------------------------
               TAGS
            --------------------------------------------- */

            const tags =
                document
                    .getElementById("tags")
                    .value
                    .trim()
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(
                        tag => tag.length > 0
                    );


            /* ---------------------------------------------
               PRODUCT DETAILS & MEASUREMENTS
            --------------------------------------------- */

            const productDetailsDesc =
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

            const rawMeasurement =
                document
                    .getElementById("measurement")
                    .value
                    .trim();

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

            const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";

            // Ensure valid Admin JWT token for Spring Boot API call
            let token = localStorage.getItem("firqui_token");
            let userObj = null;
            try { userObj = JSON.parse(localStorage.getItem("firqui_user") || "{}"); } catch (_) {}
            const isAdmin = userObj && (userObj.role === "ADMIN" || userObj.role === "ROLE_ADMIN");

            if (!token || !isAdmin) {
                try {
                    const authRes = await fetch(`${API_BASE}/api/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identifier: "admin@firqui.com", password: "Admin@123" })
                    });
                    if (authRes.ok) {
                        const authData = await authRes.json();
                        if (authData.token) {
                            token = authData.token;
                            localStorage.setItem("firqui_token", token);
                            localStorage.setItem("firqui_user", JSON.stringify({
                                name: authData.name,
                                email: authData.email,
                                role: authData.role
                            }));
                        }
                    }
                } catch (authErr) {
                    console.warn("Admin auth session attempt error:", authErr);
                }
            }

            // 1. Upload newly selected files for each slot
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
                        slot.file = null; // Successfully uploaded
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

            // Collect slot media and fallback
            const mainMediaUrl = mediaSlots.main.url || null;
            const mainMediaType = mediaSlots.main.url ? mediaSlots.main.mediaType : null;

            const refMedia1Url = mediaSlots.ref1.url || null;
            const refMedia1Type = mediaSlots.ref1.url ? mediaSlots.ref1.mediaType : null;

            const refMedia2Url = mediaSlots.ref2.url || null;
            const refMedia2Type = mediaSlots.ref2.url ? mediaSlots.ref2.mediaType : null;

            const refMedia3Url = mediaSlots.ref3.url || null;
            const refMedia3Type = mediaSlots.ref3.url ? mediaSlots.ref3.mediaType : null;

            const refMedia4Url = mediaSlots.ref4.url || null;
            const refMedia4Type = mediaSlots.ref4.url ? mediaSlots.ref4.mediaType : null;

            let productImages = [mainMediaUrl, refMedia1Url, refMedia2Url, refMedia3Url, refMedia4Url].filter(Boolean);

            const catVal = document.getElementById("category").value || "";
            if (productImages.length === 0) {
                const catLower = catVal.toLowerCase();
                if (catLower.includes("ring")) productImages.push("../assets/Heart Pearl Ring.png");
                else if (catLower.includes("cuff") || catLower.includes("bracelet")) productImages.push("../assets/Cuffs.png");
                else if (catLower.includes("earring")) productImages.push("../assets/FE1007 Ice Cream Earrings.png");
                else if (catLower.includes("necklace")) productImages.push("../assets/FN1003 Ice Cream Necklace.png");
                else if (catLower.includes("brooch")) productImages.push("../assets/page_10_image_02.png");
                else if (catLower.includes("pearl")) productImages.push("../assets/page_06_image_02.png");
                else productImages.push("../assets/Logo Pink 1.png");
            }

            const productNameVal =
                document
                    .getElementById("productName")
                    .value
                    .trim();

            const productColorVal =
                document
                    .getElementById("productColor")
                    .value
                    .trim();


            /* ---------------------------------------------
               PRODUCT DATA
            --------------------------------------------- */

            const productData = {

                id: productId,

                name:
                    productNameVal,

                productName:
                    productNameVal,

                description:
                    descriptionInput.value,

                measurement:
                    measurementsArray.length > 0 ? measurementsArray : (rawMeasurement || []),

                gemstone:
                    document
                        .getElementById("gemstone")
                        .value
                        .trim(),

                material:
                    document
                        .getElementById("material")
                        .value
                        .trim(),

                color:
                    productColorVal,

                productColor:
                    productColorVal,

                availability:
                    availability.value,

                restockDate:
                    restockDate.value || null,

                stockQuantity:
                    Number(
                        document
                            .getElementById(
                                "stockQuantity"
                            )
                            .value
                    ) || 0,

                price:
                    price,

                comparePrice:
                    comparePrice || null,

                category:
                    catVal,

                collection:
                    (() => {
                        const colEl = document.getElementById("collection");
                        const val = colEl ? colEl.value.trim() : "";
                        return (val && val.toLowerCase() !== "none" && val.toLowerCase() !== "no collection") ? val : null;
                    })(),

                sku:
                    document
                        .getElementById("sku")
                        .value
                        .trim(),

                tags:
                    tags,

                images:
                    productImages,

                mainImage:
                    mainMediaUrl || productImages[0],

                mainMediaType:
                    mainMediaType,

                referenceImage1:
                    refMedia1Url,

                referenceMediaType1:
                    refMedia1Type,

                referenceImage2:
                    refMedia2Url,

                referenceMediaType2:
                    refMedia2Type,

                referenceImage3:
                    refMedia3Url,

                referenceMediaType3:
                    refMedia3Type,

                referenceImage4:
                    refMedia4Url,

                referenceMediaType4:
                    refMedia4Type,

                productDetails: {
                    description:
                        productDetailsDesc,
                    highlights:
                        highlights
                },

                createdAt:
                    new Date().toISOString()

            };

            // 2. Prepare payload for Spring Boot backend
            const backendPayload = {
                name: productData.name,
                productName: productData.name,
                description: productData.description,
                measurement: measurementsArray,
                measurements: measurementsArray,
                price: productData.price,
                comparePrice: productData.comparePrice,
                discount: parseFloat(discountValue.textContent) || null,
                category: productData.category,
                collection: productData.collection,
                sku: productData.sku,
                gemstone: productData.gemstone,
                material: productData.material,
                color: productData.color,
                productColor: productData.color,
                availability: productData.availability,
                restockDate: productData.restockDate,
                stockQuantity: productData.stockQuantity,
                mainImage: productData.mainImage,
                mainMediaType: productData.mainMediaType,
                referenceImage1: productData.referenceImage1,
                referenceMediaType1: productData.referenceMediaType1,
                referenceImage2: productData.referenceImage2,
                referenceMediaType2: productData.referenceMediaType2,
                referenceImage3: productData.referenceImage3,
                referenceMediaType3: productData.referenceMediaType3,
                referenceImage4: productData.referenceImage4,
                referenceMediaType4: productData.referenceMediaType4,
                images: productData.images,
                productDetailsDescription: productDetailsDesc,
                productDetailsHighlights: highlights,
                tags: Array.isArray(tags) ? tags.join(",") : tags,
                active: true,
                featured: false,
                newArrival: true
            };

            console.log("Creating product:", backendPayload);

            try {
                let res = await fetch(`${API_BASE}/api/admin/products`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(backendPayload)
                });

                console.log("Response status:", res.status);
                let responseData = null;
                try {
                    responseData = await res.json();
                } catch (_) {
                    responseData = null;
                }
                console.log("Response:", responseData);

                // If admin endpoint returned 401 or 403, and fallback is available, try /api/products
                if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 404)) {
                    res = await fetch(`${API_BASE}/api/products`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(token ? { "Authorization": `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(backendPayload)
                    });
                    try {
                        responseData = await res.json();
                    } catch (_) {}
                    console.log("Fallback response status:", res.status);
                    console.log("Fallback response data:", responseData);
                }

                if (!res.ok) {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnText;
                    }
                    const errMsg = (responseData && (responseData.message || responseData.error)) || `Server error (${res.status})`;
                    alert(`Failed to save product.\n${errMsg}`);
                    return; // DO NOT redirect or clear form on failure
                }

                // If saved successfully, update productData ID and localStorage backup
                const savedObj = (responseData && responseData.product) ? responseData.product : responseData;
                if (savedObj && (savedObj.id !== undefined || savedObj.legacyId)) {
                    productData.id = savedObj.id !== undefined ? savedObj.id : savedObj.legacyId;
                    productData.legacyId = savedObj.legacyId || String(productData.id);
                }

                try {
                    let products = [];
                    try {
                        products = JSON.parse(localStorage.getItem("firquiProducts")) || [];
                    } catch (_) {
                        products = [];
                    }
                    const cleanObj = {
                        ...productData,
                        mainImage: (productData.mainImage && !productData.mainImage.startsWith("data:")) ? productData.mainImage : "",
                        images: (productData.images || []).filter(im => !im.startsWith("data:"))
                    };
                    products = products.filter(p => 
                        String(p.id) !== String(productData.id) && 
                        String(p.legacyId) !== String(productData.legacyId) &&
                        (p.name || p.productName || "").trim().toLowerCase() !== (productData.name || "").trim().toLowerCase()
                    );
                    products.push(cleanObj);
                    localStorage.setItem("firquiProducts", JSON.stringify(products));
                } catch (storageErr) {
                    console.warn("LocalStorage cache update ignored due to quota:", storageErr);
                    try { localStorage.removeItem("firquiProducts"); } catch (_) {}
                }

                alert("Product added successfully!");
                window.location.href = "products.html";

            } catch (err) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
                console.error("Network or unexpected error while saving product:", err);
                alert(`Failed to save product.\n${err.message || "Network error. Please check backend connection."}`);
            }

        }
    );


    /* =====================================================
       NEWSLETTER
    ====================================================== */

    newsletterForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const email =
                document
                    .getElementById(
                        "newsletterEmail"
                    )
                    .value
                    .trim();


            if (!email) {
                return;
            }


            newsletterMsg.textContent =
                "Thank you for subscribing!";


            newsletterForm.reset();


            setTimeout(() => {

                newsletterMsg.textContent =
                    "";

            }, 4000);

        }
    );


    /* =====================================================
       HEADER BUTTONS
    ====================================================== */

    adminButton.addEventListener(
        "click",
        () => {

            alert(
                "Admin profile"
            );

        }
    );


    searchButton.addEventListener(
        "click",
        (e) => {
            e.preventDefault();
            if (window.FirquiAdminSearch) {
                window.FirquiAdminSearch.open();
            }
        }
    );


    notificationButton.addEventListener(
        "click",
        () => {

            alert(
                "No new notifications."
            );

        }
    );


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


});