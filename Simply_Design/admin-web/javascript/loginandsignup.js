// (function () {
//   "use strict";

//   var form = document.getElementById("loginForm");
//   if (!form) return;

//   var errorBox = document.getElementById("formError");
//   var submitBtn = form.querySelector(".btn-primary");
//   var submitLabel = submitBtn ? submitBtn.querySelector(".btn-label") : null;

//   var REMEMBER_KEY = "rememberedEmail";

//   /* ---------- Show / hide password ---------- */

//   document.querySelectorAll(".toggle").forEach(function (btn) {
//     // Keep focus in the password field while clicking the eye
//     btn.addEventListener("mousedown", function (e) {
//       e.preventDefault();
//     });

//     btn.addEventListener("click", function () {
//       var input = document.getElementById(btn.dataset.target);
//       if (!input) return;

//       var start = input.selectionStart;
//       var end = input.selectionEnd;

//       var show = input.type === "password";

//       input.type = show ? "text" : "password";

//       input.focus();

//       try {
//         input.setSelectionRange(start, end);
//       } catch (err) {
//         /* ignore */
//       }

//       btn.classList.toggle("on", show);

//       btn.setAttribute("aria-pressed", show ? "true" : "false");

//       btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
//     });
//   });

//   /* ---------- Remember me ---------- */

//   // Only the email is saved in the browser.
//   // The password is NEVER saved.

//   function loadRemembered() {
//     try {
//       var saved = localStorage.getItem(REMEMBER_KEY);

//       if (saved) {
//         form.email.value = saved;

//         if (form.remember) {
//           form.remember.checked = true;
//         }
//       }
//     } catch (err) {
//       /* storage unavailable */
//     }
//   }

//   function saveRemembered() {
//     try {
//       if (form.remember && form.remember.checked) {
//         localStorage.setItem(REMEMBER_KEY, form.email.value.trim());
//       } else {
//         localStorage.removeItem(REMEMBER_KEY);
//       }
//     } catch (err) {
//       /* storage unavailable */
//     }
//   }

//   loadRemembered();

//   /* ---------- Errors ---------- */

//   function showError(message) {
//     // Hide then show so the animation replays
//     errorBox.hidden = true;

//     void errorBox.offsetWidth;

//     errorBox.textContent = message;

//     errorBox.hidden = false;
//   }

//   function clearError() {
//     errorBox.hidden = true;

//     errorBox.textContent = "";
//   }

//   function markInvalid(input) {
//     var wrap = input.closest(".input-wrap");

//     if (!wrap) return;

//     wrap.classList.remove("shake");

//     void wrap.offsetWidth;

//     wrap.classList.add("invalid", "shake");
//   }

//   function flag(input, message) {
//     markInvalid(input);

//     input.focus();

//     showError(message);
//   }

//   // Clear red state when the user starts typing
//   form.querySelectorAll(".input-wrap input").forEach(function (input) {
//     input.addEventListener("input", function () {
//       var wrap = input.closest(".input-wrap");

//       if (wrap) {
//         wrap.classList.remove("invalid", "shake");
//       }

//       if (!form.querySelector(".input-wrap.invalid")) {
//         clearError();
//       }
//     });
//   });

//   /* ---------- Validation ---------- */

//   function validate() {
//     var fields = [form.email, form.password];

//     // Check if fields are empty
//     var empty = fields.filter(function (f) {
//       return f.value.trim() === "";
//     });

//     if (empty.length) {
//       empty.forEach(markInvalid);

//       empty[0].focus();

//       showError("Please fill in all fields.");

//       return false;
//     }

//     // Check email format
//     if (!form.email.validity.valid) {
//       flag(form.email, "Enter a valid email address.");

//       return false;
//     }

//     return true;
//   }

//   /* ---------- LOGIN AUTHENTICATION ---------- */

//   function logIn(data) {
//     return new Promise(function (resolve, reject) {
//       /*
//        * ADMIN ACCOUNT
//        *
//        * Email:
//        * admin@simplydesign.com
//        *
//        * Password:
//        * admin123
//        */

//       if (
//         data.email === "admin@simplydesign.com" &&
//         data.password === "admin123"
//       ) {
//         resolve("admin");

//         return;
//       }

//       /*
//        * USER ACCOUNT
//        *
//        * Email:
//        * user@simplydesign.com
//        *
//        * Password:
//        * user123
//        */

