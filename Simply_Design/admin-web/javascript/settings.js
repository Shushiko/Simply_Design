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

  // ----- Email verification code (sent with EmailJS) -----
  // Same three values as in profile.js / loginandsignup.js. Template variables:
  // {{to_email}}, {{to_name}}, {{otp_code}}, {{expires_in}}
  var EMAILJS = { publicKey: 'Ul8HraSWP2sp0-PZt', serviceId: 'service_14aknet', templateId: 'template_clxdxb8' };
  var OTP_MINUTES = 5, OTP_MAX_TRIES = 5, OTP_RESEND_SECONDS = 30;

  // The admin's own login email: read from the logged-in session, so it only has to be set in loginandsignup.js
  function sessionAdminEmail() {
    var u = null;
    try { u = JSON.parse(localStorage.getItem("simplyUser")) || JSON.parse(sessionStorage.getItem("simplyUser")); } catch (e) {}
    return u && u.role === "admin" && u.email ? String(u.email).toLowerCase() : "";
  }
  var ADMIN_EMAIL = sessionAdminEmail() || "admin.shushuko@gmail.com";
  var PROFILES_KEY = "simplyProfiles";          // shared with the login page
  var ADMIN_PW_KEY = "simplyAdminPassword";     // new admin password (the login page checks it too)

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = resolve;
      el.onerror = function () { reject(new Error("load")); };
      document.head.appendChild(el);
    });
  }

  // Where the verification code is sent
  function verifyTarget() {
    // a real admin login email wins; the old demo address can't receive mail, so fall back to the Business Information email
    if (!/@simplydesign\.com$/i.test(ADMIN_EMAIL)) return ADMIN_EMAIL;
    var v = fields.bizEmail ? fields.bizEmail.value.trim() : "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : "";
  }

  // Remember on the login page whether Two-Factor is on, and where its code should be sent
  function syncAdminProfile() {
    var all = readJSON(PROFILES_KEY) || {};
    var p = all[ADMIN_EMAIL] || { name: "Admin", since: new Date().toISOString() };
    var on = false;
    try { on = localStorage.getItem(TWO_FACTOR_KEY) === "on"; } catch (e) {}
    p.prefs = Object.assign({}, p.prefs, { twofa: on });
    var to = verifyTarget();
    if (to) p.otpEmail = to;
    all[ADMIN_EMAIL] = p;
    writeJSON(PROFILES_KEY, all);
  }

  // Emails a fresh 6-digit code. Resolves { code, note } (note is only filled in demo mode).
  function mailCode(to) {
    var code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    if (EMAILJS.publicKey === "YOUR_PUBLIC_KEY") {
      console.info("[Demo] Verification code for " + to + ": " + code);
      return Promise.resolve({ code: code, note: "NO EMAIL SENT (EmailJS keys not set in settings.js). Demo code: " + code });
    }
    return (window.emailjs ? Promise.resolve() : loadScript("https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js"))
      .then(function () {
        return emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
          to_email: to,
          to_name: "Admin",
          otp_code: code,
          expires_in: OTP_MINUTES + " minutes"
        }, { publicKey: EMAILJS.publicKey });
      })
      .then(function () {
        return { code: code, note: "" };
      }, function (err) {
        console.error("EmailJS error:", err);
        throw { message: "Couldn't send the verification email: " + ((err && (err.text || err.message)) || "unknown error") };
      });
  }

  // Sends the code, then shows the "Verify it's you" window.
  // Resolves when the right code is entered. Rejects if cancelled, too many wrong tries, or the email can't be sent.
  function requireEmailCode() {
    var to = verifyTarget();
    if (!to) {
      showToast("Enter a valid Email under Business Information first.");
      if (fields.bizEmail) fields.bizEmail.focus();
      return Promise.reject(null);
    }
    return mailCode(to).then(function (sent) {
      return new Promise(function (resolve, reject) {
        var current = { code: sent.code, expires: Date.now() + OTP_MINUTES * 60000, tries: 0, sentAt: Date.now() };

        var boxes = "";
        for (var n = 0; n < 6; n++) {
          boxes += '<input class="tf-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="' +
            (n === 0 ? "one-time-code" : "off") + '" aria-label="Digit ' + (n + 1) + ' of 6">';
        }

        var overlay = document.createElement("div");
        overlay.className = "modal-overlay tf-overlay";
        overlay.innerHTML =
          '<form class="modal tf-modal" role="dialog" aria-modal="true" aria-labelledby="tfTitle" novalidate>' +
            '<span class="tf-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6L12 3z"/><rect x="9" y="11" width="6" height="4.5" rx="1"/><path d="M10.2 11V9.8a1.8 1.8 0 0 1 3.6 0V11"/></svg></span>' +
            '<h2 id="tfTitle">Verify it\'s you</h2>' +
            '<p class="tf-sub">Enter the 6-digit code we sent to<br><strong class="tf-mail"></strong></p>' +
            '<p class="tf-demo" hidden></p>' +
            '<div class="tf-code" role="group" aria-label="Verification code">' + boxes + '</div>' +
            '<p class="tf-timer" aria-live="polite"></p>' +
            '<p class="field-error tf-err" role="alert" hidden></p>' +
            '<button type="submit" class="tf-verify">Verify</button>' +
            '<p class="tf-resend">Didn\'t get it? <button type="button" class="tf-link"></button></p>' +
            '<div class="tf-foot"><button type="button" class="tf-cancel">Cancel</button></div>' +
          '</form>';
        document.body.appendChild(overlay);
        document.documentElement.classList.add("modal-open");
        requestAnimationFrame(function () { overlay.classList.add("open"); });

        var dlg = overlay.querySelector(".tf-modal");
        var inputs = Array.prototype.slice.call(overlay.querySelectorAll(".tf-digit"));
        var row = overlay.querySelector(".tf-code");
        var timerEl = overlay.querySelector(".tf-timer");
        var errEl = overlay.querySelector(".tf-err");
        var demoEl = overlay.querySelector(".tf-demo");
        var resendBtn = overlay.querySelector(".tf-link");
        var lastFocus = document.activeElement;
        overlay.querySelector(".tf-mail").textContent = to;

        function mmss(ms) {
          var t = Math.max(0, Math.ceil(ms / 1000));
          return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
        }
        function getCode() { return inputs.map(function (i) { return i.value; }).join(""); }
        function oops(msg) { errEl.textContent = msg; errEl.hidden = false; }
        function shake() {
          row.classList.remove("shake");
          void row.offsetWidth;
          row.classList.add("shake");
        }
        function clearBoxes() {
          inputs.forEach(function (i) { i.value = ""; i.classList.remove("filled"); });
          inputs[0].focus();
        }
        function setDemo(note) { demoEl.textContent = note || ""; demoEl.hidden = !note; }

        function tick() {
          var left = current.expires - Date.now();
          if (left <= 0) {
            timerEl.textContent = "Code expired. Request a new one.";
            timerEl.classList.add("expired");
          } else {
            timerEl.textContent = "Code expires in " + mmss(left);
            timerEl.classList.remove("expired");
          }
          var wait = current.sentAt + OTP_RESEND_SECONDS * 1000 - Date.now();
          if (wait > 0) { resendBtn.disabled = true; resendBtn.textContent = "Resend code in " + mmss(wait); }
          else { resendBtn.disabled = false; resendBtn.textContent = "Resend code"; }
        }
        var timer = setInterval(tick, 1000);
        tick();
        setDemo(sent.note);

        function close() {
          clearInterval(timer);
          document.removeEventListener("keydown", onKey, true);
          overlay.remove();
          if (!document.querySelector(".modal-overlay.open")) document.documentElement.classList.remove("modal-open");
          if (lastFocus && lastFocus.focus) lastFocus.focus();
        }
        function cancel() { close(); reject(null); }
        function onKey(e) {
          if (e.key === "Escape") { e.stopPropagation(); cancel(); }
        }
        document.addEventListener("keydown", onKey, true);
        overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) cancel(); });
        overlay.querySelector(".tf-cancel").addEventListener("click", cancel);

        // spread digits across the boxes (typing, paste and autofill all end up here)
        function fill(from, text) {
          var d = String(text).replace(/\D/g, "").split("");
          for (var k = 0; k < d.length && from + k < 6; k++) {
            inputs[from + k].value = d[k];
            inputs[from + k].classList.add("filled");
          }
          inputs[Math.min(from + d.length, 5)].focus();
        }
        inputs.forEach(function (box, idx) {
          box.addEventListener("input", function () {
            errEl.hidden = true;
            var v = box.value.replace(/\D/g, "");
            box.value = "";
            box.classList.remove("filled");
            if (v) fill(idx, v);
          });
          box.addEventListener("keydown", function (e) {
            if (e.key === "Backspace" && !box.value && idx > 0) {
              inputs[idx - 1].value = ""; inputs[idx - 1].classList.remove("filled"); inputs[idx - 1].focus();
              e.preventDefault();
            } else if (e.key === "ArrowLeft" && idx > 0) { inputs[idx - 1].focus(); e.preventDefault(); }
            else if (e.key === "ArrowRight" && idx < 5) { inputs[idx + 1].focus(); e.preventDefault(); }
          });
          box.addEventListener("paste", function (e) {
            var text = (e.clipboardData || window.clipboardData).getData("text");
            e.preventDefault();
            errEl.hidden = true;
            fill(idx, text);
          });
          box.addEventListener("focus", function () { box.select(); });
        });
        setTimeout(function () { inputs[0].focus(); }, 60);

        resendBtn.addEventListener("click", function () {
          if (resendBtn.disabled) return;
          resendBtn.disabled = true;
          mailCode(to).then(function (again) {
            current = { code: again.code, expires: Date.now() + OTP_MINUTES * 60000, tries: 0, sentAt: Date.now() };
            setDemo(again.note);
            errEl.hidden = true;
            clearBoxes();
            tick();
          }, function (err) {
            oops(err && err.message ? err.message : "Couldn't send the email. Try again.");
            tick();
          });
        });

        dlg.addEventListener("submit", function (e) {
          e.preventDefault();
          var entered = getCode();
          if (entered.length < 6) { oops("Enter all 6 digits."); shake(); return; }
          if (Date.now() > current.expires) { oops("That code has expired. Request a new one."); shake(); return; }
          if (entered !== current.code) {
            current.tries++;
            if (current.tries >= OTP_MAX_TRIES) { close(); showToast("Too many wrong codes. Please start again."); reject(null); return; }
            oops("That code is incorrect. " + (OTP_MAX_TRIES - current.tries) + " tries left.");
            shake();
            clearBoxes();
            return;
          }
          close();
          resolve();
        });
      });
    });
  }

  // ----- Save Changes -----
  var saveBtn = document.getElementById("saveSettingsBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      var data = {};
      Object.keys(fields).forEach(function (key) { if (fields[key]) data[key] = fields[key].value; });
      Object.keys(toggles).forEach(function (key) { if (toggles[key]) data[key] = toggles[key].checked; });
      writeJSON(SETTINGS_KEY, data);
      syncAdminProfile();
      showToast("Settings saved.");
    });
  }

  // ----- Dark Mode (applies instantly, independent of Save Changes) -----
  var darkModeToggle = document.getElementById("darkModeToggle");
  if (darkModeToggle) {
    darkModeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
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
    var twoFactorOn = false;
    try { twoFactorOn = localStorage.getItem(TWO_FACTOR_KEY) === "on"; } catch (e) {}

    function renderTwoFactorButton() {
      twoFactorBtn.textContent = twoFactorOn ? "Disable Two-Factor Authentication" : "Enable Two-Factor Authentication";
      twoFactorBtn.classList.toggle("is-on", twoFactorOn);
    }
    renderTwoFactorButton();

    twoFactorBtn.addEventListener("click", function () {
      if (twoFactorBtn.disabled) return;
      var turnOn = !twoFactorOn;
      twoFactorBtn.disabled = true;
      requireEmailCode().then(function () {
        twoFactorOn = turnOn;
        try { localStorage.setItem(TWO_FACTOR_KEY, twoFactorOn ? "on" : "off"); } catch (e) {}
        syncAdminProfile();   // lets the login page ask for a code
        renderTwoFactorButton();
        showToast(twoFactorOn ? "Two-factor authentication enabled." : "Two-factor authentication disabled.");
      }, function (err) {
        if (err && err.message) showToast(err.message);
      }).then(function () { twoFactorBtn.disabled = false; });
    });
  }

  // ----- Change Password (popup, reuses the site's modal styling) -----
  var pwOverlay = document.getElementById("changePasswordModal");
  var pwForm = document.getElementById("changePasswordForm");
  var pwBtn = document.getElementById("changePasswordBtn");
  var pwError = document.getElementById("passwordError");

  if (pwOverlay && pwForm && pwBtn) {
    var pwLastFocused = null;

    function storedAdminPw() {
      try { return localStorage.getItem(ADMIN_PW_KEY) || ""; } catch (err) { return ""; }
    }

    function openPwModal() {
      pwLastFocused = document.activeElement;
      pwForm.reset();
      var hasPw = !!storedAdminPw();
      pwForm.elements.currentPassword.closest(".field").hidden = !hasPw;
      pwForm.elements.currentPassword.required = hasPw;
      var title = document.getElementById("changePasswordTitle");
      if (title) title.textContent = hasPw ? "Change Password" : "Set a Password";
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
      if (e.key === "Escape" && pwOverlay.classList.contains("open") && !document.querySelector(".tf-overlay")) closePwModal();
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
      var stored = storedAdminPw();

      if (stored) {
        if (!current) { showPwError("Enter your current password."); return; }
        if (current !== stored) { showPwError("Your current password is incorrect."); return; }
      }
      if (next.length < 6) { showPwError("New password must be at least 6 characters."); return; }
      if (next !== confirm) { showPwError("New password and confirmation don't match."); return; }
      if (pwError) pwError.hidden = true;

      var submitBtn = pwForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      requireEmailCode().then(function () {
        try { localStorage.setItem(ADMIN_PW_KEY, next); } catch (err) {}
        closePwModal();
        showToast("Password updated.");
      }, function (err) {
        if (err && err.message) showPwError(err.message);
      }).then(function () { submitBtn.disabled = false; });
    });
  }


  // ----- Profile photo (pencil button opens the file picker) -----
  var PHOTO_KEY = "simplyDesignProfilePhoto";
  var photoWrap = document.getElementById("profilePhoto");
  var photoImg = document.getElementById("profilePhotoImg");
  var photoInput = document.getElementById("profilePhotoInput");
  var photoEdit = document.getElementById("profilePhotoEdit");

  // Sidebar avatar: shows the photo in place of the "AD" initials
  function applySidebarAvatar(src) {
    document.querySelectorAll(".sidebar .avatar").forEach(function (el) {
      if (!el.dataset.initials) el.dataset.initials = el.textContent.trim();
      if (src) {
        el.textContent = "";
        el.style.backgroundImage = 'url("' + src + '")';
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      } else {
        el.textContent = el.dataset.initials;
        el.style.backgroundImage = "";
      }
    });
  }

  function showProfilePhoto(src) {
    if (!photoWrap || !photoImg) return;
    photoImg.src = src;
    photoWrap.classList.add("has-photo");
    applySidebarAvatar(src);
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
      window.location.href = "../web/login.html";
    });
  }
});