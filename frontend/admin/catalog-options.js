/* =====================================================
   FIRQUI JEWELS - ADMIN
   Category and collection drop-downs filled from the database,
   so new collections appear without editing the page.
   Keeps whatever is already selected (e.g. on the edit page).
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const API_BASE = window.FIRQUI_API_BASE || "";

    function titleCase(name) {
        return String(name).toLowerCase().replace(/(^|[\s&-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
    }

    function fill(select, items, placeholder) {
        if (!select || !Array.isArray(items) || items.length === 0) return;
        const current = select.value;

        select.innerHTML = "";
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = placeholder;
        select.appendChild(empty);

        const names = items
            .map(item => item && item.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        names.forEach(name => {
            const opt = document.createElement("option");
            opt.value = titleCase(name);
            opt.textContent = titleCase(name);
            select.appendChild(opt);
        });

        // Keep the existing choice, even if it is no longer in the list
        if (current) {
            const match = Array.from(select.options).find(o => o.value.toLowerCase() === current.toLowerCase());
            if (match) {
                select.value = match.value;
            } else {
                const keep = document.createElement("option");
                keep.value = current;
                keep.textContent = current;
                select.appendChild(keep);
                select.value = current;
            }
        }
    }

    function load(path) {
        return fetch(`${API_BASE}${path}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null);
    }

    load("/api/categories").then(list => fill(document.getElementById("category"), list, "Select category (Optional)"));
    load("/api/collections").then(list => fill(document.getElementById("collection"), list, "Select collection (Optional)"));
});
