// Shared login-session helpers for the customer pages (user, booking, contact, profile).
// Logging in / signing up happens on the other pages (loginandsignup.js), which save the session
// under the SAME keys used here, so keep these names the same.
//
// What this file does:
//   - when someone is logged in, the top bar's "Log in | Sign up" turns into a profile icon
//   - clicking that icon opens profile.html (the account / settings page)
//   - shows a short welcome message right after logging in or signing up

const SESSION_KEY = 'simplyUser';       // who is logged in (localStorage if "Remember me", else sessionStorage)
const PROFILES_KEY = 'simplyProfiles';  // saved profile details + settings, by email
const ACCOUNTS_KEY = 'simplyAccounts';  // accounts created on the sign-up page
const ORDERS_KEY = 'simplyOrders';      // rentals booked from booking.html, by email
const WELCOME_KEY = 'simplyWelcome';    // 'back' or 'new', set by the login / sign-up page

// Resolved from THIS file's location (the javascript folder), so the links work from any page.
const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
const LOGIN_URL = new URL('../../../admin-web/web/login.html', SCRIPT_URL).href;
const SIGNUP_URL = new URL('../../../admin-web/web/signup.html', SCRIPT_URL).href;
const PROFILE_URL = new URL('../web/profile.html', SCRIPT_URL).href;

/* ---------- Storage helpers (never throw) ---------- */

function readStore(kind, key) {
  try { return JSON.parse(window[kind].getItem(key)); } catch (e) { return null; }
}
function writeStore(kind, key, value) {
  try { window[kind].setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

/* ---------- Session ---------- */

function getUser() {
  return readStore('localStorage', SESSION_KEY) || readStore('sessionStorage', SESSION_KEY);
}
function setUser(user) {
  // keep the session in whichever storage it already lives in
  writeStore(readStore('localStorage', SESSION_KEY) ? 'localStorage' : 'sessionStorage', SESSION_KEY, user);
}
function clearUser() {
  try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}

/* ---------- Accounts, profiles, orders ---------- */

function getAccounts() { return readStore('localStorage', ACCOUNTS_KEY) || {}; }
function saveAccounts(accounts) { return writeStore('localStorage', ACCOUNTS_KEY, accounts); }

function getProfile(email) {
  return (readStore('localStorage', PROFILES_KEY) || {})[(email || '').toLowerCase()] || {};
}
// Merges `patch` into the saved profile for this email
function saveProfile(email, patch) {
  const key = (email || '').toLowerCase();
  const all = readStore('localStorage', PROFILES_KEY) || {};
  all[key] = Object.assign({}, all[key], patch);
  return writeStore('localStorage', PROFILES_KEY, all);
}

function getOrders(email) {
  return (readStore('localStorage', ORDERS_KEY) || {})[(email || '').toLowerCase()] || [];
}
// Called by booking.js after "Confirm & Book Rental". Does nothing when nobody is logged in.
function saveOrder(order) {
  const user = getUser();
  if (!user) return false;
  const key = (user.email || '').toLowerCase();
  const all = readStore('localStorage', ORDERS_KEY) || {};
  all[key] = [order].concat(all[key] || []);
  return writeStore('localStorage', ORDERS_KEY, all);
}

/* ---------- Small helpers ---------- */

function escapeHtml(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function initialsFor(name, email) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return String(email || '?').slice(0, 2).toUpperCase();
}

let authToastTimer;
function authToast(msg) {
  let el = document.querySelector('#toast');
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

// Login and sign-up are separate pages
function openAuth(mode) {
  location.href = mode === 'signup' ? SIGNUP_URL : LOGIN_URL;
}

/* ---------- Top bar: "Log in | Sign up"  <->  profile icon ---------- */

function renderAuthNav() {
  const nav = document.querySelector('.topbar .auth');
  if (!nav) return;
  const guestHtml = `<a href="${LOGIN_URL}">Log in</a><i></i><a href="${SIGNUP_URL}">Sign up</a>`;

  const user = getUser();
  if (!user) {
    // default state: nobody logged in -> only "Log in | Sign up", never the profile icon
    nav.innerHTML = guestHtml;
    nav.classList.remove('swap');
    nav.dataset.shown = 'guest';
    applyTheme(null);
    return;
  }

  const profile = getProfile(user.email);
  const name = profile.name || user.name || user.email || 'My profile';
  const photo = /^data:image\//.test(profile.photo || '') ? profile.photo : '';
  const firstShow = nav.dataset.shown !== 'user';

  nav.innerHTML = `
    <a class="avatar${user.role === 'admin' ? ' is-admin' : ''}${firstShow ? ' pop' : ''}" href="${PROFILE_URL}"
       aria-label="Open my profile: ${escapeHtml(name)}" title="${escapeHtml(name)}">${photo ? `<img src="${photo}" alt="">` : escapeHtml(initialsFor(name, user.email))}</a>`;
  if (firstShow) nav.classList.add('swap');
  nav.dataset.shown = 'user';
  applyTheme(profile);
}

// Dark mode chosen in Settings now applies on every customer page
function applyTheme(profile) {
  const dark = Boolean(profile && profile.prefs && profile.prefs.dark);
  document.body.classList.toggle('dark', dark);
}

// "Welcome back" / "Welcome" message after the login or sign-up page sends the person here
function showWelcome() {
  let kind = null;
  try { kind = sessionStorage.getItem(WELCOME_KEY); sessionStorage.removeItem(WELCOME_KEY); } catch (e) { /* ignore */ }
  const user = getUser();
  if (!kind || !user || user.role === 'admin') return;
  const first = (getProfile(user.email).name || user.name || '').split(' ')[0];
  authToast(kind === 'new' ? `Welcome, ${first}! Your account is ready.` : `Welcome back, ${first}!`);
}

renderAuthNav();
showWelcome();
// logging in / out in another tab updates this one too
window.addEventListener('storage', renderAuthNav);