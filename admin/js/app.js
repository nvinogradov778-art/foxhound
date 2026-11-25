(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/app] shared.js must load first');

  const SECTION_LOADERS = {
    'photos':       () => window.AdminPhotos?.load(),
    'operators':    () => window.AdminOperators?.load(),
    'instructions': () => window.AdminInstructions?.load(),
    'docs':         () => window.AdminDocs?.load(),
    'atak':         () => window.AdminTrees?.load('atak'),
    'regulations':  () => window.AdminTrees?.load('regulations'),
    'scenarios':    () => window.AdminScenarios?.load(),
    'devices':      () => window.AdminDevices?.load(),
    'radio':        () => window.AdminRadio?.load(),
    'maps':         () => window.AdminMaps?.load(),
    'users':        () => window.AdminUsers?.load(),
    'logs':         () => window.AdminLogs?.load()
  };

  const loaded = {};

  async function loadSection(key) {
    if (loaded[key]) return;

    const loader = SECTION_LOADERS[key];
    if (!loader) return;

    try {
      await loader();
      loaded[key] = true;
    } catch (error) {
      // Не помечаем как загруженную — при следующем вызове попробуем снова.
      // Это защищает от ситуации, когда сторонний модуль ещё не успел
      // зарегистрировать window.AdminXxx (например, из-за кэша).
      console.error('[AdminApp.loadSection] failed:', key, error);
    }
  }

  // Экспортируем функцию для использования в inline-скрипте index.php
  window.AdminApp = { loadSection };

  // Запуск при загрузке страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const hash = location.hash ? location.hash.substring(1) : 'photos';
      loadSection(hash);
    });
  } else {
    const hash = location.hash ? location.hash.substring(1) : 'photos';
    loadSection(hash);
  }
})();