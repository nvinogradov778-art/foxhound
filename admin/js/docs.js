(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/docs] shared.js must load first');

  const { api, confirmDanger, qs, setValue, getValue } = AdminShared;

  let documentsCache = [];
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/docs.php');
      documentsCache = data.documents || [];
      renderList();
    } catch (error) {
      console.error('[AdminDocs.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#docs-form').addEventListener('submit', handleSubmit);
  }

  function renderList() {
    const container = qs('#docs-list');
    container.innerHTML = '';

    if (!documentsCache.length) {
      container.innerHTML = '<p class="text-muted">Нет регламентов.</p>';
      return;
    }

    documentsCache.forEach(doc => container.appendChild(renderRow(doc)));
  }

  function renderRow(doc) {
    const row = document.createElement('div');
    row.className = 'list-item';

    const left = document.createElement('div');
    left.className = 'list-left';
    left.style.flexDirection = 'column';
    left.style.alignItems = 'flex-start';
    left.style.gap = '4px';

    const title = document.createElement('strong');
    title.textContent = doc.title;
    left.appendChild(title);

    if (doc.doc_number || doc.doc_date) {
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:13px; color:#ff6600; font-family:var(--font-heading); letter-spacing:0.5px;';
      const parts = [];
      if (doc.doc_number) parts.push('№ ' + doc.doc_number);
      if (doc.doc_date) parts.push(doc.doc_date);
      meta.textContent = parts.join(' · ');
      left.appendChild(meta);
    }

    if (doc.description) {
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:14px; color:#666;';
      desc.textContent = doc.description;
      left.appendChild(desc);
    }

    if (doc.link) {
      const linkBox = document.createElement('div');
      const a = document.createElement('a');
      a.href = doc.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = doc.link;
      linkBox.appendChild(a);
      left.appendChild(linkBox);
    }

    row.appendChild(left);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-sm';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.addEventListener('click', () => editDoc(doc));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', () => deleteDoc(doc.id));
    actions.appendChild(delBtn);

    row.appendChild(actions);
    return row;
  }

  function editDoc(doc) {
    setValue('doc-id', doc.id);
    setValue('doc-title', doc.title || '');
    setValue('doc-number', doc.doc_number || '');
    setValue('doc-date', doc.doc_date || '');
    setValue('doc-desc', doc.description || '');
    setValue('doc-link', doc.link || '');
    setText('doc-submit-btn', 'Сохранить');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const id = getValue('doc-id');
    const payload = {
      title: getValue('doc-title').trim(),
      doc_number: getValue('doc-number').trim(),
      doc_date: getValue('doc-date').trim(),
      description: getValue('doc-desc').trim(),
      link: getValue('doc-link').trim()
    };
    if (id) payload.id = parseInt(id, 10);

    const action = id ? 'update' : 'add';

    try {
      await api('/api/docs.php?action=' + action, 'POST', payload);
      qs('#docs-form').reset();
      setValue('doc-id', '');
      setText('doc-submit-btn', 'Добавить регламент');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteDoc(id) {
    const confirmed = await confirmDanger('Удалить регламент?', null);
    if (!confirmed) return;

    try {
      await api('/api/docs.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  window.AdminDocs = { load };
})();