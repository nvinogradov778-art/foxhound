(function () {
  'use strict';
  if (!window.AdminShared) throw new Error('[admin/trees] shared.js must load first');

  const { api, qs, setStatus } = AdminShared;

  const CONFIGS = {
    atak: {
      endpoint: '/api/atak.php',
      editorId: 'atak-editor',
      statusId: 'atak-status',
      loadBtnId: 'atak-load-btn',
      saveBtnId: 'atak-save-btn',
      formatBtnId: 'atak-format-btn'
    },
    regulations: {
      endpoint: '/api/regulations.php',
      editorId: 'reg-editor',
      statusId: 'reg-status',
      loadBtnId: 'reg-load-btn',
      saveBtnId: 'reg-save-btn',
      formatBtnId: 'reg-format-btn'
    }
  };

  const bound = {};

  async function load(type) {
    const cfg = CONFIGS[type];
    if (!cfg) return;

    if (!bound[type]) {
      bind(type, cfg);
      bound[type] = true;
    }

    // Автоматически подгружаем из БД при первом входе
    await loadFromDb(type, cfg);
  }

  function bind(type, cfg) {
    qs('#' + cfg.loadBtnId).addEventListener('click', () => loadFromDb(type, cfg));
    qs('#' + cfg.saveBtnId).addEventListener('click', () => saveToDb(type, cfg));
    qs('#' + cfg.formatBtnId).addEventListener('click', () => formatJson(cfg));
  }

  async function loadFromDb(type, cfg) {
    const editor = qs('#' + cfg.editorId);
    const status = qs('#' + cfg.statusId);

    try {
      const data = await api(cfg.endpoint);
      editor.value = JSON.stringify({ sections: data.sections || [] }, null, 4);
      setStatus(status, 'Загружено из БД', 'success');
    } catch (error) {
      setStatus(status, 'Ошибка: ' + error.message, 'error');
    }
  }

  async function saveToDb(type, cfg) {
    const editor = qs('#' + cfg.editorId);
    const status = qs('#' + cfg.statusId);

    let parsed;
    try {
      parsed = JSON.parse(editor.value);
    } catch (error) {
      setStatus(status, 'Неверный JSON: ' + error.message, 'error');
      return;
    }

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      setStatus(status, 'Должен быть объект {"sections": [...]}', 'error');
      return;
    }

    try {
      await api(cfg.endpoint, 'POST', { sections: parsed.sections });
      setStatus(status, 'Сохранено в БД!', 'success');
    } catch (error) {
      setStatus(status, 'Ошибка: ' + error.message, 'error');
    }
  }

  function formatJson(cfg) {
    const editor = qs('#' + cfg.editorId);
    const status = qs('#' + cfg.statusId);

    try {
      const parsed = JSON.parse(editor.value);
      editor.value = JSON.stringify(parsed, null, 4);
      setStatus(status, 'Отформатировано', 'success');
    } catch (error) {
      setStatus(status, 'Неверный JSON: ' + error.message, 'error');
    }
  }

  window.AdminTrees = { load };
})();