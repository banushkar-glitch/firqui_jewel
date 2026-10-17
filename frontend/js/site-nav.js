/**
 * FIRQUI JEWELS - shared site chrome
 * Loaded on every page. Adds the mobile menu, the header cart badge,
 * fixes the "Categories" link on pages without a categories section,
 * and swaps broken images for a placeholder.
 */
(function () {
    "use strict";

    // js/site-nav.js lives one level below the site root
    const SCRIPT_SRC = document.currentScript ? document.currentScript.src : "";
    const ROOT = SCRIPT_SRC ? new URL("../", SCRIPT_SRC).href : "/";
    const PLACEHOLDER = ROOT + "assets/Logo%20Pink%201.png";

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080"
        ? "http://localhost:8080"
        : "";

    const CATEGORIES = [
        ["Rings", "products/rings.html"],
        ["Earrings", "products/earrings.html"],
        ["Necklaces", "products/necklaces.html"],
        ["Bracelets & Cuffs", "products/bracelets_cuffs.html"],
        ["Brooches", "products/brooches.html"]
    ];

    /* =====================================================
       BROKEN IMAGES -> PLACEHOLDER
    ===================================================== */
    function useFallback(img) {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = "true";
        img.classList.add("img-fallback");
        img.src = PLACEHOLDER;
    }

    document.addEventListener("error", function (e) {
        if (e.target instanceof HTMLImageElement) useFallback(e.target);
    }, true);

    function checkImage(img) {
        if (img.complete) {
            if (img.naturalWidth === 0 && img.getAttribute("src")) useFallback(img);
        } else {
            img.addEventListener("error", function () { useFallback(img); }, { once: true });
        }
    }

    // Images that already failed before this script ran, plus images that scripts
    // build off-page and insert later (their error event never reaches the document)
    function replaceFailedImages() {
        Array.prototype.forEach.call(document.images, checkImage);
        new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === "IMG") checkImage(node);
                    else if (node.querySelectorAll) node.querySelectorAll("img").forEach(checkImage);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    /* =====================================================
       CART BADGE
    ===================================================== */
    function readCartCount() {
        try {
            const items = JSON.parse(localStorage.getItem("firquiCart") || "[]");
            if (!Array.isArray(items)) return 0;
            return items.reduce(function (sum, item) {
                return sum + (parseInt(item.quantity, 10) || 1);
            }, 0);
        } catch (e) {
            return 0;
        }
    }

    function findCartButton() {
        return document.getElementById("cartHeaderButton") ||
            document.querySelector('.header-icons [aria-label="Shopping Cart"]') ||
            document.querySelector('.header-icons [href*="cart.html"]') ||
            document.querySelector('.header-icons [onclick*="cart.html"]');
    }

    function updateCartBadge() {
        const cartBtn = findCartButton();
        if (!cartBtn) return;

        let badge = cartBtn.querySelector(".cart-count-badge");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "cart-count-badge";
            badge.setAttribute("aria-hidden", "true");
            cartBtn.appendChild(badge);
        }

        const count = readCartCount();
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.hidden = count === 0;
    }

    async function syncCartFromServer() {
        const token = localStorage.getItem("firqui_token");
        if (!token) return;
        try {
            const res = await fetch(API_BASE + "/api/cart", {
                headers: { "Authorization": "Bearer " + token }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data && Array.isArray(data.items)) {
                localStorage.setItem("firquiCart", JSON.stringify(data.items));
                updateCartBadge();
            }
        } catch (e) {
            // Offline or backend unavailable: keep the locally stored count
        }
    }

    window.FirquiCartBadge = { update: updateCartBadge, sync: syncCartFromServer };

    window.addEventListener("storage", function (e) {
        if (e.key === "firquiCart") updateCartBadge();
    });

    /* =====================================================
       NEWSLETTER SIGN-UP (footer form on every page)
    ===================================================== */
    function newsletterMessage(form) {
        let msg = document.getElementById("newsletterMsg");
        if (!msg || !form.parentNode.contains(msg)) {
            msg = form.parentNode.querySelector(".newsletter-message");
        }
        if (!msg) {
            msg = document.createElement("p");
            msg.className = "newsletter-message";
            msg.setAttribute("role", "status");
            form.insertAdjacentElement("afterend", msg);
        }
        // Some pages ship their own hidden message box; make sure it can be seen
        msg.classList.add("newsletter-message");
        msg.style.display = "block";
        return msg;
    }

    // Capture phase on window runs before the pages' own (placeholder) handlers
    window.addEventListener("submit", async function (e) {
        const form = e.target;
        if (!(form instanceof HTMLFormElement) || !form.matches(".newsletter-form, #newsletterForm")) return;
        e.preventDefault();
        e.stopPropagation();

        const input = form.querySelector('input[type="email"]');
        const button = form.querySelector('button[type="submit"], button');
        const msg = newsletterMessage(form);
        const email = input ? input.value.trim() : "";

        msg.classList.remove("is-error", "is-success");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            msg.textContent = "Please enter a valid email address.";
            msg.classList.add("is-error");
            return;
        }

        if (button) button.disabled = true;
        msg.textContent = "Subscribing...";
        try {
            const res = await fetch(API_BASE + "/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, source: window.location.pathname })
            });
            const data = await res.json().catch(function () { return {}; });
            if (!res.ok || !data.success) throw new Error(data.message || "Could not subscribe right now.");
            msg.textContent = data.message || "Thank you for subscribing!";
            msg.classList.add("is-success");
            form.reset();
        } catch (err) {
            msg.textContent = err && err.message && !/fetch|network/i.test(err.message)
                ? err.message
                : "Could not subscribe right now. Please try again in a moment.";
            msg.classList.add("is-error");
        } finally {
            if (button) button.disabled = false;
        }
    }, true);

    /* =====================================================
       "CATEGORIES" LINK
    ===================================================== */
    function fixCategoriesLink() {
        // Only the home page has the category tiles; elsewhere #categories is just the product grid
        if (document.querySelector("section.categories#categories")) return;
        document.querySelectorAll('.navigation a[href="#categories"], footer a[href="#categories"], .lower-section a[href="#categories"]').forEach(function (a) {
            a.href = ROOT + "index.html#categories";
        });
    }

    /* =====================================================
       MOBILE MENU
    ===================================================== */
    function linkLabel(a) {
        return (a.textContent || "").replace(/\s+/g, " ").trim();
    }

    function buildMobileMenu() {
        const header = document.querySelector(".header");
        const nav = header && header.querySelector(".navigation");
        const icons = header && header.querySelector(".header-icons");
        if (!nav || !icons || document.getElementById("mobileMenu")) return;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "header-icon-btn mobile-menu-toggle";
        toggle.setAttribute("aria-label", "Open menu");
        toggle.setAttribute("aria-controls", "mobileMenu");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = '<span class="mobile-menu-bars" aria-hidden="true"><span></span><span></span><span></span></span>';
        icons.appendChild(toggle);

        const overlay = document.createElement("div");
        overlay.className = "mobile-menu-overlay";
        overlay.hidden = true;

        const panel = document.createElement("nav");
        panel.className = "mobile-menu";
        panel.id = "mobileMenu";
        panel.setAttribute("aria-label", "Site menu");
        panel.hidden = true;

        const head = document.createElement("div");
        head.className = "mobile-menu-head";
        const logo = header.querySelector(".header-logo img");
        head.innerHTML = '<img src="' + (logo ? logo.src : PLACEHOLDER) + '" alt="FIRQUI JEWELS" class="mobile-menu-logo">' +
            '<button type="button" class="mobile-menu-close" aria-label="Close menu"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
        panel.appendChild(head);

        const list = document.createElement("ul");
        list.className = "mobile-menu-list";
        const here = window.location.pathname.replace(/\/+$/, "");

        nav.querySelectorAll("a").forEach(function (a) {
            const label = linkLabel(a);
            if (!label) return;
            const li = document.createElement("li");

            if (/^categories$/i.test(label)) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "mobile-menu-link mobile-menu-expand";
                btn.setAttribute("aria-expanded", "false");
                btn.innerHTML = "<span>Categories</span>" + '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
                const sub = document.createElement("ul");
                sub.className = "mobile-menu-sub";
                sub.hidden = true;
                CATEGORIES.forEach(function (c) {
                    const sli = document.createElement("li");
                    const sa = document.createElement("a");
                    sa.href = ROOT + c[1];
                    sa.textContent = c[0];
                    if (new URL(sa.href).pathname === here) sa.classList.add("is-current");
                    sli.appendChild(sa);
                    sub.appendChild(sli);
                });
                btn.addEventListener("click", function () {
                    const open = btn.getAttribute("aria-expanded") === "true";
                    btn.setAttribute("aria-expanded", String(!open));
                    sub.hidden = open;
                });
                li.appendChild(btn);
                li.appendChild(sub);
            } else {
                const link = document.createElement("a");
                link.className = "mobile-menu-link";
                link.href = a.href;
                link.textContent = label;
                const target = new URL(a.href, window.location.href);
                if (target.pathname.replace(/\/+$/, "") === here && !target.hash) link.classList.add("is-current");
                li.appendChild(link);
            }
            list.appendChild(li);
        });
        panel.appendChild(list);

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        let lastFocus = null;

        function openMenu() {
            lastFocus = document.activeElement;
            overlay.hidden = false;
            panel.hidden = false;
            // next frame so the slide-in transition runs
            requestAnimationFrame(function () {
                document.documentElement.classList.add("mobile-menu-open");
            });
            toggle.setAttribute("aria-expanded", "true");
            const first = panel.querySelector(".mobile-menu-close");
            if (first) first.focus();
        }

        function closeMenu() {
            document.documentElement.classList.remove("mobile-menu-open");
            toggle.setAttribute("aria-expanded", "false");
            setTimeout(function () {
                if (!document.documentElement.classList.contains("mobile-menu-open")) {
                    overlay.hidden = true;
                    panel.hidden = true;
                }
            }, 300);
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        toggle.addEventListener("click", openMenu);
        overlay.addEventListener("click", closeMenu);
        head.querySelector(".mobile-menu-close").addEventListener("click", closeMenu);
        panel.addEventListener("click", function (e) {
            if (e.target.closest("a")) closeMenu();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && document.documentElement.classList.contains("mobile-menu-open")) closeMenu();
        });
        window.addEventListener("resize", function () {
            if (window.innerWidth > 960 && document.documentElement.classList.contains("mobile-menu-open")) closeMenu();
        });
    }

    function init() {
        replaceFailedImages();
        fixCategoriesLink();
        buildMobileMenu();
        updateCartBadge();
        syncCartFromServer();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
