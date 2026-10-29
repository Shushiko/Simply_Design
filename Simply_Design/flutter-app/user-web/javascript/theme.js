// Applies the saved theme BEFORE the page paints, so there is no light-mode flash.
// Load it synchronously (no "defer") in the <head> of every customer page.
//
// Order of priority (same rule auth.js uses later):
//   1. a logged-in user's saved Settings > Dark Mode choice (read here too, so the right theme is
//      painted on the very first frame instead of flashing light and switching after auth.js loads)
//   2. this device's choice, remembered under 'simplyTheme' (also works for logged-out visitors)
//   3. light
(function () {
  function read(store, key) {
    try { return JSON.parse(store.getItem(key)); } catch (e) { return null; }
  }
  var dark = false;
  try {
    dark = localStorage.getItem('simplyTheme') === 'dark';

    // Same session rule as auth.js: a customer session lives in sessionStorage (this tab only);
    // only an admin session may sit in localStorage. Old customer sessions there are ignored.
    var saved = read(localStorage, 'simplyUser');
    if (saved && saved.role !== 'admin') saved = null;
    var user = saved || read(sessionStorage, 'simplyUser');

    if (user && user.email) {
      var all = read(localStorage, 'simplyProfiles') || {};
      var prefs = (all[String(user.email).toLowerCase()] || {}).prefs;
      if (prefs && typeof prefs.dark === 'boolean') dark = prefs.dark;
    }
  } catch (e) { /* storage blocked: keep whatever was decided above (light by default) */ }
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();