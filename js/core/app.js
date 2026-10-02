(function () {
  'use strict';

  const PAGES = {};
  document.querySelectorAll('.page').forEach(page => {
    PAGES[page.id] = page;
  });

  const PAGE_LOADERS = {
    'page-home':         () => { window.Widgets?.loadAll(); window.RadioPlayer?.load(); },
    'page-operators':    () => window.Operators?.load(),
    'page-scenarios':    () => window.Scenarios?.load(),
    'page-instructions': () => window.Instructions?.load(),
    'page-devices':      () => window.Devices?.load(),
    'page-regulations':  () => window.Regulations?.load(),
    'page-atak':         () => window.Atak?.load(),
    'page-maps':         () => window.Maps?.load(),
    'page-photo':        () => window.Gallery?.load(),
    'page-calc':         () => window.Calculator?.load(),
    'page-logs':         () => window.Logs?.load(),
    'page-profile':      () => window.Profile?.load(),
    'page-settings':     () => window.ProfileSettings?.load(),
    'page-chat':         () => window.Chat?.load(),
    'page-polls':        () => window.Polls?.load(),
    'page-events':       () => window.Events?.load()
  };

  function showPage(pageId, options = {}) {
    const target = PAGES[pageId];
    if (!target) return;

    const current = document.querySelector('.page.active');
    if (current === target && !options.force) return;

    const swap = () => {
      Object.values(PAGES).forEach(p => p.classList.remove('active', 'page-leaving'));
      target.classList.add('active');

      if (!options.fromHash && window.Router) {
        window.Router.setHash(pageId);
      }

      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu) mobileMenu.classList.remove('open');

      updateNavHighlight(pageId);

      const main = document.querySelector('.app-main');
      if (main) main.classList.toggle('no-padding', pageId === 'page-chat');
      document.body.classList.toggle('chat-active', pageId === 'page-chat');

      const loader = PAGE_LOADERS[pageId];
      if (loader) loader();

      if (pageId !== 'page-chat' && window.Chat && window.Chat.stop) {
        window.Chat.stop();
      }
    };

    if (current && current !== target && !options.skipTransition) {
      current.classList.add('page-leaving');
      setTimeout(swap, 140);
    } else {
      swap();
    }
  }

  function updateNavHighlight(pageId) {
    document.querySelectorAll('.nav-link.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-group.group-active').forEach(el => el.classList.remove('group-active'));
    document.querySelectorAll('.nav-dropdown a.active').forEach(el => el.classList.remove('active'));

    const direct = document.querySelector('.app-nav > .nav-link[data-page="' + pageId + '"]');
    if (direct) direct.classList.add('active');

    document.querySelectorAll('.nav-group').forEach(group => {
      const match = group.querySelector('.nav-dropdown a[data-page="' + pageId + '"]');
      if (match) {
        group.classList.add('group-active');
        match.classList.add('active');
      }
    });
  }

  function initNavLinks() {
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', event => {
        const pageId = link.dataset.page;
        if (pageId) {
          event.preventDefault();
          showPage(pageId);
        }
      });
    });
  }

  function initMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

  function initVisibilityStatus() {
    document.addEventListener('visibilitychange', () => {
      if (!window.Auth || !window.Auth.setAutoStatus) return;
      if (!window.Auth.currentUser()) return;
      window.Auth.setAutoStatus(document.hidden ? 'away' : 'online');
    });
  }

  function initPageHide() {
    window.addEventListener('pagehide', () => {
      if (!window.Auth || !window.Auth.currentUser()) return;
      try {
        fetch('/api/chat_status.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.__csrfToken || ''
          },
          credentials: 'same-origin',
          body: JSON.stringify({ status: 'offline', custom_text: '' }),
          keepalive: true
        });
      } catch (_) {}
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => console.warn('[SW] registration failed:', error));
    });
  }

  async function boot() {
    if (window.Auth) {
      await window.Auth.checkAuth();
    }
    if (window.Router) {
      window.Router.init((pageId, opts) => {
        showPage(pageId, { fromHash: true, force: !!(opts && opts.first) });
      });
    }
  }

  window.App = {
    showPage,
    updateNavHighlight,
    refresh(options) {
      const pageId = window.Router ? window.Router.getPageFromHash() : 'page-home';
      showPage(pageId, Object.assign({ fromHash: true, force: true }, options || {}));
    }
  };

  initNavLinks();
  initMobileMenu();
  initVisibilityStatus();
  initPageHide();
  registerSW();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
