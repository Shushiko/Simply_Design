(function () {
  'use strict';

  var form = document.getElementById('forgotForm');
  if (!form) return;

  var errorBox = document.getElementById('formError');
  var successBox = document.getElementById('formSuccess');
  var submitBtn = form.querySelector('.btn-primary');
  var submitLabel = submitBtn ? submitBtn.querySelector('.btn-label') : null;
  var emailWrap = form.email.closest('.input-wrap');

  var DEFAULT_LABEL = submitLabel ? submitLabel.textContent : 'Send reset link';

  /* ---------- Messages ---------- */

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

  function showSuccess(message) {
    successBox.textContent = message;
    successBox.hidden = false;
  }

  function clearSuccess() {
    successBox.hidden = true;
    successBox.textContent = '';
  }

  function markInvalid() {
    emailWrap.classList.remove('shake');
    void emailWrap.offsetWidth; // restart the shake animation
    emailWrap.classList.add('invalid', 'shake');
    form.email.focus();
  }

  /* ---------- Typing again resets the form ---------- */

  form.email.addEventListener('input', function () {
    emailWrap.classList.remove('invalid', 'shake');
    clearError();

    // After a link was sent, editing the email lets them send another one
    if (submitBtn.classList.contains('done')) {
      clearSuccess();
      submitBtn.classList.remove('done');
      submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = DEFAULT_LABEL;
    }
  });

  /* ---------- Validation ---------- */

  function validate() {
    var value = form.email.value.trim();

    if (value === '') {
      markInvalid();
      showError('Please enter your email address.');
      return false;
    }
    if (!form.email.validity.valid) {
      markInvalid();
      showError('Enter a valid email address.');
      return false;
    }
    return true;
  }

  /* ---------- Submit ---------- */

  // Replace this with your real request, e.g. fetch('/api/forgot-password', { ... })
  function sendResetLink(email) {
    return new Promise(function (resolve) {
      setTimeout(resolve, 1200);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled || !validate()) return;

    var email = form.email.value.trim();

    clearError();
    clearSuccess();
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    sendResetLink(email)
      .then(function () {
        submitBtn.classList.remove('loading');
        submitBtn.classList.add('done');
        if (submitLabel) submitLabel.textContent = 'Link sent';
        // Same wording whether or not the account exists, so nobody can use
        // this form to find out which emails are registered.
        showSuccess('If an account exists for ' + email + ', a reset link is on its way. Check your inbox.');
      })
      .catch(function () {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showError('We could not send the link. Try again.');
      });
  });
})();