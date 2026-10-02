(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/logs] shared.js must load first');

  const { api, confirmDanger, qs, setValue, getValue, show, hide } = AdminShared;

  let logsCache = [];
  let editingId = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/logs.php');
      logsCache = data.logs || [];
      renderList();
    } catch (error) {
      console.error('[AdminLogs.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#log-new-btn').addEventListener('click', openNew);
    qs('#lg-save-btn').addEventListener('click', save);
    qs('#lg-cancel-btn').addEventListener('click', closeEditor);
  }

  function renderList() {
    const container = qs('#log-list');
    container.innerHTML = '';

    if (!logsCache.length) {
      container.innerHTML = '<p class="text-muted">Записей нет.</p>';
      return;
    }

    logsCache.forEach(entry => container.appendChild(renderRow(entry)));
  }

  function renderRow(entry) {
    const row = document.createElement('div');
    row.className = 'list-item';

    const info = document.createElement('div');

    if (entry.date) {
      const date = document.createElement('strong');
      date.style.color = '#ff6600';
      date.textContent = entry.date;
      info.appendChild(date);
    }

    const text = document.createElement('div');
    text.style.cssText = 'font-size:14px; color:#ccc;';
    if (entry.style) {
      try { text.style.cssText += entry.style; } catch (_) {}
    }
    text.textContent = entry.text;
    info.appendChild(text);

    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-sm';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.addEventListener('click', () => openEdit(entry));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', () => deleteEntry(entry.id));
    actions.appendChild(delBtn);

    row.appendChild(actions);
    return row;
  }

  function openNew() {
    editingId = null;
    setValue('lg-id', '');
    setValue('lg-date', '');
    setValue('lg-text', '');
    setValue('lg-style', '');
    setText('lg-save-btn', 'Сохранить');
    show('log-editor');
    qs('#lg-text').focus();
  }

  function openEdit(entry) {
    editingId = entry.id;
    setValue('lg-id', entry.id);
    setValue('lg-date', entry.date || '');
    setValue('lg-text', entry.text || '');
    setValue('lg-style', entry.style || '');
    setText('lg-save-btn', 'Обновить');
    show('log-editor');
  }

  function closeEditor() {
    hide('log-editor');
    setValue('lg-id', '');
    editingId = null;
  }

  async function save() {
    const payload = {
      date: getValue('lg-date').trim(),
      text: getValue('lg-text').trim(),
      style: getValue('lg-style').trim()
    };
    if (editingId) payload.id = editingId;

    if (!payload.text) {
      Modal.alert({ title: 'Текст обязателен', danger: true });
      return;
    }

    try {
      await api('/api/logs.php?action=save', 'POST', payload);
      closeEditor();
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteEntry(id) {
    const confirmed = await confirmDanger('Удалить запись?', null);
    if (!confirmed) return;

    try {
      await api('/api/logs.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  window.AdminLogs = { load };
})();