//       if (
//         data.email === "user@simplydesign.com" &&
//         data.password === "user123"
//       ) {
//         resolve("user");

//         return;
//       }

//       /*
//        * INVALID LOGIN
//        */

//       reject();
//     });
//   }

//   /* ---------- Submit ---------- */

//   form.addEventListener("submit", function (e) {
//     e.preventDefault();

//     if (submitBtn.disabled || !validate()) {
//       return;
//     }

//     clearError();

//     submitBtn.disabled = true;

//     submitBtn.classList.add("loading");

//     logIn({
//       email: form.email.value.trim(),

//       password: form.password.value,

//       remember: form.remember ? form.remember.checked : false,
//     })
//       /* ---------- LOGIN SUCCESS ---------- */

//       .then(function (accountType) {
//         saveRemembered();

//         submitBtn.classList.remove("loading");

//         submitBtn.classList.add("done");

//         if (submitLabel) {
//           submitLabel.textContent = "Logged in";
//         }

//         /*
//          * ADMIN LOGIN
//          *
//          * admin@simplydesign.com
//          * admin123
//          */

//         if (accountType === "admin") {
//           window.location.href = "Simply_Design/admin-web/web/dashboard.html";

//           return;
//         }

//         /*
//          * USER LOGIN
//          *
//          * user@simplydesign.com
//          * user123
//          */

//         if (accountType === "user") {
//           window.location.href = "Simply_Design/flutter-app/user-web/web/user.html";

//           return;
//         }
//       })

//       /* ---------- LOGIN FAILED ---------- */

//       .catch(function () {
//         submitBtn.classList.remove("loading");

//         submitBtn.disabled = false;

//         showError("Email or password is incorrect.");
//       });
//   });

//   /* ---------- Social Login ---------- */

//   // Hook these up to your Google / Facebook OAuth flow

//   var googleBtn = document.getElementById("googleBtn");

//   var facebookBtn = document.getElementById("facebookBtn");

//   if (googleBtn) {
//     googleBtn.addEventListener("click", function () {
//       console.log("Continue with Google");
//     });
//   }

//   if (facebookBtn) {
//     facebookBtn.addEventListener("click", function () {
//       console.log("Continue with Facebook");
//     });
//   }
// })();








