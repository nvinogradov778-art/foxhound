import { Auth } from './auth.js';
import { Router } from './router.js';
import { Chat } from '../features/chat.js';
import { Widgets } from '../features/widgets.js';
import { RadioPlayer } from '../features/radio-player.js';
import { Operators } from '../features/operators.js';
import { Scenarios } from '../features/scenarios.js';
import { Instructions } from '../features/instructions.js';
import { Devices } from '../features/devices.js';
import { Regulations } from '../features/regulations.js';
import { Docs } from '../features/docs.js';
import { Atak } from '../features/atak.js';
import { Maps } from '../features/maps.js';
import { Gallery } from '../features/gallery.js';
import { Calculator } from '../features/calculator.js';
import { Logs } from '../features/logs.js';
import { Profile } from '../features/profile.js';
import { ProfileSettings } from '../features/profile-settings.js';
import { Polls } from '../features/polls.js';
import { Events } from '../features/events.js';

const PAGES = {};
document.querySelectorAll('.page').forEach(page => {
  PAGES[page.id] = page;
});

const PAGE_LOADERS = {
  'page-home':         () => { Widgets.loadAll(); RadioPlayer.load(); },
  'page-operators':    () => Operators.load(),
  'page-scenarios':    () => Scenarios.load(),
  'page-instructions': () => Instructions.load(),
  'page-devices':      () => Devices.load(),
  'page-regulations':  () => Regulations.load(),
  'page-docs':         () => Docs.load(),
  'page-atak':         () => Atak.load(),
  'page-maps':         () => Maps.load(),
  'page-photo':        () => Gallery.load(),
  'page-calc':         () => Calculator.load(),
  'page-logs':         () => Logs.load(),
  'page-profile':      () => Profile.load(),
  'page-settings':     () => ProfileSettings.load(),
  'page-chat':         () => Chat.load(),
  'page-polls':        () => Polls.load(),
  'page-events':       () => Events.load()
};

function showPage(pageId, options = {}) {
  const target = PAGES[pageId];
  if (!target) return;

  // Принудительно перерисовываем, если это не тот же самый вызов (чтобы избежать двойной загрузки)
  // Но при смене хеша force должно быть true, чтобы страница точно открылась.
  // Мы будем всегда делать swap, если force не false (по умолчанию делаем swap).
  
  // Убираем старую проверку, которая блокировала перерисовку при хеш-навигации.
  // Теперь мы всегда перерисовываем, если не передан skipRender.
  
  // window.scrollTo(0, 0); // Убрали, чтобы не дергалось при каждом переходе (перенесли в swap)

  const swap = () => {
    Object.values(PAGES).forEach(p => p.classList.remove('active', 'page-leaving'));
    target.classList.add('active');

    if (!options.fromHash && window.Router) {
      window.Router.setHash(pageId);
    }

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
      document.body.classList.remove('mobile-menu-open');
    }

    updateNavHighlight(pageId);

    const main = document.querySelector('.app-main');
    if (main) main.classList.toggle('no-padding', pageId === 'page-chat');
    document.body.classList.toggle('chat-active', pageId === 'page-chat');

    const loader = PAGE_LOADERS[pageId];
    if (loader) loader();

    if (pageId !== 'page-chat') {
      Chat.stop();
    }
    
    // Скролл наверх только при переключении страницы
    window.scrollTo(0, 0);
  };

  // Если это первый вызов или страница действительно меняется, делаем swap
  // Если мы вызываем showPage повторно для той же страницы (например, refresh), тоже делаем swap
  // Единственное исключение - если передан skipRender (но такого флага у нас нет).
  
  // Упрощаем: всегда делаем swap, если не передан fromHash (клик по ссылке) или force.
  // При fromHash:true (событие hashchange) мы тоже хотим обновить страницу.
  
  // Но если current === target и fromHash:true, мы все равно сделаем swap, чтобы страница обновилась.
  // Это не страшно, так как загрузчики имеют кэш.
  
  swap();
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
  // Убираем перехват кликов, чтобы браузер сам менял хеш и срабатывал hashchange.
  // Но для мобильного меню (где ссылки могут быть без хеша) оставим обработку.
  // В нашем случае все ссылки имеют href="#/...", поэтому браузер сам изменит хеш.
}

function initMobileMenu() {
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    document.body.classList.toggle('mobile-menu-open', open);
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      document.body.classList.remove('mobile-menu-open');
    });
  });
}

function initVisibilityStatus() {
  document.addEventListener('visibilitychange', () => {
    if (!Auth.currentUser()) return;
    Auth.setAutoStatus(document.hidden ? 'away' : 'online');
  });
}

function initPageHide() {
  window.addEventListener('pagehide', () => {
    if (!Auth.currentUser()) return;
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

export const App = {
  boot: async () => {
    initNavLinks();
    initMobileMenu();
    initVisibilityStatus();
    initPageHide();
    registerSW();

    // Инициализируем роутер ДО проверки авторизации
    Router.init((pageId, opts) => {
      // Всегда принудительно перерисовываем при смене хеша
      showPage(pageId, { fromHash: true, force: true });
    });

    await Auth.checkAuth();

    // После авторизации обновляем текущую страницу (на случай, если нужно обновить данные пользователя)
    const currentPageId = Router.getPageFromHash();
    showPage(currentPageId, { fromHash: true, force: true, skipTransition: true });

    document.addEventListener('app:refresh-page', (e) => {
      const pageId = e.detail || Router.getPageFromHash();
      showPage(pageId, { fromHash: true, force: true, skipTransition: true });
    });

    document.addEventListener('chat:select-channel', (e) => {
      if (window.Chat && window.Chat.selectChannel) {
        window.Chat.selectChannel(e.detail);
      }
    });
  },
  showPage,
  updateNavHighlight,
  refresh(options) {
    const pageId = Router.getPageFromHash();
    showPage(pageId, Object.assign({ fromHash: true, force: true }, options || {}));
  }
};