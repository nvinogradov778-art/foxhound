(function () {
  'use strict';
  if (!window.Utils) throw new Error('[events] utils.js must load first');
  if (!window.Modal) throw new Error('[events] modal.js must load first');
  if (!window.EventLogistics) throw new Error('[events] event-logistics.js must load first');

  const CACHE_TTL = 30 * 1000;
  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  let currentDate = new Date();
  let selectedDate = null;
  let eventsCache = [];
  let showArchived = false;
  let loading = false;
  let loadedAt = 0;

  async function load(options = {}) {
    const root = document.getElementById('events-root');
    if (!root) return;

    if (loading) return;
    if (!options.force && Date.now() - loadedAt < CACHE_TTL && eventsCache.length) return;

    loading = true;

    try {
      const data = await Utils.apiRequest(
        '/api/events.php?archived=' + (showArchived ? 1 : 0),
        'GET'
      );
      eventsCache = Array.isArray(data) ? data : [];

      if (!selectedDate) {
        selectedDate = pickInitialDate();
      }

      render(root);
      loadedAt = Date.now();
    } catch (error) {
      if (error.status === 401) {
        root.innerHTML = '<div class="text-muted text-center">Войдите, чтобы видеть события</div>';
      } else {
        console.error('[Events.load]', error);
        root.innerHTML = '';
        root.appendChild(Utils.emptyState(
          'error_outline',
          'Ошибка загрузки',
          'Не удалось загрузить события'
        ));
      }
    } finally {
      loading = false;
    }
  }

  function pickInitialDate() {
    const today = new Date();
    const todayStr = today.toDateString();

    const hasToday = eventsCache.some(ev =>
      new Date(ev.event_date * 1000).toDateString() === todayStr
    );
    if (hasToday) return today;

    if (eventsCache.length) {
      const sorted = eventsCache.slice().sort((a, b) => a.event_date - b.event_date);
      const first = sorted.find(ev => ev.event_date * 1000 >= Date.now()) || sorted[0];
      const date = new Date(first.event_date * 1000);
      currentDate = new Date(date);
      return date;
    }

    return null;
  }

  function render(root) {
    root.innerHTML = '';

    root.appendChild(renderBar());

    const layout = document.createElement('div');
    layout.className = 'events-layout';

    const calendarBox = document.createElement('div');
    calendarBox.className = 'events-calendar';
    renderCalendar(calendarBox);
    layout.appendChild(calendarBox);

    const listBox = document.createElement('div');
    listBox.className = 'events-list';
    renderDayEvents(listBox);
    layout.appendChild(listBox);

    root.appendChild(layout);
  }

  function renderBar() {
    const bar = document.createElement('div');
    bar.className = 'events-bar';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-secondary btn-sm';
    toggle.innerHTML = showArchived
      ? '<span class="material-icons">arrow_back</span> К активным'
      : '<span class="material-icons">archive</span> Архив';
    toggle.addEventListener('click', () => {
      showArchived = !showArchived;
      selectedDate = null;
      eventsCache = [];
      loadedAt = 0;
      load({ force: true });
    });
    bar.appendChild(toggle);

    const user = window.Auth && window.Auth.currentUser();
    if (user && user.role === 'admin' && !showArchived) {
      const createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'btn btn-primary btn-sm';
      createBtn.innerHTML = '<span class="material-icons">add</span> Создать событие';
      createBtn.addEventListener('click', () => openEventModal(null));
      bar.appendChild(createBtn);
    }

    return bar;
  }

  // ---------- Календарь ----------

  function renderCalendar(box) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    box.appendChild(renderCalendarHead(year, month));

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const table = document.createElement('table');
    table.className = 'calendar-table';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Пн</th><th>Вт</th><th>Ср</th><th>Чт</th><th>Пт</th><th>Сб</th><th>Вс</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let row = document.createElement('tr');

    for (let i = 0; i < startOffset; i++) row.appendChild(document.createElement('td'));

    for (let d = 1; d <= daysInMonth; d++) {
      row.appendChild(renderDayCell(year, month, d));
      if ((d + startOffset) % 7 === 0) {
        tbody.appendChild(row);
        row = document.createElement('tr');
      }
    }

    if (row.children.length) {
      while (row.children.length < 7) row.appendChild(document.createElement('td'));
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    box.appendChild(table);

    box.appendChild(renderLegend());
  }

  function renderCalendarHead(year, month) {
    const head = document.createElement('div');
    head.className = 'calendar-head';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'calendar-nav';
    prev.innerHTML = '<span class="material-icons">chevron_left</span>';
    prev.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      rerenderAll();
    });
    head.appendChild(prev);

    const title = document.createElement('div');
    title.className = 'calendar-title';
    title.innerHTML =
      '<span class="calendar-title-month">' + MONTHS[month] + '</span>' +
      '<span class="calendar-title-year">' + year + '</span>';
    head.appendChild(title);

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'calendar-nav';
    next.innerHTML = '<span class="material-icons">chevron_right</span>';
    next.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      rerenderAll();
    });
    head.appendChild(next);

    return head;
  }

  function renderDayCell(year, month, day) {
    const dateObj = new Date(year, month, day);
    const ts = Math.floor(dateObj.getTime() / 1000);

    const dayEvents = eventsCache.filter(ev => {
      const d = new Date(ev.event_date * 1000);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

    const today = new Date();
    const isToday = day === today.getDate()
      && month === today.getMonth()
      && year === today.getFullYear();

    const isSelected = selectedDate
      && selectedDate.getFullYear() === year
      && selectedDate.getMonth() === month
      && selectedDate.getDate() === day;

    const cell = document.createElement('td');
    cell.className = 'calendar-day';
    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');
    if (dayEvents.length) cell.classList.add('has-event');
    cell.dataset.ts = ts;

    const num = document.createElement('span');
    num.className = 'calendar-day-num';
    num.textContent = day;
    cell.appendChild(num);

    if (dayEvents.length) {
      const dots = document.createElement('span');
      dots.className = 'calendar-day-dots';
      const count = Math.min(dayEvents.length, 3);
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = 'calendar-day-dot';
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
    }

    cell.addEventListener('click', function () {
      selectedDate = new Date(parseInt(this.dataset.ts, 10) * 1000);
      rerenderAll();
    });

    return cell;
  }

  function renderLegend() {
    const legend = document.createElement('div');
    legend.className = 'calendar-legend';
    legend.innerHTML =
      '<div class="calendar-legend-item">' +
        '<span class="calendar-legend-dot legend-today"></span><span>Сегодня</span>' +
      '</div>' +
      '<div class="calendar-legend-item">' +
        '<span class="calendar-legend-dot legend-event"></span><span>Есть события</span>' +
      '</div>';
    return legend;
  }

  function rerenderAll() {
    const root = document.getElementById('events-root');
    if (root) render(root);
  }

  // ---------- Список событий ----------

  function renderDayEvents(box) {
    box.innerHTML = '';

    if (!selectedDate) {
      box.appendChild(Utils.emptyState(
        'event_note',
        'Выберите дату',
        'Клик по дню в календаре — покажем события'
      ));
      return;
    }

    const dayEvents = getEventsForSelectedDate();

    box.appendChild(renderDayHead(dayEvents));

    if (!dayEvents.length) {
      box.appendChild(Utils.emptyState(
        'event_busy',
        'Событий нет',
        'На эту дату ничего не запланировано'
      ));
      return;
    }

    const list = document.createElement('div');
    list.className = 'events-cards';
    dayEvents.forEach(ev => list.appendChild(renderEventCard(ev)));
    box.appendChild(list);
  }

  function getEventsForSelectedDate() {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();

    return eventsCache
      .filter(ev => {
        const dt = new Date(ev.event_date * 1000);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
      })
      .sort((a, b) => a.event_date - b.event_date);
  }

  function renderDayHead(dayEvents) {
    const head = document.createElement('div');
    head.className = 'events-list-head';

    const dateText = document.createElement('div');
    dateText.className = 'events-list-date';

    const day = document.createElement('span');
    day.className = 'events-list-day';
    day.textContent = selectedDate.getDate();
    dateText.appendChild(day);

    const meta = document.createElement('div');
    meta.className = 'events-list-meta';

    const weekday = document.createElement('span');
    weekday.className = 'events-list-weekday';
    weekday.textContent = selectedDate.toLocaleDateString('ru', { weekday: 'long' });
    meta.appendChild(weekday);

    const month = document.createElement('span');
    month.className = 'events-list-month';
    month.textContent = selectedDate.toLocaleDateString('ru', { month: 'long', year: 'numeric' });
    meta.appendChild(month);

    dateText.appendChild(meta);
    head.appendChild(dateText);

    if (dayEvents.length) {
      const counter = document.createElement('span');
      counter.className = 'badge badge-accent';
      const n = dayEvents.length;
      const suffix = n === 1 ? 'ие' : n < 5 ? 'ия' : 'ий';
      counter.textContent = n + ' событ' + suffix;
      head.appendChild(counter);
    }

    return head;
  }

  function renderEventCard(ev) {
    const card = document.createElement('article');
    card.className = 'event-card';

    const time = new Date(ev.event_date * 1000);

    const head = document.createElement('div');
    head.className = 'event-card-head';

    const timeEl = document.createElement('div');
    timeEl.className = 'event-card-time';
    timeEl.textContent = time.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    head.appendChild(timeEl);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'event-card-title-wrap';

    const title = document.createElement('h3');
    title.className = 'event-card-title';
    title.textContent = ev.title;
    titleWrap.appendChild(title);

    if (ev.location) {
      const loc = document.createElement('div');
      loc.className = 'event-card-location';
      loc.innerHTML = '<span class="material-icons">place</span>';
      loc.appendChild(document.createTextNode(ev.location));
      titleWrap.appendChild(loc);
    }

    head.appendChild(titleWrap);

    const user = window.Auth && window.Auth.currentUser();
    if (user && user.role === 'admin') {
      head.appendChild(renderAdminActions(ev));
    }

    card.appendChild(head);

    if (ev.description) {
      const desc = document.createElement('div');
      desc.className = 'event-card-desc';
      desc.textContent = ev.description;
      card.appendChild(desc);
    }

    const rsvpBox = document.createElement('div');
    rsvpBox.className = 'event-card-rsvp';
    rsvpBox.dataset.eventId = ev.id;
    rsvpBox.innerHTML = '<div class="text-muted">Загрузка…</div>';
    card.appendChild(rsvpBox);

    const logisticsBox = document.createElement('div');
    logisticsBox.className = 'event-card-logistics';
    logisticsBox.style.display = 'none';
    card.appendChild(logisticsBox);

    loadRsvp(ev.id, rsvpBox, () => {
      EventLogistics.render(ev.id, logisticsBox, rsvpBox);
    });

    return card;
  }

  function renderAdminActions(ev) {
    const actions = document.createElement('div');
    actions.className = 'event-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'event-card-action';
    editBtn.title = 'Редактировать';
    editBtn.innerHTML = '<span class="material-icons">edit</span>';
    editBtn.addEventListener('click', () => openEventModal(ev));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'event-card-action event-card-action-danger';
    delBtn.title = 'Удалить';
    delBtn.innerHTML = '<span class="material-icons">delete</span>';
    delBtn.addEventListener('click', () => deleteEvent(ev));
    actions.appendChild(delBtn);

    return actions;
  }

  // ---------- RSVP ----------

  async function loadRsvp(eventId, container, onDone) {
    try {
      const data = await Utils.apiRequest(
        '/api/event_rsvp.php?event_id=' + encodeURIComponent(eventId),
        'GET'
      );
      renderRsvp(eventId, container, data);
      if (onDone) onDone();
    } catch (error) {
      console.error('[Events.loadRsvp]', error);
      container.innerHTML = '';
      container.appendChild(Utils.emptyState(
        'error_outline',
        'Ошибка загрузки',
        null
      ));
      if (onDone) onDone();
    }
  }

  function renderRsvp(eventId, container, data) {
    container.innerHTML = '';
    container.dataset.myStatus = data.my_status || '';

    const counts = data.counts || { going: 0, maybe: 0, not_going: 0 };
    const responses = data.responses || [];

    const user = window.Auth && window.Auth.currentUser();
    if (user) {
      container.appendChild(renderRsvpButtons(eventId, data.my_status, container));
    }

    container.appendChild(renderRsvpCounters(counts));

    if (responses.length) {
      container.appendChild(renderRsvpList(responses));
    }
  }

  function renderRsvpButtons(eventId, myStatus, container) {
    const OPTIONS = [
      { status: 'going',     label: 'Иду',          cls: 'rsvp-btn-going' },
      { status: 'maybe',     label: 'Под вопросом', cls: 'rsvp-btn-maybe' },
      { status: 'not_going', label: 'Не иду',       cls: 'rsvp-btn-not'   }
    ];

    const row = document.createElement('div');
    row.className = 'rsvp-buttons';

    OPTIONS.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm rsvp-btn ' + opt.cls;
      if (myStatus === opt.status) btn.classList.add('active');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => submitRsvp(eventId, opt.status, container));
      row.appendChild(btn);
    });

    return row;
  }

  function renderRsvpCounters(counts) {
    const box = document.createElement('div');
    box.className = 'rsvp-counters';
    box.innerHTML =
      '<span class="rsvp-counter rsvp-counter-going">Идут: ' + counts.going + '</span>' +
      '<span class="rsvp-counter rsvp-counter-maybe">Под вопросом: ' + counts.maybe + '</span>' +
      '<span class="rsvp-counter rsvp-counter-not">Не идут: ' + counts.not_going + '</span>';
    return box;
  }

  function renderRsvpList(responses) {
    const list = document.createElement('div');
    list.className = 'rsvp-list';

    responses.forEach(r => {
      const item = document.createElement('div');
      item.className = 'rsvp-item rsvp-item-' + r.status;

      const name = document.createElement('span');
      name.className = 'rsvp-name';
      name.textContent = r.username;
      item.appendChild(name);

      if (r.comment && r.comment.trim()) {
        const sep = document.createElement('span');
        sep.className = 'rsvp-sep';
        sep.textContent = ' — ';
        item.appendChild(sep);

        const comment = document.createElement('span');
        comment.className = 'rsvp-comment';
        comment.textContent = r.comment;
        item.appendChild(comment);
      }

      list.appendChild(item);
    });

    return list;
  }

  async function submitRsvp(eventId, status, container) {
    try {
      await Utils.apiRequest('/api/event_rsvp.php', 'POST', {
        event_id: eventId,
        status: status,
        comment: ''
      });

      const card = container.closest('.event-card');
      const logisticsBox = card ? card.querySelector('.event-card-logistics') : null;

      loadRsvp(eventId, container, () => {
        if (logisticsBox) EventLogistics.render(eventId, logisticsBox, container);
      });
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось сохранить ответ',
        danger: true
      });
    }
  }

  // ---------- Модалка создания/редактирования ----------

  function openEventModal(ev) {
    const modal = document.getElementById('event-modal');
    if (!modal) return;

    const titleEl = document.getElementById('event-modal-title');
    const form = document.getElementById('event-form');

    if (ev) {
      titleEl.textContent = 'Редактировать событие';
      form.querySelector('#event-id').value = ev.id;
      form.querySelector('#event-title').value = ev.title || '';
      form.querySelector('#event-desc').value = ev.description || '';
      form.querySelector('#event-location').value = ev.location || '';

      const d = new Date(ev.event_date * 1000);
      form.querySelector('#event-date').value = formatDateInput(d);
      form.querySelector('#event-time').value = formatTimeInput(d);
    } else {
      titleEl.textContent = 'Создать событие';
      form.reset();
      form.querySelector('#event-id').value = '';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      form.querySelector('#event-date').value = formatDateInput(tomorrow);
      form.querySelector('#event-time').value = formatTimeInput(tomorrow);
    }

    modal.classList.add('active');
  }

  function closeEventModal() {
    const modal = document.getElementById('event-modal');
    if (modal) modal.classList.remove('active');
  }

  function formatDateInput(date) {
    const pad = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatTimeInput(date) {
    const pad = n => String(n).padStart(2, '0');
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function initModal() {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const closeBtn = document.getElementById('event-modal-close');
    if (!modal || !form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    closeBtn?.addEventListener('click', closeEventModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closeEventModal();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const id = form.querySelector('#event-id').value;
      const title = form.querySelector('#event-title').value.trim();
      const description = form.querySelector('#event-desc').value.trim();
      const location = form.querySelector('#event-location').value.trim();
      const dateValue = form.querySelector('#event-date').value;
      const timeValue = form.querySelector('#event-time').value;

      if (!title || !dateValue || !timeValue) {
        Modal.alert({ title: 'Заполните обязательные поля', danger: true });
        return;
      }

      const ts = Math.floor(new Date(dateValue + 'T' + timeValue).getTime() / 1000);
      if (!ts || isNaN(ts)) {
        Modal.alert({ title: 'Некорректная дата', danger: true });
        return;
      }

      const payload = {
        action: id ? 'update' : 'create',
        title,
        description,
        event_date: ts,
        location
      };
      if (id) payload.event_id = parseInt(id, 10);

      try {
        await Utils.apiRequest('/api/events.php', 'POST', payload);
        closeEventModal();
        load({ force: true });
      } catch (error) {
        Modal.alert({
          title: 'Ошибка',
          message: error.message || 'Не удалось сохранить событие',
          danger: true
        });
      }
    });
  }

  async function deleteEvent(ev) {
    const confirmed = await Modal.confirm({
      title: 'Удалить событие «' + ev.title + '»?',
      message: 'Все RSVP и логистика будут удалены безвозвратно.',
      danger: true,
      okText: 'Удалить'
    });
    if (!confirmed) return;

    try {
      await Utils.apiRequest('/api/events.php', 'DELETE', { event_id: ev.id });
      load({ force: true });
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось удалить',
        danger: true
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModal);
  } else {
    initModal();
  }

  window.Events = { load };
})();