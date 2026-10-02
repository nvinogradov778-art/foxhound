(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/maps] shared.js must load first');

  const { api, apiForm, confirmDanger, qs, qsa, setValue, getValue, show, hide } = AdminShared;

  const STYLE_PRESETS = {
    line_orange:  { name: 'Линия — оранжевая',          style: { color: '#ff6600', weight: 3, opacity: 0.9 } },
    line_yellow:  { name: 'Линия — жёлтая',             style: { color: '#ffaa00', weight: 4, opacity: 0.9 } },
    line_green:   { name: 'Линия — зелёная (пунктир)',  style: { color: '#33cc33', weight: 2, opacity: 0.8, dashArray: '5, 5' } },
    line_gray:    { name: 'Линия — серая',              style: { color: '#888888', weight: 1, opacity: 0.8 } },
    poly_green:   { name: 'Полигон — зелёный',          style: { color: '#2e7d32', weight: 1, fillColor: '#2e7d32', fillOpacity: 0.4 } },
    poly_red:     { name: 'Полигон — красный',          style: { color: '#ff3333', weight: 2, fillColor: '#ff3333', fillOpacity: 0.3 } },
    poly_blue:    { name: 'Полигон — синий',            style: { color: '#3399ff', weight: 2, fillColor: '#3399ff', fillOpacity: 0.3 } },
    poly_yellow:  { name: 'Полигон — жёлтый',           style: { color: '#ffcc00', weight: 2, fillColor: '#ffcc00', fillOpacity: 0.25 } },
    polygon_dark: { name: 'Полигон — тёмный',           style: { color: '#888888', weight: 1, fillOpacity: 0.2, opacity: 0.8 } }
  };

  let polygonsCache = [];
  let currentMap = null;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const data = await api('/api/maps.php');
      polygonsCache = data.polygons || [];
      fillSelect();
      renderEditor(currentMap);
    } catch (error) {
      console.error('[AdminMaps.load]', error);
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  function bind() {
    qs('#map-select').addEventListener('change', handleSelect);
    qs('#map-new-btn').addEventListener('click', openNew);
    qs('#map-delete-btn').addEventListener('click', deleteCurrent);
    qs('#mp-layer-add-btn').addEventListener('click', () => addLayer(null));
    qs('#mp-save-btn').addEventListener('click', save);
    qs('#mp-cancel-btn').addEventListener('click', cancel);
  }

  function fillSelect() {
    const select = qs('#map-select');
    select.innerHTML = '<option value="">— Выберите полигон —</option>';

    polygonsCache.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  }

  function handleSelect() {
    const id = parseInt(this.value, 10);
    if (!id) {
      hide('map-editor');
      hide('map-delete-btn');
      currentMap = null;
      return;
    }

    currentMap = polygonsCache.find(p => p.id === id);
    if (!currentMap) return;

    renderEditor(currentMap);
    show('map-editor');
    show('map-delete-btn');
  }

  function openNew() {
    currentMap = null;
    renderEditor({ slug: '', name: '', center: [60, 69], zoom: 14, layers: [] });
    setValue('map-select', '');
    show('map-editor');
    hide('map-delete-btn');
  }

  function cancel() {
    hide('map-editor');
    hide('map-delete-btn');
    setValue('map-select', '');
    currentMap = null;
  }

  function renderEditor(polygon) {
    polygon = polygon || {};

    setValue('mp-slug', polygon.slug || '');
    setValue('mp-name', polygon.name || '');
    setValue('mp-lat', polygon.center ? polygon.center[0] : '');
    setValue('mp-lng', polygon.center ? polygon.center[1] : '');
    setValue('mp-zoom', polygon.zoom || 14);

    const list = qs('#mp-layer-list');
    list.innerHTML = '';
    (polygon.layers || []).forEach(l => list.appendChild(buildLayer(l)));
  }

  function addLayer(layer) {
    qs('#mp-layer-list').appendChild(buildLayer(layer || { id: '', name: '', url: '', style: {} }));
  }

  function buildLayer(layer) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:#0a0a0a; border:1px solid #2a2a2a; padding:10px; margin-bottom:8px;';

    // Строка: id / name / remove
    const top = document.createElement('div');
    top.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;';

    top.appendChild(makeInput('mp-layer-id', layer.id, 'id', 'flex:1; min-width:120px;'));
    top.appendChild(makeInput('mp-layer-name', layer.name, 'Название', 'flex:2; min-width:150px;'));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => wrap.remove());
    top.appendChild(removeBtn);
    wrap.appendChild(top);

    // Строка: url select / refresh / upload
    const urlRow = document.createElement('div');
    urlRow.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;';

    const select = document.createElement('select');
    select.className = 'mp-layer-url-select';
    select.style.cssText = 'flex:1; min-width:200px; padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    select.dataset.current = layer.url || '';
    if (layer.url) {
      const opt = document.createElement('option');
      opt.value = layer.url;
      opt.textContent = layer.url;
      select.appendChild(opt);
    }
    urlRow.appendChild(select);

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn mp-layer-refresh btn-sm';
    refreshBtn.innerHTML = '<span class="material-icons">refresh</span>';
    refreshBtn.addEventListener('click', () => refreshFiles(select, layer));
    urlRow.appendChild(refreshBtn);

    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'btn mp-layer-upload-btn btn-sm';
    uploadBtn.innerHTML = '<span class="material-icons">upload</span> GeoJSON';
    urlRow.appendChild(uploadBtn);

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.className = 'mp-layer-upload-input';
    uploadInput.accept = '.geojson,.json';
    uploadInput.style.display = 'none';
    urlRow.appendChild(uploadInput);

    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', function () {
      uploadGeoJSON(this, uploadBtn, select);
    });
    select.addEventListener('change', function () { this.dataset.current = this.value; });

    wrap.appendChild(urlRow);

    // Стилевой блок
    wrap.appendChild(buildStyleBlock(layer));

    // Первичная загрузка файлов
    if (layer.url) refreshFiles(select, layer);

    return wrap;
  }

  function buildStyleBlock(layer) {
    const style = layer.style || {};

    const block = document.createElement('div');
    block.style.cssText = 'background:#0d0d0d; border:1px solid #1a1a1a; padding:10px; margin-bottom:8px;';

    // Пресет
    const presetRow = document.createElement('div');
    presetRow.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;';

    const presetLabel = document.createElement('label');
    presetLabel.style.cssText = 'font-size:13px; color:#888; min-width:110px;';
    presetLabel.textContent = 'Пресет:';
    presetRow.appendChild(presetLabel);

    const presetSelect = document.createElement('select');
    presetSelect.className = 'mp-layer-preset';
    presetSelect.style.cssText = 'flex:1; min-width:200px; padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';

    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— выбери пресет —';
    presetSelect.appendChild(emptyOpt);

    Object.keys(STYLE_PRESETS).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = STYLE_PRESETS[key].name;
      presetSelect.appendChild(opt);
    });
    presetRow.appendChild(presetSelect);
    block.appendChild(presetRow);

    // 4 поля
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:8px; margin-bottom:8px;';

    const colorInput = makeColorField('Цвет линии', 'mp-layer-color', style.color || '#ff6600');
    const weightInput = makeNumberField('Толщина', 'mp-layer-weight', style.weight || 2, 1, 20, '1');
    const fillColorInput = makeColorField('Цвет заливки', 'mp-layer-fillcolor', style.fillColor || '#ff6600');
    const fillOpacityInput = makeNumberField('Прозр. заливки', 'mp-layer-fillopacity', style.fillOpacity || 0, 0, 1, '0.05');

    grid.appendChild(colorInput.group);
    grid.appendChild(weightInput.group);
    grid.appendChild(fillColorInput.group);
    grid.appendChild(fillOpacityInput.group);
    block.appendChild(grid);

    // Details с JSON
    const details = document.createElement('details');
    details.style.marginTop = '6px';

    const summary = document.createElement('summary');
    summary.style.cssText = 'cursor:pointer; color:#888; font-size:13px;';
    summary.textContent = 'Доп. JSON';
    details.appendChild(summary);

    const textarea = document.createElement('textarea');
    textarea.className = 'mp-layer-style';
    textarea.style.cssText = 'width:100%; min-height:120px; margin-top:6px; padding:10px; background:#111; border:1px solid #2a2a2a; color:#33ff33; border-radius:4px; font-family:monospace; font-size:13px;';
    textarea.value = JSON.stringify(style, null, 2);
    details.appendChild(textarea);
    block.appendChild(details);

    // Синхронизация: preset → поля
    presetSelect.addEventListener('change', function () {
      const preset = STYLE_PRESETS[this.value];
      if (!preset) return;

      const s = preset.style;
      if (s.color) colorInput.input.value = s.color;
      if (s.weight) weightInput.input.value = s.weight;
      if (s.fillColor) fillColorInput.input.value = s.fillColor;
      if (s.fillOpacity !== undefined) fillOpacityInput.input.value = s.fillOpacity;

      textarea.value = JSON.stringify(s, null, 2);
    });

    // Синхронизация: поля → JSON
    [colorInput.input, weightInput.input, fillColorInput.input, fillOpacityInput.input].forEach(el => {
      el.addEventListener('input', () => {
        const s = {};
        if (colorInput.input.value) s.color = colorInput.input.value;
        const w = parseInt(weightInput.input.value, 10);
        if (!isNaN(w)) s.weight = w;
        if (fillColorInput.input.value) s.fillColor = fillColorInput.input.value;
        const fo = parseFloat(fillOpacityInput.input.value);
        if (!isNaN(fo)) s.fillOpacity = fo;
        textarea.value = JSON.stringify(s, null, 2);
      });
    });

    return block;
  }

  async function refreshFiles(select, layer) {
    select.innerHTML = '';

    const loading = document.createElement('option');
    loading.value = '';
    loading.textContent = '— загрузка... —';
    select.appendChild(loading);

    try {
      const data = await api('/api/geojson_files.php');
      const folders = data.folders || [];
      const current = select.dataset.current || (layer && layer.url) || '';

      select.innerHTML = '';

      if (!folders.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— файлов нет —';
        select.appendChild(opt);
      } else {
        folders.forEach(folder => {
          const group = document.createElement('optgroup');
          group.label = folder.folder;

          folder.files.forEach(file => {
            const opt = document.createElement('option');
            opt.value = file.path;
            opt.textContent = file.name;
            if (file.path === current) opt.selected = true;
            group.appendChild(opt);
          });

          select.appendChild(group);
        });
      }

      if (current && !select.value) {
        const opt = document.createElement('option');
        opt.value = current;
        opt.textContent = current + ' (нет в списке)';
        opt.selected = true;
        select.insertBefore(opt, select.firstChild);
      }

      select.dataset.current = current;
    } catch (_) {
      select.innerHTML = '<option value="">— ошибка —</option>';
    }
  }

  async function uploadGeoJSON(input, button, select) {
    const file = input.files[0];
    if (!file) return;

    const folder = getValue('mp-slug').trim() || 'common';

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span class="material-icons">hourglass_empty</span>...';

    const fd = new FormData();
    fd.append('folder', folder);
    fd.append('file', file);

    try {
      const data = await apiForm('/api/geojson_upload.php', fd);
      select.dataset.current = data.path;
      await refreshFiles(select, { url: data.path });
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      input.value = '';
    }
  }

  function collect() {
    const layers = [];

    qsa('#mp-layer-list > div').forEach(node => {
      const id = (node.querySelector('.mp-layer-id')?.value || '').trim();
      const name = (node.querySelector('.mp-layer-name')?.value || '').trim();
      const url = (node.querySelector('.mp-layer-url-select')?.value || '').trim();

      let style = {};
      const rawStyle = (node.querySelector('.mp-layer-style')?.value || '').trim();
      if (rawStyle) {
        try { style = JSON.parse(rawStyle); } catch (_) { style = {}; }
      }

      if (!Object.keys(style).length) {
        const c = (node.querySelector('.mp-layer-color')?.value || '').trim();
        const w = parseInt(node.querySelector('.mp-layer-weight')?.value, 10);
        const fc = (node.querySelector('.mp-layer-fillcolor')?.value || '').trim();
        const fo = parseFloat(node.querySelector('.mp-layer-fillopacity')?.value);
        if (c) style.color = c;
        if (!isNaN(w)) style.weight = w;
        if (fc) style.fillColor = fc;
        if (!isNaN(fo)) style.fillOpacity = fo;
      }

      if (id || name || url) {
        layers.push({ id, name, url, visible: true, style });
      }
    });

    return {
      id: currentMap ? currentMap.id : 0,
      slug: getValue('mp-slug').trim(),
      name: getValue('mp-name').trim(),
      center: [
        parseFloat(getValue('mp-lat')) || 0,
        parseFloat(getValue('mp-lng')) || 0
      ],
      zoom: parseInt(getValue('mp-zoom'), 10) || 14,
      layers
    };
  }

  async function save() {
    const data = collect();
    if (!data.name) {
      Modal.alert({ title: 'Название обязательно', danger: true });
      return;
    }

    try {
      const result = await api('/api/maps.php?action=save', 'POST', data);
      await load();
      if (result.id) {
        setValue('map-select', result.id);
        qs('#map-select').dispatchEvent(new Event('change'));
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteCurrent() {
    if (!currentMap) return;

    const confirmed = await confirmDanger('Удалить полигон «' + currentMap.name + '»?', null);
    if (!confirmed) return;

    try {
      await api('/api/maps.php?action=delete', 'POST', { id: currentMap.id });
      currentMap = null;
      hide('map-editor');
      hide('map-delete-btn');
      setValue('map-select', '');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Хелперы полей ----------

  function makeInput(className, value, placeholder, style) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.value = value || '';
    input.placeholder = placeholder;
    input.style.cssText = style + ' padding:6px 10px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    return input;
  }

  function makeColorField(label, className, value) {
    const group = document.createElement('div');

    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:12px; color:#888;';
    lbl.textContent = label;
    group.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'color';
    input.className = className;
    input.value = value;
    input.style.cssText = 'width:100%; height:32px; background:#111; border:1px solid #2a2a2a; border-radius:4px; cursor:pointer;';
    group.appendChild(input);

    return { group, input };
  }

  function makeNumberField(label, className, value, min, max, step) {
    const group = document.createElement('div');

    const lbl = document.createElement('label');
    lbl.style.cssText = 'font-size:12px; color:#888;';
    lbl.textContent = label;
    group.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'number';
    input.className = className;
    input.value = value;
    input.min = min;
    input.max = max;
    input.step = step;
    input.style.cssText = 'width:100%; padding:6px 8px; background:#111; border:1px solid #2a2a2a; color:#fff; border-radius:4px;';
    group.appendChild(input);

    return { group, input };
  }

  window.AdminMaps = { load };
})();