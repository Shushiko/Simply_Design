const passwordInput = document.getElementById("password");
const showPassword = document.getElementById("show-password");
const hidePassword = document.getElementById("hide-password");

function showPasswordValue() {
  passwordInput.type = "text";
  showPassword.style.display = "none";
  hidePassword.style.display = "inline-block";
}

function hidePasswordValue() {
  passwordInput.type = "password";
  showPassword.style.display = "inline-block";
  hidePassword.style.display = "none";
}

showPassword.addEventListener("click", showPasswordValue);
hidePassword.addEventListener("click", hidePasswordValue);

showPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    showPasswordValue();
  }
});

hidePassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    hidePasswordValue();
  }
});
