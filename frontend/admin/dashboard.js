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


    /*
       STATIC DEMO DATA

       Later these values can come from
       Spring Boot + PostgreSQL.
    */

    const dashboardData = {

        products: 24,

        categories: 6,

        collections: 4,

        orders: 12

    };


    if (productCount) {
        productCount.textContent =
            String(dashboardData.products).padStart(2, "0");

        const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";
        fetch(`${API_BASE}/api/admin/products`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (Array.isArray(data)) {
                    productCount.textContent = String(data.length).padStart(2, "0");
                }
            })
            .catch(() => {});
    }


    if (categoryCount) {

        categoryCount.textContent =
            String(dashboardData.categories).padStart(2, "0");

    }


    if (collectionCount) {

        collectionCount.textContent =
            String(dashboardData.collections).padStart(2, "0");

    }


    if (orderCount) {

        orderCount.textContent =
            String(dashboardData.orders).padStart(2, "0");

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