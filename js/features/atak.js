(function () {
  'use strict';
  if (!window.Utils) throw new Error('[atak] utils.js must load first');
  if (!window.TreeRenderer) throw new Error('[atak] tree-renderer.js must load first');

  const CACHE_TTL = 60 * 1000;

  let loadedAt = 0;
  let inFlight = null;

  async function load(options = {}) {
    const root = document.getElementById('atak-root');
    if (!root) return;

    if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
    if (inFlight) return inFlight;

    root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

    inFlight = (async () => {
      try {
        const data = await Utils.apiRequest('/api/atak.php', 'GET');
        const sections = data.sections || [];

        if (!sections.length) {
          root.innerHTML = '';
          root.appendChild(Utils.emptyState(
            'satellite_alt',
            'Разделы отсутствуют',
            'Руководство по ATAK ещё не заполнено'
          ));
        } else {
          TreeRenderer.render(root, sections);
        }

        loadedAt = Date.now();
      } catch (error) {
        console.error('[Atak.load]', error);
        root.innerHTML = '';
        root.appendChild(Utils.emptyState(
          'error_outline',
          'Ошибка загрузки',
          'Не удалось получить руководство ATAK'
        ));
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  window.Atak = { load };
})();