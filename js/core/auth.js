import { Utils } from './utils.js';
import { Modal } from './modal.js';
import { Notify } from './notify.js';
import { Router } from './router.js';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

let currentUser = null;
let isLoginMode = true;

let heartbeatTimer = null;
let idleCheckTimer = null;
let lastActivity = Date.now();

let manualStatus = 'online';
let autoStatus = 'online';
let lastSentStatus = null;
let customStatusText = '';

function refreshCurrentPage() {
  const pageId = Router.getPageFromHash();
  document.dispatchEvent(new CustomEvent('app:refresh-page', { detail: pageId }));
}

function sendStatus(status, custom) {
  if (!currentUser) return Promise.resolve();
  return Utils.apiRequest('/api/chat_status.php', 'POST', {
    status,
    custom_text: (custom !== undefined ? custom : customStatusText) || ''
  }).catch(() => null);
}

function effectiveStatus() {
  return manualStatus === 'online' ? autoStatus : manualStatus;
}

function pushStatus(force) {
  const target = effectiveStatus();
  if (!force && lastSentStatus === target) return;
  lastSentStatus = target;
  sendStatus(target, customStatusText);
}

function onUserActivity() {
  lastActivity = Date.now();
  if (manualStatus !== 'online') return;
  if (autoStatus === 'away') {
    autoStatus = 'online';
    pushStatus();
  }
}

function checkIdle() {
  if (!currentUser || manualStatus !== 'online') return;
  const idle = Date.now() - lastActivity;
  const target = idle > 5 * 60 * 1000 ? 'away' : 'online';
  if (autoStatus !== target) {
    autoStatus = target;
    pushStatus();
  }
}

function startStatusTracking() {
  stopStatusTracking();
  lastActivity = Date.now();
  lastSentStatus = null;
  autoStatus = 'online';
  pushStatus(true);

  heartbeatTimer = setInterval(() => {
    sendStatus(lastSentStatus || effectiveStatus(), customStatusText);
  }, 2 * 60 * 1000);

  idleCheckTimer = setInterval(checkIdle, 30 * 1000);

  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, onUserActivity, { passive: true });
  });
}

function stopStatusTracking() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  if (idleCheckTimer) { clearInterval(idleCheckTimer); idleCheckTimer = null; }
  ACTIVITY_EVENTS.forEach(event => document.removeEventListener(event, onUserActivity));
}

function setMyStatus(status, custom) {
  if (!['online', 'away', 'dnd', 'offline'].includes(status)) return;
  manualStatus = status;
  if (status === 'online') autoStatus = 'online';
  if (custom !== undefined) customStatusText = custom;
  lastSentStatus = status;
  return sendStatus(status, customStatusText);
}

function setAutoStatus(status) {
  if (status !== 'online' && status !== 'away') return;
  if (manualStatus !== 'online') return;
  if (autoStatus === status) return;
  autoStatus = status;
  pushStatus();
}

function getMyStatus() {
  return { status: effectiveStatus(), custom_text: customStatusText };
}

async function checkAuth() {
  try {
    const data = await Utils.apiRequest('/api/auth.php?action=check', 'GET');
    window.__csrfToken = data.csrf_token || null;
    currentUser = data.loggedin ? data.user : null;
    updateAuthUI();

    if (currentUser) {
      startStatusTracking();
      Notify.startPolling();
    } else {
      stopStatusTracking();
      Notify.stopPolling();
    }
    return data;
  } catch (error) {
    console.warn('[Auth.check]', error);
    return { loggedin: false, networkError: true };
  }
}

async function login(username, password) {
  try {
    const data = await Utils.apiRequest('/api/auth.php?action=login', 'POST', { username, password });
    if (!data.success) {
      Modal.alert({ title: 'Ошибка входа', message: data.error || 'Неизвестная ошибка', danger: true });
      return false;
    }
    await checkAuth();
    refreshCurrentPage();
    return true;
  } catch (err) {
    Modal.alert({ title: 'Ошибка входа', message: err.message || 'Неизвестная ошибка', danger: true });
    return false;
  }
}

async function register(username, password) {
  try {
    const data = await Utils.apiRequest('/api/auth.php?action=register', 'POST', { username, password });
    if (!data.success) {
      Modal.alert({ title: 'Ошибка регистрации', message: data.error || 'Неизвестная ошибка', danger: true });
      return false;
    }
    await checkAuth();
    refreshCurrentPage();
    return true;
  } catch (err) {
    Modal.alert({ title: 'Ошибка регистрации', message: err.message || 'Неизвестная ошибка', danger: true });
    return false;
  }
}

async function logout() {
  stopStatusTracking();

  try {
    if (currentUser && window.__csrfToken) {
      await sendStatus('offline', '');
    }
    await Utils.apiRequest('/api/auth.php?action=logout', 'GET');
  } catch (_) {}

  currentUser = null;
  window.__csrfToken = null;
  updateAuthUI();

  Notify.stopPolling();
  location.hash = '#/home';
  setTimeout(refreshCurrentPage, 50);
}

function updateAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  const profileBtn = document.getElementById('profile-btn');
  if (!loginBtn || !profileBtn) return;

  loginBtn.style.display = currentUser ? 'none' : 'inline-flex';
  profileBtn.style.display = currentUser ? 'inline-flex' : 'none';
}

function initModal() {
  const modal = document.getElementById('auth-modal');
  const form = document.getElementById('auth-form');
  const titleEl = document.getElementById('auth-modal-title');
  const submitBtn = document.getElementById('auth-submit');
  const switchLink = document.getElementById('auth-switch');
  const closeBtn = document.getElementById('auth-close');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');

  if (!modal || !form) return;

  const openModal = () => {
    modal.classList.add('active');
    usernameInput.value = '';
    passwordInput.value = '';
    isLoginMode = true;
    titleEl.textContent = 'Вход';
    submitBtn.textContent = 'Войти';
    switchLink.textContent = 'Зарегистрироваться';
    setTimeout(() => usernameInput.focus(), 50);
  };

  const closeModal = () => modal.classList.remove('active');

  document.getElementById('login-btn')?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  switchLink?.addEventListener('click', event => {
    event.preventDefault();
    isLoginMode = !isLoginMode;
    titleEl.textContent = isLoginMode ? 'Вход' : 'Регистрация';
    submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
    switchLink.textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) return;

    submitBtn.disabled = true;
    try {
      const success = isLoginMode
        ? await login(username, password)
        : await register(username, password);
      if (success) closeModal();
    } catch (err) {
      console.error('[Auth.submit]', err);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export const Auth = {
  checkAuth,
  login,
  register,
  logout,
  currentUser: () => currentUser,
  updateAuthUI,
  setMyStatus,
  setAutoStatus,
  getMyStatus,
  getCsrfToken: () => window.__csrfToken
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModal);
} else {
  initModal();
}
