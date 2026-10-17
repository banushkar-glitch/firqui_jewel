/**
 * FIRQUI JEWELS - sign-in session (loaded in <head> on every page, before other scripts)
 *
 * The login token lives in an HttpOnly cookie set by the backend, so no script on the
 * page can read or steal it. This file:
 *  - defines window.FIRQUI_API_BASE (same host as the page, so the cookie is sent);
 *  - makes every API request carry the cookie and the X-Requested-With header;
 *  - exposes window.FirquiAuth for "who is signed in", logout and page guards;
 *  - hides pages marked <html data-auth="user"> or data-auth="admin" until the
 *    server confirms the session, and sends visitors to the login page otherwise.
 *
 * localStorage "firqui_user" only caches the name/role for the header; it grants nothing.
 */
(function () {
    "use strict";

    var loc = window.location;
    var isLocal = ["localhost", "127.0.0.1", ""].indexOf(loc.hostname) !== -1;
    var API_BASE = isLocal && loc.port !== "8080"
        ? (loc.protocol === "file:" ? "http://localhost:8080" : loc.protocol + "//" + loc.hostname + ":8080")
        : "";
    window.FIRQUI_API_BASE = API_BASE;

    var SCRIPT_SRC = document.currentScript ? document.currentScript.src : "";
    var ROOT = SCRIPT_SRC ? new URL("../", SCRIPT_SRC).href : loc.origin + "/";
    var USER_KEY = "firqui_user";
    var API_ORIGIN = API_BASE ? new URL(API_BASE).origin : loc.origin;

    // Tokens are no longer kept in browser storage; drop any left from older versions
    try { localStorage.removeItem("firqui_token"); } catch (e) {}

    /* =====================================================
       API REQUESTS: send the session cookie
    ===================================================== */
    function isApiUrl(url) {
        try {
            var u = new URL(url, loc.href);
            return u.origin === API_ORIGIN && u.pathname.indexOf("/api/") === 0;
        } catch (e) {
            return false;
        }
    }

    var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch) {
        window.fetch = function (input, init) {
            var url = typeof input === "string" ? input : (input && input.url) || String(input);
            if (!isApiUrl(url)) return nativeFetch(input, init);

            var options = Object.assign({}, init || {});
            var headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
            headers.delete("Authorization"); // the cookie is the only credential
            headers.set("X-Requested-With", "XMLHttpRequest");
            options.headers = headers;
            options.credentials = "include";

            return nativeFetch(input, options).then(function (res) {
                if (res.status === 401 && url.indexOf("/api/auth/") === -1 && readUser()) {
                    // The session ended (expired, password changed, logged out elsewhere)
                    clearLocal();
                    if (document.documentElement.hasAttribute("data-auth")) goToLogin();
                }
                return res;
            });
        };
    }

    /* =====================================================
       SESSION STATE
    ===================================================== */
    function readUser() {
        try {
            var u = JSON.parse(localStorage.getItem(USER_KEY) || "null");
            return u && u.email ? u : null;
        } catch (e) {
            return null;
        }
    }

    function storeUser(u) {
        try {
            localStorage.setItem(USER_KEY, JSON.stringify({ name: u.name, email: u.email, role: u.role || "USER" }));
        } catch (e) {}
    }

    function clearLocal() {
        // Remove everything tied to the signed-in person so the next user starts clean
        ["firqui_user", "firquiCustomer", "firquiCart", "firquiWishlist", "firquiOrders", "firqui_token"].forEach(function (k) {
            try { localStorage.removeItem(k); } catch (e) {}
        });
        try { sessionStorage.removeItem("firqui_pending_checkout"); } catch (e) {}
    }

    function isAdminRole(role) {
        var r = String(role || "").toUpperCase();
        return r === "ADMIN" || r === "ROLE_ADMIN";
    }

    var refreshing = null;
    function refresh() {
        if (!refreshing) {
            refreshing = fetch(API_BASE + "/api/auth/session", { cache: "no-store" })
                .then(function (res) { return res.ok ? res.json() : { authenticated: false }; })
                .then(function (data) {
                    if (data && data.authenticated) {
                        storeUser(data);
                        return readUser();
                    }
                    if (readUser()) clearLocal();
                    return null;
                })
                .catch(function () {
                    // Backend unreachable: keep what we know rather than signing the person out
                    return readUser();
                });
        }
        return refreshing;
    }

    function safeNext(next) {
        if (!next) return null;
        try {
            var u = new URL(next, loc.href);
            // Only pages on this site, and never back to the login/register pages
            if (u.origin !== loc.origin || /\/authentication\/(login|register)\.html$/.test(u.pathname)) return null;
            return u.pathname + u.search + u.hash;
        } catch (e) {
            return null;
        }
    }

    function loginUrl(next) {
        var target = next || (loc.pathname + loc.search);
        return ROOT + "authentication/login.html?next=" + encodeURIComponent(target);
    }

    function goToLogin(next) {
        loc.href = loginUrl(next);
    }

    function logout() {
        var done = function () {
            clearLocal();
            loc.href = ROOT + "index.html";
        };
        return fetch(API_BASE + "/api/auth/logout", { method: "POST" }).then(done, done);
    }

    window.FirquiAuth = {
        root: ROOT,
        user: readUser,
        isSignedIn: function () { return !!readUser(); },
        isAdmin: function () { var u = readUser(); return !!u && isAdminRole(u.role); },
        isAdminRole: isAdminRole,
        setUser: storeUser,
        clear: clearLocal,
        refresh: refresh,
        logout: logout,
        loginUrl: loginUrl,
        goToLogin: goToLogin,
        safeNext: safeNext,
        // Older page scripts check a "token" to decide whether someone is signed in.
        // The real token is in the HttpOnly cookie; this is only a yes/no marker.
        token: function () { return readUser() ? "cookie-session" : null; }
    };

    /* =====================================================
       PAGE GUARD: <html data-auth="user"> or data-auth="admin"
    ===================================================== */
    var required = document.documentElement.getAttribute("data-auth");
    if (required) {
        var style = document.createElement("style");
        style.textContent = "html.auth-checking body{visibility:hidden}";
        document.head.appendChild(style);
        document.documentElement.classList.add("auth-checking");

        refresh().then(function (user) {
            if (!user) {
                goToLogin();
                return;
            }
            if (required === "admin" && !isAdminRole(user.role)) {
                loc.href = ROOT + "index.html";
                return;
            }
            document.documentElement.classList.remove("auth-checking");
        });
    } else {
        // Keep the header's signed-in state honest on public pages too
        refresh();
    }
})();
