(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/photos] shared.js must load first');

  const { api, apiForm, confirmDanger, qs, setValue, getValue, show, hide, esc } = AdminShared;

  let photoCache = [];
  let albumCache = [];
  let albumsAllCollapsed = false;
  let bound = false;

  async function load() {
    if (!bound) {
      bind();
      bound = true;
    }

    try {
      const [photosData, albumsData] = await Promise.all([
        api('/api/photos.php'),
        api('/api/albums.php')
      ]);
      photoCache = photosData.photos || [];
      albumCache = albumsData.albums || [];
      render();
    } catch (error) {
      console.error('[AdminPhotos.load]', error);
      Modal.alert({ title: 'Ошибка загрузки галереи', message: error.message, danger: true });
    }
  }

  // ---------- Привязки ----------

  function bind() {
    qs('#photo-new-album-btn').addEventListener('click', () => openAlbumEditor(null));
    qs('#photo-collapse-all').addEventListener('click', toggleCollapseAll);
    qs('#album-cancel').addEventListener('click', () => hide('album-editor'));
    qs('#album-save').addEventListener('click', saveAlbum);
  }

  function toggleCollapseAll() {
    albumsAllCollapsed = !albumsAllCollapsed;

    document.querySelectorAll('.admin-album-body').forEach(box => {
      box.style.display = albumsAllCollapsed ? 'none' : '';
    });
    document.querySelectorAll('.admin-album-arrow').forEach(arrow => {
      arrow.style.transform = albumsAllCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    });

    const btn = qs('#photo-collapse-all');
    btn.innerHTML = albumsAllCollapsed
      ? '<span class="material-icons">unfold_more</span> Развернуть всё'
      : '<span class="material-icons">unfold_less</span> Свернуть всё';
  }

  // ---------- Рендер ----------

  function render() {
    const container = qs('#photo-list');
    container.innerHTML = '';

    if (!albumCache.length && !photoCache.length) {
      container.innerHTML = '<p class="text-muted">Пока ничего нет. Создайте альбом или загрузите фото.</p>';
      return;
    }

    albumCache.forEach(album => {
      const photos = photoCache.filter(p => p.album_id === album.id);
      container.appendChild(renderAlbumBlock(album, photos));
    });

    const noAlbum = photoCache.filter(p => !p.album_id);
    if (noAlbum.length) {
      container.appendChild(renderNoAlbumBlock(noAlbum));
    }
  }

  function renderAlbumBlock(album, photos) {
    const block = document.createElement('div');
    block.className = 'admin-album';

    const head = buildAlbumHead({
      title: album.title,
      count: photos.length,
      onEdit: () => openAlbumEditor(album),
      onDelete: () => deleteAlbum(album.id),
      onAddPhoto: body => openPhotoUploadForm(album.id, body),
      onReorder: direction => reorderAlbum(album.id, direction)
    });

    const body = buildAlbumBody(photos, album.id);
    bindAlbumToggle(head, body);

    block.appendChild(head);
    block.appendChild(body);
    return block;
  }

  function renderNoAlbumBlock(photos) {
    const block = document.createElement('div');
    block.className = 'admin-album';

    const head = buildAlbumHead({
      title: 'Разное',
      count: photos.length,
      onAddPhoto: body => openPhotoUploadForm(null, body),
      noActions: true
    });

    const body = buildAlbumBody(photos, null);
    bindAlbumToggle(head, body);

    block.appendChild(head);
    block.appendChild(body);
    return block;
  }

  function buildAlbumHead({ title, count, onEdit, onDelete, onAddPhoto, onReorder, noActions }) {
    const head = document.createElement('div');
    head.className = 'admin-album-head';

    const left = document.createElement('div');
    left.className = 'admin-album-left';

    const arrow = document.createElement('span');
    arrow.className = 'admin-album-arrow';
    arrow.textContent = '▼';
    left.appendChild(arrow);

    const titleEl = document.createElement('strong');
    titleEl.className = 'admin-album-title';
    titleEl.textContent = title;
    left.appendChild(titleEl);

    const countEl = document.createElement('span');
    countEl.className = 'admin-album-count';
    countEl.textContent = '(' + count + ' фото)';
    left.appendChild(countEl);

    head.appendChild(left);

    const actions = document.createElement('div');
    actions.className = 'admin-album-actions';

    if (!noActions && onReorder) {
      actions.appendChild(makeIconButton('arrow_upward', 'Выше', () => onReorder('up')));
      actions.appendChild(makeIconButton('arrow_downward', 'Ниже', () => onReorder('down')));
    }

    if (!noActions && onEdit) {
      actions.appendChild(makeIconButton('edit', 'Редактировать альбом', onEdit));
    }

    if (!noActions && onDelete) {
      actions.appendChild(makeIconButton('delete', 'Удалить альбом', onDelete, 'btn-danger'));
    }

    if (onAddPhoto) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn-sm';
      addBtn.style.background = '#33cc33';
      addBtn.style.color = '#0a0a0a';
      addBtn.textContent = '+ Фото';
      addBtn.title = 'Добавить фото';
      addBtn.addEventListener('click', event => {
        event.stopPropagation();
        onAddPhoto(head.parentElement.querySelector('.admin-album-body'));
      });
      actions.appendChild(addBtn);
    }

    head.appendChild(actions);
    return head;
  }

  function makeIconButton(icon, title, onClick, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm ' + (extraClass || '');
    btn.title = title;
    btn.innerHTML = '<span class="material-icons">' + icon + '</span>';
    btn.addEventListener('click', event => {
      event.stopPropagation();
      onClick();
    });
    return btn;
  }

  function buildAlbumBody(photos, albumId) {
    const body = document.createElement('div');
    body.className = 'admin-album-body';

    if (!photos.length) {
      body.innerHTML = '<p class="text-muted" style="font-size:13px;">В альбоме нет фото. Привяжите через форму ниже.</p>';
      return body;
    }

    const grid = document.createElement('div');
    grid.className = 'admin-photo-grid';

    photos.forEach(photo => {
      grid.appendChild(renderPhotoCard(photo, albumId));
    });

    body.appendChild(grid);
    return body;
  }

  function bindAlbumToggle(head, body) {
    const arrow = head.querySelector('.admin-album-arrow');
    head.addEventListener('click', () => {
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      arrow.style.transform = hidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
  }

  function renderPhotoCard(photo, albumId) {
    const card = document.createElement('div');
    card.className = 'admin-photo-card';

    const img = document.createElement('img');
    img.src = '/' + photo.image;
    img.onerror = function () { this.style.opacity = '0.3'; };
    img.addEventListener('click', () => openLightbox(this.src));
    card.appendChild(img);

    const title = document.createElement('div');
    title.className = 'photo-title';
    title.textContent = photo.title || 'Без названия';
    card.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'photo-actions';

    actions.appendChild(makeIconButton('arrow_upward', 'Выше', () => reorderPhoto(photo.id, 'up')));
    actions.appendChild(makeIconButton('arrow_downward', 'Ниже', () => reorderPhoto(photo.id, 'down')));
    actions.appendChild(makeIconButton('drive_file_move', 'Переместить', () => openMovePhotoDialog(photo)));
    actions.appendChild(makeIconButton('delete', 'Удалить', () => deletePhoto(photo.id), 'btn-danger'));

    card.appendChild(actions);
    return card;
  }

  // ---------- Альбом: сохранение, удаление, сортировка ----------

  function openAlbumEditor(album) {
    const isNew = !album;

    setValue('album-id', isNew ? '' : album.id);
    setValue('album-title', isNew ? '' : (album.title || ''));
    setValue('album-slug', isNew ? '' : (album.slug || ''));
    setValue('album-desc', isNew ? '' : (album.description || ''));
    setValue('album-cover', '');

    setText('album-editor-title', isNew ? 'Новый альбом' : 'Редактировать альбом');

    const coverBox = qs('#album-cover-current');
    coverBox.innerHTML = '';
    if (!isNew && album.cover_photo) {
      const img = document.createElement('img');
      img.src = '/' + album.cover_photo;
      img.style.cssText = 'max-width:120px; border:1px solid #2a2a2a;';
      coverBox.appendChild(img);
    }

    show('album-editor');
    qs('#album-editor').scrollIntoView({ behavior: 'smooth' });
  }

  async function saveAlbum() {
    const id = getValue('album-id');
    const title = getValue('album-title').trim();
    if (!title) {
      Modal.alert({ title: 'Название обязательно', danger: true });
      return;
    }

    const fd = new FormData();
    if (id) fd.append('id', id);
    fd.append('title', title);
    fd.append('slug', getValue('album-slug').trim());
    fd.append('description', getValue('album-desc').trim());

    const fileInput = qs('#album-cover');
    if (fileInput.files.length) fd.append('cover', fileInput.files[0]);

    try {
      await apiForm('/api/albums.php?action=save', fd);
      hide('album-editor');
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteAlbum(id) {
    const confirmed = await confirmDanger(
      'Удалить альбом?',
      'Фото останутся в «Разном».'
    );
    if (!confirmed) return;

    try {
      await api('/api/albums.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function reorderAlbum(id, direction) {
    try {
      const data = await api('/api/albums.php?action=reorder', 'POST', { id, direction });
      if (data && data.moved) load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Фото: загрузка, удаление, сортировка, перемещение ----------

  function openPhotoUploadForm(albumId, container) {
    let box = container.querySelector('.photo-forms-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'photo-forms-box';
      box.style.cssText = 'margin-bottom:12px;';
      box.dataset.albumId = albumId === null ? '' : albumId;
      container.insertBefore(box, container.firstChild);
    }

    const form = buildUploadForm();
    box.appendChild(form);

    form.querySelector('.pu-remove').addEventListener('click', () => {
      form.remove();
      if (!box.querySelectorAll('.photo-upload-form').length) {
        box.remove();
        const bar = container.querySelector('.photo-upload-all-bar');
        if (bar) bar.remove();
      } else {
        updateUploadAllBar(container);
      }
    });

    form.querySelector('.pu-title').focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    updateUploadAllBar(container);
  }

  function buildUploadForm() {
    const form = document.createElement('div');
    form.className = 'photo-upload-form';
    form.style.cssText = 'background:#0d0d0d; border:1px solid #ff6600; padding:12px; margin-bottom:8px;';
    form.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
        '<strong style="color:#ff6600; font-size:13px;">Новое фото</strong>' +
        '<button type="button" class="btn btn-danger pu-remove btn-sm">×</button>' +
      '</div>' +
      '<div class="form-group"><label>Название <span style="color:#ff3333;">*</span></label><input type="text" class="pu-title"></div>' +
      '<div class="form-group"><label>Описание</label><textarea class="pu-desc"></textarea></div>' +
      '<div class="form-group"><label>Дата</label><input type="date" class="pu-date"></div>' +
      '<div class="form-group"><label>Файл <span style="color:#ff3333;">*</span></label><input type="file" class="pu-file" accept="image/*"></div>';
    return form;
  }

  function updateUploadAllBar(container) {
    const box = container.querySelector('.photo-forms-box');
    if (!box) return;

    const forms = box.querySelectorAll('.photo-upload-form');
    let bar = box.querySelector('.photo-upload-all-bar');

    if (!forms.length) {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'photo-upload-all-bar';
      bar.style.cssText = 'display:flex; gap:8px; align-items:center; padding:8px 12px; background:#1a1a1a; border:1px solid #33cc33; margin-bottom:8px; border-radius:4px; flex-wrap:wrap;';
      bar.innerHTML =
        '<span style="color:#fff; font-size:13px;" class="pu-count"></span>' +
        '<button type="button" class="btn pu-upload-all btn-sm" style="background:#33cc33; color:#0a0a0a;">Загрузить все</button>' +
        '<button type="button" class="btn pu-clear-all btn-sm btn-secondary">Очистить</button>' +
        '<span class="pu-status" style="color:#888; font-size:13px;"></span>';
      box.insertBefore(bar, box.firstChild);

      bar.querySelector('.pu-upload-all').addEventListener('click', () => uploadAllPhotos(container));
      bar.querySelector('.pu-clear-all').addEventListener('click', () => {
        box.remove();
        const b = container.querySelector('.photo-upload-all-bar');
        if (b) b.remove();
      });
    }

    bar.querySelector('.pu-count').textContent = 'Готово к загрузке: ' + forms.length;
  }

  async function uploadAllPhotos(container) {
    const box = container.querySelector('.photo-forms-box');
    if (!box) return;

    const albumIdRaw = box.dataset.albumId;
    const albumId = albumIdRaw === '' ? null : parseInt(albumIdRaw, 10);

    const forms = Array.from(box.querySelectorAll('.photo-upload-form'));
    if (!forms.length) return;

    const bar = box.querySelector('.photo-upload-all-bar');
    const status = bar.querySelector('.pu-status');
    const uploadBtn = bar.querySelector('.pu-upload-all');
    const clearBtn = bar.querySelector('.pu-clear-all');

    for (const form of forms) {
      if (!form.querySelector('.pu-title').value.trim()) {
        Modal.alert({ title: 'Укажите название для всех фото', danger: true });
        form.querySelector('.pu-title').focus();
        return;
      }
      if (!form.querySelector('.pu-file').files[0]) {
        Modal.alert({ title: 'Выберите файл для всех фото', danger: true });
        form.querySelector('.pu-file').focus();
        return;
      }
    }

    uploadBtn.disabled = true;
    clearBtn.disabled = true;

    const total = forms.length;
    let done = 0;

    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      status.textContent = 'Загрузка ' + (i + 1) + ' из ' + total + '...';

      const fd = new FormData();
      fd.append('title', form.querySelector('.pu-title').value.trim());
      fd.append('description', form.querySelector('.pu-desc').value.trim());
      fd.append('date', form.querySelector('.pu-date').value);
      fd.append('album_id', albumId === null ? '' : albumId);
      fd.append('photo', form.querySelector('.pu-file').files[0]);

      try {
        await apiForm('/api/photos.php?action=upload', fd);
        done++;
        form.remove();
      } catch (error) {
        status.textContent = 'Ошибка в файле ' + (i + 1) + ': ' + error.message;
        uploadBtn.disabled = false;
        clearBtn.disabled = false;
        return;
      }
    }

    uploadBtn.disabled = false;
    clearBtn.disabled = false;
    status.textContent = 'Готово: ' + done;

    if (!box.querySelectorAll('.photo-upload-form').length) box.remove();
    load();
  }

  async function deletePhoto(id) {
    const confirmed = await confirmDanger('Удалить фото?', null);
    if (!confirmed) return;

    try {
      await api('/api/photos.php?action=delete', 'POST', { id });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function reorderPhoto(id, direction) {
    try {
      const data = await api('/api/photos.php?action=reorder', 'POST', { id, direction });
      if (data && data.moved) load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function openMovePhotoDialog(photo) {
    const options = ['Разное (без альбома)'].concat(albumCache.map(a => a.title));
    const choice = await Modal.prompt({
      title: 'Куда переместить фото «' + (photo.title || 'Без названия') + '»?',
      message: options.map((t, i) => (i + 1) + '. ' + t).join('\n') +
               '\n\nВведите номер (1-' + options.length + '):',
      value: '',
      required: true
    });
    if (choice === null) return;

    const num = parseInt(choice, 10);
    if (isNaN(num) || num < 1 || num > options.length) {
      Modal.alert({ title: 'Неверный номер', danger: true });
      return;
    }

    const newAlbumId = num === 1 ? null : albumCache[num - 2].id;

    try {
      await api('/api/albums.php?action=attach', 'POST', {
        photo_id: photo.id,
        album_id: newAlbumId
      });
      load();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Lightbox ----------

  function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    if (!lb) {
      // создадим на лету, если в админке его нет
      const created = document.createElement('div');
      created.id = 'lightbox';
      created.className = 'lightbox';
      created.innerHTML =
        '<button type="button" class="lightbox-close"><span class="material-icons">close</span></button>' +
        '<img class="lightbox-img" src="" alt="">' +
        '<div class="lightbox-caption"></div>';
      document.body.appendChild(created);

      created.addEventListener('click', event => {
        if (event.target === created ||
            event.target.classList.contains('lightbox-close') ||
            event.target.classList.contains('lightbox-img')) {
          closeLightbox();
        }
      });
    }

    const lbEl = document.getElementById('lightbox');
    lbEl.querySelector('.lightbox-img').src = src;
    lbEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  window.AdminPhotos = { load };
})();