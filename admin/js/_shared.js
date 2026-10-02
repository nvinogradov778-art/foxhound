(function () {
  'use strict';
  if (!window.Utils) throw new Error('[admin/shared] utils.js must load first');
  if (!window.Modal) throw new Error('[admin/shared] modal.js must load first');

  // CSRF-токен для админки (не используем window.Auth — это отдельная страница)
  let csrfToken = null;
  let csrfPromise = null;

  async function ensureCsrf() {
    if (csrfToken) return csrfToken;
    if (csrfPromise) return csrfPromise;

    csrfPromise = Utils.apiRequest('/api/auth.php?action=check', 'GET')
      .then(data => {
        csrfToken = data.csrf_token || null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => { csrfPromise = null; });

    return csrfPromise;
  }

  /**
   * JSON-запрос с CSRF.
   */
  async function api(url, method = 'GET', body) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
      await ensureCsrf();
    }

    const options = {
      method: method.toUpperCase(),
      credentials: 'same-origin',
      headers: {}
    };

    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    if (csrfToken) {
      options.headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, options);

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

  /**
   * multipart/form-data с CSRF.
   */
  async function apiForm(url, formData) {
    await ensureCsrf();

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      body: formData
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

  /**
   * Универсальный confirm-danger.
   */
  function confirmDanger(title, message) {
    return Modal.confirm({
      title,
      message,
      danger: true,
      okText: 'Удалить'
    });
  }

  /**
   * Устанавливает текст в admin-status блок.
   */
  function setStatus(el, message, type) {
    if (!el) return;
    el.className = 'admin-status ' + (type || '');
    el.textContent = message || '';
    if (message) {
      setTimeout(() => { el.className = 'admin-status'; el.textContent = ''; }, 5000);
    }
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value == null ? '' : value;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }

  function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  window.AdminShared = {
    api,
    apiForm,
    ensureCsrf,
    confirmDanger,
    setStatus,
    qs,
    qsa,
    setText,
    setValue,
    getValue,
    show,
    hide,
    esc: Utils.escapeHtml
  };
})();