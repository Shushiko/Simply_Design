// Settings page functionality.
// Everything here is client-side only (localStorage) — there's no
// real backend, so "saving" just means "remembered in this browser".
document.addEventListener("DOMContentLoaded", function () {
  var SETTINGS_KEY = "simplyDesignSettings";
  var THEME_KEY = "simplyDesignTheme";
  var TWO_FACTOR_KEY = "simplyDesignTwoFactor";

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // localStorage can be unavailable (e.g. private browsing) — fail quietly
    }
  }

  // ----- Toast (small confirmation message, bottom-right) -----
  var toastTimer = null;
  function showToast(message) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  // ----- Fields this page knows how to save/restore -----
  var fields = {
    bizName: document.getElementById("bizName"),
    bizEmail: document.getElementById("bizEmail"),
    bizPhone: document.getElementById("bizPhone"),
    bizAddress: document.getElementById("bizAddress"),
    gcashNumber: document.getElementById("gcashNumber"),
    lateFee: document.getElementById("lateFee"),
    damageFee: document.getElementById("damageFee"),
    language: document.getElementById("language"),
    currency: document.getElementById("currency"),
  };
  var toggles = {
    notifyNewRentals: document.getElementById("notifyNewRentals"),
    notifyItemReturns: document.getElementById("notifyItemReturns"),
    notifyPaymentReceived: document.getElementById("notifyPaymentReceived"),
    notifyViolations: document.getElementById("notifyViolations"),
  };

  // Restore anything saved on an earlier visit
  (function restore() {
    var saved = readJSON(SETTINGS_KEY);
    if (!saved) return;
    Object.keys(fields).forEach(function (key) {
      if (fields[key] && typeof saved[key] === "string") fields[key].value = saved[key];
    });
    Object.keys(toggles).forEach(function (key) {
      if (toggles[key] && typeof saved[key] === "boolean") toggles[key].checked = saved[key];
    });
  })();

  // ----- Save Changes -----
  var saveBtn = document.getElementById("saveSettingsBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var data = {};
      Object.keys(fields).forEach(function (key) { if (fields[key]) data[key] = fields[key].value; });
      Object.keys(toggles).forEach(function (key) { if (toggles[key]) data[key] = toggles[key].checked; });
      writeJSON(SETTINGS_KEY, data);
      showToast("Settings saved.");
    });
  }

  // ----- Dark Mode (applies instantly, independent of Save Changes) -----
  var darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.checked = localStorage.getItem(THEME_KEY) === "dark";
    darkModeToggle.addEventListener("change", function () {
      var dark = darkModeToggle.checked;
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
      showToast(dark ? "Dark mode on." : "Dark mode off.");
    });
  }

  // ----- Two-Factor Authentication (toggle button) -----
  var twoFactorBtn = document.getElementById("twoFactorBtn");
  if (twoFactorBtn) {
    var twoFactorOn = localStorage.getItem(TWO_FACTOR_KEY) === "on";

    function renderTwoFactorButton() {
      twoFactorBtn.textContent = twoFactorOn ? "Disable Two-Factor Authentication" : "Enable Two-Factor Authentication";
      twoFactorBtn.classList.toggle("is-on", twoFactorOn);
    }
    renderTwoFactorButton();

    twoFactorBtn.addEventListener("click", function () {
      twoFactorOn = !twoFactorOn;
      try { localStorage.setItem(TWO_FACTOR_KEY, twoFactorOn ? "on" : "off"); } catch (e) {}
      renderTwoFactorButton();
      showToast(twoFactorOn ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
    });
  }

  // ----- Change Password (popup, reuses the site's modal styling) -----
  var pwOverlay = document.getElementById("changePasswordModal");
  var pwForm = document.getElementById("changePasswordForm");
  var pwBtn = document.getElementById("changePasswordBtn");
  var pwError = document.getElementById("passwordError");

  if (pwOverlay && pwForm && pwBtn) {
    var pwLastFocused = null;

    function openPwModal() {
      pwLastFocused = document.activeElement;
      pwForm.reset();
      if (pwError) pwError.hidden = true;
      pwOverlay.classList.add("open");
      document.documentElement.classList.add("modal-open");
      setTimeout(function () { pwForm.elements.currentPassword.focus(); }, 60);
    }
    function closePwModal() {
      pwOverlay.classList.remove("open");
      document.documentElement.classList.remove("modal-open");
      if (pwLastFocused) pwLastFocused.focus();
    }

    pwBtn.addEventListener("click", openPwModal);
    pwOverlay.querySelectorAll("[data-close]").forEach(function (btn) {
      btn.addEventListener("click", closePwModal);
    });
    pwOverlay.addEventListener("mousedown", function (e) {
      if (e.target === pwOverlay) closePwModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && pwOverlay.classList.contains("open")) closePwModal();
    });

    function showPwError(message) {
      if (!pwError) return;
      pwError.textContent = message;
      pwError.hidden = false;
    }

    pwForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var current = pwForm.elements.currentPassword.value;
      var next = pwForm.elements.newPassword.value;
      var confirm = pwForm.elements.confirmPassword.value;

      if (!current) { showPwError("Enter your current password."); return; }
      if (next.length < 6) { showPwError("New password must be at least 6 characters."); return; }
      if (next !== confirm) { showPwError("New password and confirmation don't match."); return; }

      closePwModal();
      showToast("Password updated.");
    });
  }


  // ----- Profile photo (pencil button opens the file picker) -----
  var PHOTO_KEY = "simplyDesignProfilePhoto";
  var photoWrap = document.getElementById("profilePhoto");
  var photoImg = document.getElementById("profilePhotoImg");
  var photoInput = document.getElementById("profilePhotoInput");
  var photoEdit = document.getElementById("profilePhotoEdit");

  function showProfilePhoto(src) {
    if (!photoWrap || !photoImg) return;
    photoImg.src = src;
    photoWrap.classList.add("has-photo");
  }
  try {
    var savedPhoto = localStorage.getItem(PHOTO_KEY);
    if (savedPhoto) showProfilePhoto(savedPhoto);
  } catch (e) {}

  if (photoInput && photoEdit) {
    photoEdit.addEventListener("click", function () { photoInput.click(); });
    if (photoWrap) photoWrap.addEventListener("click", function () { photoInput.click(); });

    photoInput.addEventListener("change", function () {
      var file = photoInput.files && photoInput.files[0];
      photoInput.value = "";
      if (!file) return;
      if (file.type.indexOf("image/") !== 0) { showToast("Please choose an image file."); return; }

      var reader = new FileReader();
      reader.onload = function () {
        // Shrink to 480px so it fits comfortably in localStorage
        var img = new Image();
        img.onload = function () {
          var size = Math.min(img.width, img.height);
          var out = Math.min(size, 480);
          var canvas = document.createElement("canvas");
          canvas.width = out;
          canvas.height = out;
          canvas.getContext("2d").drawImage(
            img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, out, out
          );
          var data = canvas.toDataURL("image/jpeg", 0.85);
          showProfilePhoto(data);
          try { localStorage.setItem(PHOTO_KEY, data); } catch (e) {}
          showToast("Profile photo updated.");
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }


  // ----- Log Out -----
  var logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (event) {
      event.preventDefault();

      // if (window.confirm("Are you sure you want to log out?")) {
      //   showToast("You have been logged out.");

        // Redirect to the login/home page
        setTimeout(function () {
          window.location.href = "../../../index.html";
        }, 100);
      }
    );
  };
})




//   // ----- Log Out -----
//   var logoutBtn = document.getElementById("logoutBtn");

//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", function (event) {
//       event.preventDefault();

//       if (window.confirm("Are you sure you want to log out?")) {
//         showToast("You have been logged out.");

//         // Redirect to the login/home page
//         setTimeout(function () {
//           window.location.href = "../../../index.html";
//         }, 500);
//       }
//     });
//   }
// })




//   // ----- Log Out -----
//   var logoutBtn = document.getElementById("logoutBtn");

//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", function (event) {
//       event.preventDefault();

//       if (window.confirm("Are you sure you want to log out?")) {
//         showToast("You have been logged out.");

//         // Redirect to the login/home page
//         setTimeout(function () {
//           window.location.href = "../../../index.html";
//         }, 500);
//       }
//     });
//   }
// })
