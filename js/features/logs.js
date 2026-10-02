(function () {
  'use strict';
  if (!window.Utils) throw new Error('[logs] utils.js must load first');

  const CACHE_TTL = 60 * 1000;

  let loadedAt = 0;
  let inFlight = null;

  async function load(options = {}) {
    const root = document.getElementById('logs-root');
    if (!root) return;

    if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
    if (inFlight) return inFlight;

    root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

    inFlight = (async () => {
      try {
        const data = await Utils.apiRequest('/api/logs.php', 'GET');
        const logs = data.logs || [];

        root.innerHTML = '';

        if (!logs.length) {
          root.appendChild(Utils.emptyState(
            'history_edu',
            'Журнал пуст',
            'Записи о жизни команды ещё не добавлены'
          ));
        } else {
          const feed = document.createElement('div');
          feed.className = 'logs-feed';
          logs.forEach(entry => feed.appendChild(renderRow(entry)));
          root.appendChild(feed);
        }

        loadedAt = Date.now();
      } catch (error) {
        console.error('[Logs.load]', error);
        root.innerHTML = '';
        root.appendChild(Utils.emptyState(
          'error_outline',
          'Ошибка загрузки',
          'Не удалось получить журнал'
        ));
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  function renderRow(entry) {
    const row = document.createElement('article');
    row.className = 'log-entry';

    const dot = document.createElement('div');
    dot.className = 'log-dot';
    row.appendChild(dot);

    const body = document.createElement('div');
    body.className = 'log-body';

    if (entry.date) {
      const date = document.createElement('div');
      date.className = 'log-date';
      date.textContent = entry.date;
      body.appendChild(date);
    }

    const text = document.createElement('div');
    text.className = 'log-text';
    text.textContent = entry.text || '';

    if (entry.style) {
      try {
        text.style.cssText = entry.style;
      } catch (_) {}
    }

    body.appendChild(text);
    row.appendChild(body);
    return row;
  }

  window.Logs = { load };
})();