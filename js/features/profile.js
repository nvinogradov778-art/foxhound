import { Utils } from '../core/utils.js';
import { Modal } from '../core/modal.js';
import { Auth } from '../core/auth.js';
import { EventLogistics } from './event-logistics.js';

let inFlight = null;

async function load() {
  const root = document.getElementById('profile-root');
  if (!root) return;

  const user = Auth.currentUser();
  if (!user) {
    root.innerHTML =
      '<div class="profile-guest">' +
        '<span class="material-icons">lock</span>' +
        '<h2>Требуется вход</h2>' +
        '<p class="text-secondary">Войдите в аккаунт, чтобы увидеть личный дашборд.</p>' +
      '</div>';
    return;
  }

  if (inFlight) return inFlight;

  root.innerHTML = '';
  root.appendChild(buildSkeleton());

  inFlight = (async () => {
    try {
      const [active, archived, pollsRaw, rsvpRaw] = await Promise.all([
        Utils.apiRequest('/api/events.php', 'GET').catch(() => []),
        Utils.apiRequest('/api/events.php?archived=1', 'GET').catch(() => []),
        Utils.apiRequest('/api/polls.php', 'GET').catch(() => []),
        Utils.apiRequest('/api/event_rsvp.php?my_all=1', 'GET').catch(() => ({ my_all: [] }))
      ]);

      const allEvents = [].concat(
        Array.isArray(active) ? active : [],
        Array.isArray(archived) ? archived : []
      );

      const rsvpMap = {};
      const myStatuses = rsvpRaw.my_all || [];
      allEvents.forEach(ev => {
        const match = myStatuses.find(s => s.event_id === ev.id);
        if (match) {
          rsvpMap[ev.id] = { event: ev, status: match.status };
        }
      });

      paint(root, user, rsvpMap, Array.isArray(pollsRaw) ? pollsRaw : [], allEvents);
    } catch (error) {
      console.error('[Profile.load]', error);
      root.innerHTML = '<div class="text-error text-center">Не удалось загрузить профиль</div>';
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function buildSkeleton() {
  const wrap = document.createElement('div');
  wrap.className = 'profile-loading';

  wrap.appendChild(buildSkeletonHeader());

  const grid = document.createElement('div');
  grid.className = 'profile-loading-grid';
  for (let i = 0; i < 4; i++) grid.appendChild(buildSkeletonWidget());
  wrap.appendChild(grid);

  return wrap;
}

function buildSkeletonHeader() {
  const header = document.createElement('div');
  header.className = 'profile-loading-header';

  const avatar = document.createElement('div');
  avatar.className = 'profile-loading-avatar';
  header.appendChild(avatar);

  const info = document.createElement('div');
  info.className = 'profile-loading-info';
  info.innerHTML =
    '<div class="profile-loading-line w-40"></div>' +
    '<div class="profile-loading-line w-25 h-sm"></div>' +
    '<div class="profile-loading-line w-55 h-sm"></div>';
  header.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'profile-loading-actions';
  actions.innerHTML =
    '<div class="profile-loading-btn"></div>' +
    '<div class="profile-loading-btn"></div>';
  header.appendChild(actions);

  return header;
}

function buildSkeletonWidget() {
  const card = document.createElement('div');
  card.className = 'profile-loading-widget';

  const head = document.createElement('div');
  head.className = 'profile-loading-widget-head';
  head.innerHTML =
    '<div class="profile-loading-icon"></div>' +
    '<div class="profile-loading-line w-40 h-sm"></div>';
  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'profile-loading-widget-body';
  for (let i = 0; i < 3; i++) {
    body.innerHTML +=
      '<div class="profile-loading-row">' +
        '<div class="profile-loading-line w-20 h-sm"></div>' +
        '<div class="profile-loading-line w-70"></div>' +
      '</div>';
  }
  card.appendChild(body);
  return card;
}

function paint(root, user, rsvpMap, polls, allEvents) {
  root.innerHTML = '';
  root.appendChild(buildHeader(user));

  const grid = document.createElement('div');
  grid.className = 'profile-grid';
  grid.appendChild(buildRsvpWidget(allEvents, rsvpMap));
  grid.appendChild(buildPollsWidget(polls));
  grid.appendChild(buildLogisticsWidget(allEvents, rsvpMap));
  grid.appendChild(buildBaseWidget());
  root.appendChild(grid);
}

function buildHeader(user) {
  const header = document.createElement('div');
  header.className = 'profile-header';

  header.appendChild(buildAvatar(user));

  const info = document.createElement('div');
  info.className = 'profile-info';

  const name = document.createElement('h1');
  name.className = 'profile-name';
  name.textContent = user.username || 'Боец';
  info.appendChild(name);

  const role = document.createElement('div');
  role.className = 'profile-role';
  role.textContent = (user.role === 'admin' || user.role === 'commander') ? 'Администратор' : 'Участник';
  info.appendChild(role);

  if (user.registered_at) {
    const meta = document.createElement('div');
    meta.className = 'profile-meta';
    const d = new Date(user.registered_at * 1000);
    meta.innerHTML = '<span class="material-icons">event</span> В команде с ' +
      d.toLocaleDateString('ru', { day: '2-digit', month: 'long', year: 'numeric' });
    info.appendChild(meta);
  }

  header.appendChild(info);
  header.appendChild(buildHeaderActions(user));

  if (user.about && String(user.about).trim()) {
    header.appendChild(buildAbout(user.about));
  }

  return header;
}

function buildAvatar(user) {
  const avatar = document.createElement('div');
  avatar.className = 'profile-avatar';

  if (user.avatar && user.avatar !== 'default.png') {
    const img = document.createElement('img');
    img.src = '/uploads/avatars/' + user.avatar;
    img.alt = user.username;
    img.onerror = function () {
      this.remove();
      avatar.innerHTML = '<span class="material-icons">person</span>';
    };
    avatar.appendChild(img);
  } else {
    avatar.innerHTML = '<span class="material-icons">person</span>';
  }

  return avatar;
}

function buildHeaderActions(user) {
  const actions = document.createElement('div');
  actions.className = 'profile-actions';

  if (user.role === 'admin' || user.role === 'commander') {
    const adminBtn = document.createElement('a');
    adminBtn.className = 'btn btn-secondary';
    adminBtn.href = '/admin/';
    adminBtn.target = '_blank';
    adminBtn.rel = 'noopener';
    adminBtn.innerHTML = '<span class="material-icons">admin_panel_settings</span> Админ-панель';
    actions.appendChild(adminBtn);

    if (user.role === 'commander') {
      const cmdBtn = document.createElement('a');
      cmdBtn.className = 'btn btn-primary';
      cmdBtn.href = '/admin/command.php';
      cmdBtn.target = '_blank';
      cmdBtn.rel = 'noopener';
      cmdBtn.innerHTML = '<span class="material-icons">military_tech</span> Командование';
      actions.insertBefore(cmdBtn, actions.firstChild);
    }
  }

  const settingsBtn = document.createElement('a');
  settingsBtn.className = 'btn btn-secondary';
  settingsBtn.href = '#/settings';
  settingsBtn.dataset.page = 'page-settings';
  settingsBtn.innerHTML = '<span class="material-icons">settings</span> Настройки';
  actions.appendChild(settingsBtn);

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.className = 'btn btn-danger';
  logoutBtn.innerHTML = '<span class="material-icons">logout</span> Выйти';
  logoutBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm({
      title: 'Выйти из аккаунта?',
      okText: 'Выйти',
      danger: true
    });
    if (confirmed) {
      await Auth.logout();
    }
  });
  actions.appendChild(logoutBtn);

  return actions;
}

function buildAbout(text) {
  const about = document.createElement('div');
  about.className = 'profile-about';

  const title = document.createElement('div');
  title.className = 'profile-about-title';
  title.innerHTML = '<span class="material-icons">info</span> О себе';
  about.appendChild(title);

  const body = document.createElement('div');
  body.className = 'profile-about-text';
  body.textContent = text;
  about.appendChild(body);

  return about;
}

function buildRsvpWidget(allEvents, rsvpMap) {
  const box = makeWidget('event', 'Ближайшие мероприятия');
  const body = box.querySelector('.profile-widget-body');

  const now = Math.floor(Date.now() / 1000);
  const upcoming = allEvents
    .filter(e => e.event_date >= now)
    .sort((a, b) => a.event_date - b.event_date)
    .slice(0, 5);

  if (!upcoming.length) {
    body.innerHTML = '<span class="text-muted">Ближайших мероприятий нет.</span>';
  } else {
    const STATUS = {
      going:     { label: 'Иду',          cls: 'badge-success' },
      maybe:     { label: 'Под вопросом', cls: 'badge-warning' },
      not_going: { label: 'Не иду',       cls: 'badge-error'   }
    };

    upcoming.forEach(ev => {
      const d = new Date(ev.event_date * 1000);
      const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

      const row = document.createElement('div');
      row.className = 'profile-event-row';

      const dateBox = document.createElement('div');
      dateBox.className = 'profile-event-date';
      dateBox.innerHTML =
        '<span class="profile-event-date-num">' + d.getDate() + '</span>' +
        '<span class="profile-event-date-month">' +
          d.toLocaleDateString('ru', { month: 'short' }) +
        '</span>';
      row.appendChild(dateBox);

      const content = document.createElement('div');
      content.className = 'profile-event-content';

      const title = document.createElement('div');
      title.className = 'profile-event-title';
      title.textContent = ev.title;
      content.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'profile-event-meta';
      const parts = [time];
      if (ev.location) parts.push(ev.location);
      meta.textContent = parts.join(' · ');
      content.appendChild(meta);

      row.appendChild(content);

      const status = document.createElement('div');
      status.className = 'profile-event-status';

      const rsvp = rsvpMap[ev.id];
      const badge = document.createElement('span');
      if (rsvp && STATUS[rsvp.status]) {
        badge.className = 'badge ' + STATUS[rsvp.status].cls;
        badge.textContent = STATUS[rsvp.status].label;
      } else {
        badge.className = 'badge';
        badge.textContent = 'Не отмечен';
      }
      status.appendChild(badge);
      row.appendChild(status);

      body.appendChild(row);
    });
  }

  box.appendChild(makeFooter('#/events', 'calendar_month', 'Календарь', 'page-events'));
  return box;
}

function buildPollsWidget(polls) {
  const box = makeWidget('how_to_vote', 'Активные голосования');
  const body = box.querySelector('.profile-widget-body');

  const now = Math.floor(Date.now() / 1000);
  const active = polls.filter(p => parseInt(p.expires_at, 10) > now);

  if (!active.length) {
    body.innerHTML = '<span class="text-muted">Активных голосований нет.</span>';
  } else {
    active.forEach(p => {
      const row = document.createElement('div');
      row.className = 'profile-poll-row';

      const content = document.createElement('div');
      content.className = 'profile-poll-content';

      const title = document.createElement('div');
      title.className = 'profile-poll-title';
      title.textContent = p.title;
      content.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'profile-poll-meta';
      const expires = new Date(p.expires_at * 1000);
      meta.textContent = 'до ' + expires.toLocaleDateString('ru', { day: '2-digit', month: 'short' });
      content.appendChild(meta);

      row.appendChild(content);

      const voted = (p.my_votes || []).length > 0;
      const status = document.createElement('span');
      status.className = 'badge ' + (voted ? 'badge-success' : 'badge-warning');
      status.textContent = voted ? 'Проголосовал' : 'Не голосовал';
      row.appendChild(status);

      body.appendChild(row);
    });
  }

  box.appendChild(makeFooter('#/polls', 'how_to_vote', 'Все голосования', 'page-polls'));
  return box;
}

function buildLogisticsWidget(allEvents, rsvpMap) {
  const box = makeWidget('local_shipping', 'Моя логистика');
  const body = box.querySelector('.profile-widget-body');
  body.innerHTML = '<span class="text-muted">Загрузка…</span>';

  const now = Math.floor(Date.now() / 1000);
  const upcoming = Object.values(rsvpMap)
    .filter(({ event, status }) => status === 'going' && event.event_date >= now)
    .sort((a, b) => a.event.event_date - b.event.event_date);

  if (!upcoming.length) {
    body.innerHTML = '<span class="text-muted">Нет предстоящих игр.</span>';
    box.appendChild(makeFooter('#/events', 'calendar_month', 'Календарь', 'page-events'));
    return box;
  }

  const ev = upcoming[0].event;

  (async () => {
    try {
      const data = await Utils.apiRequest(
        '/api/event_logistics.php?event_id=' + encodeURIComponent(ev.id),
        'GET'
      );
      paintLogisticsSummary(body, ev, data);
      box.appendChild(makeFooter('#/events', 'arrow_forward', 'К событию', 'page-events'));
    } catch (error) {
      console.error('[Profile.logisticsWidget]', error);
      body.innerHTML = '<span class="text-muted">Не удалось загрузить логистику.</span>';
      box.appendChild(makeFooter('#/events', 'calendar_month', 'Календарь', 'page-events'));
    }
  })();

  return box;
}

function paintLogisticsSummary(body, event, data) {
  body.innerHTML = '';

  const d = new Date(event.event_date * 1000);
  const dateStr = d.toLocaleDateString('ru', { day: '2-digit', month: 'long' });
  const timeStr = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  const evTitle = document.createElement('div');
  evTitle.className = 'profile-logistics-event';
  evTitle.textContent = event.title;
  body.appendChild(evTitle);

  const evMeta = document.createElement('div');
  evMeta.className = 'profile-logistics-meta';
  evMeta.textContent = dateStr + ' · ' + timeStr;
  body.appendChild(evMeta);

  const mine = data.mine || {};
  const myBooking = data.my_booking;

  if (mine.is_driver) {
    paintDriverRole(body, mine, data);
  } else if (mine.needs_ride) {
    paintRiderRole(body, mine, myBooking, data);
  } else {
    const empty = document.createElement('div');
    empty.className = 'profile-logistics-empty-big';
    empty.innerHTML =
      '<span class="material-icons">info</span>' +
      '<span>Логистика не заполнена</span>';
    body.appendChild(empty);
  }
}

function paintDriverRole(body, mine, data) {
  const role = document.createElement('div');
  role.className = 'profile-logistics-role is-driver';
  role.innerHTML =
    '<span class="material-icons">directions_car</span>' +
    '<span>Я — водитель</span>' +
    '<span class="profile-logistics-role-count">' + (mine.seats || 0) + ' мест</span>';
  body.appendChild(role);

  if (mine.pickup_point) {
    const area = document.createElement('div');
    area.className = 'profile-logistics-detail';
    area.innerHTML = '<span class="material-icons">place</span>';
    area.appendChild(document.createTextNode(mine.pickup_point));
    body.appendChild(area);
  }

  const me = Auth.currentUser();
  const meDriver = (data.drivers || []).find(x => x.user_id === me.id);

  if (meDriver && meDriver.booked_list && meDriver.booked_list.length) {
    const title = document.createElement('div');
    title.className = 'profile-logistics-subtitle';
    title.textContent = 'Забронировали место:';
    body.appendChild(title);

    meDriver.booked_list.forEach(p => {
      const row = document.createElement('div');
      row.className = 'profile-logistics-passenger';
      row.innerHTML = '<span class="material-icons">how_to_reg</span>';
      row.appendChild(document.createTextNode(p.rider_username));
      body.appendChild(row);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'profile-logistics-empty';
    empty.textContent = 'Пока никто не забронировал';
    body.appendChild(empty);
  }
}

function paintRiderRole(body, mine, myBooking, data) {
  const role = document.createElement('div');
  role.className = 'profile-logistics-role is-rider';
  role.innerHTML =
    '<span class="material-icons">person_pin_circle</span>' +
    '<span>Нужно место</span>';
  body.appendChild(role);

  if (mine.ride_area) {
    const area = document.createElement('div');
    area.className = 'profile-logistics-detail';
    area.innerHTML = '<span class="material-icons">place</span>';
    area.appendChild(document.createTextNode(mine.ride_area));
    body.appendChild(area);
  }

  if (myBooking && myBooking.driver_id) {
    const driver = (data.drivers || []).find(x => x.user_id === myBooking.driver_id);
    if (driver) {
      const line = document.createElement('div');
      line.className = 'profile-logistics-booked';
      line.innerHTML = '<span class="material-icons">check_circle</span>Забронировано у ';
      const strong = document.createElement('strong');
      strong.textContent = driver.username;
      line.appendChild(strong);
      body.appendChild(line);

      if (driver.pickup_point) {
        const area = document.createElement('div');
        area.className = 'profile-logistics-detail';
        area.innerHTML = '<span class="material-icons">place</span>';
        area.appendChild(document.createTextNode(driver.pickup_point));
        body.appendChild(area);
      }
    }
  } else {
    const empty = document.createElement('div');
    empty.className = 'profile-logistics-empty';
    empty.textContent = 'Место ещё не забронировано';
    body.appendChild(empty);
  }
}

function buildBaseWidget() {
  const box = document.createElement('article');
  box.className = 'profile-widget profile-widget-base';

  const head = document.createElement('div');
  head.className = 'profile-widget-head';
  head.innerHTML = '<span class="material-icons">memory</span><span>База</span>';
  box.appendChild(head);

  const body = document.createElement('div');
  body.className = 'profile-widget-body base-body';
  body.innerHTML = '<span class="text-muted">Загрузка…</span>';
  box.appendChild(body);

  Utils.apiRequest('/api/base_stats.php', 'GET')
    .then(data => paintBaseStats(body, data.stats))
    .catch(() => {
      body.innerHTML = '<span class="text-muted">Нет данных</span>';
    });

  return box;
}

function paintBaseStats(body, data) {
  if (!data) {
    body.innerHTML = '<span class="text-muted">Нет данных</span>';
    return;
  }

  const rows = [
    { key: 'Оперативники', value: data.operators,    icon: 'groups' },
    { key: 'Сценарии',     value: data.scenarios,    icon: 'movie' },
    { key: 'Девайсы',      value: data.devices,      icon: 'build' },
    { key: 'Радио',        value: data.radio,        icon: 'radio' },
    { key: 'Фотографии',   value: data.photos,       icon: 'photo_library' },
    { key: 'События',      value: data.events,       icon: 'event' },
    { key: 'Инструкции',   value: data.instructions, icon: 'description' },
    { key: 'Сообщения',    value: data.messages,     icon: 'chat' }
  ];

  body.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'base-grid';

  rows.forEach(r => {
    const row = document.createElement('div');
    row.className = 'base-row';
    row.innerHTML =
      '<span class="base-icon material-icons">' + r.icon + '</span>' +
      '<span class="base-key">' + r.key + '</span>' +
      '<span class="base-dots"></span>' +
      '<span class="base-value">' + r.value + '</span>';
    grid.appendChild(row);
  });

  body.appendChild(grid);

  const total = rows.reduce((sum, r) => sum + (r.value || 0), 0);
  const totalRow = document.createElement('div');
  totalRow.className = 'base-total';
  totalRow.innerHTML =
    '<span class="base-total-label">Всего единиц</span>' +
    '<span class="base-total-value">' + total + '</span>';
  body.appendChild(totalRow);
}

function makeWidget(icon, title) {
  const box = document.createElement('article');
  box.className = 'profile-widget';

  const head = document.createElement('div');
  head.className = 'profile-widget-head';
  head.innerHTML =
    '<span class="material-icons">' + icon + '</span>' +
    '<span>' + title + '</span>';
  box.appendChild(head);

  const body = document.createElement('div');
  body.className = 'profile-widget-body';
  box.appendChild(body);

  return box;
}

function makeFooter(href, icon, label, pageId) {
  const footer = document.createElement('div');
  footer.className = 'profile-widget-footer';
  const a = document.createElement('a');
  a.href = href;
  a.className = 'btn btn-secondary btn-sm';
  a.dataset.page = pageId;
  a.innerHTML = '<span class="material-icons">' + icon + '</span>' + label;
  footer.appendChild(a);
  return footer;
}

export const Profile = { load };