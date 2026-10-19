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

  var ADMIN_URL = 'Simply_Design/admin-web/web/dashboard.html';
  var USER_URL = '../../../index.html';

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

  // "Remember me" keeps the session after the browser closes; otherwise it ends with the tab.
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
      // ADMIN_URL / USER_URL start from the project root (the folder that contains Simply_Design),
      // so find that root from wherever this page is served
      var href = window.location.href;
      var cut = href.indexOf('/Simply_Design/');
      var base = cut >= 0 ? href.slice(0, cut + 1) : new URL('./', href).href;
      window.location.href = base + (account.role === 'admin' ? ADMIN_URL : USER_URL);
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
        // Customers stay logged in on this browser until they press Log Out (so the catalog's top bar
        // changes in every tab). Admins keep the old behavior: tab-only unless "Remember me" is ticked.
        startSession(account, account.role !== 'admin' || !!(remember && remember.checked));
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
        startSession(account, true);
        goTo(account, 'new');
      });
    });
  }

  /* ---------- Social buttons ---------- */
  // Hook these up to your Google / Facebook OAuth flow

  var googleBtn = document.getElementById('googleBtn');
  var facebookBtn = document.getElementById('facebookBtn');

  if (googleBtn) googleBtn.addEventListener('click', function () {
    console.log('Continue with Google');
  });
  if (facebookBtn) facebookBtn.addEventListener('click', function () {
    console.log('Continue with Facebook');
  });
})();