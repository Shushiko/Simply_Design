// Logic for profile.html. Relies on auth.js having already run (getUser,
// setUser, escapeHtml, initialsFor, getAccounts/saveAccounts, authToast).

function renderProfilePage() {
  const user = getUser();
  document.getElementById('signedIn').hidden = !user;
  document.getElementById('signedOut').hidden = !!user;
  if (!user) return;

  const accounts = getAccounts();
  const account = accounts[(user.email || '').toLowerCase()];
  const since = account && account.since ? new Date(account.since) : null;

  document.getElementById('greetName').textContent = (user.name || user.email || 'there').split(' ')[0];
  document.getElementById('pfAvatar').textContent = initialsFor(user.name, user.email);
  document.getElementById('pfName').textContent = user.name || 'My Account';
  document.getElementById('pfEmail').textContent = user.email || '';
  document.getElementById('pfSince').textContent = since && !isNaN(since)
    ? since.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : (user.role === 'admin' ? 'Admin account' : '\u2013');

  document.getElementById('nameInput').value = user.name || '';
}

// auth.js calls this after a successful login/signup/logout so this page
// refreshes without needing a reload.
function onAuthChange() { renderProfilePage(); }

document.getElementById('profileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getUser();
  if (!user) return;

  const input = document.getElementById('nameInput');
  const msg = document.getElementById('formMsg');
  const name = input.value.trim();

  if (!name) {
    msg.textContent = 'Enter your name.';
    msg.hidden = false;
    input.focus();
    return;
  }
  msg.hidden = true;

  user.name = name;
  setUser(user);

  // Keep the signed-up account record (used for login + "member since") in sync.
  const accounts = getAccounts();
  const key = (user.email || '').toLowerCase();
  if (accounts[key]) {
    accounts[key].name = name;
    saveAccounts(accounts);
  }

  renderProfilePage();
  renderAuthNav();
  authToast('Profile updated');
});

document.getElementById('nameInput').addEventListener('input', () => {
  document.getElementById('formMsg').hidden = true;
});

document.getElementById('pfLogoutBtn').addEventListener('click', () => {
  clearUser();
  renderAuthNav();
  renderProfilePage();
  authToast('Logged out');
});

document.getElementById('goLogin').addEventListener('click', () => openAuth('login'));
document.getElementById('goSignup').addEventListener('click', () => openAuth('signup'));

renderProfilePage();