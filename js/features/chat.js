import { Utils } from '../core/utils.js';
import { Modal } from '../core/modal.js';
import { Auth } from '../core/auth.js';

const CHANNELS_POLL_INTERVAL = 5000;
const STATUSES_POLL_INTERVAL = 30000;
const COMPACT_WINDOW_SECONDS = 300;

let channels = [];
let currentChannelId = null;
let currentChannel = null;
let messages = [];
let lastMaxId = 0;
let replyTo = null;
let pendingFile = null;
let isLoadingMore = false;
let hasMoreMessages = false;
let typingTimeout = null;

let ws = null;
let currentWsUrl = null;
let wsReconnectTimer = null;
let typingUsers = {};
let typingCleanupTimer = null;

let chatFetchController = null;
let pollChannelsTimer = null;
let pollStatusTimer = null;

let layoutBound = false;
let viewportBound = false;
let markReadInFlight = false;

async function load() {
  const root = document.getElementById('chat-layout');
  const guestView = document.getElementById('chat-guest-view');
  if (!root || !guestView) return;

  const user = Auth.currentUser();
  if (!user) {
    guestView.style.display = 'flex';
    root.style.display = 'none';
    reset();
    return;
  }

  guestView.style.display = 'none';
  root.style.display = ''; // Возвращаем стандартный display из CSS (grid)

  if (!layoutBound) {
    bindLayout();
    layoutBound = true;
  }

  startTypingCleanup();
  await loadChannels();
  loadStatuses();
  startPolling();
  subscribeToPush();
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
  typingUsers = {};
  window.__currentChatChannelId = null;
  resetAttachment();
  renderTyping();
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
  hasMoreMessages = false;
  typingUsers = {};

  resetAttachment();
  updateSendButtonState();

  document.querySelectorAll('.chat-channel').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id, 10) === channelId);
  });

  closeOverlays();
  renderTyping();

  const title = document.getElementById('chat-channel-name');
  const desc = document.getElementById('chat-channel-desc');
  if (title && currentChannel) title.textContent = currentChannel.name;
  if (desc && currentChannel) desc.textContent = currentChannel.description || '';

  clearReply();
  await loadMessages();
  await markRead();

  connectWebSocket();
}

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
  const msgContainer = document.getElementById('chat-messages');
  
  if (msgContainer) {
    msgContainer.addEventListener('click', (e) => {
      if (e.target.closest('.chat-msg-actions')) return;

      const msg = e.target.closest('.chat-msg');
      if (!msg) return;

      const wasVisible = msg.classList.contains('actions-visible');

      document.querySelectorAll('.chat-msg.actions-visible').forEach(m => {
        m.classList.remove('actions-visible');
      });

      if (!wasVisible) {
        msg.classList.add('actions-visible');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.chat-msg')) {
        document.querySelectorAll('.chat-msg.actions-visible').forEach(m => {
          m.classList.remove('actions-visible');
        });
      }
    });
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (text || pendingFile) sendMessage(text);
  });

  input?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const text = input.value.trim();
      if (text || pendingFile) sendMessage(text);
    }
  });

  input?.addEventListener('input', () => {
    autoResizeInput.call(input);
    updateSendButtonState();

    if (!currentChannelId) return;

    if (!typingTimeout) {
        Utils.apiRequest('/api/chat_typing.php', 'POST', { channel_id: currentChannelId }).catch(()=>{});
        typingTimeout = setTimeout(() => { typingTimeout = null; }, 3000);
    }
  });

  cancelReply?.addEventListener('click', clearReply);

  msgContainer?.addEventListener('scroll', () => {
      if (msgContainer.scrollTop === 0 && !isLoadingMore && hasMoreMessages && messages.length) {
          loadMessages(messages[0].id);
      }
  });

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
    const user = Auth.currentUser();
    if (user && (user.role === 'admin' || user.role === 'commander')) {
      newChannelBtn.style.display = '';
      newChannelBtn.addEventListener('click', openCreateChannel);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentChannelId && document.body.classList.contains('chat-active')) {
      markRead();
      if (!ws || ws.readyState !== WebSocket.OPEN) connectWebSocket();
    }
  });

  ensureTypingEl();
  setupAttachmentUI();
  setupViewportHandler();
  updateSendButtonState();
}

