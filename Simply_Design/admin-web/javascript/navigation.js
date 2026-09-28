// Highlights the sidebar link that matches the page you are on
(function () {
  var current = location.pathname.split("/").pop() || "index.html";
  var links = document.querySelectorAll(".nav-link");
  var match = null;

  links.forEach(function (link) {
    if (link.getAttribute("href") === current) match = link;
  });
  if (!match) return;

  links.forEach(function (link) {
    var isCurrent = link === match;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
})();