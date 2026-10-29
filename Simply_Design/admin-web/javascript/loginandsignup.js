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

  // Built-in accounts. Demo only: a real site must check passwords on a server.
  var DEMO_ACCOUNTS = [
    { email: 'admin@simplydesign.com', password: 'admin123', role: 'admin', name: 'Admin' },
    { email: 'user@simplydesign.com', password: 'user123', role: 'user', name: 'User' }
  ];

  var REMEMBER_KEY = 'rememberedEmail';  // remembered email (never the password)
  var ACCOUNTS_KEY = 'simplyAccounts';   // accounts created on the sign-up page
  // Shared with profile.js (keep these names the same)
  var SESSION_KEY = 'simplyUser';
  var PROFILES_KEY = 'simplyProfiles';
  var WELCOME_KEY = 'simplyWelcome';

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
      if (DEMO_ACCOUNTS[i].email === email) return DEMO_ACCOUNTS[i];
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
        return logIn(emailInput.value.trim(), passwordInput.value);
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
      }, 'Account created', function (account) {
        startSession(account, false);   // new customers are also logged in for this tab only
        goTo(account, 'new');
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
    FACEBOOK_APP_ID: '1654147319348313' 
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
      FB.init({ appId: SOCIAL.FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v19.0' });
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
      // The built-in admin / user accounts can only be used with their password
      for (var i = 0; i < DEMO_ACCOUNTS.length; i++) {
        if (DEMO_ACCOUNTS[i].email === email) {
          reject({ message: 'This email can only log in with its password.' });
          return;
        }
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
      startSession(account, false);
      goTo(account, isNew ? 'new' : 'back');
      resolve(account);
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