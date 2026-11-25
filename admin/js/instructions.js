(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/instructions] shared.js must load first');

  const { api, confirmDanger, qs, setValue, getValue } = AdminShared;

  let documentsCache = [];
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/instructions.php');
      documentsCache = data.documents || [];
      renderList();
    } catch (error) {
      console.error('[AdminInstructions.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#instruction-form').addEventListener('submit', handleSubmit);
  }

  function renderList() {
    const container = qs('#instruction-list');
    container.innerHTML = '';

    if (!documentsCache.length) {
      container.innerHTML = '<p class="text-muted">Нет инструкций.</p>';
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
    editBtn.addEventListener('click', () => editInstruction(doc));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', () => deleteInstruction(doc.id));
    actions.appendChild(delBtn);

    row.appendChild(actions);
    return row;
  }

  function editInstruction(doc) {
    setValue('inst-id', doc.id);
    setValue('inst-title', doc.title || '');
    setValue('inst-desc', doc.description || '');
    setValue('inst-link', doc.link || '');
    setText('inst-submit-btn', 'Сохранить');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const id = getValue('inst-id');
    const payload = {
      title: getValue('inst-title').trim(),
      description: getValue('inst-desc').trim(),
      link: getValue('inst-link').trim()
    };
    if (id) payload.id = parseInt(id, 10);

    const action = id ? 'update' : 'add';

    try {
      await api('/api/instructions.php?action=' + action, 'POST', payload);
      qs('#instruction-form').reset();
      setValue('inst-id', '');
      setText('inst-submit-btn', 'Добавить инструкцию');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteInstruction(id) {
    const confirmed = await confirmDanger('Удалить инструкцию?', null);
    if (!confirmed) return;

    try {
      await api('/api/instructions.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  window.AdminInstructions = { load };
})();