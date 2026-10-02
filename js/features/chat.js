(function () {
  'use strict';
  if (!window.Utils) throw new Error('[chat] utils.js must load first');
  if (!window.Modal) throw new Error('[chat] modal.js must load first');

  const QUICK_EMOJI = ['👍', '❤️', '😂', '😢', '👎', '🔥', '🎯', '🫡'];
  const MSG_POLL_INTERVAL = 4000;
  const CHANNELS_POLL_INTERVAL = 5000;
  const STATUSES_POLL_INTERVAL = 30000;
  const COMPACT_WINDOW_SECONDS = 300;

  let channels = [];
  let currentChannelId = null;
  let currentChannel = null;
  let messages = [];
  let lastMaxId = 0;
  let replyTo = null;

  let pollMsgTimer = null;
  let pollChannelsTimer = null;
  let pollStatusTimer = null;

  let layoutBound = false;
  let viewportBound = false;
  let markReadInFlight = false;

  // ---------- Публичное API ----------

  async function load() {
    const root = document.getElementById('chat-layout');
    if (!root) return;

    const user = window.Auth && window.Auth.currentUser();
    if (!user) {
      renderGuest(root);
      reset();
      return;
    }

    // Разметка уже в HTML — просто убеждаемся, что контейнер пуст от гостевой заглушки
    if (root.querySelector('.chat-guest')) {
      location.reload();
      return;
    }

    if (!layoutBound) {
      bindLayout();
      layoutBound = true;
    }

    await loadChannels();
    loadStatuses();
    startPolling();
  }

  function stop() {
    clearPollers();
  }

  function reset() {
    clearPollers();
    channels = [];
    currentChannelId = null;
    currentChannel = null;
    messages = [];
    lastMaxId = 0;
    replyTo = null;
    window.__currentChatChannelId = null;
  }

  function getCurrentChannelId() {
    return currentChannelId;
  }

  async function selectChannel(channelId) {
    if (currentChannelId === channelId) return;

    currentChannelId = channelId;
    window.__currentChatChannelId = channelId;
    currentChannel = channels.find(c => c.id === channelId) || null;
    replyTo = null;
    lastMaxId = 0;
    messages = [];

    document.querySelectorAll('.chat-channel').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.id, 10) === channelId);
    });

    closeOverlays();

    const title = document.getElementById('chat-channel-name');
    const desc = document.getElementById('chat-channel-desc');
    if (title && currentChannel) title.textContent = currentChannel.name;
    if (desc && currentChannel) desc.textContent = currentChannel.description || '';

    clearReply();
    await loadMessages();
    await markRead();
  }

  // ---------- Гостевое состояние ----------

  function renderGuest(root) {
    root.innerHTML =
      '<div class="chat-guest">' +
        '<span class="material-icons">lock</span>' +
        '<h2>Требуется вход</h2>' +
        '<p class="text-secondary">Войдите, чтобы открыть чат.</p>' +
      '</div>';
  }

  // ---------- Привязка обработчиков ----------

  function bindLayout() {
    const form = document.getElementById('chat-input-form');
    const input = document.getElementById('chat-input');
    const cancelReply = document.getElementById('chat-reply-cancel');
    const sidebar = document.getElementById('chat-sidebar');
    const statuses = document.getElementById('chat-statuses');
    const backdrop = document.getElementById('chat-backdrop');
    const chToggle = document.getElementById('chat-mobile-toggle');
    const stToggle = document.getElementById('chat-status-toggle');
    const newChannelBtn = document.getElementById('chat-new-channel');

    form?.addEventListener('submit', event => {
      event.preventDefault();
      const text = input.value.trim();
      if (text) sendMessage(text);
    });

    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const text = input.value.trim();
        if (text) sendMessage(text);
      }
    });

    input?.addEventListener('input', autoResizeInput);

    cancelReply?.addEventListener('click', clearReply);

    chToggle?.addEventListener('click', () => {
      const willOpen = !sidebar.classList.contains('open');
      closeOverlays();
      if (willOpen) {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
      }
    });

    stToggle?.addEventListener('click', () => {
      const willOpen = !statuses.classList.contains('open');
      closeOverlays();
      if (willOpen) {
        statuses.classList.add('open');
        backdrop.classList.add('active');
      }
    });

    backdrop?.addEventListener('click', closeOverlays);

    if (newChannelBtn) {
      const user = window.Auth.currentUser();
      if (user && user.role === 'admin') {
        newChannelBtn.style.display = '';
        newChannelBtn.addEventListener('click', openCreateChannel);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && currentChannelId && document.body.classList.contains('chat-active')) {
        markRead();
      }
    });

    setupViewportHandler();
  }

  function closeOverlays() {
    document.getElementById('chat-sidebar')?.classList.remove('open');
    document.getElementById('chat-statuses')?.classList.remove('open');
    document.getElementById('chat-backdrop')?.classList.remove('active');
  }

  function autoResizeInput() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 140) + 'px';
  }

  function setupViewportHandler() {
    if (viewportBound) return;
    if (!window.visualViewport) return;

    const header = document.querySelector('.app-header');
    const layout = document.getElementById('chat-layout');
    if (!header || !layout) return;

    function adjust() {
      if (!document.body.classList.contains('chat-active')) {
        layout.style.removeProperty('height');
        return;
      }
      const headerH = header.offsetHeight || 54;
      const h = Math.max(200, window.visualViewport.height - headerH);
      layout.style.height = h + 'px';
    }

    window.visualViewport.addEventListener('resize', adjust);
    window.visualViewport.addEventListener('scroll', adjust);
    viewportBound = true;

    setTimeout(adjust, 100);
  }

  // ---------- Каналы ----------

  async function loadChannels() {
    try {
      const data = await Utils.apiRequest('/api/chat_channels.php', 'GET');
      channels = data.channels || [];

      if (currentChannelId) {
        const current = channels.find(c => c.id === currentChannelId);
        if (current) current.unread = 0;
      }

      renderChannels();

      if (!channels.find(c => c.id === currentChannelId)) {
        if (channels.length) {
          selectChannel(channels[0].id);
        } else {
          currentChannelId = null;
          currentChannel = null;
          window.__currentChatChannelId = null;
        }
      }
    } catch (error) {
      console.error('[Chat.loadChannels]', error);
    }
  }

  function renderChannels() {
    const box = document.getElementById('chat-channels');
    if (!box) return;
    box.innerHTML = '';

    const groups = {};
    channels.forEach(ch => {
      const key = ch.category || 'Разное';
      (groups[key] || (groups[key] = [])).push(ch);
    });

    Object.keys(groups).forEach(category => {
      const groupBox = document.createElement('div');
      groupBox.className = 'chat-cat';

      const label = document.createElement('div');
      label.className = 'chat-cat-label';
      label.textContent = category;
      groupBox.appendChild(label);

      groups[category].forEach(ch => groupBox.appendChild(renderChannelItem(ch)));

      box.appendChild(groupBox);
    });
  }

  function renderChannelItem(ch) {
    const row = document.createElement('div');
    row.className = 'chat-channel-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-channel' + (ch.id === currentChannelId ? ' active' : '');
    btn.dataset.id = ch.id;

    const hash = document.createElement('span');
    hash.className = 'chat-channel-hash';
    hash.textContent = '#';
    btn.appendChild(hash);

    const name = document.createElement('span');
    name.className = 'chat-channel-name';
    name.textContent = ch.name;
    btn.appendChild(name);

    if (ch.is_private) {
      const lock = document.createElement('span');
      lock.className = 'material-icons chat-channel-lock';
      lock.textContent = 'lock';
      btn.appendChild(lock);
    }

    if (ch.unread > 0) {
      const badge = document.createElement('span');
      badge.className = 'chat-channel-unread';
      badge.textContent = ch.unread > 99 ? '99+' : ch.unread;
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => selectChannel(ch.id));
    row.appendChild(btn);

    const user = window.Auth && window.Auth.currentUser();
    if (user && user.role === 'admin') {
      row.appendChild(buildChannelDeleteButton(ch));
    }

    return row;
  }

  function buildChannelDeleteButton(ch) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-channel-del';
    btn.title = 'Удалить канал';
    btn.innerHTML = '<span class="material-icons">delete</span>';
    btn.addEventListener('click', event => {
      event.stopPropagation();
      deleteChannel(ch);
    });
    return btn;
  }

  async function deleteChannel(ch) {
    const confirmed = await Modal.confirm({
      title: 'Удалить канал #' + ch.name + '?',
      message: 'Все сообщения будут удалены безвозвратно.',
      danger: true,
      okText: 'Удалить'
    });
    if (!confirmed) return;

    try {
      await Utils.apiRequest('/api/chat_channels.php?action=delete', 'POST', { id: ch.id });
      if (currentChannelId === ch.id) {
        currentChannelId = null;
        currentChannel = null;
        window.__currentChatChannelId = null;
        messages = [];
        lastMaxId = 0;
        const box = document.getElementById('chat-messages');
        if (box) box.innerHTML = '';
      }
      await loadChannels();
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось удалить канал',
        danger: true
      });
    }
  }

  // ---------- Сообщения ----------

  async function loadMessages(beforeId) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const params = 'channel_id=' + currentChannelId + (beforeId ? '&before_id=' + beforeId : '&limit=50');

    try {
      const data = await Utils.apiRequest('/api/chat_messages.php?' + params, 'GET');
      const list = data.messages || [];

      if (!beforeId) {
        messages = list;
        renderMessages();
        scrollToBottom();
      } else {
        messages = list.concat(messages);
        renderMessages();
      }

      if (messages.length) {
        lastMaxId = Math.max(lastMaxId, messages[messages.length - 1].id);
        if (!beforeId) markRead();
      }
    } catch (error) {
      console.error('[Chat.loadMessages]', error);
      container.innerHTML = '';
      container.appendChild(Utils.emptyState(
        'error_outline',
        'Ошибка загрузки',
        'Не удалось загрузить сообщения'
      ));
    }
  }

  async function pollNewMessages() {
    if (!currentChannelId) return;

    try {
      const data = await Utils.apiRequest(
        '/api/chat_messages.php?channel_id=' + currentChannelId + '&limit=50',
        'GET'
      );
      const list = data.messages || [];
      if (!list.length) return;

      const newOnes = list.filter(m => m.id > lastMaxId);
      if (!newOnes.length) return;

      newOnes.forEach(m => messages.push(m));
      lastMaxId = messages[messages.length - 1].id;

      renderMessages();
      scrollToBottom();
      markRead();
      loadChannels();
    } catch (_) {}
  }

  function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    if (!messages.length) {
      container.innerHTML = '<div class="chat-empty">Сообщений пока нет. Будьте первым!</div>';
      return;
    }

    let lastUserId = null;
    let lastTs = 0;

    messages.forEach(m => {
      const sameAuthor = m.user_id === lastUserId && (m.created_at - lastTs < COMPACT_WINDOW_SECONDS);
      container.appendChild(renderMessage(m, sameAuthor));
      lastUserId = m.user_id;
      lastTs = m.created_at;
    });
  }

  function renderMessage(m, compact) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg' + (compact ? ' compact' : '');
    wrap.dataset.id = m.id;

    const user = window.Auth.currentUser();
    const isMine = user && user.id === m.user_id;
    const isAdmin = user && user.role === 'admin';

    const main = document.createElement('div');
    main.className = 'chat-msg-main';

    if (m.reply_to) {
      main.appendChild(renderReplyPreview(m.reply_to));
    }

    if (!compact) {
      main.appendChild(renderMessageHeader(m));
    }

    if (m.is_deleted) {
      const deleted = document.createElement('div');
      deleted.className = 'chat-msg-deleted';
      deleted.innerHTML = '<span class="material-icons">block</span> Сообщение удалено';
      main.appendChild(deleted);
    } else {
      const text = document.createElement('div');
      text.className = 'chat-msg-text';
      text.textContent = m.text;
      main.appendChild(text);
    }

    if (m.reactions && m.reactions.length) {
      main.appendChild(renderReactions(m));
    }

    wrap.appendChild(main);

    if (!compact) {
      wrap.insertBefore(renderAvatar(m), main);
    }

    wrap.appendChild(renderActions(m, isMine, isAdmin));

    return wrap;
  }

  function renderReplyPreview(replyTo) {
    const preview = document.createElement('div');
    preview.className = 'chat-msg-reply';

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'reply';
    preview.appendChild(icon);

    const user = document.createElement('span');
    user.className = 'chat-msg-reply-user';
    user.textContent = replyTo.username;
    preview.appendChild(user);

    const text = document.createElement('span');
    text.className = 'chat-msg-reply-text';
    text.textContent = replyTo.is_deleted ? 'сообщение удалено' : truncate(replyTo.text, 80);
    preview.appendChild(text);

    preview.addEventListener('click', () => scrollToMessage(replyTo.id));
    return preview;
  }

  function renderMessageHeader(m) {
    const header = document.createElement('div');
    header.className = 'chat-msg-header';

    const name = document.createElement('span');
    name.className = 'chat-msg-author';
    name.textContent = m.username;
    header.appendChild(name);

    const time = document.createElement('span');
    time.className = 'chat-msg-time';
    time.textContent = formatTime(m.created_at);
    header.appendChild(time);

    if (m.edited_at) {
      const edited = document.createElement('span');
      edited.className = 'chat-msg-edited';
      edited.textContent = '(ред.)';
      header.appendChild(edited);
    }

    return header;
  }

  function renderAvatar(m) {
    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';

    if (m.avatar && m.avatar !== 'default.png') {
      const img = document.createElement('img');
      img.src = '/uploads/avatars/' + m.avatar;
      img.alt = m.username;
      img.onerror = function () {
        this.remove();
        avatar.textContent = '👤';
      };
      avatar.appendChild(img);
    } else {
      avatar.textContent = '👤';
    }

    return avatar;
  }

  function renderActions(m, isMine, isAdmin) {
    const actions = document.createElement('div');
    actions.className = 'chat-msg-actions';

    QUICK_EMOJI.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-msg-act chat-msg-emoji';
      btn.textContent = emoji;
      btn.addEventListener('click', () => toggleReaction(m, emoji));
      actions.appendChild(btn);
    });

    const replyBtn = document.createElement('button');
    replyBtn.type = 'button';
    replyBtn.className = 'chat-msg-act';
    replyBtn.title = 'Ответить';
    replyBtn.innerHTML = '<span class="material-icons">reply</span>';
    replyBtn.addEventListener('click', () => setReply(m));
    actions.appendChild(replyBtn);

    if (isMine && !m.is_deleted) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'chat-msg-act';
      editBtn.title = 'Редактировать';
      editBtn.innerHTML = '<span class="material-icons">edit</span>';
      editBtn.addEventListener('click', () => editMessage(m));
      actions.appendChild(editBtn);
    }

    if (!m.is_deleted && (isMine || isAdmin)) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'chat-msg-act chat-msg-act-danger';
      delBtn.title = 'Удалить';
      delBtn.innerHTML = '<span class="material-icons">delete</span>';
      delBtn.addEventListener('click', () => deleteMessage(m));
      actions.appendChild(delBtn);
    }

    return actions;
  }

  function renderReactions(m) {
    const box = document.createElement('div');
    box.className = 'chat-msg-reactions';

    m.reactions.forEach(reaction => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-reaction' + (reaction.mine ? ' mine' : '');
      btn.title = reaction.users.map(u => u.username).join(', ');

      const emoji = document.createElement('span');
      emoji.className = 'chat-reaction-emoji';
      emoji.textContent = reaction.emoji;
      btn.appendChild(emoji);

      const count = document.createElement('span');
      count.className = 'chat-reaction-count';
      count.textContent = reaction.count;
      btn.appendChild(count);

      btn.addEventListener('click', () => toggleReaction(m, reaction.emoji));
      box.appendChild(btn);
    });

    return box;
  }

  // ---------- Действия с сообщениями ----------

  async function sendMessage(text) {
    const input = document.getElementById('chat-input');
    if (!input) return;

    try {
      const data = await Utils.apiRequest('/api/chat_messages.php?action=send', 'POST', {
        channel_id: currentChannelId,
        text,
        reply_to_id: replyTo ? replyTo.id : 0
      });

      if (!data.success || !data.message) {
        throw new Error(data.error || 'Не удалось отправить');
      }

      messages.push(data.message);
      lastMaxId = data.message.id;
      renderMessages();
      scrollToBottom();

      input.value = '';
      input.style.height = 'auto';
      clearReply();
      markRead();
    } catch (error) {
      Modal.alert({
        title: 'Ошибка отправки',
        message: error.message,
        danger: true
      });
    }
  }

  async function toggleReaction(message, emoji) {
    const isMine = message.reactions && message.reactions.find(r => r.emoji === emoji && r.mine);
    const action = isMine ? 'unreact' : 'react';

    try {
      const data = await Utils.apiRequest('/api/chat_messages.php?action=' + action, 'POST', {
        id: message.id,
        emoji
      });
      if (data.success) {
        message.reactions = data.reactions;
        renderMessages();
      }
    } catch (_) {}
  }

  async function editMessage(message) {
    const newText = await Modal.prompt({
      title: 'Редактировать сообщение',
      value: message.text,
      type: 'textarea',
      okText: 'Сохранить',
      required: true
    });
    if (newText === null) return;

    const trimmed = newText.trim();
    if (!trimmed) return;

    try {
      const data = await Utils.apiRequest('/api/chat_messages.php?action=edit', 'POST', {
        id: message.id,
        text: trimmed
      });
      if (data.success) {
        const local = messages.find(m => m.id === message.id);
        if (local) {
          local.text = trimmed;
          local.edited_at = Math.floor(Date.now() / 1000);
        }
        renderMessages();
      } else {
        Modal.alert({ title: 'Ошибка', message: data.error || 'Неизвестная ошибка', danger: true });
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  async function deleteMessage(message) {
    const confirmed = await Modal.confirm({
      title: 'Удалить сообщение?',
      message: 'Это действие необратимо.',
      danger: true,
      okText: 'Удалить'
    });
    if (!confirmed) return;

    try {
      const data = await Utils.apiRequest('/api/chat_messages.php?action=delete', 'POST', {
        id: message.id
      });
      if (data.success) {
        const local = messages.find(m => m.id === message.id);
        if (local) {
          local.is_deleted = 1;
          local.text = '';
          local.reactions = [];
        }
        renderMessages();
      }
    } catch (_) {}
  }

  // ---------- Reply ----------

  function setReply(message) {
    replyTo = message;

    const bar = document.getElementById('chat-reply-preview');
    const text = bar.querySelector('.chat-reply-text');

    text.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = message.username;
    text.appendChild(strong);
    text.appendChild(document.createTextNode(': ' + truncate(message.text, 100)));

    bar.style.display = '';
    document.getElementById('chat-input').focus();
  }

  function clearReply() {
    replyTo = null;
    const bar = document.getElementById('chat-reply-preview');
    if (bar) bar.style.display = 'none';
  }

  // ---------- Mark read ----------

  async function markRead() {
    if (!currentChannelId) return;
    if (document.hidden) return;
    if (markReadInFlight) return;

    if (!lastMaxId && messages.length) {
      lastMaxId = messages[messages.length - 1].id;
    }
    if (!lastMaxId) return;

    markReadInFlight = true;
    applyUnreadZero(currentChannelId);

    try {
      await Utils.apiRequest('/api/chat_channels.php?action=mark_read', 'POST', {
        channel_id: currentChannelId,
        last_read_message_id: lastMaxId
      });
    } catch (error) {
      console.warn('[markRead]', error);
    } finally {
      markReadInFlight = false;
    }
  }

  function applyUnreadZero(channelId) {
    const ch = channels.find(c => c.id === channelId);
    if (ch) ch.unread = 0;
    const badge = document.querySelector(
      '.chat-channel[data-id="' + channelId + '"] .chat-channel-unread'
    );
    if (badge) badge.remove();
  }

  // ---------- Статусы ----------

  async function loadStatuses() {
    const box = document.getElementById('chat-statuses');
    if (!box) return;

    try {
      const data = await Utils.apiRequest('/api/chat_status.php', 'GET');
      box.innerHTML = '';

      const groups = [
        { title: 'В сети',        list: data.online,  cls: 'online' },
        { title: 'Отошёл',        list: data.away,    cls: 'away' },
        { title: 'Не беспокоить', list: data.dnd,     cls: 'dnd' },
        { title: 'Не в сети',     list: data.offline, cls: 'offline' }
      ];

      groups.forEach(group => {
        if (!group.list || !group.list.length) return;
        box.appendChild(renderStatusGroup(group));
      });
    } catch (error) {
      console.error('[Chat.loadStatuses]', error);
    }
  }

  function renderStatusGroup({ title, list, cls }) {
    const fragment = document.createDocumentFragment();

    const label = document.createElement('div');
    label.className = 'chat-status-cat';
    label.textContent = title + ' — ' + list.length;
    fragment.appendChild(label);

    list.forEach(user => {
      const row = document.createElement('div');
      row.className = 'chat-status-row';

      const dot = document.createElement('span');
      dot.className = 'chat-status-dot ' + cls;
      row.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'chat-status-name';
      name.textContent = user.username;
      row.appendChild(name);

      if (user.custom_text) {
        const custom = document.createElement('span');
        custom.className = 'chat-status-custom';
        custom.textContent = user.custom_text;
        row.appendChild(custom);
      }

      fragment.appendChild(row);
    });

    return fragment;
  }

  // ---------- Polling ----------

  function startPolling() {
    clearPollers();
    pollMsgTimer = setInterval(pollNewMessages, MSG_POLL_INTERVAL);
    pollChannelsTimer = setInterval(loadChannels, CHANNELS_POLL_INTERVAL);
    pollStatusTimer = setInterval(loadStatuses, STATUSES_POLL_INTERVAL);
  }

  function clearPollers() {
    if (pollMsgTimer) { clearInterval(pollMsgTimer); pollMsgTimer = null; }
    if (pollChannelsTimer) { clearInterval(pollChannelsTimer); pollChannelsTimer = null; }
    if (pollStatusTimer) { clearInterval(pollStatusTimer); pollStatusTimer = null; }
  }

  // ---------- Создание канала ----------

  async function openCreateChannel() {
    const data = await Modal.form({
      title: 'Создать канал',
      okText: 'Создать',
      fields: [
        {
          name: 'name',
          label: 'Имя канала',
          required: true,
          placeholder: 'без # — например, общий',
          maxLength: 40
        },
        {
          name: 'category',
          label: 'Категория',
          type: 'select',
          value: 'Разное',
          options: [
            { value: 'Основные', label: 'Основные' },
            { value: 'Игровые',  label: 'Игровые' },
            { value: 'Разное',   label: 'Разное' }
          ]
        },
        {
          name: 'description',
          label: 'Описание',
          type: 'textarea',
          placeholder: 'Необязательно',
          rows: 3
        },
        {
          name: 'is_private',
          label: 'Приватный канал',
          type: 'checkbox',
          hint: 'Только админ и модераторы увидят канал'
        }
      ]
    });
    if (!data) return;

    try {
      const res = await Utils.apiRequest('/api/chat_channels.php?action=create', 'POST', {
        name: data.name,
        category: data.category,
        description: data.description,
        is_private: data.is_private
      });
      if (res.success) {
        await loadChannels();
        if (res.id) selectChannel(res.id);
      } else {
        Modal.alert({ title: 'Ошибка', message: res.error || 'Не удалось создать канал', danger: true });
      }
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    }
  }

  // ---------- Утилиты ----------

  function scrollToBottom() {
    const box = document.getElementById('chat-messages');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function scrollToMessage(id) {
    const el = document.querySelector('.chat-msg[data-id="' + id + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 1500);
  }

  function formatTime(ts) {
    const d = new Date(ts * 1000);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();

    if (sameDay) {
      return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }) +
           ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }

  function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  window.Chat = {
    load,
    stop,
    selectChannel,
    getCurrentChannelId,
    reset
  };
})();