function updateSendButtonState() {
  const input = document.getElementById('chat-input');
  const submitBtn = document.querySelector('.chat-input-form button[type="submit"]');
  if (!input || !submitBtn) return;

  const hasText = input.value.trim().length > 0;
  submitBtn.disabled = !hasText && !pendingFile;
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

function ensureTypingEl() {
  let el = document.getElementById('chat-typing');
  if (el) return el;
  const form = document.getElementById('chat-input-form');
  if (!form) return null;
  el = document.createElement('div');
  el.id = 'chat-typing';
  el.className = 'chat-typing-indicator';
  form.parentNode.insertBefore(el, form);
  return el;
}

function startTypingCleanup() {
  if (typingCleanupTimer) return;
  typingCleanupTimer = setInterval(() => {
      let changed = false;
      const now = Date.now();
      for (const user in typingUsers) {
          if (now - typingUsers[user] > 4000) {
              delete typingUsers[user];
              changed = true;
          }
      }
      if (changed) renderTyping();
  }, 1000);
}

function renderTyping() {
  const el = ensureTypingEl();
  if (!el) return;

  const users = Object.keys(typingUsers);
  if (!users.length) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }

  el.style.display = '';
  if (users.length === 1) {
    el.textContent = users[0] + ' печатает…';
  } else if (users.length === 2) {
    el.textContent = users[0] + ' и ' + users[1] + ' печатают…';
  } else {
    el.textContent = users.slice(0, 2).join(', ') + ' и ещё ' + (users.length - 2) + ' печатают…';
  }
}

function setupAttachmentUI() {
  const btn       = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');
  const cancel    = document.getElementById('chat-file-cancel');

  if (btn && fileInput && !btn.dataset.bound) {
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      pendingFile = file;
      btn.classList.add('has-attachment');
      showAttachmentPreview(file.name);
      updateSendButtonState();
    });

    cancel?.addEventListener('click', resetAttachment);
  }

  resetAttachment();
}

function showAttachmentPreview(name) {
  const box = document.getElementById('chat-file-preview');
  const lbl = document.getElementById('chat-file-name');
  if (lbl) lbl.textContent = '📎 ' + name;
  if (box) box.style.display = 'flex';
}

function resetAttachment() {
  pendingFile = null;

  const attachBtn = document.getElementById('chat-attach-btn');
  if (attachBtn) {
    attachBtn.classList.remove('has-attachment');
    attachBtn.title = 'Прикрепить файл';
  }

  const fileInput = document.getElementById('chat-file-input');
  if (fileInput) fileInput.value = '';

  const preview = document.getElementById('chat-file-preview');
  if (preview) preview.style.display = 'none';

  const nameEl = document.getElementById('chat-file-name');
  if (nameEl) nameEl.textContent = '';

  updateSendButtonState();
}

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

  const user = Auth.currentUser();
  if (user && (user.role === 'admin' || user.role === 'commander')) {
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
    Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
  }
}

async function loadMessages(beforeId) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  if (beforeId) {
      isLoadingMore = true;
      const spinner = document.createElement('div');
      spinner.id = 'chat-load-spinner';
      spinner.className = 'chat-load-spinner';
      spinner.textContent = 'Загрузка истории...';
      container.prepend(spinner);
  } else {
      container.innerHTML = `
          <div class="skeleton-stack">
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-100"></div>
              <div class="skeleton-line w-70"></div>
              <div style="height: 12px"></div>
              <div class="skeleton-line w-25"></div>
              <div class="skeleton-line w-100"></div>
              <div class="skeleton-line w-55"></div>
          </div>
      `;
  }

  const params = 'channel_id=' + currentChannelId + (beforeId ? '&before_id=' + beforeId : '&limit=50');

  if (chatFetchController) chatFetchController.abort();
  chatFetchController = new AbortController();

  try {
    const response = await fetch('/api/chat_messages.php?' + params, {
      method: 'GET',
      signal: chatFetchController.signal,
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': window.__csrfToken || '' }
    });

    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();

    const list = data.messages || [];
    hasMoreMessages = data.has_more;

    if (!beforeId) {
      messages = list;
      renderMessages();
      scrollToBottom();
    } else {
      const oldHeight = container.scrollHeight;
      messages = list.concat(messages);
      renderMessages();
      container.scrollTop = container.scrollHeight - oldHeight;
    }

    if (messages.length) {
      lastMaxId = Math.max(lastMaxId, messages[messages.length - 1].id);
      if (!beforeId) markRead();
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('[Chat.loadMessages]', error);
    if (!beforeId) container.innerHTML = '<div class="chat-error">Не удалось загрузить сообщения.</div>';
  } finally {
      if (beforeId) {
          isLoadingMore = false;
          document.getElementById('chat-load-spinner')?.remove();
      }
  }
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

  const user = Auth.currentUser();
  const isMine = user && user.id === m.user_id;
  const isAdmin = user && (user.role === 'admin' || user.role === 'commander');

  if (isMine) wrap.classList.add('own');

  const main = document.createElement('div');
  main.className = 'chat-msg-main';

  if (m.reply_to) main.appendChild(renderReplyPreview(m.reply_to));
  if (!compact) main.appendChild(renderMessageHeader(m));

  if (m.is_deleted) {
    const deleted = document.createElement('div');
    deleted.className = 'chat-msg-deleted';
    deleted.innerHTML = '<span class="material-icons">block</span> Сообщение удалено';
    main.appendChild(deleted);
  } else {
    if (m.text) {
      const text = document.createElement('div');
      text.className = 'chat-msg-text';
      text.textContent = m.text;
      main.appendChild(text);
    }
    if (m.attachment) main.appendChild(renderAttachment(m.attachment));
  }

  wrap.appendChild(main);
  if (!compact) wrap.insertBefore(renderAvatar(m), main);
  wrap.appendChild(renderActions(m, isMine, isAdmin));

  return wrap;
}

