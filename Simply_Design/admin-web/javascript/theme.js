// Applies the saved theme before the page paints, so there is no flash of
// light mode. Loaded synchronously in <head> on every page.
// The Dark Mode switch on the Settings page writes the same key.
(function () {
  var theme = "light";
  try {
    if (localStorage.getItem("simplyDesignTheme") === "dark") theme = "dark";
  } catch (e) {}
  document.documentElement.setAttribute("data-theme", theme);
})();
