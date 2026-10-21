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

  /* ---------- Settings ---------- */

  // EMAIL SENDING (free service: https://www.emailjs.com). Fill these three in to send real emails.
  // Until they are filled in, no email can be sent (see the notes in the chat).
  var EMAILJS = {
    SERVICE_ID: 'service_14aknet',     // e.g. 'service_abc123'
    TEMPLATE_ID: 'template_wqfdbuq',    // e.g. 'template_xyz789'
    PUBLIC_KEY: 'Ul8HraSWP2sp0-PZt'      // e.g. 'AbCdEfGhIjKlMnOp'
  };

  var ACCOUNTS_KEY = 'simplyAccounts';   // same accounts the sign-up page saves
  var RESETS_KEY = 'simplyResets';       // reset links that are still valid
  var SENT_KEY = 'simplyResetSent';      // when a link was last requested, per email
  var LINK_MINUTES = 30;                 // how long a link works
  var COOLDOWN_SECONDS = 60;             // wait between requests for the same email

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function randomToken() {
    var a = new Uint8Array(24);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  var configured = !!(EMAILJS.SERVICE_ID && EMAILJS.TEMPLATE_ID && EMAILJS.PUBLIC_KEY);
  // Only when testing on your own computer: show the link on the page instead of failing
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(window.location.hostname);

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

  // Creates a reset link for the account and emails it. Resolves the same way whether or not the
  // account exists, so nobody can use this form to find out which emails are registered.
  function sendResetLink(email) {
    var key = email.toLowerCase();

    if (!configured && !isLocal) {
      return Promise.reject({ message: "Email sending isn't set up yet. Please contact the shop." });
    }

    // one request per minute for each email (also protects the free email quota)
    var sent = read(SENT_KEY);
    var now = Date.now();
    if (sent[key] && now - sent[key] < COOLDOWN_SECONDS * 1000) {
      return Promise.reject({ message: 'Please wait a minute before asking for another link.' });
    }
    sent[key] = now;
    write(SENT_KEY, sent);

    var accounts = read(ACCOUNTS_KEY);
    var account = accounts[key];
    if (!account || !account.password) {
      return wait(900).then(function () { return {}; });   // same look and timing, nothing is sent
    }

    // new token; drop expired ones and any older link for this email
    var resets = read(RESETS_KEY);
    Object.keys(resets).forEach(function (t) {
      if (resets[t].exp < now || resets[t].email === key) delete resets[t];
    });
    var token = randomToken();
    resets[token] = { email: key, exp: now + LINK_MINUTES * 60 * 1000 };
    if (!write(RESETS_KEY, resets)) {
      return Promise.reject({ message: 'Could not create the link. Allow this site to store data and try again.' });
    }

    var link = new URL('resetpassword.html', window.location.href).href.split('#')[0].split('?')[0] +
      '?token=' + token;

    if (!configured) return Promise.resolve({ demoLink: link });   // local testing only

    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS.SERVICE_ID,
        template_id: EMAILJS.TEMPLATE_ID,
        user_id: EMAILJS.PUBLIC_KEY,
        template_params: {
          // names used by your EmailJS template ({{email}} and {{link}})
          email: email,
          link: link,
          name: account.name || email,
          // same values under the other names, so either template wording works
          to_email: email,
          to_name: account.name || email,
          reset_link: link,
          expires_in: LINK_MINUTES + ' minutes',
          site_name: 'Simply Design'
        }
      })
    }).then(function (r) {
      if (r.ok) return {};
      // EmailJS explains what is wrong in the reply (wrong key, empty "To email", Gmail not connected...)
      return r.text().then(function (text) {
        console.error('EmailJS error', r.status, text);
        throw { message: 'We could not send the email. EmailJS says: ' + (text || ('error ' + r.status)) };
      });
    }, function (err) {
      console.error('EmailJS request failed', err);
      throw { message: 'We could not reach the email service. Check your internet connection and try again.' };
    }).catch(function (err) {
      // a failed send should not lock the person out for a minute
      var again = read(SENT_KEY);
      delete again[key];
      write(SENT_KEY, again);
      throw err;
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
      .then(function (result) {
        submitBtn.classList.remove('loading');
        submitBtn.classList.add('done');
        if (submitLabel) submitLabel.textContent = 'Link sent';
        showSuccess('If an account exists for ' + email + ', a reset link is on its way. Check your inbox (and spam folder). The link works for ' + LINK_MINUTES + ' minutes.');

        if (result && result.demoLink) {
          // testing on your own computer, no email service connected
          var p = document.createElement('span');
          p.style.display = 'block';
          p.style.marginTop = '8px';
          p.appendChild(document.createTextNode('Test mode (no email service connected): '));
          var a = document.createElement('a');
          a.href = result.demoLink;
          a.textContent = 'open your reset link';
          p.appendChild(a);
          successBox.appendChild(p);
        }
      })
      .catch(function (err) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        showError(err && err.message ? err.message : 'We could not send the link. Try again.');
      });
  });
})();