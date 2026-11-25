import { Utils } from '../core/utils.js';

const CACHE_TTL = 60 * 1000;
let loadedAt = 0;
let inFlight = null;

async function load(options = {}) {
  const root = document.getElementById('devices-root');
  if (!root) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
  if (inFlight) return inFlight;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  inFlight = (async () => {
    try {
      const data = await Utils.apiRequest('/api/devices.php', 'GET');
      const list = data.devices || [];

      root.innerHTML = '';

      if (!list.length) {
        root.appendChild(Utils.emptyState('build', 'Устройств пока нет', 'Инженерные девайсы ещё не добавлены'));
      } else {
        const grid = document.createElement('div');
        grid.className = 'dv-list';
        list.forEach(device => grid.appendChild(renderCard(device)));
        root.appendChild(grid);
      }
      loadedAt = Date.now();
    } catch (error) {
      console.error('[Devices.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось получить список устройств'));
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function normalizePath(path) {
  if (!path) return '';
  const s = String(path).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return s.startsWith('/') ? s : '/' + s;
}

function renderCard(device) {
  const card = document.createElement('article');
  card.className = 'dv-card';

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'dv-head';

  const title = document.createElement('h3');
  title.className = 'dv-title';
  title.textContent = device.name || 'Без названия';
  head.appendChild(title);

  const arrow = document.createElement('span');
  arrow.className = 'material-icons dv-arrow';
  arrow.textContent = 'expand_more';
  head.appendChild(arrow);

  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'dv-body';

  const inner = document.createElement('div');
  inner.className = 'dv-body-inner';

  if (device.photo) {
    const fig = document.createElement('figure');
    fig.className = 'dv-photo';
    const imgWrap = Utils.img(normalizePath(device.photo), {
      alt: device.name || '',
      onError: () => fig.remove()
    });
    fig.appendChild(imgWrap);
    inner.appendChild(fig);
  }

  if (device.description) {
    const desc = document.createElement('p');
    desc.className = 'dv-desc';
    desc.textContent = device.description;
    inner.appendChild(desc);
  }

  if (device.video_link) {
    const wrap = document.createElement('div');
    wrap.className = 'dv-video';
    const iframe = document.createElement('iframe');
    iframe.src = device.video_link;
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    iframe.frameBorder = '0';
    wrap.appendChild(iframe);
    inner.appendChild(wrap);
  }

  const links = collectLinks(device);
  if (links.length) {
    inner.appendChild(renderLinks(links));
  }

  body.appendChild(inner);
  card.appendChild(body);

  head.addEventListener('click', () => {
    const isOpen = card.classList.toggle('open');
    arrow.textContent = isOpen ? 'expand_less' : 'expand_more';
  });

  return card;
}

function collectLinks(device) {
  const links = [];
  if (device.schematic_link) {
    links.push({ label: 'Схема', href: normalizePath(device.schematic_link), icon: 'schema' });
  }
  if (device.docs_link) {
    links.push({ label: 'Документация', href: normalizePath(device.docs_link), icon: 'menu_book' });
  }
  if (Array.isArray(device.files)) {
    device.files.forEach(file => {
      if (file && file.link) {
        links.push({
          label: file.name || 'Файл',
          href: normalizePath(file.link),
          icon: 'description'
        });
      }
    });
  }
  return links;
}

function renderLinks(links) {
  const section = document.createElement('div');
  section.className = 'dv-section';

  const title = document.createElement('div');
  title.className = 'dv-section-title';
  title.innerHTML = '<span class="material-icons">attachment</span> Материалы';
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'dv-links';

  links.forEach(link => {
    const a = document.createElement('a');
    a.className = 'btn btn-secondary btn-sm';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = link.icon;
    a.appendChild(icon);

    a.appendChild(document.createTextNode(link.label));
    list.appendChild(a);
  });

  section.appendChild(list);
  return section;
}

export const Devices = { load };