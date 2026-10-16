/* =====================================================
   FIRQUI JEWELS
   ADMIN PRODUCTS
===================================================== */


document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       PRODUCTS DATA (LOCAL STORAGE + DEFAULTS)
    ====================================================== */

    const initialProducts = [

        {
            id: 1,
            name: "Golden Grace",
            category: "Bracelets & Cuffs",
            collection: "Signature",
            price: 1499,
            stock: 18,
            status: "Active"
        },

        {
            id: 2,
            name: "Pearl Shine",
            category: "Necklaces",
            collection: "Pearl Collection",
            price: 1899,
            stock: 12,
            status: "Active"
        },

        {
            id: 3,
            name: "Rose Charm",
            category: "Earrings",
            collection: "Rose Collection",
            price: 999,
            stock: 24,
            status: "Active"
        },

        {
            id: 4,
            name: "Classic Aura",
            category: "Rings",
            collection: "Classic Collection",
            price: 1299,
            stock: 8,
            status: "Active"
        },

        {
            id: 5,
            name: "Blush Bloom",
            category: "Bangles",
            collection: "Rose Collection",
            price: 1599,
            stock: 3,
            status: "Active"
        },

        {
            id: 6,
            name: "Moonlight Pearl",
            category: "Necklaces",
            collection: "Pearl Collection",
            price: 2199,
            stock: 0,
            status: "Inactive"
        }

    ];

    let localProducts = [];
    try {
        localProducts =
            JSON.parse(
                localStorage.getItem("firquiProducts")
            ) || [];
    } catch (e) {
        localProducts = [];
    }

    let products = [...initialProducts];

    function mergeProducts(incomingList) {
        if (!incomingList || incomingList.length === 0) return;
        incomingList.forEach(item => {
            const itemId = item.id || item.legacyId;
            const idx = products.findIndex(p => String(p.id) === String(itemId) || (item.legacyId && String(p.id) === String(item.legacyId)));
            const formatted = {
                id: itemId,
                name: item.name || item.productName || "Product",
                category: item.category || "General",
                collection: item.collection || "Signature",
                price: Number(item.price) || 0,
                stock: item.stockQuantity !== undefined ? item.stockQuantity : (item.stock || 10),
                status: (item.availability === "Out of Stock" || item.active === false) ? "Inactive" : "Active"
            };
            if (idx !== -1) {
                products[idx] = { ...products[idx], ...formatted };
            } else {
                products.unshift(formatted);
            }
        });
    }

    if (localProducts.length > 0) {
        mergeProducts(localProducts);
    }

    const API_BASE = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) && window.location.port !== "8080" ? "http://localhost:8080" : "";

    async function getAdminToken() {
        let token = localStorage.getItem("firqui_token");
        let userObj = null;
        try { userObj = JSON.parse(localStorage.getItem("firqui_user") || "{}"); } catch (_) {}
        const isAdmin = userObj && (userObj.role === "ADMIN" || userObj.role === "ROLE_ADMIN");

        // No valid admin session: send to the login page
        if (!token || !isAdmin) {
            window.location.href = "../authentication/login.html";
            return null;
        }
        return token;
    }

    // Fetch live products directly from Spring Boot PostgreSQL backend
    async function loadAdminProducts() {
        const token = await getAdminToken();
        try {
            let res = await fetch(`${API_BASE}/api/admin/products`, {
                headers: { ...(token ? { "Authorization": `Bearer ${token}` } : {}) }
            });
            if (!res.ok) {
                res = await fetch(`${API_BASE}/api/products`);
            }
            if (res.ok) {
                const apiList = await res.json();
                if (Array.isArray(apiList)) {
                    products = apiList.map(item => ({
                        id: item.id !== undefined ? item.id : item.legacyId,
                        legacyId: item.legacyId || String(item.id),
                        name: item.name || item.productName || "Product",
                        category: item.category || "General",
                        collection: item.collection || "Signature",
                        price: Number(item.price) || 0,
                        stock: item.stockQuantity !== undefined ? item.stockQuantity : (item.stock || 10),
                        status: (item.availability === "Out of Stock" || item.active === false) ? "Inactive" : "Active"
                    }));

                    // Synchronize local cache with live authoritative PostgreSQL database
                    try {
                        const curLocal = JSON.parse(localStorage.getItem("firquiProducts") || "[]");
                        const validIds = new Set(apiList.map(p => String(p.id)));
                        const validLegacyIds = new Set(apiList.map(p => String(p.legacyId)));
                        const validNames = new Set(apiList.map(p => (p.name || p.productName || "").trim().toLowerCase()));

                        const syncedLocal = curLocal.filter(p => 
                            validIds.has(String(p.id)) || 
                            validLegacyIds.has(String(p.id)) || 
                            (p.legacyId && (validIds.has(String(p.legacyId)) || validLegacyIds.has(String(p.legacyId)))) ||
                            validNames.has((p.name || p.productName || "").trim().toLowerCase())
                        );
                        localStorage.setItem("firquiProducts", JSON.stringify(syncedLocal));
                    } catch (_) {}

                    filterProducts();
                }
            }
        } catch (err) {
            console.warn("Backend API offline for products list, using fallback:", err);
        }
    }

    loadAdminProducts();



    /* =====================================================
       ELEMENTS
    ====================================================== */

    const tableBody =
        document.getElementById("productsTableBody");

    const searchInput =
        document.getElementById("productSearch");

    const clearSearch =
        document.getElementById("clearSearch");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const collectionFilter =
        document.getElementById("collectionFilter");

    const statusFilter =
        document.getElementById("statusFilter");

    const productCount =
        document.getElementById("productCount");

    const emptyState =
        document.getElementById("emptyState");



    /* =====================================================
       FORMAT PRICE
    ====================================================== */

    function formatPrice(price) {

        return "₹" + price.toLocaleString("en-IN");

    }



    /* =====================================================
       STOCK CLASS
    ====================================================== */

    function getStockClass(stock) {

        if (stock === 0) {

            return "stock-out";

        }

        if (stock <= 5) {

            return "stock-low";

        }

        return "stock-good";

    }



    /* =====================================================
       RENDER PRODUCTS
    ====================================================== */

    function renderProducts(list) {

        tableBody.innerHTML = "";


        productCount.textContent =
            list.length;


        if (list.length === 0) {

            emptyState.classList.add("show");

            return;

        }


        emptyState.classList.remove("show");


        list.forEach(product => {


            const row =
                document.createElement("tr");


            const statusClass =
                product.status === "Active"
                    ? "active"
                    : "inactive";


            const stockClass =
                getStockClass(product.stock);


            const stockText =
                product.stock === 0
                    ? "Out of stock"
                    : `${product.stock} units`;


            row.innerHTML = `

                <!-- PRODUCT -->

                <td>

                    <div class="product-info">

                        <div class="product-image">

                            <i class="fa-solid fa-gem"></i>

                        </div>

                        <div>

                            <strong>
                                ${product.name}
                            </strong>

                            <small>
                                Product #${String(product.id).padStart(3, "0")}
                            </small>

                        </div>

                    </div>

                </td>


                <!-- CATEGORY -->

                <td>
                    ${product.category}
                </td>


                <!-- COLLECTION -->

                <td>
                    ${product.collection}
                </td>


                <!-- PRICE -->

                <td>

                    <strong>
                        ${formatPrice(product.price)}
                    </strong>

                </td>


                <!-- STOCK -->

                <td>

                    <span class="${stockClass}">
                        ${stockText}
                    </span>

                </td>


                <!-- STATUS -->

                <td>

                    <span class="status ${statusClass}">
                        ${product.status}
                    </span>

                </td>


                <!-- ACTION -->

                <td>

                    <button
                        type="button"
                        class="table-action edit-btn"
                        data-id="${product.id}"
                        title="Edit Product"
                    >

                        <i class="fa-regular fa-pen-to-square"></i>

                    </button>


                    <button
                        type="button"
                        class="table-action delete-btn"
                        data-id="${product.id}"
                        title="Delete Product"
                    >

                        <i class="fa-regular fa-trash-can"></i>

                    </button>

                </td>

            `;


            tableBody.appendChild(row);

        });


        attachProductActions();

    }



    /* =====================================================
       FILTER
    ====================================================== */

    function filterProducts() {


        const search =
            searchInput.value
                .trim()
                .toLowerCase();


        const category =
            categoryFilter.value;


        const collection =
            collectionFilter.value;


        const status =
            statusFilter.value;


        const filtered =
            products.filter(product => {


                const matchesSearch =

                    product.name
                        .toLowerCase()
                        .includes(search)

                    ||

                    product.category
                        .toLowerCase()
                        .includes(search)

                    ||

                    product.collection
                        .toLowerCase()
                        .includes(search);


                const matchesCategory =

                    category === "all"

                    ||

                    product.category === category;


                const matchesCollection =

                    collection === "all"

                    ||

                    product.collection === collection;


                const matchesStatus =

                    status === "all"

                    ||

                    product.status === status;


                return (

                    matchesSearch &&

                    matchesCategory &&

                    matchesCollection &&

                    matchesStatus

                );

            });


        renderProducts(filtered);

    }



    /* =====================================================
       SEARCH
    ====================================================== */

    searchInput.addEventListener(
        "input",
        () => {


            if (searchInput.value.trim() !== "") {

                clearSearch.classList.add("show");

            } else {

                clearSearch.classList.remove("show");

            }


            filterProducts();

        }
    );



    /* =====================================================
       CLEAR SEARCH
    ====================================================== */

    clearSearch.addEventListener(
        "click",
        () => {

            searchInput.value = "";

            clearSearch.classList.remove("show");

            filterProducts();

            searchInput.focus();

        }
    );



    /* =====================================================
       FILTER EVENTS
    ====================================================== */

    categoryFilter.addEventListener(
        "change",
        filterProducts
    );


    collectionFilter.addEventListener(
        "change",
        filterProducts
    );


    statusFilter.addEventListener(
        "change",
        filterProducts
    );



    /* =====================================================
       PRODUCT ACTIONS
    ====================================================== */

    function attachProductActions() {


        /* ---------------------------------------------
           EDIT
        --------------------------------------------- */

        document
            .querySelectorAll(".edit-btn")
            .forEach(button => {


                button.addEventListener(
                    "click",
                    () => {


                        const id =
                            button.dataset.id;


                        window.location.href =
                            `edit-product.html?id=${id}`;

                    }
                );

            });



        /* ---------------------------------------------
           DELETE
        --------------------------------------------- */

        document
            .querySelectorAll(".delete-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    async () => {
                        const id = button.dataset.id;
                        const product = products.find(
                            item => String(item.id) === String(id) || String(item.legacyId) === String(id)
                        );

                        if (!product) {
                            return;
                        }

                        // Prevent accidental duplicate delete requests
                        if (button.dataset.deleting === "true") {
                            return;
                        }

                        const confirmed = confirm(
                            `Are you sure you want to delete "${product.name}"?`
                        );

                        if (!confirmed) {
                            return;
                        }

                        button.dataset.deleting = "true";
                        button.disabled = true;
                        button.style.opacity = "0.5";

                        try {
                            const token = await getAdminToken();
                            let res = await fetch(`${API_BASE}/api/admin/products/${encodeURIComponent(id)}`, {
                                method: "DELETE",
                                headers: {
                                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                                }
                            });

                            if (!res.ok) {
                                res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
                                    method: "DELETE",
                                    headers: {
                                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                                    }
                                });
                            }

                            if (!res.ok) {
                                let errData = null;
                                try {
                                    errData = await res.json();
                                } catch (_) {}
                                const errMsg = (errData && (errData.message || errData.error)) || `Server error (${res.status})`;
                                alert(`Failed to delete "${product.name}".\n${errMsg}`);
                                button.disabled = false;
                                button.style.opacity = "1";
                                delete button.dataset.deleting;
                                return;
                            }

                            // Deletion confirmed by server! Remove from memory array
                            products = products.filter(
                                item => String(item.id) !== String(id) && 
                                        String(item.legacyId) !== String(id) &&
                                        (!product.name || (item.name || item.productName || "").trim().toLowerCase() !== product.name.trim().toLowerCase())
                            );

                            // Remove from firquiProducts in localStorage
                            try {
                                const curLocal = JSON.parse(localStorage.getItem("firquiProducts") || "[]");
                                const nextLocal = curLocal.filter(p => 
                                    String(p.id) !== String(id) && 
                                    String(p.legacyId) !== String(id) &&
                                    (!product.name || (p.name || p.productName || "").trim().toLowerCase() !== product.name.trim().toLowerCase())
                                );
                                localStorage.setItem("firquiProducts", JSON.stringify(nextLocal));
                            } catch (e) {
                                console.warn("LocalStorage delete error:", e);
                            }

                            // Synchronize cart and wishlist localStorage if this deleted product was stored
                            try {
                                const curCart = JSON.parse(localStorage.getItem("firquiCart") || "[]");
                                const nextCart = curCart.filter(item => 
                                    String(item.productId) !== String(id) &&
                                    (!product.name || (item.name || "").trim().toLowerCase() !== product.name.trim().toLowerCase())
                                );
                                localStorage.setItem("firquiCart", JSON.stringify(nextCart));
                            } catch (_) {}

                            try {
                                const curWish = JSON.parse(localStorage.getItem("firquiWishlist") || "[]");
                                const nextWish = curWish.filter(item => 
                                    String(item.productId) !== String(id) &&
                                    (!product.name || (item.name || "").trim().toLowerCase() !== product.name.trim().toLowerCase())
                                );
                                localStorage.setItem("firquiWishlist", JSON.stringify(nextWish));
                            } catch (_) {}

                            filterProducts();
                            alert(`"${product.name}" has been deleted.`);
                        } catch (err) {
                            console.error("Backend DELETE error:", err);
                            alert(`Failed to delete "${product.name}".\n${err.message || "Network error. Please check backend connection."}`);
                            button.disabled = false;
                            button.style.opacity = "1";
                            delete button.dataset.deleting;
                        }
                    }
                );

            });

    }



    /* =====================================================
       HEADER - ADMIN
    ====================================================== */

    const adminButton =
        document.getElementById("adminButton");


    if (adminButton) {

        adminButton.addEventListener(
            "click",
            () => {

                alert(
                    "Admin Account\n\nProfile management will be connected later."
                );

            }
        );

    }



    /* =====================================================
       HEADER - SEARCH
    ====================================================== */

    const searchButton =
        document.getElementById("searchButton");


    if (searchButton) {

        searchButton.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (window.FirquiAdminSearch) {
                    window.FirquiAdminSearch.open();
                } else if (searchInput) {
                    searchInput.focus();
                }
            }
        );

    }



    /* =====================================================
       HEADER - NOTIFICATION
    ====================================================== */

    const notificationButton =
        document.getElementById("notificationButton");


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                alert(
                    "Notifications\n\nYou have new store notifications."
                );

            }
        );

    }



    /* =====================================================
       HEADER - LOGOUT
    ====================================================== */

    const logoutButton =
        document.getElementById("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            () => {


                const confirmLogout =
                    confirm(
                        "Are you sure you want to logout?"
                    );


                if (!confirmLogout) {

                    return;

                }


                window.location.href =
                    "signin.html";

            }
        );

    }



    /* =====================================================
       NEWSLETTER
    ====================================================== */

    const newsletterForm =
        document.getElementById("newsletterForm");

    const newsletterEmail =
        document.getElementById("newsletterEmail");

    const newsletterMsg =
        document.getElementById("newsletterMsg");


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const email =
                    newsletterEmail.value.trim();


                if (!email) {

                    return;

                }


                newsletterMsg.textContent =
                    "Thank you for subscribing!";


                newsletterEmail.value = "";

            }
        );

    }



    /* =====================================================
       INITIAL LOAD
    ====================================================== */

    renderProducts(products);

});