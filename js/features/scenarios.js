import { Utils } from '../core/utils.js';

const CACHE_TTL = 60 * 1000;
let loadedAt = 0;
let inFlight = null;

async function load(options = {}) {
  const root = document.getElementById('scenarios-root');
  if (!root) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
  if (inFlight) return inFlight;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  inFlight = (async () => {
    try {
      const data = await Utils.apiRequest('/api/scenarios.php', 'GET');
      const list = data.scenarios || [];

      root.innerHTML = '';

      if (!list.length) {
        root.appendChild(Utils.emptyState('movie', 'Сценариев пока нет', 'Сценарии для игр ещё не добавлены'));
      } else {
        const container = document.createElement('div');
        container.className = 'sc-list';
        list.forEach(scenario => container.appendChild(renderCard(scenario)));
        root.appendChild(container);
      }
      loadedAt = Date.now();
    } catch (error) {
      console.error('[Scenarios.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось получить список сценариев'));
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function renderCard(scenario) {
  const card = document.createElement('article');
  card.className = 'sc-card';

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'sc-head';

  const headLeft = document.createElement('div');
  headLeft.className = 'sc-head-left';

  const title = document.createElement('h3');
  title.className = 'sc-title';
  title.textContent = scenario.title || 'Без названия';
  headLeft.appendChild(title);

  if (scenario.description) {
    const preview = document.createElement('div');
    preview.className = 'sc-preview';
    preview.textContent = scenario.description;
    headLeft.appendChild(preview);
  }

  head.appendChild(headLeft);

  const arrow = document.createElement('span');
  arrow.className = 'material-icons sc-arrow';
  arrow.textContent = 'expand_more';
  head.appendChild(arrow);

  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'sc-body';

  const inner = document.createElement('div');
  inner.className = 'sc-body-inner';

  if (scenario.description) {
    const full = document.createElement('p');
    full.className = 'sc-desc';
    full.textContent = scenario.description;
    inner.appendChild(full);
  }

  if (scenario.video_link) {
    inner.appendChild(renderVideo(scenario.video_link));
  }

  if (Array.isArray(scenario.phases) && scenario.phases.length) {
    inner.appendChild(renderPhases(scenario.phases));
  }

  if (Array.isArray(scenario.inventory) && scenario.inventory.length) {
    inner.appendChild(renderInventory(scenario.inventory));
  }

  if (Array.isArray(scenario.files) && scenario.files.length) {
    const filesBlock = renderFiles(scenario.files);
    if (filesBlock) inner.appendChild(filesBlock);
  }

  body.appendChild(inner);
  card.appendChild(body);

  head.addEventListener('click', () => {
    const isOpen = card.classList.toggle('open');
    arrow.textContent = isOpen ? 'expand_less' : 'expand_more';
  });

  return card;
}

function renderVideo(url) {
  const wrap = document.createElement('div');
  wrap.className = 'sc-video';
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.frameBorder = '0';
  wrap.appendChild(iframe);
  return wrap;
}

function renderPhases(phases) {
  const wrap = document.createElement('div');
  wrap.className = 'sc-section';

  const title = document.createElement('div');
  title.className = 'sc-section-title';
  title.innerHTML = '<span class="material-icons">layers</span> Фазы';
  wrap.appendChild(title);

  const list = document.createElement('div');
  list.className = 'sc-phases';

  phases.forEach((phase, index) => {
    list.appendChild(renderPhase(phase, index));
  });

  wrap.appendChild(list);
  return wrap;
}

function renderPhase(phase, index) {
  const item = document.createElement('div');
  item.className = 'sc-phase';

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'sc-phase-head';

  const num = document.createElement('span');
  num.className = 'sc-phase-num';
  num.textContent = String(index + 1).padStart(2, '0');
  head.appendChild(num);

  const name = document.createElement('span');
  name.className = 'sc-phase-name';
  name.textContent = phase.name || '—';
  head.appendChild(name);

  if (phase.time) {
    const time = document.createElement('span');
    time.className = 'sc-phase-time';
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'schedule';
    time.appendChild(icon);
    time.appendChild(document.createTextNode(phase.time));
    head.appendChild(time);
  }

  const arrow = document.createElement('span');
  arrow.className = 'material-icons sc-phase-arrow';
  arrow.textContent = 'expand_more';
  head.appendChild(arrow);

  item.appendChild(head);

  const body = document.createElement('div');
  body.className = 'sc-phase-body';

  const inner = document.createElement('div');
  inner.className = 'sc-phase-body-inner';

  if (phase.description) {
    const desc = document.createElement('div');
    desc.className = 'sc-phase-desc';
    desc.textContent = phase.description;
    inner.appendChild(desc);
  }

  if (phase.map_image) {
    let src = String(phase.map_image).trim();
    if (src && !/^https?:\/\//i.test(src) && !src.startsWith('/')) {
      src = '/' + src;
    }

    const figure = document.createElement('figure');
    figure.className = 'sc-phase-map-wrap';

    const imgWrap = Utils.img(src, {
      alt: phase.name || '',
      className: 'sc-phase-map',
      wrapClass: 'sc-phase-map-wrap-img',
      onError: () => figure.remove()
    });
    figure.appendChild(imgWrap);

    const caption = document.createElement('figcaption');
    caption.className = 'sc-phase-map-caption';
    caption.innerHTML = '<span class="material-icons">map</span> Карта фазы';
    figure.appendChild(caption);

    inner.appendChild(figure);
  }

  body.appendChild(inner);
  item.appendChild(body);

  head.addEventListener('click', () => {
    const isOpen = item.classList.toggle('open');
    arrow.textContent = isOpen ? 'expand_less' : 'expand_more';
  });

  return item;
}

function renderInventory(inventory) {
  const wrap = document.createElement('div');
  wrap.className = 'sc-section';

  const title = document.createElement('div');
  title.className = 'sc-section-title';
  title.innerHTML = '<span class="material-icons">inventory_2</span> Инвентарь';
  wrap.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'sc-inventory';

  inventory.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });

  wrap.appendChild(list);
  return wrap;
}

function renderFiles(files) {
  const valid = files.filter(file => file && file.link);
  if (!valid.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'sc-section';

  const title = document.createElement('div');
  title.className = 'sc-section-title';
  title.innerHTML = '<span class="material-icons">folder</span> Файлы';
  wrap.appendChild(title);

  const list = document.createElement('div');
  list.className = 'sc-files';

  valid.forEach(file => {
    const a = document.createElement('a');
    a.className = 'btn btn-secondary btn-sm';
    a.href = file.link;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'download';
    a.appendChild(icon);
    a.appendChild(document.createTextNode(file.name || 'Скачать'));
    list.appendChild(a);
  });

  wrap.appendChild(list);
  return wrap;
}

export const Scenarios = { load };