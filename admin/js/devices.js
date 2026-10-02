(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/devices] shared.js must load first');

  const { api, apiForm, confirmDanger, qs, qsa, setValue, getValue, show, hide } = AdminShared;

  let devicesCache = [];
  let currentDevice = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/devices.php');
      devicesCache = data.devices || [];
      fillSelect();
      renderEditor(currentDevice);
    } catch (error) {
      console.error('[AdminDevices.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#device-select').addEventListener('change', handleSelect);
    qs('#device-new-btn').addEventListener('click', openNew);
    qs('#device-delete-btn').addEventListener('click', deleteCurrent);
    qs('#dv-file-add-btn').addEventListener('click', () => addFileItem(null));
    qs('#dv-save-btn').addEventListener('click', save);
    qs('#dv-cancel-btn').addEventListener('click', cancel);
  }

  function fillSelect() {
    const select = qs('#device-select');
    select.innerHTML = '<option value="">— Выберите устройство —</option>';

    devicesCache.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      select.appendChild(opt);
    });
  }

  function handleSelect() {
    const id = parseInt(this.value, 10);
    if (!id) {
      hide('device-editor');
      hide('device-delete-btn');
      currentDevice = null;
      return;
    }

    currentDevice = devicesCache.find(d => d.id === id);
    if (!currentDevice) return;

    renderEditor(currentDevice);
    show('device-editor');
    show('device-delete-btn');
  }

  function openNew() {
    currentDevice = null;
    renderEditor({ slug: '', name: '', description: '', video_link: '', schematic_link: '', docs_link: '', files: [], photo: null });
    setValue('device-select', '');
    show('device-editor');
    hide('device-delete-btn');
  }

  function cancel() {
    hide('device-editor');
    hide('device-delete-btn');
    setValue('device-select', '');
    currentDevice = null;
  }

  function renderEditor(device) {
    device = device || {};

    setValue('dv-slug', device.slug || '');
    setValue('dv-name', device.name || '');
    setValue('dv-description', device.description || '');
    setValue('dv-video', device.video_link || '');
    setValue('dv-schematic', device.schematic_link || '');
    setValue('dv-docs', device.docs_link || '');
    setValue('dv-photo', '');

    const photoBox = qs('#dv-photo-current');
    photoBox.innerHTML = '';
    if (device.photo) {
      const img = document.createElement('img');
      img.src = '/' + device.photo;
      img.style.cssText = 'max-width:120px; border:1px solid #2a2a2a;';
      img.onerror = function () { this.style.display = 'none'; };
      photoBox.appendChild(img);
    }

    const fileList = qs('#dv-file-list');
    fileList.innerHTML = '';
    (device.files || []).forEach(f => fileList.appendChild(buildFileItem(f)));
  }

  function buildFileItem(file) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#0a0a0a; border:1px solid #2a2a2a; padding:8px; margin-bottom:6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;';

    wrap.appendChild(makeInlineField('dv-file-name', file.name, 'Название', 'flex:2; min-width:150px;'));
    wrap.appendChild(makeInlineField('dv-file-link', file.link, 'https://...', 'flex:3; min-width:200px;'));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => wrap.remove());
    wrap.appendChild(removeBtn);

    return wrap;
  }

  function addFileItem(file) {
    qs('#dv-file-list').appendChild(buildFileItem(file || { name: '', link: '' }));
  }

  function collect() {
    const files = qsa('#dv-file-list > div')
      .map(node => ({
        name: (node.querySelector('.dv-file-name')?.value || '').trim(),
        link: (node.querySelector('.dv-file-link')?.value || '').trim()
      }))
      .filter(f => f.name || f.link);

    return {
      id: currentDevice ? currentDevice.id : 0,
      slug: getValue('dv-slug').trim(),
      name: getValue('dv-name').trim(),
      description: getValue('dv-description').trim(),
      video_link: getValue('dv-video').trim(),
      schematic_link: getValue('dv-schematic').trim(),
      docs_link: getValue('dv-docs').trim(),
      files
    };
  }

  async function save() {
    const data = collect();
    if (!data.name) {
      Modal.alert({ title: 'Название обязательно', danger: true });
      return;
    }

    const fd = new FormData();
    if (data.id) fd.append('id', data.id);
    fd.append('slug', data.slug);
    fd.append('name', data.name);
    fd.append('description', data.description);
    fd.append('video_link', data.video_link);
    fd.append('schematic_link', data.schematic_link);
    fd.append('docs_link', data.docs_link);
    fd.append('files', JSON.stringify(data.files));

    const photoInput = qs('#dv-photo');
    if (photoInput.files.length) fd.append('photo', photoInput.files[0]);

    try {
      const result = await apiForm('/api/devices.php?action=save', fd);
      await load();
      if (result.id) {
        setValue('device-select', result.id);
        qs('#device-select').dispatchEvent(new Event('change'));
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteCurrent() {
    if (!currentDevice) return;

    const confirmed = await confirmDanger('Удалить устройство «' + currentDevice.name + '»?', null);
    if (!confirmed) return;

    try {
      await api('/api/devices.php?action=delete', 'POST', { id: currentDevice.id });
      currentDevice = null;
      hide('device-editor');
      hide('device-delete-btn');
      setValue('device-select', '');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
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

  window.AdminDevices = { load };
})();