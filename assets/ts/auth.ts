let authApiBase = window.location.origin || 'http://localhost:4000';
if (authApiBase.startsWith('file://')) {
  authApiBase = 'http://localhost:4000';
}

function showAuthMessage(message: string, type: 'error' | 'success' = 'error'): void {
  const messageElement = document.getElementById('authMessage');
  if (!messageElement) return;
  messageElement.replaceChildren();
  messageElement.textContent = message;
  messageElement.className = type === 'success' ? 'form-helper success-text' : 'form-helper error-text';
}

function showAuthLink(label: string, href: string): void {
  const messageElement = document.getElementById('authMessage');
  if (!messageElement || !href) return;
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  const wrap = document.createElement('div');
  wrap.className = 'auth-note';
  wrap.appendChild(link);
  messageElement.appendChild(wrap);
}

function setBusy(form: HTMLFormElement, busy: boolean): void {
  form.querySelectorAll('button[type="submit"]').forEach(button => {
    (button as HTMLButtonElement).disabled = busy;
  });
}

async function postJson(url: string, body: Record<string, string>): Promise<any> {
  const response = await fetch(`${authApiBase}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.error) data.error = 'Something went wrong. Please try again.';
  return data;
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

function queryParam(name: string): string {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function toggleResendRow(show: boolean): void {
  document.getElementById('resendRow')?.classList.toggle('is-visible', show);
}

function handleLogin(event: Event): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const email = (form.querySelector('#email') as HTMLInputElement).value.trim().toLowerCase();
  const password = (form.querySelector('#password') as HTMLInputElement).value;
  setBusy(form, true);
  toggleResendRow(false);

  postJson('/api/auth/login', { email, password })
    .then((data: { error?: string; code?: string; token?: string; user?: { role: string } }) => {
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        toggleResendRow(true);
        return showAuthMessage(data.error || 'Please confirm your email before signing in.', 'error');
      }
      if (data.error) return showAuthMessage(data.error, 'error');
      if (['super-admin', 'admin', 'staff', 'sub-admin'].includes(data.user?.role ?? '')) {
        return showAuthMessage('Admin accounts must sign in through the Admin Panel.', 'error');
      }
      saveToken(data.token ?? '');
      showAuthMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => window.location.href = getRedirectTarget(), 800);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'))
    .finally(() => setBusy(form, false));
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

  setBusy(form, true);
  postJson('/api/auth/register', { name, email, phone, password, confirmPassword })
    .then((data: { error?: string; emailSent?: boolean; verificationUrl?: string }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      if (data.emailSent) {
        showAuthMessage(`We sent a confirmation link to ${email}. Open it, then sign in.`, 'success');
        return;
      }
      showAuthMessage(data.verificationUrl ? 'Account created. Use the button below to confirm your email, then sign in.' : 'Account created, but we could not send the confirmation email. Try signing in and choose Resend confirmation email.', data.verificationUrl ? 'success' : 'error');
      if (data.verificationUrl) showAuthLink('Confirm this email', data.verificationUrl);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'))
    .finally(() => setBusy(form, false));
}

function handleForgotPassword(event: Event): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const email = (form.querySelector('#email') as HTMLInputElement).value.trim().toLowerCase();
  setBusy(form, true);
  postJson('/api/auth/forgot-password', { email })
    .then((data: { error?: string; emailSent?: boolean; message?: string; resetUrl?: string }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      showAuthMessage(data.message || 'If an account exists for that email, password reset instructions are on the way.', 'success');
      if (!data.emailSent && data.resetUrl) showAuthLink('Choose a new password', data.resetUrl);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'))
    .finally(() => setBusy(form, false));
}

function handleResetPassword(event: Event): void {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const email = (form.querySelector('#email') as HTMLInputElement).value.trim().toLowerCase();
  const token = (form.querySelector('#token') as HTMLInputElement).value.trim();
  const password = (form.querySelector('#password') as HTMLInputElement).value;
  const confirmPassword = (form.querySelector('#confirmPassword') as HTMLInputElement).value;
  if (password !== confirmPassword) {
    return showAuthMessage('Passwords must match.', 'error');
  }
  setBusy(form, true);
  postJson('/api/auth/reset-password', { email, token, password, confirmPassword })
    .then((data: { error?: string }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      showAuthMessage('Password updated. You can sign in now.', 'success');
      setTimeout(() => window.location.href = 'login.html?reset=1', 900);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'))
    .finally(() => setBusy(form, false));
}

function handleResendVerification(event: Event): void {
  event.preventDefault();
  const emailInput = document.querySelector('#email') as HTMLInputElement | null;
  const email = (emailInput?.value || queryParam('email')).trim().toLowerCase();
  if (!email) {
    return showAuthMessage('Enter your email first.', 'error');
  }
  postJson('/api/auth/resend-verification', { email })
    .then((data: { error?: string; emailSent?: boolean; message?: string; verificationUrl?: string }) => {
      if (data.error) return showAuthMessage(data.error, 'error');
      showAuthMessage(data.message || 'If an account exists for that email, a confirmation link is on its way.', 'success');
      if (!data.emailSent && data.verificationUrl) showAuthLink('Confirm this email', data.verificationUrl);
    })
    .catch(() => showAuthMessage('Unable to connect to the authentication server.', 'error'));
}

function initVerifyEmailPage(): void {
  const email = queryParam('email').trim().toLowerCase();
  const token = queryParam('token').trim();
  if (!email || !token) {
    showAuthMessage('This confirmation link is missing details. Request a new email from the sign-in page.', 'error');
    toggleResendRow(true);
    return;
  }
  showAuthMessage('Confirming your email…', 'success');
  postJson('/api/auth/verify-email', { email, token })
    .then((data: { error?: string; token?: string }) => {
      if (data.error) {
        toggleResendRow(true);
        return showAuthMessage(data.error, 'error');
      }
      showAuthMessage('Email confirmed. You can sign in now.', 'success');
      setTimeout(() => window.location.href = 'login.html?verified=1', 900);
    })
    .catch(() => {
      toggleResendRow(true);
      showAuthMessage('Unable to confirm this email right now.', 'error');
    });
}

function initLoginNotices(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === '1') {
    showAuthMessage('Email confirmed. You can sign in now.', 'success');
  } else if (params.get('reset') === '1') {
    showAuthMessage('Password updated. Sign in with your new password.', 'success');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const forgotForm = document.getElementById('forgotPasswordForm');
  const resetForm = document.getElementById('resetPasswordForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    initLoginNotices();
  }
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);
  if (resetForm) {
    const emailInput = resetForm.querySelector('#email') as HTMLInputElement | null;
    const tokenInput = resetForm.querySelector('#token') as HTMLInputElement | null;
    if (emailInput && !emailInput.value) emailInput.value = queryParam('email');
    if (tokenInput && !tokenInput.value) tokenInput.value = queryParam('token');
    if (!queryParam('token')) {
      showAuthMessage('This reset link is missing or expired. Request a new one.', 'error');
    }
    resetForm.addEventListener('submit', handleResetPassword);
  }

  document.getElementById('resendVerificationBtn')?.addEventListener('click', handleResendVerification);

  if (document.body.dataset.authPage === 'verify-email') {
    initVerifyEmailPage();
  }
});
