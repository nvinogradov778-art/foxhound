(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/radio] shared.js must load first');

  const { api, apiForm, confirmDanger, qs, qsa, setValue, getValue, show, hide } = AdminShared;

  let stationsCache = [];
  let currentStation = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/radio.php');
      stationsCache = data.stations || [];
      fillSelect();
      renderEditor(currentStation);
    } catch (error) {
      console.error('[AdminRadio.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#radio-select').addEventListener('change', handleSelect);
    qs('#radio-new-btn').addEventListener('click', openNew);
    qs('#radio-delete-btn').addEventListener('click', deleteCurrent);
    qs('#rd-track-add-btn').addEventListener('click', () => addTrack(null));
    qs('#rd-save-btn').addEventListener('click', save);
    qs('#rd-cancel-btn').addEventListener('click', cancel);
  }

  function fillSelect() {
    const select = qs('#radio-select');
    select.innerHTML = '<option value="">— Выберите станцию —</option>';

    stationsCache.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
  }

  function handleSelect() {
    const id = parseInt(this.value, 10);
    if (!id) {
      hide('radio-editor');
      hide('radio-delete-btn');
      currentStation = null;
      return;
    }

    currentStation = stationsCache.find(s => s.id === id);
    if (!currentStation) return;

    renderEditor(currentStation);
    show('radio-editor');
    show('radio-delete-btn');
  }

  function openNew() {
    currentStation = null;
    renderEditor({ slug: '', name: '', folder: '', frequency: '', purpose: '', desc: '', tracks: [] });
    setValue('radio-select', '');
    show('radio-editor');
    hide('radio-delete-btn');
  }

  function cancel() {
    hide('radio-editor');
    hide('radio-delete-btn');
    setValue('radio-select', '');
    currentStation = null;
  }

  function renderEditor(station) {
    station = station || {};

    setValue('rd-slug', station.slug || '');
    setValue('rd-name', station.name || '');
    setValue('rd-folder', station.folder || '');
    setValue('rd-frequency', station.frequency || '');
    setValue('rd-purpose', station.purpose || '');
    setValue('rd-desc', station.desc || '');

    const list = qs('#rd-track-list');
    list.innerHTML = '';
    (station.tracks || []).forEach(t => list.appendChild(buildTrack(t)));
  }

  function buildTrack(track) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#0a0a0a; border:1px solid #2a2a2a; padding:8px; margin-bottom:6px;';

    // Верхняя строка: up/down/title/remove
    const top = document.createElement('div');
    top.style.cssText = 'display:flex; gap:8px; margin-bottom:6px; flex-wrap:wrap;';

    const upBtn = makeIconBtn('arrow_upward', 'Выше');
    upBtn.addEventListener('click', () => moveUp(wrap));
    top.appendChild(upBtn);

    const downBtn = makeIconBtn('arrow_downward', 'Ниже');
    downBtn.addEventListener('click', () => moveDown(wrap));
    top.appendChild(downBtn);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'rd-track-title';
    titleInput.value = track.title || '';
    titleInput.placeholder = 'Название трека';
    titleInput.style.cssText = 'flex:2; min-width:180px; padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    top.appendChild(titleInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => wrap.remove());
    top.appendChild(removeBtn);

    wrap.appendChild(top);

    // Нижняя строка: select src / refresh / upload
    const bottom = document.createElement('div');
    bottom.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';

    const select = document.createElement('select');
    select.className = 'rd-track-src';
    select.style.cssText = 'flex:1; min-width:200px; padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    if (track.src) {
      const opt = document.createElement('option');
      opt.value = track.src;
      opt.textContent = track.src;
      select.appendChild(opt);
    }
    select.dataset.current = track.src || '';
    bottom.appendChild(select);

    const refreshBtn = makeIconBtn('refresh', 'Обновить список');
    refreshBtn.className = 'btn rd-refresh-files btn-sm';
    refreshBtn.addEventListener('click', () => refreshFiles(select, track));
    bottom.appendChild(refreshBtn);

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn rd-upload-btn btn-sm';
    uploadBtn.innerHTML = '<span class="material-icons">upload</span> Загрузить';
    bottom.appendChild(uploadBtn);

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.className = 'rd-upload-input';
    uploadInput.accept = 'audio/*';
    uploadInput.style.display = 'none';
    bottom.appendChild(uploadInput);

    uploadBtn.addEventListener('click', () => {
      const folder = getValue('rd-folder').trim();
      if (!folder) {
        Modal.alert({ title: 'Сначала укажи папку плейлиста', danger: true });
        return;
      }
      uploadInput.click();
    });

    uploadInput.addEventListener('change', function () {
      uploadTrack(this, uploadBtn, titleInput, select);
    });

    select.addEventListener('change', function () {
      this.dataset.current = this.value;
    });

    wrap.appendChild(bottom);

    // Первичная загрузка файлов
    if (track.src) refreshFiles(select, track);

    return wrap;
  }

  function addTrack(track) {
    qs('#rd-track-list').appendChild(buildTrack(track || { title: '', src: '' }));
  }

  async function refreshFiles(select, track) {
    const folder = getValue('rd-folder').trim();
    select.innerHTML = '';

    if (!folder) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— сначала укажи папку плейлиста —';
      select.appendChild(opt);
      return;
    }

    const loading = document.createElement('option');
    loading.value = '';
    loading.textContent = '— загрузка... —';
    select.appendChild(loading);

    try {
      const data = await api('/api/radio_files.php?folder=' + encodeURIComponent(folder));
      const files = data.files || [];
      const current = select.dataset.current || (track && track.src) || '';

      select.innerHTML = '';

      if (!files.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— файлов нет —';
        select.appendChild(opt);
      } else {
        files.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.path;
          opt.textContent = f.name;
          if (f.path === current) opt.selected = true;
          select.appendChild(opt);
        });
      }

      select.dataset.current = current;
    } catch (_) {
      select.innerHTML = '<option value="">— ошибка —</option>';
    }
  }

  async function uploadTrack(input, button, titleInput, select) {
    const file = input.files[0];
    if (!file) return;

    const folder = getValue('rd-folder').trim();
    if (!folder) return;

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span class="material-icons">hourglass_empty</span>...';

    const fd = new FormData();
    fd.append('folder', folder);
    fd.append('file', file);

    try {
      const data = await apiForm('/api/radio_upload.php', fd);

      if (!titleInput.value.trim()) {
        titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      }

      select.dataset.current = data.path;
      await refreshFiles(select, { src: data.path });
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      input.value = '';
    }
  }

  function moveUp(wrap) {
    const prev = wrap.previousElementSibling;
    if (prev) wrap.parentElement.insertBefore(wrap, prev);
  }

  function moveDown(wrap) {
    const next = wrap.nextElementSibling;
    if (next) wrap.parentElement.insertBefore(next, wrap);
  }

  function collect() {
    const tracks = qsa('#rd-track-list > div').map(node => ({
      title: (node.querySelector('.rd-track-title')?.value || '').trim(),
      src: (node.querySelector('.rd-track-src')?.value || '').trim()
    })).filter(t => t.title || t.src);

    return {
      id: currentStation ? currentStation.id : 0,
      slug: getValue('rd-slug').trim(),
      name: getValue('rd-name').trim(),
      folder: getValue('rd-folder').trim(),
      frequency: getValue('rd-frequency').trim(),
      purpose: getValue('rd-purpose').trim(),
      desc: getValue('rd-desc').trim(),
      tracks
    };
  }

  async function save() {
    const data = collect();
    if (!data.name) {
      Modal.alert({ title: 'Название обязательно', danger: true });
      return;
    }

    try {
      const result = await api('/api/radio.php?action=save', 'POST', data);
      await load();
      if (result.id) {
        setValue('radio-select', result.id);
        qs('#radio-select').dispatchEvent(new Event('change'));
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteCurrent() {
    if (!currentStation) return;

    const confirmed = await confirmDanger('Удалить станцию «' + currentStation.name + '»?', null);
    if (!confirmed) return;

    try {
      await api('/api/radio.php?action=delete', 'POST', { id: currentStation.id });
      currentStation = null;
      hide('radio-editor');
      hide('radio-delete-btn');
      setValue('radio-select', '');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function makeIconBtn(icon, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm';
    btn.title = title;
    btn.innerHTML = '<span class="material-icons">' + icon + '</span>';
    return btn;
  }

  window.AdminRadio = { load };
})();