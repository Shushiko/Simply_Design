document.addEventListener("DOMContentLoaded", function () {
  const avatarBtn = document.getElementById("avatarBtn");
  if (avatarBtn) {
    avatarBtn.addEventListener("click", openSidebar);
  }
});

function openSidebar() {
  document.getElementById("sidebarDrawer").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("active");
}

function closeSidebar() {
  document.getElementById("sidebarDrawer").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
}

function handleLogout() {
  window.location.href = "login.html";
}
