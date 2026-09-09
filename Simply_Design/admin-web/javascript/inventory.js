document.addEventListener("DOMContentLoaded", () => {
    // Select top tab buttons and main view sections
    const tabAdminBtn = document.getElementById("tab-admin");
    const tabCatalogBtn = document.getElementById("tab-catalog");
    
    const adminView = document.getElementById("admin-view");
    const catalogView = document.getElementById("catalog-view");

    // Switch to Admin View
    tabAdminBtn.addEventListener("click", () => {
        tabAdminBtn.classList.add("active");
        tabCatalogBtn.classList.remove("active");

        adminView.classList.add("active-view");
        catalogView.classList.remove("active-view");
    });

    // Switch to Catalog View
    tabCatalogBtn.addEventListener("click", () => {
        tabCatalogBtn.classList.add("active");
        tabAdminBtn.classList.remove("active");

        catalogView.classList.add("active-view");
        adminView.classList.remove("active-view");
    });
});
