// Logic for profile.html (the account / settings page).
// Needs auth.js to load first (getUser, saveProfile, getOrders, authToast, ...).
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);

  const DEFAULT_PREFS = { orders: true, email: true, dark: false, lang: 'English', cur: 'Philippine Peso (\u20b1)', twofa: false };
  const MOBILE = /^(\+63|0)9\d{9}$/;   // same rule as the booking form

  let user = null;
  let profile = {};
  let showAllOrders = false;

  /* ---------- helpers ---------- */

  const prefsOf = () => Object.assign({}, DEFAULT_PREFS, profile.prefs);

  function todayStr() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function fmtDay(str) {   // 'YYYY-MM-DD' -> 'Oct 9, 2026'
    const [y, m, d] = String(str).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtShort(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function fmtIso(iso) {   // order date from an ISO timestamp -> 'Oct 9, 2026'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function daysUntil(str) {
    const [y, m, d] = String(str).split('-').map(Number);
    const now = new Date();
    return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  }
  const peso = (n) => '\u20b1' + Number(n).toLocaleString('en-PH');

  function statusOf(o) {
    const t = todayStr();
    if (t < o.from) return ['reserved', 'Reserved'];
    if (t <= o.to) return ['active', 'Active'];
    return ['returned', 'Returned'];
  }

  function showError(msg, field) {
    $('#pfErr').textContent = msg || '';
    document.querySelectorAll('.pf-field input[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    return false;
  }

  /* ---------- notifications (built from the person's rentals) ---------- */

  function buildNotifications(orders) {
    const list = [];
    orders.forEach((o) => {
      const what = `${o.type} (${o.code})`;
      list.push({ at: o.created, title: `Order #${o.ref} confirmed`, text: `${what} is reserved for you.` });
      list.push(o.method === 'Cash'
        ? { at: o.created, title: 'Pay at pickup', text: `Please bring ${peso(o.fee)} to our ${o.place || 'Tayabas'} shop.` }
        : { at: o.created, title: `Payment via ${o.method}`, text: 'We will message you to confirm your payment.' });
      if (statusOf(o)[0] !== 'returned') {
        const d = daysUntil(o.to);
        const when = d <= 0 ? 'is due back today' : d === 1 ? 'is due back tomorrow' : `is due in ${d} days`;
        list.push({ at: o.created, title: 'Return reminder', text: `${o.type} ${when}.` });
      }
    });
    const cleared = profile.clearedAt || '';
    return list.filter((n) => !cleared || n.at > cleared);
  }

  /* ---------- render ---------- */

  function paintAvatar() {
    const box = $('#pfAvatar');
    if (/^data:image\//.test(profile.photo || '')) {
      box.innerHTML = `<img src="${escapeHtml(profile.photo)}" alt="">`;
    } else {
      box.textContent = initialsFor(profile.name || user.name, user.email);
    }
  }

  function render() {
    user = getUser();
    $('#signedIn').hidden = !user;
    $('#signedOut').hidden = !!user;
    if (!user) return;

    profile = getProfile(user.email);
    const prefs = prefsOf();
    const name = profile.name || user.name || '';

    paintAvatar();
    $('#pfName').textContent = name || 'My Account';
    $('#pfEmail').textContent = user.email || '';
    $('#pfRole').textContent = user.role === 'admin' ? 'Admin' : 'Customer';

    $('#fName').value = name;
    $('#fEmail').value = user.email || '';
    $('#fPhone').value = profile.phone || '';
    $('#fAddress').value = profile.address || '';
    $('#fGcash').value = profile.gcash || '';

    $('#optOrders').checked = prefs.orders;
    $('#optEmail').checked = prefs.email;
    $('#optDark').checked = isDark();   // what is on screen right now (saved profile choice, or this device's)
    $('#optLang').value = prefs.lang;
    $('#optCur').value = prefs.cur;
    $('#pf2fa').textContent = prefs.twofa ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication';

    renderOrders();
    renderNotifications();
  }

  function renderOrders() {
    const orders = getOrders(user.email).slice().sort((a, b) => b.created.localeCompare(a.created));
    const shown = showAllOrders ? orders : orders.slice(0, 3);

    $('#stOrders').textContent = orders.length;
    $('#ordersTable').hidden = !orders.length;
    $('#ordersEmpty').hidden = !!orders.length;
    $('#ordersMore').hidden = orders.length <= 3;
    $('#ordersMore').textContent = showAllOrders ? 'Show fewer orders' : 'View all orders';

    $('#ordersBody').innerHTML = shown.map((o) => {
      const [cls, label] = statusOf(o);
      return `<tr>
        <td class="ref">#${escapeHtml(o.ref)}</td>
        <td>${escapeHtml(o.type)}<small>${escapeHtml(o.code)}</small></td>
        <td class="dt">${escapeHtml(fmtIso(o.created))}</td>
        <td>${escapeHtml(peso(o.fee))}</td>
        <td><span class="pf-status ${cls}">${label}</span></td>
      </tr>`;
    }).join('');
  }

  function renderNotifications() {
    const all = buildNotifications(getOrders(user.email).slice().sort((a, b) => b.created.localeCompare(a.created)));
    $('#stNotifs').textContent = all.length;
    $('#notifCount').textContent = all.length
      ? `You have ${all.length} unread notification${all.length > 1 ? 's' : ''}`
      : 'You have no unread notifications';
    $('#notifPill').hidden = !all.length;
    $('#notifPill').textContent = all.length + ' new';
    $('#notifList').innerHTML = all.slice(0, 5).map((n) => `
      <li><span class="pf-dot"></span>
        <div><b>${escapeHtml(n.title)}</b><span>${escapeHtml(n.text)}</span></div>
        <time>${escapeHtml(fmtShort(n.at))}</time>
      </li>`).join('');
  }

  /* ---------- actions ---------- */

  $('#pfSave').addEventListener('click', () => {
    if (!user) return;
    const name = $('#fName').value.trim();
    const phone = $('#fPhone').value.trim();
    const gcash = $('#fGcash').value.trim();

    if (!name) return showError('Please enter your name.', $('#fName'));
    if (phone && !MOBILE.test(phone.replace(/\s/g, ''))) return showError('Enter a valid mobile number, e.g. 0917 123 4567.', $('#fPhone'));
    if (gcash && !MOBILE.test(gcash.replace(/\s/g, ''))) return showError('Enter a valid GCash number, e.g. 0917 123 4567.', $('#fGcash'));
    showError('');

    const prefs = Object.assign(prefsOf(), {
      orders: $('#optOrders').checked,
      email: $('#optEmail').checked,
      dark: $('#optDark').checked,
      lang: $('#optLang').value,
      cur: $('#optCur').value,
    });
    if (!saveProfile(user.email, { name, phone, address: $('#fAddress').value.trim(), gcash, prefs })) {
      return showError("Couldn't save your changes. Your browser's storage may be full or blocked.");
    }
    setTheme(prefs.dark);

    user.name = name;
    setUser(user);
    const accounts = getAccounts();
    const key = (user.email || '').toLowerCase();
    if (accounts[key]) { accounts[key].name = name; saveAccounts(accounts); }

    render();
    renderAuthNav();
    authToast('Changes saved');
  });

  $('#pfLogout').addEventListener('click', () => {
    clearUser();
    renderAuthNav();
    render();
    authToast('Logged out');
  });

  // Dark mode applies AND is remembered right away (it used to only preview, so it switched back
  // to light on the next page unless "Save Changes" was pressed first)
  $('#optDark').addEventListener('change', (e) => {
    if (!user) return;
    const dark = e.target.checked;
    setTheme(dark);   // paint + remember on this device
    saveProfile(user.email, { prefs: Object.assign({}, profile.prefs, { dark }) });
    profile = getProfile(user.email);
  });

  $('#prefToggle').addEventListener('click', (e) => {
    const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
    e.currentTarget.setAttribute('aria-expanded', open);
    $('#prefBody').hidden = !open;
  });

  $('#ordersMore').addEventListener('click', () => { showAllOrders = !showAllOrders; renderOrders(); });

  $('#notifPill').addEventListener('click', () => {
    saveProfile(user.email, { clearedAt: new Date().toISOString() });
    profile = getProfile(user.email);
    renderNotifications();
  });

  $('#pf2fa').addEventListener('click', () => {
    const on = !prefsOf().twofa;
    // only change twofa: merging prefsOf() here would also save the default "dark: false"
    // and quietly switch dark mode off on the next page
    saveProfile(user.email, { prefs: Object.assign({}, profile.prefs, { twofa: on }) });
    profile = getProfile(user.email);
    $('#pf2fa').textContent = on ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication';
    authToast(on ? 'Two-factor authentication turned on (demo)' : 'Two-factor authentication turned off');
  });

  /* ---------- change photo ---------- */

  const pickPhoto = () => $('#pfFile').click();
  $('#pfChangePhoto').addEventListener('click', pickPhoto);
  $('#pfCam').addEventListener('click', pickPhoto);

  $('#pfFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { authToast('Please choose an image file.'); return; }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // crop to a centered square and shrink it, so it stays small in the browser's storage
      const size = 160, side = Math.min(img.width, img.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      cv.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      const saved = saveProfile(user.email, { photo: cv.toDataURL('image/jpeg', 0.85) });
      profile = getProfile(user.email);
      paintAvatar();
      renderAuthNav();
      authToast(saved ? 'Photo updated' : "Couldn't save the photo (browser storage is full or blocked).");
    };
    img.onerror = () => { URL.revokeObjectURL(url); authToast('Could not read that image.'); };
    img.src = url;
  });

  /* ---------- change password ---------- */

  const pwForm = $('#pwForm');
  const pwError = (msg) => { $('#pwErr').textContent = msg || ''; return false; };

  $('#pfPwBtn').addEventListener('click', () => {
    pwForm.hidden = !pwForm.hidden;
    pwError('');
    if (!pwForm.hidden) $('#pwCur').focus();
  });
  $('#pwCancel').addEventListener('click', () => { pwForm.reset(); pwError(''); pwForm.hidden = true; });

  pwForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const accounts = getAccounts();
    const account = accounts[(user.email || '').toLowerCase()];
    if (!account) return pwError("This built-in demo account's password can't be changed here.");
    if (account.password == null) return pwError(`This account signs in with ${account.provider || 'a social login'}, so it has no password to change.`);
    if ($('#pwCur').value !== account.password) return pwError('Your current password is incorrect.');
    if ($('#pwNew').value.length < 8) return pwError('New password must be at least 8 characters.');
    if ($('#pwNew').value !== $('#pwConf').value) return pwError('The new passwords do not match.');

    account.password = $('#pwNew').value;
    saveAccounts(accounts);
    pwForm.reset();
    pwError('');
    pwForm.hidden = true;
    authToast('Password updated');
  });

  // clear the error text as soon as the person types again
  document.querySelectorAll('.pf-field input').forEach((i) => i.addEventListener('input', () => {
    i.removeAttribute('aria-invalid');
    if (i.closest('#pwForm')) pwError(''); else showError('');
  }));

  // keep mobile-number fields tidy (digits, +, spaces)
  ['#fPhone', '#fGcash'].forEach((s) => $(s).addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^\d+ ]/g, '');
  }));

  render();
})();