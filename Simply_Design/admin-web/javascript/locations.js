// Locations page: click a row to open that customer's address in Google Maps.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("#locationsBody tr").forEach(function (row) {
    var link = row.querySelector(".map-btn");
    if (!link) return;

    row.style.cursor = "pointer";
    row.tabIndex = 0;
    row.title = "Open on map";

    function openMap() {
      window.open(link.href, "_blank", "noopener");
    }

    row.addEventListener("click", function (e) {
      if (e.target.closest(".map-btn")) return; // the button already opens it
      openMap();
    });

    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target === row) openMap();
    });
  });
});