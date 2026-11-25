import { Utils } from '../core/utils.js';
import { Modal } from '../core/modal.js';
import { Auth } from '../core/auth.js';

const CACHE_TTL = 30 * 1000;

let polls = [];
let showArchived = false;
let loading = false;
let loadedAt = 0;

async function load(options = {}) {
  const root = document.getElementById('polls-root');
  if (!root) return;
  if (loading) return;
  if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;

  loading = true;

  const hasContent = root.querySelector('.poll-card, .empty-state');
  if (!hasContent) {
    root.innerHTML = '';
    root.appendChild(createSkeleton(3));
  }

  try {
    const url = '/api/polls.php' + (showArchived ? '?archived=1' : '');
    const data = await Utils.apiRequest(url, 'GET');
    polls = Array.isArray(data.polls) ? data.polls : [];
    render(root);
    loadedAt = Date.now();
  } catch (error) {
    if (error.status === 401) {
      root.innerHTML = '<div class="poll-empty">Войдите, чтобы видеть голосования</div>';
    } else {
      console.error('[Polls.load]', error);
      root.innerHTML = '';
      root.appendChild(Utils.emptyState('error_outline', 'Ошибка загрузки', 'Не удалось загрузить голосования'));
    }
  } finally {
    loading = false;
  }
}

function render(root) {
  root.innerHTML = '';
  root.appendChild(renderBar());

  if (!polls.length) {
    root.appendChild(Utils.emptyState(
      showArchived ? 'archive' : 'how_to_vote',
      showArchived ? 'Архив пуст' : 'Голосований нет',
      showArchived ? 'Завершённые голосования будут здесь' : 'Активных голосований сейчас нет'
    ));
    return;
  }

  const list = document.createElement('div');
  list.className = 'polls-list';
  polls.forEach(poll => list.appendChild(renderPoll(poll)));
  root.appendChild(list);
}

function renderBar() {
  const bar = document.createElement('div');
  bar.className = 'polls-bar';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-secondary btn-sm';
  toggle.innerHTML = showArchived
    ? '<span class="material-icons">arrow_back</span> К активным'
    : '<span class="material-icons">archive</span> Архив';
  toggle.addEventListener('click', () => {
    showArchived = !showArchived;
    load({ force: true });
  });
  bar.appendChild(toggle);

  const user = Auth.currentUser();
  if (user && (user.role === 'admin' || user.role === 'commander') && !showArchived) {
    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'btn btn-primary btn-sm';
    createBtn.innerHTML = '<span class="material-icons">add</span> Создать опрос';
    createBtn.addEventListener('click', openCreateModal);
    bar.appendChild(createBtn);
  }

  return bar;
}

function renderPoll(poll) {
  const card = document.createElement('article');
  card.className = 'poll-card';

  const isActive = poll.expires_at > Math.floor(Date.now() / 1000);
  const options = poll.options || [];
  const votes = poll.vote_counts || [];
  const total = poll.total_votes || 0;
  const myVotes = poll.my_votes || [];
  const type = poll.type || 'single';

  const head = document.createElement('div');
  head.className = 'poll-head';

  const title = document.createElement('h3');
  title.className = 'poll-title';
  title.textContent = poll.title;
  head.appendChild(title);

  const status = document.createElement('span');
  status.className = 'badge ' + (isActive ? 'badge-success' : 'badge-error');
  status.textContent = isActive ? 'Активен' : 'Завершён';
  head.appendChild(status);

  card.appendChild(head);

  const meta = document.createElement('div');
  meta.className = 'poll-meta';
  const expires = new Date(poll.expires_at * 1000);
  meta.textContent = (type === 'multiple' ? 'Множественный' : 'Одиночный')
    + ' · до ' + expires.toLocaleDateString('ru', { day: '2-digit', month: 'short' });
  card.appendChild(meta);

  const optionsBox = document.createElement('div');
  optionsBox.className = 'poll-options';

  options.forEach((label, index) => {
    const count = votes[index] || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    const checked = myVotes.includes(index);

    optionsBox.appendChild(renderOption({
      pollId: poll.id,
      type,
      index,
      label,
      count,
      percent,
      checked,
      disabled: !isActive
    }));
  });

  card.appendChild(optionsBox);
  card.appendChild(renderFooter(poll, isActive, total, type));

  return card;
}

function renderOption({ pollId, type, index, label, count, percent, checked, disabled }) {
  const row = document.createElement('label');
  row.className = 'poll-option' + (checked ? ' mine' : '');

  const input = document.createElement('input');
  input.type = type === 'multiple' ? 'checkbox' : 'radio';
  input.name = 'poll-' + pollId;
  input.value = index;
  input.checked = checked;
  input.disabled = disabled;
  row.appendChild(input);

  const content = document.createElement('div');
  content.className = 'poll-option-content';

  const head = document.createElement('div');
  head.className = 'poll-option-head';

  const name = document.createElement('span');
  name.className = 'poll-option-name';
  name.textContent = label;
  head.appendChild(name);

  const stats = document.createElement('span');
  stats.className = 'poll-option-stats';

  const countEl = document.createElement('span');
  countEl.className = 'poll-option-count';
  countEl.textContent = count;
  stats.appendChild(countEl);

  const percentEl = document.createElement('span');
  percentEl.className = 'poll-option-percent';
  percentEl.textContent = percent + '%';
  stats.appendChild(percentEl);

  head.appendChild(stats);
  content.appendChild(head);

  const bar = document.createElement('div');
  bar.className = 'poll-option-bar';

  const fill = document.createElement('div');
  fill.className = 'poll-option-fill';
  fill.style.width = percent + '%';
  bar.appendChild(fill);

  content.appendChild(bar);
  row.appendChild(content);
  return row;
}

