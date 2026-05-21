let authApiBase = window.location.origin || 'http://localhost:4000';
if (authApiBase.startsWith('file://')) {
  authApiBase = 'http://localhost:4000';
}

function showAuthMessage(message: string, type: 'error' | 'success' = 'error'): void {
  const messageElement = document.getElementById('authMessage');
  if (!messageElement) return;
  messageElement.textContent = message;
  messageElement.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

async function postJson(url: string, body: Record<string, string>): Promise<any> {
  const response = await fetch(`${authApiBase}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return response.json();
}

function saveToken(token: string): void {
  if (!token) return;
  const session = (window as any).biscoonSession;
  if (session && typeof session.start === 'function') {
    session.start(token);
    return;
  }
  localStorage.setItem('biscoonToken', token);
  localStorage.setItem('biscoonLastActivity', String(Date.now()));
}

function getRedirectTarget(): string {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  return redirect || '/index.html';
}

function handleLogin(event: Event): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const email = (form.querySelector('#email') as HTMLInputElement).value.trim().toLowerCase();
  const password = (form.querySelector('#password') as HTMLInputElement).value;

  postJson('/api/auth/login', { email, password })
    .then((data: { error?: string; token?: string; user?: { role: string } }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      if (['super-admin', 'admin', 'staff', 'sub-admin'].includes(data.user?.role ?? '')) {
        return showAuthMessage('Admin accounts must sign in through the Admin Panel.', 'error');
      }
      saveToken(data.token ?? '');
      showAuthMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => window.location.href = getRedirectTarget(), 800);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'));
}

function handleRegister(event: Event): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const name = (form.querySelector('#name') as HTMLInputElement).value.trim();
  const email = (form.querySelector('#email') as HTMLInputElement).value.trim().toLowerCase();
  const phone = (form.querySelector('#phone') as HTMLInputElement).value.trim();
  const password = (form.querySelector('#password') as HTMLInputElement).value;
  const confirmPassword = (form.querySelector('#confirmPassword') as HTMLInputElement).value;

  if (password !== confirmPassword) {
    return showAuthMessage('Passwords must match.', 'error');
  }

  postJson('/api/auth/register', { name, email, phone, password, confirmPassword })
    .then((data: { error?: string; token?: string }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      saveToken(data.token ?? '');
      showAuthMessage('Account created successfully! Redirecting...', 'success');
      setTimeout(() => window.location.href = getRedirectTarget(), 1200);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'));
}

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const forgotBtn = document.getElementById('forgotPasswordBtn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', function () {
      const msg = document.getElementById('authMessage');
      if (msg) {
        msg.textContent = 'To reset your password, email support@biscoon.com with your registered email address.';
        msg.className = 'form-helper success-text';
      }
    });
  }
});
