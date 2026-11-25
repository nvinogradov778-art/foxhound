import { Utils } from '../core/utils.js';

const CACHE_TTL = 60 * 1000;
let loadedAt = 0;
let inFlight = null;

async function load(options = {}) {
  const root = document.getElementById('operators-root');
  if (!root) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
  if (inFlight) return inFlight;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  inFlight = (async () => {
    try {
      const data = await Utils.apiRequest('/api/operators.php', 'GET');
      const operators = data.operators || [];

      root.innerHTML = '';

      if (!operators.length) {
        root.appendChild(Utils.emptyState('groups', 'Состав пуст', 'Оперативники ещё не добавлены'));
      } else {
        const grid = document.createElement('div');
        grid.className = 'op-grid';
        operators.forEach(op => grid.appendChild(renderCard(op)));
        root.appendChild(grid);
      }
      loadedAt = Date.now();
    } catch (error) {
      console.error('[Operators.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось получить список оперативников'));
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function renderCard(op) {
  const card = document.createElement('article');
  card.className = 'op-card';

  const photo = document.createElement('div');
  photo.className = 'op-photo';

  if (op.photo) {
    const src = op.photo.startsWith('/') ? op.photo : '/' + op.photo;
    const imgWrap = Utils.img(src, {
      alt: op.name || 'Оператор',
      onError: wrap => {
        wrap.remove();
        photo.innerHTML = '<span class="material-icons">person</span>';
      }
    });
    photo.appendChild(imgWrap);
  } else {
    photo.innerHTML = '<span class="material-icons">person</span>';
  }
  card.appendChild(photo);

  const info = document.createElement('div');
  info.className = 'op-info';

  const name = document.createElement('h3');
  name.className = 'op-name';
  name.textContent = op.name || 'Без имени';
  info.appendChild(name);

  if (op.role) {
    const role = document.createElement('div');
    role.className = 'op-role';
    role.textContent = op.role;
    info.appendChild(role);
  }

  if (op.specialization) {
    const spec = document.createElement('div');
    spec.className = 'op-spec';
    spec.textContent = op.specialization;
    info.appendChild(spec);
  }

  if (op.description) {
    const desc = document.createElement('p');
    desc.className = 'op-desc';
    desc.textContent = op.description;
    info.appendChild(desc);
  }

  card.appendChild(info);
  return card;
}

export const Operators = { load };