function renderAttachment(att) {
  const box = document.createElement('div');
  box.className = 'chat-msg-attachment';

  const isImage = typeof att === 'string' && /\.(jpeg|jpg|gif|png|webp)$/i.test(att);

  if (isImage) {
    const img = document.createElement('img');
    img.src = '/' + att;
    img.alt = 'Вложение';
    img.loading = 'lazy';
    img.className = 'chat-attachment-img';
    img.addEventListener('click', () => window.open('/' + att, '_blank'));
    box.appendChild(img);
  } else {
    const a = document.createElement('a');
    a.href = '/' + att;
    a.download = '';
    a.className = 'chat-attachment-file';
    a.textContent = '📎 Скачать вложение';
    box.appendChild(a);
  }
  return box;
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

  if (m.is_deleted) return actions;

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

async function sendMessage(text) {
  const input = document.getElementById('chat-input');
  if (!input) return;

  let attachmentPath = null;
  if (pendingFile) {
    const fd = new FormData();
    fd.append('file', pendingFile);
    try {
      const res = await fetch('/api/chat_upload.php', {
        method: 'POST',
        headers: { 'X-CSRF-Token': window.__csrfToken || '' },
        credentials: 'same-origin',
        body: fd
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ошибка загрузки файла');
      attachmentPath = data.path;
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
      return;
    }
  }

  const payload = {
    channel_id: currentChannelId,
    text: text,
    reply_to_id: replyTo ? replyTo.id : 0
  };
  if (attachmentPath) payload.attachment = attachmentPath;

  try {
    const data = await Utils.apiRequest('/api/chat_messages.php?action=send', 'POST', payload);
    if (!data.success || !data.message) throw new Error(data.error || 'Не удалось отправить');

    if (!messages.find(m => m.id === data.message.id)) {
      messages.push(data.message);
      lastMaxId = data.message.id;
      renderMessages();
      scrollToBottom();
    }

    input.value = '';
    input.style.height = 'auto';
    clearReply();
    resetAttachment();
    updateSendButtonState();
    markRead();
  } catch (error) {
    Modal.alert({ title: 'Ошибка отправки', message: error.message, danger: true });
  }
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
    const data = await Utils.apiRequest('/api/chat_messages.php?action=edit', 'POST', { id: message.id, text: trimmed });
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
    const data = await Utils.apiRequest('/api/chat_messages.php?action=delete', 'POST', { id: message.id });
    if (data.success) {
      const local = messages.find(m => m.id === message.id);
      if (local) {
        local.is_deleted = 1;
        local.text = '';
        local.attachment = null;
      }
      renderMessages();
    }
  } catch (_) {}
}

function setReply(message) {
  replyTo = message;
  const bar = document.getElementById('chat-reply-preview');
  const text = bar.querySelector('.chat-reply-text');
  text.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = message.username;
  text.appendChild(strong);
  text.appendChild(document.createTextNode(': ' + truncate(message.text || 'вложение', 100)));

  bar.style.display = 'flex';

  if (window.visualViewport) {
    setTimeout(() => window.visualViewport.dispatchEvent(new Event('resize')), 10);
  }

  document.getElementById('chat-input').focus();
}

function clearReply() {
  replyTo = null;
  const bar = document.getElementById('chat-reply-preview');
  if (bar) bar.style.display = 'none';

  if (window.visualViewport) {
      setTimeout(() => window.visualViewport.dispatchEvent(new Event('resize')), 10);
  }
}

async function markRead() {
  if (!currentChannelId) return;
  if (document.hidden) return;
  if (markReadInFlight) return;
  if (!lastMaxId && messages.length) lastMaxId = messages[messages.length - 1].id;
  if (!lastMaxId) return;

  markReadInFlight = true;
  applyUnreadZero(currentChannelId);

  try {
    await Utils.apiRequest('/api/chat_channels.php?action=mark_read', 'POST', { channel_id: currentChannelId, last_read_message_id: lastMaxId });
  } catch (error) {
    console.warn('[markRead]', error);
  } finally {
    markReadInFlight = false;
  }
}

function applyUnreadZero(channelId) {
  const ch = channels.find(c => c.id === channelId);
  if (ch) ch.unread = 0;
  const badge = document.querySelector('.chat-channel[data-id="' + channelId + '"] .chat-channel-unread');
  if (badge) badge.remove();
}

async function loadStatuses() {
  const box = document.getElementById('chat-statuses');
  if (!box) return;
  try {
    const data = await Utils.apiRequest('/api/chat_status.php', 'GET');
    box.innerHTML = '';
    const groups = [
      { title: 'В сети', list: data.online, cls: 'online' },
      { title: 'Отошёл', list: data.away, cls: 'away' },
      { title: 'Не беспокоить', list: data.dnd, cls: 'dnd' },
      { title: 'Не в сети', list: data.offline, cls: 'offline' }
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

function startPolling() {
  clearPollers();
  pollChannelsTimer = setInterval(loadChannels, CHANNELS_POLL_INTERVAL);
  pollStatusTimer = setInterval(loadStatuses, STATUSES_POLL_INTERVAL);
}

function clearPollers() {
  if (pollChannelsTimer) { clearInterval(pollChannelsTimer); pollChannelsTimer = null; }
  if (pollStatusTimer) { clearInterval(pollStatusTimer); pollStatusTimer = null; }
  if (ws) { ws.close(); ws = null; }
  if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
}

function connectWebSocket() {
  if (!currentChannelId) return;

  const wsProto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const wsUrl = wsProto + location.host + '/ws?channel_id=' + currentChannelId;

  if (ws && currentWsUrl === wsUrl) {
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          return;
      }
  }

  if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
  }

  currentWsUrl = wsUrl;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] Connected to channel', currentChannelId);
    if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'typing') {
          const me = Auth.currentUser();
          if (me && data.username === me.username) return;

          typingUsers[data.username] = Date.now();
          renderTyping();
          return;
      }

      const msg = data.message || data;
      if (!msg || !msg.id) return;

      if (messages.find(m => m.id === msg.id)) return;

      messages.push(msg);
      lastMaxId = Math.max(lastMaxId, msg.id);
      renderMessages();
      scrollToBottom();
      markRead();
    } catch (e) {
      console.error('[WS] Parse error', e);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected. Reconnecting in 3s...');
    wsReconnectTimer = setTimeout(() => {
      if (currentChannelId) connectWebSocket();
    }, 3000);
  };

  ws.onerror = (err) => {
    console.error('[WS] Error', err);
  };
}

