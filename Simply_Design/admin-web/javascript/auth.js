// Shared auth UI: Log in / Sign up modal + profile avatar.
// This is a front-end demo only — there is no server. "Signing up" just saves
// a name/email/password to this browser's storage, and "logging in" checks
// against that. The one exception is the admin account below, which is a
// fixed demo login rather than something anyone can sign up for.
const AUTH_KEY = 'sd_user';
const ACCOUNTS_KEY = 'sd_accounts';
const ADMIN_EMAIL = 'admin@simplydesign.com';
const ADMIN_PASSWORD = 'admin123';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
};
const setUser = (u) => localStorage.setItem(AUTH_KEY, JSON.stringify(u));
const clearUser = () => localStorage.removeItem(AUTH_KEY);

// Signed-up accounts: { "email@example.com": { name, password } }
const getAccounts = () => {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; } catch { return {}; }
};
const saveAccounts = (accounts) => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const initialsFor = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
};

// Reuse the page's own #toast if it has one (index.html), otherwise create one.
let authToastTimer;
function authToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(authToastTimer);
  authToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function injectAuthModal() {
  if (document.getElementById('authOverlay')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-overlay" id="authOverlay" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button class="modal-close" id="authClose" type="button" aria-label="Close">&times;</button>
        <div class="modal-tabs">
          <button class="tab active" type="button" data-tab="login">Log in</button>
          <button class="tab" type="button" data-tab="signup">Sign up</button>
        </div>
        <h2 id="authTitle">Welcome back</h2>
        <form id="authForm">
          <label id="authNameField" hidden>Full Name
            <input type="text" id="authName" placeholder="Juan Dela Cruz">
          </label>
          <label>Email
            <input type="email" id="authEmail" required placeholder="you@example.com">
          </label>
          <label>Password
            <input type="password" id="authPassword" required minlength="4" placeholder="At least 4 characters">
          </label>
          <div id="authRoleField">
            <p class="role-label">Log in as</p>
            <div class="role-toggle" id="roleToggle">
              <button type="button" class="role active" data-role="user">Customer</button>
              <button type="button" class="role" data-role="admin">Admin</button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary full" id="authSubmit">Log in</button>
        </form>
        <p class="modal-note">This is a demo login — no account is actually created or verified. Choose "Admin" to preview the dashboard.</p>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);

  const overlay = document.getElementById('authOverlay');
  const tabs = overlay.querySelectorAll('.tab');
  const nameField = document.getElementById('authNameField');
  const roleField = document.getElementById('authRoleField');
  const roleButtons = overlay.querySelectorAll('.role');
  const title = document.getElementById('authTitle');
  const submit = document.getElementById('authSubmit');
  overlay.dataset.role = 'user';

  function switchTab(mode) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
    overlay.dataset.mode = mode;
    const isSignup = mode === 'signup';
    nameField.hidden = !isSignup;
    document.getElementById('authName').required = isSignup;
    roleField.hidden = isSignup; // signing up always creates a regular customer account
    title.textContent = isSignup ? 'Create your account' : 'Welcome back';
    submit.textContent = isSignup ? 'Sign up' : 'Log in';
  }
  tabs.forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  roleButtons.forEach((b) => b.addEventListener('click', () => {
    roleButtons.forEach((x) => x.classList.toggle('active', x === b));
    overlay.dataset.role = b.dataset.role;
  }));

  function close() {
    overlay.classList.remove('show');
    setTimeout(() => { overlay.hidden = true; }, 180);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  document.getElementById('authClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = overlay.dataset.mode;
    const email = document.getElementById('authEmail').value.trim();
    const name = mode === 'signup' ? document.getElementById('authName').value.trim() : '';
    const role = mode === 'signup' ? 'user' : (overlay.dataset.role || 'user');
    setUser({ name, email, role });
    e.target.reset();
    close();
    if (role === 'admin') {
      location.href = '../admin-web/web/dashboard.html';
    } else {
      renderAuthNav();
      authToast(`Welcome${name ? ', ' + name.split(' ')[0] : ''}!`);
    }
  });

  overlay._open = (mode) => {
    overlay.hidden = false;
    switchTab(mode);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.addEventListener('keydown', onKey);
    setTimeout(() => document.getElementById('authEmail').focus(), 50);
  };
}

function openAuth(mode) {
  injectAuthModal();
  document.getElementById('authOverlay')._open(mode);
}

function renderAuthNav() {
  const nav = document.getElementById('authNav');
  if (!nav) return;
  const user = getUser();

  if (!user) {
    nav.innerHTML = `<a href="#" id="openLogin">Log in</a><i></i><a href="#" id="openSignup">Sign up</a>`;
    document.getElementById('openLogin').addEventListener('click', (e) => { e.preventDefault(); openAuth('login'); });
    document.getElementById('openSignup').addEventListener('click', (e) => { e.preventDefault(); openAuth('signup'); });
    return;
  }

  const onAdminPage = /(^|\/)admin\.html(\?.*)?$/.test(location.pathname);
  const dashboardLink = user.role === 'admin'
    ? (onAdminPage
      ? `<a class="link" href="index.html">Back to Site</a>`
      : `<a class="link" href="../web/dashboard.html">Admin Dashboard</a>`)
    : '';

  nav.innerHTML = `
    <div class="profile" id="profileMenu">
      <button class="avatar${user.role === 'admin' ? ' is-admin' : ''}" id="avatarBtn" type="button" aria-haspopup="true" aria-expanded="false">${initialsFor(user.name, user.email)}</button>
      <div class="dropdown" id="profileDropdown" hidden>
        <p class="who"><strong>${escapeHtml(user.name || 'My Account')}</strong><span>${escapeHtml(user.email || '')}</span></p>
        ${dashboardLink}
        <button id="logoutBtn" type="button">Log out</button>
      </div>
    </div>`;

  const btn = document.getElementById('avatarBtn');
  const dd = document.getElementById('profileDropdown');

  function openDD() {
    dd.hidden = false;
    requestAnimationFrame(() => dd.classList.add('show'));
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onOutside);
  }
  function closeDD() {
    dd.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => { dd.hidden = true; }, 160);
    document.removeEventListener('click', onOutside);
  }
  function onOutside(e) { if (!e.target.closest('#profileMenu')) closeDD(); }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dd.hidden ? openDD() : closeDD();
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearUser();
    if (onAdminPage) {
      location.href = 'Simply_Design/admin-web/web/dashboard.html';
    } else {
      renderAuthNav();
      authToast('Logged out');
    }
  });
}

renderAuthNav();