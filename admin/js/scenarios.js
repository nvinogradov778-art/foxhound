(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/scenarios] shared.js must load first');

  const { api, confirmDanger, qs, qsa, setValue, getValue, show, hide } = AdminShared;

  let scenariosCache = [];
  let currentScenario = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/scenarios.php');
      scenariosCache = data.scenarios || [];
      fillSelect();
      renderEditor(currentScenario);
    } catch (error) {
      console.error('[AdminScenarios.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#scenario-select').addEventListener('change', handleSelect);
    qs('#scenario-new-btn').addEventListener('click', openNew);
    qs('#scenario-delete-btn').addEventListener('click', deleteCurrent);
    qs('#phase-add-btn').addEventListener('click', () => addPhase(null));
    qs('#inv-add-btn').addEventListener('click', () => addInventoryItem(''));
    qs('#file-add-btn').addEventListener('click', () => addFileItem(null));
    qs('#sc-save-btn').addEventListener('click', save);
    qs('#sc-cancel-btn').addEventListener('click', cancel);
  }

  function fillSelect() {
    const select = qs('#scenario-select');
    select.innerHTML = '<option value="">— Выберите сценарий —</option>';

    scenariosCache.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.title;
      select.appendChild(opt);
    });
  }

  function handleSelect() {
    const id = parseInt(this.value, 10);
    if (!id) {
      hide('scenario-editor');
      hide('scenario-delete-btn');
      currentScenario = null;
      return;
    }

    currentScenario = scenariosCache.find(s => s.id === id);
    if (!currentScenario) return;

    renderEditor(currentScenario);
    show('scenario-editor');
    show('scenario-delete-btn');
  }

  function openNew() {
    currentScenario = null;
    renderEditor({ title: '', slug: '', description: '', video_link: '', phases: [], inventory: [], files: [] });
    setValue('scenario-select', '');
    show('scenario-editor');
    hide('scenario-delete-btn');
  }

  function cancel() {
    hide('scenario-editor');
    hide('scenario-delete-btn');
    setValue('scenario-select', '');
    currentScenario = null;
  }

  // ---------- Рендер формы ----------

  function renderEditor(scenario) {
    scenario = scenario || { title: '', slug: '', description: '', video_link: '', phases: [], inventory: [], files: [] };

    setValue('sc-title', scenario.title || '');
    setValue('sc-slug', scenario.slug || '');
    setValue('sc-description', scenario.description || '');
    setValue('sc-video', scenario.video_link || '');

    const phaseList = qs('#phase-list');
    phaseList.innerHTML = '';
    (scenario.phases || []).forEach((p, i) => phaseList.appendChild(buildPhase(p, i)));

    const invList = qs('#inv-list');
    invList.innerHTML = '';
    (scenario.inventory || []).forEach(item => invList.appendChild(buildInventoryItem(item)));

    const fileList = qs('#file-list');
    fileList.innerHTML = '';
    (scenario.files || []).forEach(f => fileList.appendChild(buildFileItem(f)));
  }

  function buildPhase(phase, index) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#0a0a0a; border:1px solid #2a2a2a; padding:12px; margin-bottom:8px;';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;';

    const title = document.createElement('strong');
    title.style.color = '#ff6600';
    title.textContent = 'Фаза ' + (index + 1);
    head.appendChild(title);

    const removeBtn = makeRemoveButton(() => wrap.remove());
    head.appendChild(removeBtn);
    wrap.appendChild(head);

    wrap.appendChild(makeField('Название', 'text', 'phase-name', phase.name));
    wrap.appendChild(makeField('Время', 'text', 'phase-time', phase.time));
    wrap.appendChild(makeTextareaField('Описание', 'phase-desc', phase.description));
    wrap.appendChild(makeField('Карта', 'text', 'phase-map', phase.map_image));

    return wrap;
  }

  function addPhase() {
    const list = qs('#phase-list');
    list.appendChild(buildPhase({ name: '', time: '', description: '', map_image: '' }, list.children.length));
  }

  function buildInventoryItem(value) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; margin-bottom:6px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inv-item';
    input.value = value || '';
    input.style.cssText = 'flex:1; padding:8px 12px; background:#0a0a0a; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    row.appendChild(input);

    row.appendChild(makeRemoveButton(() => row.remove()));
    return row;
  }

  function addInventoryItem(value) {
    qs('#inv-list').appendChild(buildInventoryItem(value));
  }

  function buildFileItem(file) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#0a0a0a; border:1px solid #2a2a2a; padding:8px; margin-bottom:6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;';

    wrap.appendChild(makeInlineField('file-name', file.name, 'Название', 'flex:2; min-width:150px;'));
    wrap.appendChild(makeInlineField('file-link', file.link, 'https://...', 'flex:3; min-width:200px;'));
    wrap.appendChild(makeRemoveButton(() => wrap.remove()));

    return wrap;
  }

  function addFileItem(file) {
    qs('#file-list').appendChild(buildFileItem(file || { name: '', link: '' }));
  }

  // ---------- Сбор формы ----------

  function collect() {
    const phases = qsa('#phase-list > div').map(node => ({
      name: (node.querySelector('.phase-name')?.value || '').trim(),
      time: (node.querySelector('.phase-time')?.value || '').trim(),
      description: (node.querySelector('.phase-desc')?.value || '').trim(),
      map_image: (node.querySelector('.phase-map')?.value || '').trim()
    }));

    const inventory = qsa('#inv-list .inv-item')
      .map(inp => inp.value.trim())
      .filter(Boolean);

    const files = qsa('#file-list > div')
      .map(node => ({
        name: (node.querySelector('.file-name')?.value || '').trim(),
        link: (node.querySelector('.file-link')?.value || '').trim()
      }))
      .filter(f => f.name || f.link);

    return {
      id: currentScenario ? currentScenario.id : 0,
      slug: getValue('sc-slug').trim(),
      title: getValue('sc-title').trim(),
      description: getValue('sc-description').trim(),
      video_link: getValue('sc-video').trim(),
      phases,
      inventory,
      files
    };
  }

  async function save() {
    const data = collect();

    if (!data.title) {
      Modal.alert({ title: 'Название обязательно', danger: true });
      return;
    }
    if (!data.slug) {
      Modal.alert({ title: 'Slug обязателен', danger: true });
      return;
    }

    try {
      const result = await api('/api/scenarios.php?action=save', 'POST', data);
      await load();
      if (result.id) {
        setValue('scenario-select', result.id);
        qs('#scenario-select').dispatchEvent(new Event('change'));
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteCurrent() {
    if (!currentScenario) return;

    const confirmed = await confirmDanger('Удалить сценарий «' + currentScenario.title + '»?', null);
    if (!confirmed) return;

    try {
      await api('/api/scenarios.php?action=delete', 'POST', { id: currentScenario.id });
      currentScenario = null;
      hide('scenario-editor');
      hide('scenario-delete-btn');
      setValue('scenario-select', '');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Хелперы форм ----------

  function makeField(label, type, className, value) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.style.fontSize = '13px';
    lbl.textContent = label;
    group.appendChild(lbl);

    const input = document.createElement('input');
    input.type = type;
    input.className = className;
    input.value = value || '';
    group.appendChild(input);

    return group;
  }

  function makeTextareaField(label, className, value) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const lbl = document.createElement('label');
    lbl.style.fontSize = '13px';
    lbl.textContent = label;
    group.appendChild(lbl);

    const ta = document.createElement('textarea');
    ta.className = className;
    ta.style.minHeight = '60px';
    ta.value = value || '';
    group.appendChild(ta);

    return group;
  }

  function makeInlineField(className, value, placeholder, style) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.value = value || '';
    input.placeholder = placeholder;
    input.style.cssText = style + ' padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    return input;
  }

  function makeRemoveButton(onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = '×';
    btn.addEventListener('click', onClick);
    return btn;
  }

  window.AdminScenarios = { load };
})();