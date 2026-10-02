(function () {
  'use strict';
  if (!window.Utils) throw new Error('[regulations] utils.js must load first');
  if (!window.TreeRenderer) throw new Error('[regulations] tree-renderer.js must load first');

  const CACHE_TTL = 60 * 1000;

  let loadedAt = 0;
  let inFlight = null;

  async function load(options = {}) {
    const root = document.getElementById('regulations-root');
    if (!root) return;

    if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
    if (inFlight) return inFlight;

    root.innerHTML = '<div class="text-muted text-center">Загрузка…</div>';

    inFlight = (async () => {
      try {
        const data = await Utils.apiRequest('/api/regulations.php', 'GET');
        const sections = data.sections || [];

        if (!sections.length) {
          root.innerHTML = '';
          root.appendChild(Utils.emptyState(
            'gavel',
            'Устав пуст',
            'Разделы устава ещё не заполнены'
          ));
        } else {
          TreeRenderer.render(root, sections);
        }

        loadedAt = Date.now();
      } catch (error) {
        console.error('[Regulations.load]', error);
        root.innerHTML = '';
        root.appendChild(Utils.emptyState(
          'error_outline',
          'Ошибка загрузки',
          'Не удалось получить устав'
        ));
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  window.Regulations = { load };
})();