function renderFooter(poll, isActive, total, type) {
  const footer = document.createElement('div');
  footer.className = 'poll-footer';

  if (isActive) {
    const myVotes = poll.my_votes || [];
    const voteBtn = document.createElement('button');
    voteBtn.type = 'button';
    voteBtn.className = 'btn btn-primary btn-sm';
    voteBtn.innerHTML = '<span class="material-icons">check</span>'
      + (myVotes.length ? 'Изменить голос' : 'Отправить');
    voteBtn.addEventListener('click', () => {
      if (type === 'multiple') submitMultiple(poll.id);
      else submitSingle(poll.id);
    });
    footer.appendChild(voteBtn);
  }

  const totalEl = document.createElement('span');
  totalEl.className = 'poll-total';
  totalEl.textContent = 'Всего голосов: ' + total;
  footer.appendChild(totalEl);

  const user = Auth.currentUser();
  if (user && (user.role === 'admin' || user.role === 'commander')) {
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-ghost btn-sm poll-delete';
    delBtn.title = 'Удалить опрос';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', async () => {
      const confirmed = await Modal.confirm({
        title: 'Удалить опрос?',
        message: '«' + poll.title + '» будет удалён вместе с голосами.',
        danger: true,
        okText: 'Удалить'
      });
      if (confirmed) deletePoll(poll.id);
    });
    footer.appendChild(delBtn);
  }

  return footer;
}

function submitSingle(pollId) {
  const selected = document.querySelector('input[name="poll-' + pollId + '"]:checked');
  if (!selected) {
    Modal.alert({ title: 'Выберите вариант', danger: true });
    return;
  }
  submitVote(pollId, [parseInt(selected.value, 10)]);
}

function submitMultiple(pollId) {
  const checked = document.querySelectorAll('input[name="poll-' + pollId + '"]:checked');
  if (!checked.length) {
    Modal.alert({ title: 'Выберите хотя бы один вариант', danger: true });
    return;
  }
  const indexes = Array.from(checked).map(cb => parseInt(cb.value, 10));
  submitVote(pollId, indexes);
}

async function submitVote(pollId, optionIndexes) {
  try {
    await Utils.apiRequest('/api/polls.php', 'POST', {
      action: 'vote',
      poll_id: pollId,
      option_indexes: optionIndexes
    });
    load({ force: true });
  } catch (error) {
    Modal.alert({
      title: 'Ошибка голосования',
      message: error.message || 'Не удалось сохранить голос',
      danger: true
    });
  }
}

async function deletePoll(pollId) {
  try {
    await Utils.apiRequest('/api/polls.php', 'DELETE', { poll_id: pollId });
    load({ force: true });
  } catch (error) {
    Modal.alert({
      title: 'Ошибка',
      message: error.message || 'Не удалось удалить опрос',
      danger: true
    });
  }
}

function openCreateModal() {
  const modal = document.getElementById('poll-create-modal');
  if (!modal) return;

  modal.classList.add('active');

  const form = modal.querySelector('#poll-create-form');
  if (form) form.reset();

  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(20, 0, 0, 0);

  const pad = n => String(n).padStart(2, '0');
  const dateInput = document.getElementById('poll-create-expires-date');
  const timeInput = document.getElementById('poll-create-expires-time');
  if (dateInput) dateInput.value = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  if (timeInput) timeInput.value = pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function closeCreateModal() {
  const modal = document.getElementById('poll-create-modal');
  if (modal) modal.classList.remove('active');
}

function initCreateForm() {
  const modal = document.getElementById('poll-create-modal');
  const form = document.getElementById('poll-create-form');
  const closeBtn = document.getElementById('poll-create-close');
  if (!modal || !form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  closeBtn?.addEventListener('click', closeCreateModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeCreateModal();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const title = document.getElementById('poll-create-title').value.trim();
    const type = document.getElementById('poll-create-type').value;
    const rawOptions = document.getElementById('poll-create-options').value.trim();
    const dateValue = document.getElementById('poll-create-expires-date').value;
    const timeValue = document.getElementById('poll-create-expires-time').value;

    if (!title) {
      Modal.alert({ title: 'Введите название', danger: true });
      return;
    }
    if (!rawOptions) {
      Modal.alert({ title: 'Введите варианты', danger: true });
      return;
    }
    if (!dateValue || !timeValue) {
      Modal.alert({ title: 'Укажите дату и время', danger: true });
      return;
    }

    const options = rawOptions.split('\n').map(s => s.trim()).filter(Boolean);
    if (options.length < 2) {
      Modal.alert({ title: 'Минимум 2 варианта', danger: true });
      return;
    }

    const expires = Math.floor(new Date(dateValue + 'T' + timeValue).getTime() / 1000);
    if (!expires || expires <= Math.floor(Date.now() / 1000)) {
      Modal.alert({ title: 'Дата должна быть в будущем', danger: true });
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Создаём...';

    try {
      await Utils.apiRequest('/api/polls.php', 'POST', {
        action: 'create',
        title,
        type,
        options,
        expires_at: expires
      });
      closeCreateModal();
      load({ force: true });
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось создать опрос',
        danger: true
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function createSkeleton(rows) {
  const wrap = document.createElement('div');
  wrap.className = 'skeleton-stack';
  for (let i = 0; i < rows; i++) {
    const line = document.createElement('div');
    line.className = 'skeleton skeleton-line';
    wrap.appendChild(line);
  }
  return wrap;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCreateForm);
} else {
  initCreateForm();
}

export const Polls = { load };