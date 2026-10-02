(function () {
  'use strict';
  if (!window.Utils) throw new Error('[notify] utils.js must load first');

  const BASE_TITLE = 'FOXHOUND';

  let unreadCount = 0;
  let toasts = [];
  let toastContainer = null;
  let lastUnreadMap = {};
  let initialized = false;
  let pollTimer = null;

  function ensureContainer() {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
    toastContainer = document.getElementById('notify-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'notify-container';
      toastContainer.className = 'notify-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function dismiss(box) {
    if (!box || box.classList.contains('leaving')) return;
    box.classList.add('leaving');
    setTimeout(() => {
      box.remove();
      toasts = toasts.filter(item => item !== box);
    }, 250);
  }

  function dismissAll() {
    toasts.slice().forEach(dismiss);
  }

  function show(opts) {
    opts = opts || {};
    if (!opts.title && !opts.message) return;

    const box = document.createElement('div');
    box.className = 'notify-toast';

    const icon = document.createElement('div');
    icon.className = 'notify-icon';
    icon.innerHTML = '<span class="material-icons"></span>';
    icon.firstChild.textContent = opts.icon || 'chat';
    box.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'notify-body';

    if (opts.title) {
      const title = document.createElement('div');
      title.className = 'notify-title';
      title.textContent = opts.title;
      body.appendChild(title);
    }
    if (opts.message) {
      const message = document.createElement('div');
      message.className = 'notify-message';
      message.textContent = opts.message;
      body.appendChild(message);
    }
    box.appendChild(body);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'notify-close';
    closeBtn.innerHTML = '<span class="material-icons">close</span>';
    closeBtn.addEventListener('click', event => {
      event.stopPropagation();
      dismiss(box);
    });
    box.appendChild(closeBtn);

    if (typeof opts.onClick === 'function') {
      box.addEventListener('click', () => {
        opts.onClick();
        dismiss(box);
      });
      box.classList.add('notify-clickable');
    }

    ensureContainer().appendChild(box);
    toasts.push(box);

    requestAnimationFrame(() => box.classList.add('active'));

    const ttl = opts.ttl || 6000;
    setTimeout(() => dismiss(box), ttl);

    if (opts.sound !== false && window.Utils.playNotificationSound) {
      try { window.Utils.playNotificationSound(); } catch (_) {}
    }

    if (toasts.length > 4) dismiss(toasts[0]);
  }

  function updateTitle(count) {
    unreadCount = count || 0;
    document.title = count > 0
      ? '(' + (count > 99 ? '99+' : count) + ') ' + BASE_TITLE
      : BASE_TITLE;
  }

  function resetTitle() {
    updateTitle(0);
  }

  function addUnread(n) {
    updateTitle(unreadCount + (n || 1));
  }

  function getUnread() {
    return unreadCount;
  }

  async function poll() {
    try {
      const data = await Utils.apiRequest('/api/chat_channels.php', 'GET');
      const channels = data.channels || [];

      const currentId = window.__currentChatChannelId || null;
      const inChat = document.body.classList.contains('chat-active');
      const isVisible = !document.hidden;

      let totalUnread = 0;

      channels.forEach(ch => {
        const prev = lastUnreadMap[ch.id] || 0;
        let now = ch.unread || 0;

        if (ch.id === currentId && inChat && isVisible) {
          now = 0;
        }

        totalUnread += now;

        if (initialized && now > prev) {
          const suppress = (ch.id === currentId && inChat && isVisible);
          if (!suppress) notifyChannel(ch, now - prev);
        }

        lastUnreadMap[ch.id] = now;
      });

      initialized = true;
      updateTitle(totalUnread);
    } catch (_) {}
  }

  function notifyChannel(ch, count) {
    show({
      icon: 'chat',
      title: '#' + ch.name,
      message: count === 1 ? 'Новое сообщение' : count + ' новых сообщений',
      onClick() {
        if (location.hash !== '#/chat') location.hash = '#/chat';
        setTimeout(() => {
          if (window.Chat && window.Chat.selectChannel) {
            window.Chat.selectChannel(ch.id);
          }
        }, 250);
      }
    });
  }

  function startPolling() {
    stopPolling();
    poll();
    pollTimer = setInterval(poll, 5000);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    lastUnreadMap = {};
    initialized = false;
    updateTitle(0);
  }

  window.Notify = {
    show,
    dismissAll,
    updateTitle,
    resetTitle,
    addUnread,
    getUnread,
    startPolling,
    stopPolling
  };
})();