async function openCreateChannel() {
  const data = await Modal.form({
    title: 'Создать канал',
    okText: 'Создать',
    fields: [
      { name: 'name', label: 'Имя канала', required: true, placeholder: 'без # — например, общий', maxLength: 40 },
      { name: 'category', label: 'Категория', type: 'select', value: 'Разное', options: [
          { value: 'Основные', label: 'Основные' },
          { value: 'Игровые', label: 'Игровые' },
          { value: 'Разное', label: 'Разное' }
        ]
      },
      { name: 'description', label: 'Описание', type: 'textarea', placeholder: 'Необязательно', rows: 3 },
      { name: 'is_private', label: 'Приватный канал', type: 'checkbox', hint: 'Только админ и модераторы увидят канал' }
    ]
  });
  if (!data) return;

  try {
    const res = await Utils.apiRequest('/api/chat_channels.php?action=create', 'POST', {
      name: data.name, category: data.category, description: data.description, is_private: data.is_private
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

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;

      const vapidPublicKey = 'BAuEKgulJSLf2CcdvnbmknnxrY4dH41R4BkyYdDF6PQcoeJ-Wi0b5ttpOXCVBqUWwiYwMkQc-PbxoiJ8p8mmc9I';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
      });

      const subData = subscription.toJSON();

      await Utils.apiRequest('/api/push_subscribe.php', 'POST', {
          endpoint: subData.endpoint,
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth
      });
      console.log('[Push] Subscribed successfully!');
  } catch (e) {
      console.warn('[Push] Subscription failed', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const Chat = {
  load,
  stop,
  selectChannel,
  getCurrentChannelId,
  reset
};