/* =====================================================
   FIRQUI JEWELS - ADMIN PRODUCT FORM
   One page for adding and editing (product-form.html?id=42).

   - Draft / Published / Archived, with buttons that match the state
   - Drafts save themselves; published listings only change when saved
   - Unsaved-changes warning and a local backup that survives a reload
   - Field-level errors (same rules as the server)
   - Live preview of the shop card
   - Photos/videos: add several at once, drag to reorder, pick the main one,
     upload progress; large photos are resized first
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const API_BASE = window.FIRQUI_API_BASE || "";
    const MAX_MEDIA = 5;
    const AUTOSAVE_MS = 2500;
    const esc = (v) => window.FirquiHtml.escape(v);

    const $ = (id) => document.getElementById(id);
    const form = $("productForm");
    const fields = {
        name: $("productName"),
        editor: $("descriptionEditor"),
        measurement: $("measurement"),
        gemstone: $("gemstone"),
        material: $("material"),
        color: $("productColor"),
        details: $("productDetailsDescription"),
        stock: $("stockQuantity"),
        restock: $("restockDate"),
        price: $("price"),
        compare: $("comparePrice"),
        category: $("category"),
        collection: $("collection"),
        sku: $("sku"),
        tags: $("tags")
    };

    const params = new URLSearchParams(window.location.search);
    let productId = params.get("id");
    let status = productId ? null : "NEW";       // NEW | DRAFT | PUBLISHED | ARCHIVED
    let media = [];                              // { url, type, uploading, progress, localUrl, error }
    let baseline = "";                           // snapshot of the last saved state
    let saving = false;
    let autosaveTimer = null;
    let lastSavedAt = null;

    const backupKey = () => "firqui_product_backup_" + (productId || "new");

    /* =====================================================
       HELPERS
    ===================================================== */
    function rupees(n) {
        return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    }

    function mediaTypeOf(urlOrFile) {
        const name = typeof urlOrFile === "string" ? urlOrFile : (urlOrFile.type || urlOrFile.name || "");
        return /video|\.mp4|\.webm/i.test(name) ? "video" : "image";
    }

    function resolveUrl(url) {
        if (!url) return "";
        if (/^(https?:|data:|blob:)/.test(url)) return url;
        if (url.startsWith("/uploads/")) return API_BASE + url;
        return url; // ../assets/... relative to /admin/
    }

    function availability() {
        const checked = form.querySelector('input[name="availability"]:checked');
        return checked ? checked.value : "In Stock";
    }

    function setAvailability(value) {
        const input = form.querySelector(`input[name="availability"][value="${value}"]`) ||
            form.querySelector('input[name="availability"][value="In Stock"]');
        input.checked = true;
        syncAvailabilityUi();
    }

    function syncAvailabilityUi() {
        form.querySelectorAll(".availability-option").forEach(opt => {
            opt.classList.toggle("selected", opt.querySelector("input").checked);
        });
        $("restockGroup").hidden = availability() !== "Arriving Soon";
    }

    /* =====================================================
       COLLECT / FILL
    ===================================================== */
    function highlightValues() {
        return Array.from(document.querySelectorAll("#highlightsList .highlight-input"))
            .map(i => i.value.trim()).filter(Boolean);
    }

    function collect(statusOverride) {
        const ready = media.filter(m => m.url && !m.uploading && !m.error);
        const slot = (i) => ready[i] ? ready[i].url : null;
        const type = (i) => ready[i] ? ready[i].type : null;
        const num = (el) => el.value.trim() === "" ? null : Number(el.value);
        return {
            name: fields.name.value.trim(),
            description: window.FirquiHtml.sanitize(fields.editor.innerHTML),
            measurement: fields.measurement.value.split(",").map(s => s.trim()).filter(Boolean),
            gemstone: fields.gemstone.value.trim(),
            material: fields.material.value.trim(),
            color: fields.color.value.trim(),
            productDetailsDescription: fields.details.value.trim(),
            productDetailsHighlights: highlightValues(),
            availability: availability(),
            restockDate: availability() === "Arriving Soon" ? (fields.restock.value || null) : null,
            stockQuantity: num(fields.stock) === null ? 0 : num(fields.stock),
            price: num(fields.price),
            comparePrice: num(fields.compare),
            category: fields.category.value || "",
            collection: fields.collection.value || "",
            sku: fields.sku.value.trim(),
            tags: fields.tags.value.trim(),
            mainImage: slot(0), mainMediaType: type(0),
            referenceImage1: slot(1), referenceMediaType1: type(1),
            referenceImage2: slot(2), referenceMediaType2: type(2),
            referenceImage3: slot(3), referenceMediaType3: type(3),
            referenceImage4: slot(4), referenceMediaType4: type(4),
            images: ready.map(m => m.url),
            status: statusOverride || (status === "NEW" ? "DRAFT" : status)
        };
    }

    function snapshot() {
        const data = collect();
        delete data.status;
        return JSON.stringify(data);
    }

    function setSelect(select, value) {
        if (!value) { select.value = ""; return; }
        const match = Array.from(select.options).find(o => o.value.toLowerCase() === String(value).toLowerCase());
        if (match) { select.value = match.value; return; }
        const opt = document.createElement("option");
        opt.value = opt.textContent = value;
        select.appendChild(opt);
        select.value = value;
    }

    function addHighlightRow(value) {
        const row = document.createElement("div");
        row.className = "highlight-row";
        row.innerHTML = `
            <span class="highlight-bullet"></span>
            <input type="text" class="highlight-input" maxlength="300" placeholder="e.g., Hypoallergenic, nickel free">
            <button type="button" class="remove-highlight-btn" aria-label="Remove highlight"><i class="fa-solid fa-xmark"></i></button>`;
        row.querySelector("input").value = value || "";
        row.querySelector("button").addEventListener("click", () => { row.remove(); changed(); });
        $("highlightsList").appendChild(row);
        return row;
    }

    function fill(p) {
        fields.name.value = p.name || "";
        fields.editor.innerHTML = window.FirquiHtml.sanitize(p.description || "");
        fields.measurement.value = (p.measurement || []).join(", ");
        fields.gemstone.value = p.gemstone || "";
        fields.material.value = p.material || "";
        fields.color.value = p.color || "";
        fields.details.value = p.productDetailsDescription || "";
        $("highlightsList").innerHTML = "";
        (p.productDetailsHighlights || []).forEach(h => addHighlightRow(h));
        if (!(p.productDetailsHighlights || []).length) addHighlightRow("");
        setAvailability(p.availability || "In Stock");
        fields.restock.value = p.restockDate || "";
        fields.stock.value = p.stockQuantity != null ? p.stockQuantity : "";
        fields.price.value = p.price ? p.price : "";
        fields.compare.value = p.comparePrice ? p.comparePrice : "";
        setSelect(fields.category, p.category ? titleCase(p.category) : "");
        setSelect(fields.collection, p.collection || "");
        fields.sku.value = p.sku || "";
        fields.tags.value = p.tags || "";

        const urls = [p.mainImage, p.referenceImage1, p.referenceImage2, p.referenceImage3, p.referenceImage4];
        const types = [p.mainMediaType, p.referenceMediaType1, p.referenceMediaType2, p.referenceMediaType3, p.referenceMediaType4];
        media = [];
        urls.forEach((u, i) => { if (u) media.push({ url: u, type: types[i] || mediaTypeOf(u) }); });
        renderMedia();
    }

    function titleCase(s) {
        return String(s).toLowerCase().replace(/(^|[\s&-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    }

    /* =====================================================
       VALIDATION (mirrors ProductRules on the server)
    ===================================================== */
    function validate(forPublish) {
        const errors = {};
        const d = collect();
        if (d.name.length < 2) errors.productName = "Please enter a product title (at least 2 characters).";
        if (media.some(m => m.uploading)) errors.media = "Please wait for the uploads to finish.";
        if (d.stockQuantity < 0 || !Number.isInteger(d.stockQuantity)) errors.stockQuantity = "Stock must be a whole number, 0 or more.";
        if (d.price !== null && d.price < 0) errors.price = "Price cannot be negative.";

        if (forPublish) {
            if (!d.mainImage) errors.media = errors.media || "Add at least one photo. The first one is the main photo in the shop.";
            if (!(d.price > 0)) errors.price = "Please enter a price above ₹0.";
            if (d.comparePrice && d.price && d.comparePrice <= d.price) errors.comparePrice = "Must be higher than the price, or left empty.";
            if (d.availability === "In Stock" && d.stockQuantity < 1) errors.stockQuantity = "An \"In Stock\" product needs at least 1. Or choose Out of Stock / Arriving Soon.";
            if (d.availability === "Arriving Soon") {
                const today = new Date().toISOString().slice(0, 10);
                if (!d.restockDate) errors.restockDate = "Please set the expected restock date.";
                else if (d.restockDate < today) errors.restockDate = "This date is in the past.";
            }
        }
        if (d.sku && !/^[A-Za-z0-9][A-Za-z0-9_\- ]{1,39}$/.test(d.sku)) errors.sku = "Letters, numbers, \"-\" and \"_\" only (2-40 characters).";
        return errors;
    }

    function showErrors(errors) {
        document.querySelectorAll(".pf-error").forEach(el => { el.textContent = ""; });
        document.querySelectorAll(".pf-invalid").forEach(el => el.classList.remove("pf-invalid"));
        let first = null;
        Object.entries(errors).forEach(([key, msg]) => {
            const slot = document.querySelector(`.pf-error[data-error-for="${key}"]`);
            if (slot) slot.textContent = msg;
            const input = $(key);
            if (input) {
                input.classList.add("pf-invalid");
                input.setAttribute("aria-invalid", "true");
            }
            if (!first) first = input || slot;
        });
        if (first) {
            first.scrollIntoView({ behavior: "smooth", block: "center" });
            if (first.focus) setTimeout(() => first.focus({ preventScroll: true }), 300);
        }
        return Object.keys(errors).length === 0;
    }

    // Server messages -> the field they are about
    function errorFieldFor(message) {
        const m = String(message || "").toLowerCase();
        if (m.includes("compare")) return "comparePrice";
        if (m.includes("price")) return "price";
        if (m.includes("restock")) return "restockDate";
        if (m.includes("stock")) return "stockQuantity";
        if (m.includes("sku")) return "sku";
        if (m.includes("title")) return "productName";
        return null;
    }

    function banner(message, kind) {
        const el = $("pfBanner");
        if (!message) { el.hidden = true; return; }
        el.textContent = message;
        el.className = "pf-banner " + (kind === "ok" ? "is-ok" : "is-error");
        el.hidden = false;
        if (kind !== "ok") el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    /* =====================================================
       SAVE
    ===================================================== */
    async function save(targetStatus, { auto = false } = {}) {
        if (saving) return false;
        const forPublish = targetStatus === "PUBLISHED";
        const errors = validate(forPublish);
        if (Object.keys(errors).length) {
            if (!auto) showErrors(errors);
            return false;
        }
        if (!auto) { showErrors({}); banner(""); }

        saving = true;
        setSavedText(auto ? "Saving draft..." : "Saving...");
        try {
            const body = collect(targetStatus);
            const res = await fetch(`${API_BASE}/api/admin/products${productId ? "/" + encodeURIComponent(productId) : ""}`, {
                method: productId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                const msg = data.message || data.error || `Could not save (error ${res.status}).`;
                if (auto) {
                    setSavedText("Draft not saved: " + msg);
                } else {
                    const field = errorFieldFor(msg);
                    if (field) showErrors({ [field]: msg }); else banner(msg);
                    setSavedText("");
                }
                return false;
            }
            const saved = data.product || data;
            const wasNew = !productId;
            productId = String(saved.id);
            status = saved.status || targetStatus;
            if (wasNew) {
                history.replaceState(null, "", "product-form.html?id=" + encodeURIComponent(productId));
                try { localStorage.removeItem("firqui_product_backup_new"); } catch (e) {}
            }
            if (!fields.sku.value.trim() && saved.sku) fields.sku.value = saved.sku;
            baseline = snapshot();
            try { localStorage.removeItem(backupKey()); } catch (e) {}
            lastSavedAt = new Date();
            renderStatus();
            setSavedText((status === "DRAFT" ? "Draft saved " : "Saved ") + lastSavedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
            return true;
        } catch (err) {
            setSavedText(auto ? "Offline: changes kept on this device." : "");
            if (!auto) banner("Could not reach the server. Your changes are kept on this device; try again in a moment.");
            return false;
        } finally {
            saving = false;
        }
    }

    async function setStatusOnly(target, confirmText) {
        if (isDirty()) {
            // Save the edits together with the status change
            const ok = await save(target);
            if (ok) banner(statusMessage(target), "ok");
            return;
        }
        if (confirmText && !confirm(confirmText)) return;
        try {
            const res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: target })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                const msg = data.message || "Could not change the status.";
                const field = errorFieldFor(msg);
                if (field) showErrors({ [field]: msg }); else banner(msg);
                return;
            }
            status = data.product.status;
            renderStatus();
            banner(statusMessage(target), "ok");
        } catch (e) {
            banner("Could not reach the server. Please try again.");
        }
    }

    function statusMessage(s) {
        return s === "PUBLISHED" ? "Published: the product is now in the shop."
            : s === "ARCHIVED" ? "Archived: hidden from the shop. Past orders keep their details."
            : "Moved to drafts: hidden from the shop.";
    }

    function setSavedText(text) {
        $("pfSaved").textContent = text;
        $("pfActionsState").textContent = text;
    }

    /* =====================================================
       STATUS UI
    ===================================================== */
    function renderStatus() {
        const badge = $("pfStatusBadge");
        const help = $("pfStatusHelp");
        const primary = $("pfPrimary");
        const draftBtn = $("pfSaveDraft");
        const secondary = $("pfSecondary");
        const labels = { NEW: "New", DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

        badge.textContent = labels[status] || status;
        badge.className = "pf-status-badge is-" + String(status).toLowerCase();
        $("pfTitle").textContent = status === "NEW" ? "Add Product" : "Edit Product";
        document.title = "Firqui Jewels | " + (status === "NEW" ? "Add Product" : "Edit Product");
        secondary.hidden = true;

        if (status === "NEW" || status === "DRAFT") {
            help.textContent = status === "NEW"
                ? "Not saved yet. It becomes a draft as soon as you type a title."
                : "Only admins can see this draft. Changes save automatically.";
            primary.textContent = "Publish";
            draftBtn.hidden = false;
            draftBtn.textContent = "Save draft";
        } else if (status === "PUBLISHED") {
            help.textContent = "Live in the shop. Changes go live when you save.";
            primary.textContent = "Save changes";
            draftBtn.hidden = false;
            draftBtn.textContent = "Unpublish";
            secondary.hidden = false;
            secondary.textContent = "Archive";
        } else if (status === "ARCHIVED") {
            help.textContent = "Hidden from the shop. Past orders keep their details.";
            primary.textContent = "Restore to shop";
            draftBtn.hidden = false;
            draftBtn.textContent = "Move to drafts";
        }
    }

    /* =====================================================
       DIRTY STATE, AUTOSAVE, BACKUP
    ===================================================== */
    function isDirty() {
        return baseline !== "" && snapshot() !== baseline;
    }

    function changed() {
        renderPreview();
        if (!isDirty()) return;
        try { localStorage.setItem(backupKey(), JSON.stringify({ at: Date.now(), data: collect() })); } catch (e) {}
        setSavedText(status === "PUBLISHED" || status === "ARCHIVED" ? "Unsaved changes" : "");
        if ((status === "NEW" || status === "DRAFT") && fields.name.value.trim().length >= 2) {
            clearTimeout(autosaveTimer);
            autosaveTimer = setTimeout(() => {
                if (!media.some(m => m.uploading) && isDirty()) save("DRAFT", { auto: true });
            }, AUTOSAVE_MS);
        }
    }

    window.addEventListener("beforeunload", (e) => {
        if (isDirty() || media.some(m => m.uploading)) {
            e.preventDefault();
            e.returnValue = "";
        }
    });

    function offerBackup() {
        let backup = null;
        try { backup = JSON.parse(localStorage.getItem(backupKey()) || "null"); } catch (e) {}
        if (!backup || !backup.data) return;
        const saved = baseline;
        const copy = Object.assign({}, backup.data);
        delete copy.status;
        if (JSON.stringify(copy) === saved) return;
        const when = new Date(backup.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        const el = $("pfBanner");
        el.className = "pf-banner is-info";
        el.innerHTML = `You have unsaved changes from ${esc(when)}. <button type="button" id="pfRestore">Restore them</button> <button type="button" id="pfDiscard">Discard</button>`;
        el.hidden = false;
        $("pfRestore").addEventListener("click", () => {
            fill(backup.data);
            el.hidden = true;
            changed();
        });
        $("pfDiscard").addEventListener("click", () => {
            try { localStorage.removeItem(backupKey()); } catch (e) {}
            el.hidden = true;
        });
    }

    /* =====================================================
       PREVIEW
    ===================================================== */
    function renderPreview() {
        const d = collect();
        const first = media.find(m => m.url || m.localUrl);
        const box = $("pfPreviewMedia");
        if (first) {
            const src = first.localUrl || resolveUrl(first.url);
            box.innerHTML = first.type === "video"
                ? `<video src="${esc(src)}" muted playsinline autoplay loop></video>`
                : `<img src="${esc(src)}" alt="">`;
        } else {
            box.innerHTML = '<i class="fa-regular fa-image"></i>';
        }
        $("pfPreviewName").textContent = d.name || "Product title";
        $("pfPreviewCat").textContent = d.category || d.collection || "";
        const desc = window.FirquiHtml.text(d.description);
        $("pfPreviewDesc").textContent = desc.length > 90 ? desc.slice(0, 90) + "..." : desc;
        $("pfPreviewPrice").textContent = rupees(d.price || 0);
        $("pfPreviewCompare").textContent = d.comparePrice && d.price && d.comparePrice > d.price ? rupees(d.comparePrice) : "";
        const stock = $("pfPreviewStock");
        if (d.availability === "Out of Stock") { stock.textContent = "Out of stock"; stock.className = "pf-preview-stock is-out"; }
        else if (d.availability === "Arriving Soon") { stock.textContent = "Pre-order"; stock.className = "pf-preview-stock is-pre"; }
        else if (d.stockQuantity > 0 && d.stockQuantity <= 3) { stock.textContent = "Only " + d.stockQuantity + " left"; stock.className = "pf-preview-stock is-low"; }
        else { stock.textContent = ""; stock.className = "pf-preview-stock"; }

        const help = $("discountHelp");
        if (d.comparePrice && d.price && d.comparePrice > d.price) {
            help.textContent = Math.round((1 - d.price / d.comparePrice) * 100) + "% off will be shown.";
        } else {
            help.textContent = "Shown crossed out when higher than the price.";
        }
    }

    /* =====================================================
       MEDIA MANAGER
    ===================================================== */
    const grid = $("pfMediaGrid");
    let dragIndex = null;

    function renderMedia() {
        grid.innerHTML = "";
        media.forEach((m, i) => {
            const tile = document.createElement("div");
            tile.className = "pf-media-tile" + (i === 0 ? " is-main" : "") + (m.error ? " has-error" : "");
            tile.draggable = !m.uploading;
            tile.dataset.index = i;
            const src = m.localUrl || resolveUrl(m.url);
            tile.innerHTML = `
                <div class="pf-media-thumb">
                    ${m.type === "video"
                        ? `<video src="${esc(src)}" muted playsinline preload="metadata"></video><span class="pf-media-kind"><i class="fa-solid fa-video"></i></span>`
                        : `<img src="${esc(src)}" alt="Product media ${i + 1}">`}
                    ${i === 0 ? '<span class="pf-media-main">Main</span>' : ""}
                    ${m.uploading ? `<div class="pf-media-progress"><span style="width:${m.progress || 0}%"></span><em>${m.progress || 0}%</em></div>` : ""}
                    ${m.error ? `<div class="pf-media-failed">${esc(m.error)}</div>` : ""}
                </div>
                <div class="pf-media-tools">
                    <button type="button" data-act="left" aria-label="Move earlier" ${i === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-left"></i></button>
                    <button type="button" data-act="main" aria-label="Make main photo" ${i === 0 ? "disabled" : ""}><i class="fa-solid fa-star"></i></button>
                    <button type="button" data-act="right" aria-label="Move later" ${i === media.length - 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-right"></i></button>
                    <button type="button" data-act="remove" aria-label="Remove"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            grid.appendChild(tile);
        });
        $("pfMediaCount").textContent = media.length + " / " + MAX_MEDIA;
        $("pfDropzone").hidden = media.length >= MAX_MEDIA;
        renderPreview();
    }

    function move(from, to) {
        if (to < 0 || to >= media.length || from === to) return;
        const [item] = media.splice(from, 1);
        media.splice(to, 0, item);
        renderMedia();
        changed();
    }

    grid.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const i = Number(btn.closest(".pf-media-tile").dataset.index);
        const act = btn.dataset.act;
        if (act === "left") move(i, i - 1);
        else if (act === "right") move(i, i + 1);
        else if (act === "main") move(i, 0);
        else if (act === "remove") {
            const [gone] = media.splice(i, 1);
            if (gone && gone.localUrl) URL.revokeObjectURL(gone.localUrl);
            if (gone && gone.xhr) gone.xhr.abort();
            renderMedia();
            changed();
        }
    });

    grid.addEventListener("dragstart", (e) => {
        const tile = e.target.closest(".pf-media-tile");
        if (!tile) return;
        dragIndex = Number(tile.dataset.index);
        tile.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
    });
    grid.addEventListener("dragover", (e) => {
        if (dragIndex === null) return;
        e.preventDefault();
    });
    grid.addEventListener("drop", (e) => {
        const tile = e.target.closest(".pf-media-tile");
        if (dragIndex === null || !tile) return;
        e.preventDefault();
        move(dragIndex, Number(tile.dataset.index));
        dragIndex = null;
    });
    grid.addEventListener("dragend", () => { dragIndex = null; });

    function checkFile(file) {
        const isVideo = /^video\/(mp4|webm)$/.test(file.type) || /\.(mp4|webm)$/i.test(file.name);
        const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
        if (!isVideo && !isImage) return `"${file.name}" is not a supported photo or video.`;
        if (isVideo && file.size > 50 * 1024 * 1024) return `"${file.name}" is larger than 50 MB.`;
        return null;
    }

    function upload(item, file) {
        return new Promise((resolve) => {
            const fd = new FormData();
            fd.append("file", file);
            const xhr = new XMLHttpRequest();
            item.xhr = xhr;
            xhr.open("POST", `${API_BASE}/api/admin/media/upload`);
            xhr.withCredentials = true;                           // session cookie
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.upload.onprogress = (e) => {
                if (!e.lengthComputable) return;
                item.progress = Math.round(e.loaded / e.total * 100);
                const bar = grid.querySelector(`.pf-media-tile[data-index="${media.indexOf(item)}"] .pf-media-progress`);
                if (bar) {
                    bar.querySelector("span").style.width = item.progress + "%";
                    bar.querySelector("em").textContent = item.progress + "%";
                }
            };
            xhr.onload = () => {
                let data = {};
                try { data = JSON.parse(xhr.responseText); } catch (e) {}
                if (xhr.status >= 200 && xhr.status < 300 && data.url) {
                    item.url = data.url;
                    item.type = data.mediaType || item.type;
                } else {
                    item.error = data.message || data.error || "Upload failed";
                }
                resolve();
            };
            xhr.onerror = () => { item.error = "Upload failed"; resolve(); };
            xhr.onabort = () => resolve();
            xhr.send(fd);
        });
    }

    async function addFiles(fileList) {
        const files = Array.from(fileList);
        const room = MAX_MEDIA - media.length;
        const errs = [];
        if (files.length > room) errs.push(`Only ${MAX_MEDIA} photos/videos per product; the extra ${files.length - room} were skipped.`);

        const jobs = [];
        for (const original of files.slice(0, Math.max(room, 0))) {
            const problem = checkFile(original);
            if (problem) { errs.push(problem); continue; }
            const item = { type: mediaTypeOf(original), uploading: true, progress: 0, localUrl: URL.createObjectURL(original) };
            media.push(item);
            jobs.push((async () => {
                const file = window.FirquiImage ? await window.FirquiImage.compress(original, { maxDimension: 2000, quality: 0.85 }) : original;
                if (file.size > 10 * 1024 * 1024 && item.type === "image") {
                    item.error = "Photo is still larger than 10 MB";
                } else {
                    await upload(item, file);
                }
                item.uploading = false;
                renderMedia();
            })());
        }
        renderMedia();
        document.querySelector('.pf-error[data-error-for="media"]').textContent = errs.join(" ");
        await Promise.all(jobs);
        // Failed uploads stay visible with their message until removed
        changed();
    }

    $("pfMediaInput").addEventListener("change", (e) => {
        addFiles(e.target.files);
        e.target.value = "";
    });

    const dropzone = $("pfDropzone");
    ["dragenter", "dragover"].forEach(ev => dropzone.addEventListener(ev, (e) => {
        if (dragIndex !== null) return;
        e.preventDefault();
        dropzone.classList.add("is-over");
    }));
    ["dragleave", "drop"].forEach(ev => dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove("is-over");
    }));
    dropzone.addEventListener("drop", (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });

    /* =====================================================
       EDITOR
    ===================================================== */
    document.querySelectorAll(".editor-toolbar button[data-command]").forEach(btn => {
        btn.addEventListener("mousedown", (e) => e.preventDefault()); // keep the selection
        btn.addEventListener("click", () => {
            document.execCommand(btn.dataset.command, false, null);
            fields.editor.focus();
            changed();
        });
    });
    // Pasting from Word or a website brings styles and links; keep plain text
    fields.editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
    });

    /* =====================================================
       EVENTS
    ===================================================== */
    form.addEventListener("input", (e) => {
        if (e.target.id) {
            e.target.classList.remove("pf-invalid");
            e.target.removeAttribute("aria-invalid");
            const slot = document.querySelector(`.pf-error[data-error-for="${e.target.id}"]`);
            if (slot) slot.textContent = "";
        }
        changed();
    });
    form.addEventListener("change", (e) => {
        if (e.target.name === "availability") syncAvailabilityUi();
        changed();
    });
    $("addHighlight").addEventListener("click", () => { addHighlightRow("").querySelector("input").focus(); });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearTimeout(autosaveTimer);
        const ok = await save("PUBLISHED");
        if (ok) banner(statusMessage("PUBLISHED").replace("Published: the", "Saved. The"), "ok");
    });

    $("pfSaveDraft").addEventListener("click", async () => {
        clearTimeout(autosaveTimer);
        if (status === "PUBLISHED") {
            setStatusOnly("DRAFT", "Take this product out of the shop and keep it as a draft?");
        } else if (status === "ARCHIVED") {
            setStatusOnly("DRAFT");
        } else {
            await save("DRAFT");
        }
    });

    $("pfSecondary").addEventListener("click", () => {
        if (status === "PUBLISHED") {
            setStatusOnly("ARCHIVED", "Archive this product? It disappears from the shop; past orders keep their details. You can restore it later.");
        }
    });

    /* =====================================================
       START
    ===================================================== */
    async function start() {
        syncAvailabilityUi();
        if (!productId) {
            addHighlightRow("");
            renderMedia();
            baseline = snapshot();
            renderStatus();
            offerBackup();
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(productId)}`);
            if (!res.ok) throw new Error(res.status === 404 ? "This product no longer exists." : "Could not load the product.");
            const p = await res.json();
            productId = String(p.id);
            status = p.status || (p.active === false ? "ARCHIVED" : "PUBLISHED");
            fill(p);
            baseline = snapshot();
            renderStatus();
            offerBackup();
        } catch (err) {
            banner(err.message || "Could not load the product.");
            form.querySelectorAll("input, textarea, select, button").forEach(el => { el.disabled = true; });
        }
    }

    // Category/collection lists load in parallel (catalog-options.js); fill() keeps the saved value either way
    start();
});
