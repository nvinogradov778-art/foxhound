(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/operators] shared.js must load first');

  const { api, apiForm, confirmDanger, qs, setValue, getValue } = AdminShared;

  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/operators.php');
      renderList(data.operators || []);
    } catch (error) {
      console.error('[AdminOperators.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#operator-form').addEventListener('submit', handleSubmit);
  }

  function renderList(operators) {
    const container = qs('#operator-list');
    container.innerHTML = '';

    if (!operators.length) {
      container.innerHTML = '<p class="text-muted">Нет оперативников.</p>';
      return;
    }

    operators.forEach(op => container.appendChild(renderRow(op)));
  }

  function renderRow(op) {
    const row = document.createElement('div');
    row.className = 'list-item';

    const left = document.createElement('div');
    left.className = 'list-left';

    if (op.photo) {
      const img = document.createElement('img');
      img.src = '/' + op.photo;
      img.alt = op.name;
      img.className = 'preview-img';
      img.onerror = function () { this.remove(); };
      left.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'preview-placeholder material-icons';
      placeholder.textContent = 'person';
      left.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.style.flex = '1';
    info.style.minWidth = '0';

    const name = document.createElement('strong');
    name.style.color = '#fff';
    name.textContent = op.name;
    info.appendChild(name);

    if (op.role) {
      const role = document.createElement('div');
      role.style.cssText = 'font-size:14px; color:var(--accent);';
      role.textContent = op.role;
      info.appendChild(role);
    }

    if (op.specialization) {
      const spec = document.createElement('div');
      spec.style.cssText = 'font-size:14px; color:var(--text-muted);';
      spec.textContent = op.specialization;
      info.appendChild(spec);
    }

    if (op.description) {
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:13px; color:var(--text-muted);';
      desc.textContent = op.description;
      info.appendChild(desc);
    }

    left.appendChild(info);
    row.appendChild(left);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-sm';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.addEventListener('click', () => editOperator(op));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger btn-sm';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', () => deleteOperator(op.id));
    actions.appendChild(delBtn);

    row.appendChild(actions);
    return row;
  }

  function editOperator(op) {
    setValue('op-id', op.id);
    setValue('op-name', op.name || '');
    setValue('op-role', op.role || '');
    setValue('op-spec', op.specialization || '');
    setValue('op-desc', op.description || '');
    setValue('op-photo', '');
    qs('#op-name').focus();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const fd = new FormData();
    const id = getValue('op-id');
    if (id) fd.append('id', id);
    fd.append('name', getValue('op-name').trim());
    fd.append('role', getValue('op-role').trim());
    fd.append('specialization', getValue('op-spec').trim());
    fd.append('description', getValue('op-desc').trim());

    const photoInput = qs('#op-photo');
    if (photoInput.files.length) fd.append('photo', photoInput.files[0]);

    try {
      await apiForm('/api/operators.php?action=save', fd);
      qs('#operator-form').reset();
      setValue('op-id', '');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteOperator(id) {
    const confirmed = await confirmDanger('Удалить оперативника?', null);
    if (!confirmed) return;

    try {
      await api('/api/operators.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  window.AdminOperators = { load };
})();