(function () {
  "use strict";

  var form = document.getElementById("loginForm");
  if (!form) return;

  var errorBox = document.getElementById("formError");
  var submitBtn = form.querySelector(".btn-primary");
  var submitLabel = submitBtn ? submitBtn.querySelector(".btn-label") : null;

  var REMEMBER_KEY = "rememberedEmail";

  /* ---------- Show / hide password ---------- */

  document.querySelectorAll(".toggle").forEach(function (btn) {
    // Keep focus in the password field while clicking the eye
    btn.addEventListener("mousedown", function (e) {
      e.preventDefault();
    });

    btn.addEventListener("click", function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;

      var start = input.selectionStart;
      var end = input.selectionEnd;

      var show = input.type === "password";

      input.type = show ? "text" : "password";

      input.focus();

      try {
        input.setSelectionRange(start, end);
      } catch (err) {
        /* ignore */
      }

      btn.classList.toggle("on", show);

      btn.setAttribute("aria-pressed", show ? "true" : "false");

      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  /* ---------- Remember me ---------- */

  // Only the email is saved in the browser.
  // The password is NEVER saved.

  function loadRemembered() {
    try {
      var saved = localStorage.getItem(REMEMBER_KEY);

      if (saved) {
        form.email.value = saved;

        if (form.remember) {
          form.remember.checked = true;
        }
      }
    } catch (err) {
      /* storage unavailable */
    }
  }

  function saveRemembered() {
    try {
      if (form.remember && form.remember.checked) {
        localStorage.setItem(REMEMBER_KEY, form.email.value.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err) {
      /* storage unavailable */
    }
  }

  loadRemembered();

  /* ---------- Errors ---------- */

  function showError(message) {
    // Hide then show so the animation replays
    errorBox.hidden = true;

    void errorBox.offsetWidth;

    errorBox.textContent = message;

    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.hidden = true;

    errorBox.textContent = "";
  }

  function markInvalid(input) {
    var wrap = input.closest(".input-wrap");

    if (!wrap) return;

    wrap.classList.remove("shake");

    void wrap.offsetWidth;

    wrap.classList.add("invalid", "shake");
  }

  function flag(input, message) {
    markInvalid(input);

    input.focus();

    showError(message);
  }

  // Clear red state when the user starts typing
  form.querySelectorAll(".input-wrap input").forEach(function (input) {
    input.addEventListener("input", function () {
      var wrap = input.closest(".input-wrap");

      if (wrap) {
        wrap.classList.remove("invalid", "shake");
      }

      if (!form.querySelector(".input-wrap.invalid")) {
        clearError();
      }
    });
  });

  /* ---------- Validation ---------- */

  function validate() {
    var fields = [form.email, form.password];

    // Check if fields are empty
    var empty = fields.filter(function (f) {
      return f.value.trim() === "";
    });

    if (empty.length) {
      empty.forEach(markInvalid);

      empty[0].focus();

      showError("Please fill in all fields.");

      return false;
    }

    // Check email format
    if (!form.email.validity.valid) {
      flag(form.email, "Enter a valid email address.");

      return false;
    }

    return true;
  }

  /* ---------- LOGIN AUTHENTICATION ---------- */

  function logIn(data) {
    return new Promise(function (resolve, reject) {
      /*
       * ADMIN ACCOUNT
       *
       * Email:
       * admin@simplydesign.com
       *
       * Password:
       * admin123
       */

      if (
        data.email === "admin@simplydesign.com" &&
        data.password === "admin123"
      ) {
        resolve("admin");

        return;
      }

      /*
       * USER ACCOUNT
       *
       * Email:
       * user@simplydesign.com
       *
       * Password:
       * user123
       */

      if (
        data.email === "user@simplydesign.com" &&
        data.password === "user123"
      ) {
        resolve("user");

        return;
      }

      /*
       * INVALID LOGIN
       */

      reject();
    });
  }

  /* ---------- Submit ---------- */

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (submitBtn.disabled || !validate()) {
      return;
    }

    clearError();

    submitBtn.disabled = true;

    submitBtn.classList.add("loading");

    logIn({
      email: form.email.value.trim(),

      password: form.password.value,

      remember: form.remember ? form.remember.checked : false,
    })
      /* ---------- LOGIN SUCCESS ---------- */

      .then(function (accountType) {
        saveRemembered();

        submitBtn.classList.remove("loading");

        submitBtn.classList.add("done");

        if (submitLabel) {
          submitLabel.textContent = "Logged in";
        }

        /*
         * ADMIN LOGIN
         *
         * admin@simplydesign.com
         * admin123
         */

        if (accountType === "admin") {
          window.location.href = "Simply_Design/admin-web/web/dashboard.html";

          return;
        }

        /*
         * USER LOGIN
         *
         * user@simplydesign.com
         * user123
         */

        if (accountType === "user") {
          window.location.href = "Simply_Design/flutter-app/user-web/web/user.html";

          return;
        }
      })

      /* ---------- LOGIN FAILED ---------- */

      .catch(function () {
        submitBtn.classList.remove("loading");

        submitBtn.disabled = false;

        showError("Email or password is incorrect.");
      });
  });

  /* ---------- Social Login ---------- */

  // Hook these up to your Google / Facebook OAuth flow

  var googleBtn = document.getElementById("googleBtn");

  var facebookBtn = document.getElementById("facebookBtn");

  if (googleBtn) {
    googleBtn.addEventListener("click", function () {
      console.log("Continue with Google");
    });
  }

  if (facebookBtn) {
    facebookBtn.addEventListener("click", function () {
      console.log("Continue with Facebook");
    });
  }
})();
