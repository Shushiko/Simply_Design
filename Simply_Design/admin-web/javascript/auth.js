// ===== Simply Design: simple front-end auth (demo only) =====
// Save this file next to animation.js -> Simply_Design/admin-web/javascript/auth.js

const USERS_KEY = "sd_users";
const SESSION_KEY = "sd_session";

// Built-in admin account. Change these values.
const DEFAULT_ADMIN = {
  fullname: "Administrator",
  email: "admin@simplydesign.com",
  password: "admin123",
  role: "admin",
};

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function startSession(user) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email: user.email, fullname: user.fullname, role: user.role })
  );
}

function showError(message) {
  const box = document.getElementById("formError");
  if (box) box.textContent = message;
}

// Use on pages only admins may open (e.g. dashboard.html)
function requireRole(role, loginUrl) {
  const session = getSession();
  if (!session || session.role !== role) {
    window.location.replace(loginUrl);
  }
}

function logout(loginUrl) {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = loginUrl;
}

// Make sure the admin account exists
if (!getUsers().some((u) => u.role === "admin")) {
  saveUsers([...getUsers(), DEFAULT_ADMIN]);
}

// ---------- Login ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const user = getUsers().find((u) => u.email === email && u.password === password);
    if (!user) {
      showError("Incorrect email or password.");
      return;
    }

    startSession(user);
    window.location.href =
      user.role === "admin" ? loginForm.dataset.adminUrl : loginForm.dataset.userUrl;
  });
}

// ---------- Sign up (always creates a normal "user") ----------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email === email)) {
      showError("This email is already registered. Sign in instead.");
      return;
    }

    const user = { fullname, email, password, role: "user" };
    saveUsers([...users, user]);
    startSession(user);
    window.location.href = signupForm.dataset.userUrl;
  });
}