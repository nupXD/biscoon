let authApiBase = window.location.origin || "http://localhost:4000";
if (authApiBase.startsWith("file://")) {
  authApiBase = "http://localhost:4000";
}
function showAuthMessage(message, type = "error") {
  const messageElement = document.getElementById("authMessage");
  if (!messageElement) return;
  messageElement.textContent = message;
  messageElement.className = type === "success" ? "form-helper success-text" : "form-helper error-text";
}
async function postJson(url, body) {
  const response = await fetch(`${authApiBase}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include"
  });
  return response.json();
}
function saveToken(token) {
  if (!token) return;
  const session = window.biscoonSession;
  if (session && typeof session.start === "function") {
    session.start(token);
    return;
  }
  localStorage.setItem("biscoonToken", token);
  localStorage.setItem("biscoonLastActivity", String(Date.now()));
}
function getRedirectTarget() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect || "/index.html";
}
function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.querySelector("#email").value.trim().toLowerCase();
  const password = form.querySelector("#password").value;
  postJson("/api/auth/login", { email, password }).then((data) => {
    if (data.error) return showAuthMessage(data.error, "error");
    if (["super-admin", "admin", "staff", "sub-admin"].includes(data.user?.role ?? "")) {
      return showAuthMessage("Admin accounts must sign in through the Admin Panel.", "error");
    }
    saveToken(data.token ?? "");
    showAuthMessage("Login successful! Redirecting...", "success");
    setTimeout(() => window.location.href = getRedirectTarget(), 800);
  }).catch(() => showAuthMessage("Unable to connect to the authentication server.", "error"));
}
function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.querySelector("#name").value.trim();
  const email = form.querySelector("#email").value.trim().toLowerCase();
  const phone = form.querySelector("#phone").value.trim();
  const password = form.querySelector("#password").value;
  const confirmPassword = form.querySelector("#confirmPassword").value;
  if (password !== confirmPassword) {
    return showAuthMessage("Passwords must match.", "error");
  }
  postJson("/api/auth/register", { name, email, phone, password, confirmPassword }).then((data) => {
    if (data.error) return showAuthMessage(data.error, "error");
    saveToken(data.token ?? "");
    showAuthMessage("Account created successfully! Redirecting...", "success");
    setTimeout(() => window.location.href = getRedirectTarget(), 1200);
  }).catch(() => showAuthMessage("Unable to connect to the authentication server.", "error"));
}
document.addEventListener("DOMContentLoaded", function() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);
  const forgotBtn = document.getElementById("forgotPasswordBtn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", function() {
      const msg = document.getElementById("authMessage");
      if (msg) {
        msg.textContent = "To reset your password, email support@biscoon.com with your registered email address.";
        msg.className = "form-helper success-text";
      }
    });
  }
});
