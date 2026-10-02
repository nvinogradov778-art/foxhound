(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/users] shared.js must load first');

  const { api, confirmDanger, qs, getValue, setValue } = AdminShared;

  let usersCache = [];
  let usersFilter = 'all';
  let currentPwdUser = null;
  let currentBanUser = null;
  let currentDelUser = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/users.php');
      usersCache = data.users || [];
      renderList();
    } catch (error) {
      console.error('[AdminUsers.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#uf-all').addEventListener('click', () => setFilter('all'));
    qs('#uf-admins').addEventListener('click', () => setFilter('admins'));
    qs('#uf-banned').addEventListener('click', () => setFilter('banned'));

    // Модалка сброса пароля
    qs('#pwd-generate').addEventListener('click', () => {
      setValue('pwd-value', generatePassword());
    });
    qs('#pwd-copy').addEventListener('click', copyPassword);
    qs('#pwd-cancel').addEventListener('click', closePwdModal);
    qs('#pwd-save').addEventListener('click', savePwd);

    // Модалка бана
    qs('#ban-cancel').addEventListener('click', closeBanModal);
    qs('#ban-save').addEventListener('click', saveBan);

    // Модалка удаления
    qs('#del-confirm').addEventListener('input', onDelConfirmInput);
    qs('#del-cancel').addEventListener('click', closeDelModal);
    qs('#del-save').addEventListener('click', saveDel);

    // Клик по фону модалки — закрыть
    ['pwd-modal', 'ban-modal', 'del-modal'].forEach(id => {
      const modal = document.getElementById(id);
      modal.addEventListener('click', event => {
        if (event.target === modal) modal.classList.remove('active');
      });
    });
  }

  function setFilter(filter) {
    usersFilter = filter;
    renderList();
  }

  // ---------- Рендер списка ----------

  function renderList() {
    const container = qs('#users-list');
    let users = usersCache.slice();

    if (usersFilter === 'admins') users = users.filter(u => u.role === 'admin');
    if (usersFilter === 'banned') users = users.filter(u => u.is_banned);

    if (!users.length) {
      container.innerHTML = '<p class="text-muted">Нет пользователей по фильтру.</p>';
      return;
    }

    container.innerHTML = '';
    users.forEach(u => container.appendChild(renderRow(u)));
  }

  function renderRow(user) {
    const row = document.createElement('div');
    row.className = 'list-item';
    if (user.is_banned) row.style.opacity = '0.6';

    const content = document.createElement('div');
    content.style.cssText = 'display:flex; gap:15px; align-items:center; flex-wrap:wrap; flex:1;';

    const idEl = document.createElement('div');
    idEl.style.cssText = 'min-width:40px; color:#666; font-family:monospace;';
    idEl.textContent = '#' + user.id;
    content.appendChild(idEl);

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:200px;';

    const nameRow = document.createElement('div');

    const name = document.createElement('strong');
    name.style.color = '#fff';
    name.textContent = user.username;
    nameRow.appendChild(name);

    if (user.is_banned) {
      nameRow.appendChild(makeBadge('ЗАБАНЕН', 'admin-badge-banned'));
    } else if (user.role === 'admin') {
      nameRow.appendChild(makeBadge('АДМИН', 'admin-badge-admin'));
    }

    info.appendChild(nameRow);

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:13px; color:#666; margin-top:4px;';
    meta.textContent = 'Регистрация: ' + formatDate(user.registered_at) +
                       ' · Был онлайн: ' + formatLastSeen(user.last_seen);
    info.appendChild(meta);

    if (user.is_banned && user.banned_reason) {
      const reason = document.createElement('div');
      reason.style.cssText = 'color:#ff8888; font-size:12px; margin-top:4px;';
      reason.textContent = 'Причина: ' + user.banned_reason;
      info.appendChild(reason);
    }

    content.appendChild(info);
    row.appendChild(content);

    row.appendChild(buildActions(user));
    return row;
  }

  function makeBadge(text, cls) {
    const badge = document.createElement('span');
    badge.className = 'admin-badge ' + cls;
    badge.textContent = text;
    return badge;
  }

  function buildActions(user) {
    const actions = document.createElement('div');
    actions.className = 'actions';

    actions.appendChild(makeIconBtn(
      user.role === 'admin' ? 'arrow_downward' : 'arrow_upward',
      user.role === 'admin' ? 'Понизить' : 'Повысить',
      () => changeRole(user)
    ));

    actions.appendChild(makeIconBtn('key', 'Сбросить пароль', () => openPwdModal(user)));

    if (user.is_banned) {
      actions.appendChild(makeIconBtn('check_circle', 'Разбанить', () => unban(user)));
    } else {
      actions.appendChild(makeIconBtn('block', 'Забанить', () => openBanModal(user), 'btn-danger'));
    }

    actions.appendChild(makeIconBtn('delete', 'Удалить', () => openDelModal(user), 'btn-danger'));

    return actions;
  }

  function makeIconBtn(icon, title, onClick, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm ' + (extraClass || '');
    btn.title = title;
    btn.innerHTML = '<span class="material-icons">' + icon + '</span>';
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ---------- Действия с пользователем ----------

  async function changeRole(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const message = newRole === 'admin'
      ? 'Повысить «' + user.username + '» до админа?'
      : 'Понизить «' + user.username + '» до пользователя?';

    const confirmed = await Modal.confirm({ title: message, danger: true, okText: 'Изменить' });
    if (!confirmed) return;

    try {
      await api('/api/users.php?action=role', 'POST', { user_id: user.id, role: newRole });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function unban(user) {
    const confirmed = await Modal.confirm({
      title: 'Разбанить «' + user.username + '»?',
      danger: true,
      okText: 'Разбанить'
    });
    if (!confirmed) return;

    try {
      await api('/api/users.php?action=unban', 'POST', { user_id: user.id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Модалка сброса пароля ----------

  function openPwdModal(user) {
    currentPwdUser = user;
    setValue('pwd-user', user.username);
    setValue('pwd-value', generatePassword());
    document.getElementById('pwd-modal').classList.add('active');
  }

  function closePwdModal() {
    document.getElementById('pwd-modal').classList.remove('active');
    currentPwdUser = null;
  }

  function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const buffer = new Uint32Array(12);
    crypto.getRandomValues(buffer);
    let out = '';
    for (let i = 0; i < 12; i++) {
      out += chars.charAt(buffer[i] % chars.length);
    }
    return out;
  }

  async function copyPassword() {
    const input = document.getElementById('pwd-value');
    input.select();

    try {
      await navigator.clipboard.writeText(input.value);
      const btn = qs('#pwd-copy');
      const original = btn.innerHTML;
      btn.innerHTML = '<span class="material-icons">check</span>';
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    } catch (_) {
      // fallback
      document.execCommand('copy');
    }
  }

  async function savePwd() {
    if (!currentPwdUser) return;

    const pwd = getValue('pwd-value').trim();
    if (pwd.length < 4) {
      Modal.alert({ title: 'Пароль минимум 4 символа', danger: true });
      return;
    }

    try {
      await api('/api/users.php?action=password', 'POST', {
        user_id: currentPwdUser.id,
        password: pwd
      });

      const username = currentPwdUser.username;
      closePwdModal();

      Modal.alert({
        title: 'Пароль обновлён',
        message: 'Пользователь: ' + username + '\nНовый пароль: ' + pwd
      });
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Модалка бана ----------

  function openBanModal(user) {
    currentBanUser = user;
    setValue('ban-user', user.username);
    setValue('ban-reason', '');
    document.getElementById('ban-modal').classList.add('active');
  }

  function closeBanModal() {
    document.getElementById('ban-modal').classList.remove('active');
    currentBanUser = null;
  }

  async function saveBan() {
    if (!currentBanUser) return;

    const reason = getValue('ban-reason').trim();

    try {
      await api('/api/users.php?action=ban', 'POST', {
        user_id: currentBanUser.id,
        reason
      });
      closeBanModal();
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Модалка удаления ----------

  function openDelModal(user) {
    currentDelUser = user;
    setValue('del-user', user.username);
    setValue('del-confirm', '');
    document.getElementById('del-save').disabled = true;
    document.getElementById('del-modal').classList.add('active');
  }

  function closeDelModal() {
    document.getElementById('del-modal').classList.remove('active');
    currentDelUser = null;
  }

  function onDelConfirmInput() {
    const value = this.value.trim();
    const ok = currentDelUser && value === currentDelUser.username;
    document.getElementById('del-save').disabled = !ok;
  }

  async function saveDel() {
    if (!currentDelUser) return;

    try {
      await api('/api/users.php?action=delete', 'POST', { user_id: currentDelUser.id });
      closeDelModal();
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Форматирование ----------

  function formatLastSeen(ts) {
    if (!ts) return '—';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин назад';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч назад';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' дн назад';
    return new Date(ts * 1000).toLocaleDateString();
  }

  function formatDate(ts) {
    return ts ? new Date(ts * 1000).toLocaleDateString() : '—';
  }

  window.AdminUsers = { load };
})();