(function () {
  'use strict';

  // This one file runs on both login.html (#loginForm) and signup.html (#signupForm).
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var form = loginForm || signupForm;
  if (!form) return;

  var errorBox = document.getElementById('formError');
  var submitBtn = form.querySelector('.btn-primary');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn-label') : null;

  /* ---------- Settings ---------- */

  // Both are worked out from THIS page's own address (login.html / signup.html sit in
  // <project root>/Simply_Design/admin-web/web/), so they also work on GitHub Pages, where the
  // site lives under /<repo-name>/ and an address that climbs too far ends on a 404.
  var ADMIN_URL = 'dashboard.html';          // same folder as login.html
  var USER_URL = '../../../index.html';      // the catalog at the project root
  var LOGIN_URL = 'login.html';              // same folder as signup.html

  // Built-in accounts. Demo only: a real site must check passwords on a server.
  var DEMO_ACCOUNTS = [
    // Admin: logs in with "Continue with Google" using this exact Google account (no password stored here).
    // A password login only works after the admin sets one in Settings. Keep the email lowercase.
    { email: 'admin.shushuko@gmail.com', password: null, role: 'admin', name: 'Admin' },
    { email: 'user@simplydesign.com', password: 'user123', role: 'user', name: 'User' }
  ];

  // Same EmailJS values you put in profile.js (used to email the login code when Two-Factor is ON)
  var EMAILJS = { publicKey: 'Ul8HraSWP2sp0-PZt', serviceId: 'service_14aknet', templateId: 'template_clxdxb8' };
  var OTP_MINUTES = 5, OTP_MAX_TRIES = 5, OTP_RESEND_SECONDS = 30;

  var REMEMBER_KEY = 'rememberedEmail';  // remembered email (never the password)
  var ACCOUNTS_KEY = 'simplyAccounts';   // accounts created on the sign-up page
  // Shared with profile.js (keep these names the same)
  var SESSION_KEY = 'simplyUser';
  var PROFILES_KEY = 'simplyProfiles';
  var WELCOME_KEY = 'simplyWelcome';
  var ADMIN_PW_KEY = 'simplyAdminPassword';   // shared with the admin Settings page

  /* ---------- Storage helpers (never throw) ---------- */

  function read(kind, key) {
    try { return JSON.parse(window[kind].getItem(key)); } catch (e) { return null; }
  }
  function write(kind, key, value) {
    try { window[kind].setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(kind, key) {
    try { window[kind].removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------- Accounts and sessions ---------- */

  function findAccount(email) {
    for (var i = 0; i < DEMO_ACCOUNTS.length; i++) {
      if (DEMO_ACCOUNTS[i].email === email) {
        var acc = DEMO_ACCOUNTS[i];
        // the admin can change this password from Settings (saved in this browser)
        var changed = acc.role === 'admin' ? read('localStorage', ADMIN_PW_KEY) : null;
        return changed ? { email: acc.email, password: changed, role: acc.role, name: acc.name } : acc;
      }
    }
    var saved = (read('localStorage', ACCOUNTS_KEY) || {})[email];
    return saved
      ? { email: email, password: saved.password, role: 'user', name: saved.name, since: saved.since }
      : null;
  }

  // Everyone starts logged out. A customer session only lives in this tab (sessionStorage), so opening
  // index.html fresh shows "Log in | Sign up" again. Only an admin who ticks "Remember me" is kept longer.
  function startSession(account, persistent) {
    var profiles = read('localStorage', PROFILES_KEY) || {};
    var profile = profiles[account.email] ||
      { name: account.name, since: account.since || new Date().toISOString() };
    profiles[account.email] = profile;
    write('localStorage', PROFILES_KEY, profiles);

    remove(persistent ? 'sessionStorage' : 'localStorage', SESSION_KEY);
    write(persistent ? 'localStorage' : 'sessionStorage', SESSION_KEY, {
      name: profile.name, email: account.email, role: account.role, since: profile.since
    });
  }

  function goTo(account, greeting) {
    try { sessionStorage.setItem(WELCOME_KEY, greeting); } catch (e) { /* ignore */ }
    setTimeout(function () {
      window.location.href = new URL(account.role === 'admin' ? ADMIN_URL : USER_URL, window.location.href).href;
    }, 500);
  }

  /* ---------- Two-Factor Authentication (code sent by email at login) ---------- */

  // True when this person turned on Two-Factor in Settings (profile.js saves it as prefs.twofa)
  function needsTwoFactor(email) {
    var p = (read('localStorage', PROFILES_KEY) || {})[String(email).toLowerCase()];
    return !!(p && p.prefs && p.prefs.twofa);
  }

  function otpTarget(account) {
    var p = (read('localStorage', PROFILES_KEY) || {})[String(account.email).toLowerCase()];
    return (p && p.otpEmail) || account.email;
  }

  function ensureEmailJs() {
    if (window.emailjs) return Promise.resolve();
    return loadScript('https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js');
  }

  // Emails a fresh 6-digit code. Resolves { code, note } where note is only filled in demo mode.
  function mailLoginCode(email, name) {
    var code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    if (EMAILJS.publicKey === 'YOUR_PUBLIC_KEY') {
      console.info('[Demo] Login code for ' + email + ': ' + code);
      return Promise.resolve({ code: code, note: 'NO EMAIL SENT (EmailJS keys not set in loginandsignup.js). Demo code: ' + code });
    }
    return ensureEmailJs().then(function () {
      return emailjs.send(EMAILJS.serviceId, EMAILJS.templateId, {
        to_email: email,
        to_name: name || 'there',
        otp_code: code,
        expires_in: OTP_MINUTES + ' minutes'
      }, { publicKey: EMAILJS.publicKey });
    }).then(function () {
      return { code: code, note: '' };
    }, function (err) {
      console.error('EmailJS error:', err);
      throw { message: "Couldn't send the verification email: " + ((err && (err.text || err.message)) || 'unknown error') };
    });
  }

  // Shows the "Verify it's you" window. Resolves when the code is right; rejects if cancelled / too many tries.
  function verifyLoginCode(account) {
    var target = otpTarget(account);
    return mailLoginCode(target, account.name).then(function (sent) {
      return new Promise(function (resolve, reject) {
        var current = { code: sent.code, expires: Date.now() + OTP_MINUTES * 60000, tries: 0, sentAt: Date.now() };

        var boxes = '';
        for (var n = 0; n < 6; n++) {
          boxes += '<input class="tf-digit" type="text" inputmode="numeric" maxlength="1" autocomplete="' +
            (n === 0 ? 'one-time-code' : 'off') + '" aria-label="Digit ' + (n + 1) + ' of 6">';
        }

        var overlay = document.createElement('div');
        overlay.className = 'so-overlay';
        overlay.innerHTML =
          '<form class="so-dialog tf-dialog" role="dialog" aria-modal="true" aria-labelledby="tfTitle" novalidate>' +
            '<span class="tf-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6L12 3z"/><rect x="9" y="11" width="6" height="4.5" rx="1"/><path d="M10.2 11V9.8a1.8 1.8 0 0 1 3.6 0V11"/></svg></span>' +
            '<h2 id="tfTitle">Verify it\'s you</h2>' +
            '<p class="tf-sub">Enter the 6-digit code we sent to<br><strong class="tf-mail"></strong></p>' +
            '<p class="so-note tf-demo" hidden></p>' +
            '<div class="tf-code" role="group" aria-label="Verification code">' + boxes + '</div>' +
            '<p class="tf-timer" aria-live="polite"></p>' +
            '<p class="so-err" role="alert" hidden></p>' +
            '<button type="submit" class="tf-verify">Verify</button>' +
            '<p class="tf-resend">Didn\'t get it? <button type="button" class="tf-link"></button></p>' +
            '<div class="tf-foot"><button type="button" class="tf-cancel">Cancel</button></div>' +
          '</form>';
        document.body.appendChild(overlay);

        var dlg = overlay.querySelector('.tf-dialog');
        var inputs = Array.prototype.slice.call(overlay.querySelectorAll('.tf-digit'));
        var row = overlay.querySelector('.tf-code');
        var timerEl = overlay.querySelector('.tf-timer');
        var errEl = overlay.querySelector('.so-err');
        var demoEl = overlay.querySelector('.tf-demo');
        var resendBtn = overlay.querySelector('.tf-link');
        var lastFocus = document.activeElement;
        overlay.querySelector('.tf-mail').textContent = target;

        function mmss(ms) {
          var t = Math.max(0, Math.ceil(ms / 1000));
          return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
        }
        function getCode() { return inputs.map(function (i) { return i.value; }).join(''); }
        function oops(msg) { errEl.textContent = msg; errEl.hidden = false; }
        function shake() {
          row.classList.remove('shake');
          void row.offsetWidth;
          row.classList.add('shake');
        }
        function clearBoxes() {
          inputs.forEach(function (i) { i.value = ''; i.classList.remove('filled'); });
          inputs[0].focus();
        }
        function setDemo(note) { demoEl.textContent = note || ''; demoEl.hidden = !note; }

        // live countdowns: code expiry + resend wait
        function tick() {
          var left = current.expires - Date.now();
          if (left <= 0) {
            timerEl.textContent = 'Code expired. Request a new one.';
            timerEl.classList.add('expired');
          } else {
            timerEl.textContent = 'Code expires in ' + mmss(left);
            timerEl.classList.remove('expired');
          }
          var wait = current.sentAt + OTP_RESEND_SECONDS * 1000 - Date.now();
          if (wait > 0) { resendBtn.disabled = true; resendBtn.textContent = 'Resend code in ' + mmss(wait); }
          else { resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
        }
        var timer = setInterval(tick, 1000);
        tick();
        setDemo(sent.note);

        function close() {
          clearInterval(timer);
          document.removeEventListener('keydown', onKey);
          overlay.remove();
          if (lastFocus && lastFocus.focus) lastFocus.focus();
        }
        function cancel() { close(); reject({ message: 'Verification cancelled. Please log in again.' }); }
        function onKey(e) { if (e.key === 'Escape') cancel(); }
        document.addEventListener('keydown', onKey);
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) cancel(); });
        overlay.querySelector('.tf-cancel').addEventListener('click', cancel);

        // spread digits across the boxes (typing, paste and autofill all end up here)
        function fill(from, text) {
          var d = String(text).replace(/\D/g, '').split('');
          for (var k = 0; k < d.length && from + k < 6; k++) {
            inputs[from + k].value = d[k];
            inputs[from + k].classList.add('filled');
          }
          inputs[Math.min(from + d.length, 5)].focus();
        }
        inputs.forEach(function (box, idx) {
          box.addEventListener('input', function () {
            errEl.hidden = true;
            var v = box.value.replace(/\D/g, '');
            box.value = '';
            box.classList.remove('filled');
            if (v) fill(idx, v);
          });
          box.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && !box.value && idx > 0) {
              inputs[idx - 1].value = ''; inputs[idx - 1].classList.remove('filled'); inputs[idx - 1].focus();
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' && idx > 0) { inputs[idx - 1].focus(); e.preventDefault(); }
            else if (e.key === 'ArrowRight' && idx < 5) { inputs[idx + 1].focus(); e.preventDefault(); }
          });
          box.addEventListener('paste', function (e) {
            var text = (e.clipboardData || window.clipboardData).getData('text');
            e.preventDefault();
            errEl.hidden = true;
            fill(idx, text);
          });
          box.addEventListener('focus', function () { box.select(); });
        });
        inputs[0].focus();

        resendBtn.addEventListener('click', function () {
          if (resendBtn.disabled) return;
          resendBtn.disabled = true;
          mailLoginCode(target, account.name).then(function (again) {
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

        dlg.addEventListener('submit', function (e) {
          e.preventDefault();
          var entered = getCode();
          if (entered.length < 6) { oops('Enter all 6 digits.'); shake(); return; }
          if (Date.now() > current.expires) { oops('That code has expired. Request a new one.'); shake(); return; }
          if (entered !== current.code) {
            current.tries++;
            if (current.tries >= OTP_MAX_TRIES) { close(); reject({ message: 'Too many wrong codes. Please log in again.' }); return; }
            oops('That code is incorrect. ' + (OTP_MAX_TRIES - current.tries) + ' tries left.');
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

  /* ---------- Show / hide password ---------- */

  document.querySelectorAll('.toggle').forEach(function (btn) {
    // Keep focus in the field while clicking the eye
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });

    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;

      var start = input.selectionStart;
      var end = input.selectionEnd;
      var show = input.type === 'password';

      input.type = show ? 'text' : 'password';
      input.focus();
      try { input.setSelectionRange(start, end); } catch (err) { /* ignore */ }

      btn.classList.toggle('on', show);
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- Errors ---------- */

  function showError(message) {
    // Hide then show so the entrance animation replays on every new message
    errorBox.hidden = true;
    void errorBox.offsetWidth;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function markInvalid(input) {
    var wrap = input.closest('.input-wrap');
    if (!wrap) return;
    wrap.classList.remove('shake');
    void wrap.offsetWidth; // restart the shake animation
    wrap.classList.add('invalid', 'shake');
  }

  function flag(input, message) {
    markInvalid(input);
    input.focus();
    showError(message);
  }

  // Clear the red state as soon as the person types again
  form.querySelectorAll('.input-wrap input').forEach(function (input) {
    input.addEventListener('input', function () {
      var wrap = input.closest('.input-wrap');
      if (wrap) wrap.classList.remove('invalid', 'shake');
      if (!form.querySelector('.input-wrap.invalid')) clearError();
    });
  });

  // True (after marking them red) when any of the fields is empty
  function hasEmpty(fields) {
    var empty = fields.filter(function (f) { return f.value.trim() === ''; });
    if (!empty.length) return false;
    empty.forEach(markInvalid);
    empty[0].focus();
    showError('Please fill in all fields.');
    return true;
  }

  /* ---------- Submit runner (spinner, success and failure states) ---------- */

  // work() returns a Promise: resolve(result) on success, reject({ message, input }) on failure
  function run(work, doneLabel, onDone) {
    clearError();
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    work().then(function (result) {
      submitBtn.classList.remove('loading');
      submitBtn.classList.add('done');
      if (submitLabel) submitLabel.textContent = doneLabel;
      onDone(result);
    }, function (err) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      if (err && err.input) markInvalid(err.input);
      showError(err && err.message ? err.message : 'Something went wrong. Try again.');
    });
  }

  /* ================= LOGIN PAGE ================= */

  if (loginForm) {
    var emailInput = loginForm.email;
    var passwordInput = loginForm.password;
    var remember = loginForm.remember;

    // Fill in the remembered email
    try {
      var savedEmail = localStorage.getItem(REMEMBER_KEY);
      if (savedEmail) {
        emailInput.value = savedEmail;
        if (remember) remember.checked = true;
      }
    } catch (err) { /* storage unavailable */ }

    var saveRemembered = function () {
      try {
        if (remember && remember.checked) {
          localStorage.setItem(REMEMBER_KEY, emailInput.value.trim());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch (err) { /* storage unavailable */ }
    };

    var logIn = function (email, password) {
      return new Promise(function (resolve, reject) {
        var account = findAccount(email.toLowerCase());
        if (account && account.role === 'admin' && account.password == null) {
          reject({ message: 'The admin logs in with Google. Click "Continue with Google" and choose that Google account.' });
          return;
        }
        if (account && account.password === password) {
          resolve(account);
        } else {
          reject({ message: 'Email or password is incorrect.' });
        }
      });
    };

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn.disabled) return;
      if (hasEmpty([emailInput, passwordInput])) return;
      if (!emailInput.validity.valid) {
        flag(emailInput, 'Enter a valid email address.');
        return;
      }

      run(function () {
        return logIn(emailInput.value.trim(), passwordInput.value).then(function (account) {
          if (!needsTwoFactor(account.email)) return account;
          return verifyLoginCode(account).then(function () { return account; });
        });
      }, 'Logged in', function (account) {
        saveRemembered();
        // Customers are logged in for this tab only (closing the tab logs them out).
        // Admins stay tab-only unless "Remember me" is ticked.
        startSession(account, account.role === 'admin' && !!(remember && remember.checked));
        goTo(account, 'back');
      });
    });
  }

  /* ================= SIGN-UP PAGE ================= */

  if (signupForm) {
    var nameInput = signupForm.fullName;
    var signupEmail = signupForm.email;
    var signupPassword = signupForm.password;
    var confirmInput = signupForm.confirmPassword;

    var createAccount = function (name, email, password) {
      return new Promise(function (resolve, reject) {
        email = email.toLowerCase();

        if (findAccount(email)) {
          reject({ message: 'An account with this email already exists.', input: signupEmail });
          return;
        }

        var accounts = read('localStorage', ACCOUNTS_KEY) || {};
        var since = new Date().toISOString();
        accounts[email] = { name: name, password: password, since: since };

        if (!write('localStorage', ACCOUNTS_KEY, accounts)) {
          reject({ message: 'Could not save your account. Allow this site to store data and try again.' });
          return;
        }
        resolve({ email: email, name: name, role: 'user', since: since });
      });
    };

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn.disabled) return;
      if (hasEmpty([nameInput, signupEmail, signupPassword, confirmInput])) return;
      if (!signupEmail.validity.valid) {
        flag(signupEmail, 'Enter a valid email address.');
        return;
      }
      if (signupPassword.value.length < 8) {
        flag(signupPassword, 'Password must be at least 8 characters.');
        return;
      }
      if (signupPassword.value !== confirmInput.value) {
        flag(confirmInput, 'Passwords do not match.');
        return;
      }

      run(function () {
        return createAccount(nameInput.value.trim(), signupEmail.value.trim(), signupPassword.value);
      }, 'Account created', function () {
        // Account is saved. Send the new customer to the login page to sign in.
        setTimeout(function () {
          window.location.href = new URL(LOGIN_URL, window.location.href).href;
        }, 800);
      });
    });
  }

  /* ================= SOCIAL LOGIN (Google / Facebook) ================= */

  // Paste your IDs here to get the REAL Google / Facebook sign-in popup (the account chooser
  // you see on other websites). While an ID is empty, a small DEMO window opens instead.
  //
  // Google:   Google Cloud Console > APIs & Services > Credentials > Create OAuth client ID
  //           (type "Web application"). Add your site address under "Authorized JavaScript origins",
  //           e.g. http://localhost:5500 and https://<your-name>.github.io
  // Facebook: developers.facebook.com > Create App > Facebook Login > Settings.
  //           Add your site address under "Allowed Domains for the JavaScript SDK". Needs https
  //           (http://localhost is fine while testing).
  var SOCIAL = {
    GOOGLE_CLIENT_ID: '581925785874-56hna5nkhkl7al40cm8u4v66jismjhhd.apps.googleusercontent.com',
    FACEBOOK_APP_ID: '2027840961224696' 
  };

  var googleBtn = document.getElementById('googleBtn');
  var facebookBtn = document.getElementById('facebookBtn');

  var googleClient = null;     // filled in once Google's script has loaded
  var googlePending = null;    // the sign-in waiting for Google's answer
  var facebookReady = false;   // true once Facebook's script has loaded

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('load')); };
      document.head.appendChild(s);
    });
  }

  var onFile = window.location.protocol === 'file:';

  /* ----- Google: load the sign-in library now, so the popup can open instantly on click ----- */
  if (SOCIAL.GOOGLE_CLIENT_ID && !onFile) {
    loadScript('https://accounts.google.com/gsi/client').then(function () {
      googleClient = google.accounts.oauth2.initTokenClient({
        client_id: SOCIAL.GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: function (resp) {
          var p = googlePending;
          googlePending = null;
          if (!p) return;
          if (resp.error || !resp.access_token) {
            p.reject(resp.error === 'access_denied' ? null : { message: 'Google sign-in failed. Try again.' });
            return;
          }
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + resp.access_token }
          }).then(function (r) { return r.json(); }).then(function (info) {
            if (!info || info.error || !info.email) throw new Error('profile');
            if (info.email_verified === false) {
              p.reject({ message: 'Google did not share a verified email address.' });
              return;
            }
            p.resolve(info);
          }).then(null, function () {
            p.reject({ message: 'Could not read your Google profile. Try again.' });
          });
        },
        error_callback: function (err) {
          var p = googlePending;
          googlePending = null;
          if (!p) return;
          // Closing the popup is not an error
          p.reject(err && err.type === 'popup_closed' ? null
            : { message: 'Google sign-in could not open. Allow pop-ups for this site and try again.' });
        }
      });
    }).then(null, function () { /* blocked or offline: the button explains it when clicked */ });
  }

  // Must be called straight from the click so the browser allows the popup
  function googlePopup() {
    return new Promise(function (resolve, reject) {
      googlePending = { resolve: resolve, reject: reject };
      googleClient.requestAccessToken();
    });
  }

  /* ----- Facebook ----- */
  if (SOCIAL.FACEBOOK_APP_ID && !onFile) {
    window.fbAsyncInit = function () {
      FB.init({ appId: SOCIAL.FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v25.0' });
      facebookReady = true;
    };
    loadScript('https://connect.facebook.net/en_US/sdk.js').then(null, function () { /* blocked or offline */ });
  }

  function facebookPopup() {
    return new Promise(function (resolve, reject) {
      FB.login(function (resp) {
        if (!resp || !resp.authResponse) { reject(null); return; }   // popup closed / declined
        FB.api('/me', { fields: 'name,email' }, function (info) {
          if (!info || info.error) {
            reject({ message: 'Could not read your Facebook profile. Try again.' });
            return;
          }
          resolve(info);
        });
      }, { scope: 'public_profile,email' });
    });
  }

  /* ----- Demo window (used while no Google / Facebook ID is set) ----- */
  function demoDialog(provider) {
    return new Promise(function (resolve, reject) {
      var overlay = document.createElement('div');
      overlay.className = 'so-overlay';
      overlay.innerHTML =
        '<form class="so-dialog" role="dialog" aria-modal="true" aria-labelledby="soTitle" novalidate>' +
          '<h2 id="soTitle">Continue with ' + provider + '</h2>' +
          '<p class="so-note">Demo mode: this is not the real ' + provider + ' sign-in. Enter any name and email to continue.</p>' +
          '<label>Name<input type="text" name="soName" autocomplete="name" maxlength="60" placeholder="Your name"></label>' +
          '<label>Email<input type="email" name="soEmail" autocomplete="email" placeholder="you@example.com"></label>' +
          '<p class="so-err" role="alert" hidden></p>' +
          '<div class="so-actions">' +
            '<button type="button" class="so-cancel">Cancel</button>' +
            '<button type="submit" class="so-go">Continue</button>' +
          '</div>' +
        '</form>';
      document.body.appendChild(overlay);

      var dlg = overlay.querySelector('.so-dialog');
      var nameEl = dlg.soName, emailEl = dlg.soEmail, errEl = overlay.querySelector('.so-err');
      var lastFocus = document.activeElement;
      nameEl.focus();

      function close() {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
      function cancel() { close(); reject(null); }
      function onKey(e) { if (e.key === 'Escape') cancel(); }
      document.addEventListener('keydown', onKey);

      overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) cancel(); });
      overlay.querySelector('.so-cancel').addEventListener('click', cancel);

      dlg.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!nameEl.value.trim()) { errEl.textContent = 'Please enter your name.'; errEl.hidden = false; nameEl.focus(); return; }
        if (!emailEl.value.trim() || !emailEl.validity.valid) { errEl.textContent = 'Enter a valid email address.'; errEl.hidden = false; emailEl.focus(); return; }
        close();
        resolve({ name: nameEl.value.trim(), email: emailEl.value.trim() });
      });
    });
  }

  /* ----- Turn a Google / Facebook profile into a logged-in customer ----- */
  // Works for both pages: a new email gets an account (sign up), a known one just logs in.
  function socialFinish(provider, info, verified) {
    return new Promise(function (resolve, reject) {
      var email = String((info && info.email) || '').trim().toLowerCase();
      var name = String((info && info.name) || '').trim() || email.split('@')[0];

      if (!email) {
        reject({ message: provider + ' did not share an email address. Allow email access, or log in another way.' });
        return;
      }
      // Built-in accounts: the admin can only come in through a real, verified Google sign-in
      for (var i = 0; i < DEMO_ACCOUNTS.length; i++) {
        var demo = DEMO_ACCOUNTS[i];
        if (demo.email !== email) continue;
        if (demo.role === 'admin' && provider === 'Google' && verified) {
          var adminAcc = { email: email, name: demo.name, role: 'admin', since: new Date().toISOString() };
          var enterAdmin = function () { startSession(adminAcc, false); goTo(adminAcc, 'back'); resolve(adminAcc); };
          if (needsTwoFactor(email)) verifyLoginCode(adminAcc).then(enterAdmin, reject);
          else enterAdmin();
          return;
        }
        reject({ message: demo.role === 'admin'
          ? 'This is the admin email. Use Continue with Google and choose that Google account.'
          : 'This email can only log in with its password.' });
        return;
      }

      var accounts = read('localStorage', ACCOUNTS_KEY) || {};
      var existing = accounts[email];

      // Demo mode cannot prove who owns an email, so it will not open someone's password account
      if (existing && existing.password && !verified) {
        reject({ message: 'This email already has a password account. Please log in with your password.' });
        return;
      }

      var isNew = !existing;
      var since = existing ? existing.since : new Date().toISOString();
      if (isNew) {
        accounts[email] = { name: name, password: null, provider: provider.toLowerCase(), since: since };
        if (!write('localStorage', ACCOUNTS_KEY, accounts)) {
          reject({ message: 'Could not save your account. Allow this site to store data and try again.' });
          return;
        }
      }

      var account = { email: email, name: existing ? existing.name : name, role: 'user', since: since };
      var finish = function () {
        startSession(account, false);
        goTo(account, isNew ? 'new' : 'back');
        resolve(account);
      };
      if (needsTwoFactor(email)) verifyLoginCode(account).then(finish, reject);
      else finish();
    });
  }

  function startSocial(provider, btn) {
    if (!btn || btn.disabled) return;
    clearError();

    var real = provider === 'Google' ? !!SOCIAL.GOOGLE_CLIENT_ID : !!SOCIAL.FACEBOOK_APP_ID;
    var getInfo;

    if (real) {
      if (onFile) {
        showError('Real ' + provider + ' sign-in does not work when the page is opened as a file. Open it through http://localhost or your https website.');
        return;
      }
      var ready = provider === 'Google' ? !!googleClient : facebookReady;
      if (!ready) {
        showError(provider + ' sign-in is still loading or was blocked. Wait a moment and try again.');
        return;
      }
      getInfo = provider === 'Google' ? googlePopup : facebookPopup;
    } else {
      getInfo = demoDialog;
    }

    btn.disabled = true;
    btn.classList.add('busy');

    // getInfo() runs right here inside the click, so the popup is not blocked
    getInfo(provider).then(function (info) {
      return socialFinish(provider, info, real);
    }).then(null, function (err) {
      btn.disabled = false;
      btn.classList.remove('busy');
      if (err && err.message) showError(err.message);   // a closed popup / cancelled demo stays silent
    });
  }

  if (googleBtn) googleBtn.addEventListener('click', function () { startSocial('Google', googleBtn); });
  if (facebookBtn) facebookBtn.addEventListener('click', function () { startSocial('Facebook', facebookBtn); });
})();