(function () {
  'use strict';

  var form = document.getElementById('resetForm');
  if (!form) return;

  var invalidBox = document.getElementById('resetInvalid');
  var doneBox = document.getElementById('resetDone');
  var forText = document.getElementById('resetFor');
  var errorBox = document.getElementById('formError');
  var submitBtn = form.querySelector('.btn-primary');

  var ACCOUNTS_KEY = 'simplyAccounts';   // same accounts the sign-up page saves
  var RESETS_KEY = 'simplyResets';       // reset links created by forgotpassword.js

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* ---------- Check the link ---------- */

  var token = new URLSearchParams(window.location.search).get('token') || '';
  var resets = read(RESETS_KEY);
  var entry = token && Object.prototype.hasOwnProperty.call(resets, token) ? resets[token] : null;
  var accounts = read(ACCOUNTS_KEY);

  if (!entry || entry.exp < Date.now() || !accounts[entry.email]) {
    invalidBox.hidden = false;
    return;
  }
  // keep the token out of the address bar / history from here on
  try { history.replaceState(null, '', window.location.pathname); } catch (e) { /* ignore */ }

  form.hidden = false;
  forText.textContent = 'Choose a new password for ' + entry.email + '.';
  form.newPassword.focus();

  /* ---------- Show / hide password ---------- */

  document.querySelectorAll('.toggle').forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.dataset.target);
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      input.focus();
      btn.classList.toggle('on', show);
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- Errors ---------- */

  function showError(message) {
    errorBox.hidden = true;
    void errorBox.offsetWidth;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }
  function markInvalid(input) {
    var wrap = input.closest('.input-wrap');
    if (!wrap) return;
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('invalid', 'shake');
    input.focus();
  }
  form.querySelectorAll('.input-wrap input').forEach(function (input) {
    input.addEventListener('input', function () {
      var wrap = input.closest('.input-wrap');
      if (wrap) wrap.classList.remove('invalid', 'shake');
      if (!form.querySelector('.input-wrap.invalid')) { errorBox.hidden = true; errorBox.textContent = ''; }
    });
  });

  /* ---------- Submit ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    var pw = form.newPassword.value;
    var conf = form.confirmPassword.value;

    if (!pw) { markInvalid(form.newPassword); showError('Please enter a new password.'); return; }
    if (pw.length < 8) { markInvalid(form.newPassword); showError('Password must be at least 8 characters.'); return; }
    if (pw !== conf) { markInvalid(form.confirmPassword); showError('Passwords do not match.'); return; }

    // read again, in case something changed while the page was open
    var nowResets = read(RESETS_KEY);
    var nowAccounts = read(ACCOUNTS_KEY);
    if (!nowResets[token] || nowResets[token].exp < Date.now() || !nowAccounts[entry.email]) {
      form.hidden = true;
      invalidBox.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    nowAccounts[entry.email].password = pw;
    delete nowResets[token];                    // each link works once
    var ok = write(ACCOUNTS_KEY, nowAccounts);
    write(RESETS_KEY, nowResets);

    setTimeout(function () {
      submitBtn.classList.remove('loading');
      if (!ok) {
        submitBtn.disabled = false;
        showError('Could not save your new password. Allow this site to store data and try again.');
        return;
      }
      form.hidden = true;
      doneBox.hidden = false;
    }, 500);
  });
})();