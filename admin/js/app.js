(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/app] shared.js must load first');

  const SECTION_LOADERS = {
    'section-photos':       () => window.AdminPhotos?.load(),
    'section-operators':    () => window.AdminOperators?.load(),
    'section-instructions': () => window.AdminInstructions?.load(),
    'section-atak':         () => window.AdminTrees?.load('atak'),
    'section-regulations':  () => window.AdminTrees?.load('regulations'),
    'section-scenarios':    () => window.AdminScenarios?.load(),
    'section-devices':      () => window.AdminDevices?.load(),
    'section-radio':        () => window.AdminRadio?.load(),
    'section-maps':         () => window.AdminMaps?.load(),
    'section-users':        () => window.AdminUsers?.load(),
    'section-logs':         () => window.AdminLogs?.load()
  };

  function loadActiveSection() {
    const active = document.querySelector('.admin-section.active');
    if (!active) return;
    const loader = SECTION_LOADERS[active.id];
    if (loader) loader();
  }

  function initNavLinks() {
    document.querySelectorAll('.admin-nav a[href^="?section="]').forEach(link => {
      link.addEventListener('click', () => {
        // Страница перезагрузится с ?section=..., но перед этим
        // можно было бы делать что-то ещё. Пока — оставляем переход.
      });
    });
  }

  function boot() {
    initNavLinks();
    loadActiveSection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();