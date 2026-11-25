import { Utils } from '../core/utils.js';

const CACHE_TTL = 60 * 1000;
let loadedAt = 0;
let inFlight = null;

async function load(options = {}) {
  const root = document.getElementById('docs-root');
  if (!root) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
  if (inFlight) return inFlight;

  root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

  inFlight = (async () => {
    try {
      const data = await Utils.apiRequest('/api/docs.php', 'GET');
      const documents = data.documents || [];

      root.innerHTML = '';

      if (!documents.length) {
        root.appendChild(Utils.emptyState('article', 'Регламентов пока нет', 'Документы ещё не добавлены'));
      } else {
        const grid = document.createElement('div');
        grid.className = 'doc-grid';
        documents.forEach(doc => grid.appendChild(renderCard(doc)));
        root.appendChild(grid);
      }
      loadedAt = Date.now();
    } catch (error) {
      console.error('[Docs.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось получить регламенты'));
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function renderCard(doc) {
  const card = document.createElement('a');
  card.className = 'doc-card';
  card.href = doc.link || '#';
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  const icon = document.createElement('div');
  icon.className = 'doc-icon';
  icon.innerHTML = '<span class="material-icons">article</span>';
  card.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'doc-body';

  const title = document.createElement('h3');
  title.className = 'doc-title';
  title.textContent = doc.title || 'Без названия';
  body.appendChild(title);

  if (doc.doc_number || doc.doc_date) {
    const meta = document.createElement('div');
    meta.className = 'doc-meta';
    const parts = [];
    if (doc.doc_number) parts.push('№ ' + doc.doc_number);
    if (doc.doc_date) parts.push(doc.doc_date);
    meta.textContent = parts.join(' · ');
    body.appendChild(meta);
  }

  if (doc.description) {
    const desc = document.createElement('p');
    desc.className = 'doc-desc';
    desc.textContent = doc.description;
    body.appendChild(desc);
  }

  card.appendChild(body);
  return card;
}

export const Docs = { load };