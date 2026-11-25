function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiRequest(url, method, body) {
  const upper = (method || 'GET').toUpperCase();
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(upper)) {
    const token = window.__csrfToken;
    if (token) headers['X-CSRF-Token'] = token;
  }

  const response = await fetch(url, {
    method: upper,
    headers,
    credentials: 'same-origin',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await response.json(); } catch (_) {}

  if (!response.ok) {
    const error = new Error((data && data.error) || ('HTTP ' + response.status));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function emptyState(icon, title, subtitle) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';

  const iconEl = document.createElement('span');
  iconEl.className = 'material-icons empty-state-icon';
  iconEl.textContent = icon || 'inbox';
  wrap.appendChild(iconEl);

  const titleEl = document.createElement('div');
  titleEl.className = 'empty-state-title';
  titleEl.textContent = title || 'Пусто';
  wrap.appendChild(titleEl);

  if (subtitle) {
    const subEl = document.createElement('div');
    subEl.className = 'empty-state-subtitle';
    subEl.textContent = subtitle;
    wrap.appendChild(subEl);
  }

  return wrap;
}

function img(src, options = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'img-wrap' + (options.wrapClass ? ' ' + options.wrapClass : '');

  const safeSrc = typeof src === 'string' ? src.trim() : '';

  if (!safeSrc) {
    wrap.classList.add('loaded');
    const placeholder = document.createElement('img');
    placeholder.className = 'img-fade loaded' + (options.className ? ' ' + options.className : '');
    placeholder.alt = options.alt || '';
    wrap.appendChild(placeholder);
    if (typeof options.onError === 'function') {
      options.onError(wrap, placeholder);
    }
    return wrap;
  }

  const image = document.createElement('img');
  image.src = safeSrc;
  image.alt = options.alt || '';
  image.loading = 'lazy';
  image.className = 'img-fade' + (options.className ? ' ' + options.className : '');

  image.addEventListener('load', () => {
    image.classList.add('loaded');
    wrap.classList.add('loaded');
  }, { once: true });

  image.addEventListener('error', () => {
    image.classList.add('failed');
    wrap.classList.add('loaded');
    if (typeof options.onError === 'function') {
      options.onError(wrap, image);
    }
  }, { once: true });

  wrap.appendChild(image);
  return wrap;
}

function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notify.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
}

function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export const Utils = {
  escapeHtml,
  apiRequest,
  formatTime,
  emptyState,
  img,
  playNotificationSound,
  debounce
};

export const esc = escapeHtml;