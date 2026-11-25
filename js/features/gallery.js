import { Utils } from '../core/utils.js';

const CACHE_TTL = 60 * 1000;
let loadedAt = 0;
let inFlight = null;
let albumsCache = [];
let currentAlbumTitle = '';
let currentPhotos = [];
let currentPhotoIndex = -1;

async function load(options = {}) {
  const root = document.getElementById('gallery-root');
  if (!root) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
  if (inFlight) return inFlight;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  inFlight = (async () => {
    try {
      const [albumsData, noAlbumData] = await Promise.all([
        Utils.apiRequest('/api/albums.php', 'GET'),
        Utils.apiRequest('/api/photos.php?album_id=null', 'GET')
      ]);

      albumsCache = albumsData.albums || [];
      const noAlbum = noAlbumData.photos || [];

      renderAlbums(root, albumsCache, noAlbum);
      loadedAt = Date.now();
    } catch (error) {
      console.error('[Gallery.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось загрузить галерею'));
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function renderAlbums(root, albums, noAlbum) {
  currentAlbumTitle = '';
  root.innerHTML = '';

  if (!albums.length && !noAlbum.length) {
    root.appendChild(Utils.emptyState('photo_library', 'Фотографий пока нет', 'Галерея ещё не заполнена'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-albums';

  albums.forEach(album => {
    grid.appendChild(renderAlbumCard(album.id, album.title, album.description, album.cover_photo, album.photo_count));
  });

  if (noAlbum.length) {
    grid.appendChild(renderAlbumCard('no_album', 'Разное', '', noAlbum[0].image, noAlbum.length));
  }

  root.appendChild(grid);
}

function renderAlbumCard(id, title, description, cover, count) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'album-card';

  const coverBox = document.createElement('div');
  coverBox.className = 'album-cover';

  if (cover) {
    const imgWrap = Utils.img(normalizePath(cover), {
      alt: title,
      wrapClass: 'album-cover-img',
      onError: wrap => {
        wrap.remove();
        coverBox.innerHTML = '<span class="material-icons">photo_library</span>';
      }
    });
    coverBox.appendChild(imgWrap);
  } else {
    coverBox.innerHTML = '<span class="material-icons">photo_library</span>';
  }

  const badge = document.createElement('div');
  badge.className = 'album-count';
  badge.textContent = count + ' фото';
  coverBox.appendChild(badge);
  card.appendChild(coverBox);

  const body = document.createElement('div');
  body.className = 'album-body';

  const titleEl = document.createElement('h3');
  titleEl.className = 'album-title';
  titleEl.textContent = title;
  body.appendChild(titleEl);

  if (description) {
    const desc = document.createElement('p');
    desc.className = 'album-desc';
    desc.textContent = description;
    body.appendChild(desc);
  }

  card.appendChild(body);
  card.addEventListener('click', () => openAlbum(id, title));
  return card;
}

async function openAlbum(albumId, title) {
  const root = document.getElementById('gallery-root');
  if (!root) return;

  currentAlbumTitle = title;
  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  try {
    const url = albumId === 'no_album' ? '/api/photos.php?album_id=null' : '/api/photos.php?album_id=' + encodeURIComponent(albumId);
    const data = await Utils.apiRequest(url, 'GET');
    const photos = data.photos || [];
    currentPhotos = photos;
    renderPhotos(root, photos);
  } catch (error) {
    console.error('[Gallery.openAlbum]', error);
    root.innerHTML = '';
    root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось загрузить фото'));
  }
}

function renderPhotos(root, photos) {
  root.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'gallery-bar';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'btn btn-secondary btn-sm';
  back.innerHTML = '<span class="material-icons">arrow_back</span> К альбомам';
  back.addEventListener('click', goBackToAlbums);
  bar.appendChild(back);

  const title = document.createElement('div');
  title.className = 'gallery-bar-title';
  title.textContent = currentAlbumTitle + ' · ' + photos.length + ' фото';
  bar.appendChild(title);

  root.appendChild(bar);

  if (!photos.length) {
    root.appendChild(Utils.emptyState('image', 'В альбоме пусто', 'Фотографии в этот альбом ещё не загружены'));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'gallery-photos';

  photos.forEach((photo, index) => grid.appendChild(renderPhotoTile(photo, index)));
  root.appendChild(grid);
}

function renderPhotoTile(photo, index) {
  const card = document.createElement('div');
  card.className = 'photo-tile';

  const imgWrap = Utils.img(normalizePath(photo.image), {
    alt: photo.title || 'Фото',
    wrapClass: 'photo-tile-img',
    onError: wrap => {
      wrap.remove();
      card.innerHTML = '<span class="material-icons">broken_image</span>';
    }
  });
  card.appendChild(imgWrap);

  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';

  const title = document.createElement('div');
  title.className = 'photo-overlay-title';
  title.textContent = photo.title || 'Без названия';
  overlay.appendChild(title);

  if (photo.date) {
    const date = document.createElement('div');
    date.className = 'photo-overlay-date';
    date.textContent = photo.date;
    overlay.appendChild(date);
  }

  card.appendChild(overlay);
  card.addEventListener('click', () => openLightbox(index));
  return card;
}

async function goBackToAlbums() {
  const root = document.getElementById('gallery-root');
  if (!root) return;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  try {
    const data = await Utils.apiRequest('/api/photos.php?album_id=null', 'GET');
    renderAlbums(root, albumsCache, data.photos || []);
  } catch (_) {
    renderAlbums(root, albumsCache, []);
  }
}

function normalizePath(path) {
  if (!path) return '';
  const s = String(path).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : '/' + s;
}

function openLightbox(index) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox || !currentPhotos.length) return;

  if (index < 0) index = currentPhotos.length - 1;
  if (index >= currentPhotos.length) index = 0;

  currentPhotoIndex = index;
  const photo = currentPhotos[index];

  const img = lightbox.querySelector('.lightbox-img');
  const caption = lightbox.querySelector('.lightbox-caption');

  img.src = normalizePath(photo.image);
  img.alt = photo.title || 'Фото';
  caption.textContent = photo.title || '';

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  updateLightboxArrows();
}

function updateLightboxArrows() {
  const prev = document.getElementById('lightbox-prev');
  const next = document.getElementById('lightbox-next');
  if (!prev || !next) return;

  if (currentPhotos.length <= 1) {
    prev.style.display = 'none';
    next.style.display = 'none';
  } else {
    prev.style.display = 'flex';
    next.style.display = 'flex';
  }
}

function prevPhoto() {
  if (!currentPhotos.length) return;
  openLightbox(currentPhotoIndex - 1);
}

function nextPhoto() {
  if (!currentPhotos.length) return;
  openLightbox(currentPhotoIndex + 1);
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    prevPhoto();
  });
  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    nextPhoto();
  });

  lightbox.onclick = function(event) {
    const target = event.target;
    
    if (target.closest('.lightbox-close')) {
      event.preventDefault();
      event.stopPropagation();
      closeLightbox();
      return;
    }

    if (target.closest('.lightbox-arrow')) return;
    
    if (target === lightbox || target.classList.contains('lightbox-img')) {
      closeLightbox();
    }
  };

  document.addEventListener('keydown', event => {
    if (!lightbox.classList.contains('active')) return;

    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      prevPhoto();
    } else if (event.key === 'ArrowRight') {
      nextPhoto();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLightbox);
} else {
  initLightbox();
}

export const Gallery = { load, closeLightbox };