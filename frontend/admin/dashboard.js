/* =====================================================
   FIRQUI JEWELS
   ADMIN DASHBOARD JAVASCRIPT
===================================================== */

document.addEventListener("DOMContentLoaded", function () {


    /* =================================================
       DASHBOARD COUNTS
    ================================================== */

    const productCount =
        document.getElementById("productCount");

    const categoryCount =
        document.getElementById("categoryCount");

    const collectionCount =
        document.getElementById("collectionCount");

    const orderCount =
        document.getElementById("orderCount");


    const API_BASE = window.FIRQUI_API_BASE;
    const token = window.FirquiAuth.token();
    const authHeaders = token ? { "Authorization": `Bearer ${token}` } : {};

    function setCount(el, value) {
        if (el) el.textContent = String(value).padStart(2, "0");
    }

    function getJson(path, withAuth) {
        return fetch(`${API_BASE}${path}`, { headers: withAuth ? authHeaders : {} })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    [productCount, categoryCount, collectionCount, orderCount].forEach(el => { if (el) el.textContent = "--"; });

    getJson("/api/admin/products").then(products => {
        if (!Array.isArray(products)) return;
        setCount(productCount, products.length);
        renderRecentProducts(products);
    });
    getJson("/api/categories").then(list => { if (Array.isArray(list)) setCount(categoryCount, list.length); });
    getJson("/api/collections").then(list => { if (Array.isArray(list)) setCount(collectionCount, list.length); });
    getJson("/api/admin/orders", true).then(list => { if (Array.isArray(list)) setCount(orderCount, list.length); });

    function renderRecentProducts(products) {
        const body = document.getElementById("recentProductsBody");
        if (!body) return;
        const latest = products.slice().sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 5);
        if (latest.length === 0) {
            body.innerHTML = '<tr><td colspan="6">No products yet. Use "Add Product" to create one.</td></tr>';
            return;
        }
        body.innerHTML = latest.map(p => `
            <tr>
                <td>
                    <div class="product-info">
                        <div class="product-image"><i class="fa-solid fa-gem"></i></div>
                        <div>
                            <strong>${escapeHtml(p.name)}</strong>
                            <small>Product #${String(p.id).padStart(3, "0")}</small>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(p.category || "-")}</td>
                <td>${escapeHtml(p.collection || "-")}</td>
                <td>&#8377;${Number(p.price || 0).toLocaleString("en-IN")}</td>
                <td><span class="status ${p.active === false ? "inactive" : "active"}">${p.active === false ? "Inactive" : "Active"}</span></td>
                <td><a class="table-action" href="edit-product.html?id=${encodeURIComponent(p.id)}" aria-label="Edit ${escapeHtml(p.name)}"><i class="fa-solid fa-pen"></i></a></td>
            </tr>`).join("");
    }

    /* =================================================
       EDIT PRODUCT BUTTONS
    ================================================== */

    const editButtons =
        document.querySelectorAll(".edit-btn");


    editButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const productName =
                button.getAttribute("data-product");


            if (!productName) {

                return;

            }


            /*
               Demo behaviour.

               Later this can redirect to:

               products/edit-product.html?id=PRODUCT_ID
            */

            alert(
                "Edit Product: " + productName
            );

        });

    });



    /* =================================================
       ADMIN BUTTON
    ================================================== */

    const adminButton =
        document.getElementById("adminButton");


    if (adminButton) {

        adminButton.addEventListener("click", function () {

            alert(
                "Admin profile will be available here."
            );

        });

    }



    /* =================================================
       SEARCH BUTTON
    ================================================== */

    const searchButton =
        document.getElementById("searchButton");


    if (searchButton) {

        searchButton.addEventListener("click", function (e) {
            e.preventDefault();
            if (window.FirquiAdminSearch) {
                window.FirquiAdminSearch.open();
            }
        });

    }



    /* =================================================
       NOTIFICATION BUTTON
    ================================================== */

    const notificationButton =
        document.getElementById("notificationButton");


    if (notificationButton) {

        notificationButton.addEventListener("click", function () {

            alert(
                "You have no new notifications."
            );

        });

    }



    /* =================================================
       LOGOUT
    ================================================== */

    const logoutButton =
        document.getElementById("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener("click", function () {

            const confirmLogout =
                confirm(
                    "Are you sure you want to logout?"
                );


            if (confirmLogout) {

                /*
                   For the client demo, redirect
                   back to the existing login page.

                   Adjust the path if your signin.html
                   is located somewhere else.
                */

                window.location.href =
                    "../authentication/login.html";

            }

        });

    }



    /* =================================================
       NEWSLETTER
    ================================================== */

    const newsletterForm =
        document.getElementById("newsletterForm");

    const newsletterMsg =
        document.getElementById("newsletterMsg");


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const email =
                    document
                        .getElementById("newsletterEmail")
                        .value
                        .trim();


                if (!email) {

                    newsletterMsg.textContent =
                        "Please enter your email.";

                    return;

                }


                newsletterMsg.textContent =
                    "Thank you for subscribing!";


                newsletterForm.reset();

            }
        );

    }


});