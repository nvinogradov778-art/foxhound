(function () {
  'use strict';
  if (!window.Utils) throw new Error('[widgets] utils.js must load first');

  const CACHE_TTL = 30 * 1000;

  let cachedEvents = null;
  let eventsFetchedAt = 0;
  let inFlightAll = null;

  // Один общий запрос событий для event-виджета и weather-виджета
  async function getEvents() {
    if (cachedEvents && Date.now() - eventsFetchedAt < CACHE_TTL) return cachedEvents;
    const data = await Utils.apiRequest('/api/events.php?archived=0', 'GET');
    cachedEvents = Array.isArray(data) ? data : [];
    eventsFetchedAt = Date.now();
    return cachedEvents;
  }

  function loadAll() {
    if (inFlightAll) return inFlightAll;
    inFlightAll = Promise.allSettled([
      loadEventWidget(),
      loadLogWidget(),
      loadPollsWidget(),
      loadWeatherWidget()
    ]).finally(() => { inFlightAll = null; });
    return inFlightAll;
  }

  // ---------- Виджет: события ----------

  async function loadEventWidget() {
    const body = document.getElementById('widget-event-body');
    if (!body) return;

    showSkeleton(body, 3);

    let events;
    try {
      events = await getEvents();
    } catch (error) {
      if (error.status === 401) {
        body.innerHTML = '<span class="text-muted">Войдите, чтобы видеть события</span>';
      } else {
        body.innerHTML = '';
        const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
        e.classList.add('empty-state-sm');
        body.appendChild(e);
        return;
      }
      return;
    }

    if (!events.length) {
      body.innerHTML = '';
      const e = Utils.emptyState('event_busy', 'Событий нет', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    events.sort((a, b) => a.event_date - b.event_date);
    const upcoming = events.slice(0, 3);

    const rsvps = await Promise.all(upcoming.map(ev =>
      Utils.apiRequest('/api/event_rsvp.php?event_id=' + encodeURIComponent(ev.id), 'GET')
        .catch(() => null)
    ));

    body.innerHTML = '';

    const main = document.createElement('div');
    main.className = 'widget-main';

    upcoming.forEach((ev, i) => {
      main.appendChild(renderEventItem(ev, rsvps[i]));
    });

    body.appendChild(main);
    body.appendChild(makeWidgetFooter('#/events', 'calendar_month', 'Расписание', 'page-events'));
  }

  function renderEventItem(ev, rsvp) {
    const d = new Date(ev.event_date * 1000);
    const daysLeft = daysUntil(d);

    let countdown;
    if (daysLeft <= 0) countdown = 'Сегодня';
    else if (daysLeft === 1) countdown = 'Завтра';
    else countdown = 'Через ' + daysLeft + ' дн.';

    const dateStr = d.toLocaleDateString('ru', { day: '2-digit', month: 'short', weekday: 'short' });
    const timeStr = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'widget-event-item';

    const head = document.createElement('div');
    head.className = 'widget-event-item-head';

    const cd = document.createElement('span');
    cd.className = 'widget-event-countdown';
    cd.textContent = countdown;
    head.appendChild(cd);

    const title = document.createElement('div');
    title.className = 'widget-event-title';
    title.textContent = ev.title;
    head.appendChild(title);

    item.appendChild(head);

    const meta = document.createElement('div');
    meta.className = 'widget-event-meta';
    meta.textContent = dateStr + ' · ' + timeStr + (ev.location ? ' · ' + ev.location : '');
    item.appendChild(meta);

    if (rsvp && rsvp.counts) {
      const box = document.createElement('div');
      box.className = 'widget-event-rsvp';
      box.innerHTML =
        '<span class="badge badge-success">Идут: ' + rsvp.counts.going + '</span>' +
        '<span class="badge badge-warning">Мб: ' + rsvp.counts.maybe + '</span>' +
        '<span class="badge badge-error">Не идут: ' + rsvp.counts.not_going + '</span>';
      item.appendChild(box);
    }

    return item;
  }

  // ---------- Виджет: журнал ----------

  async function loadLogWidget() {
    const body = document.getElementById('widget-log-body');
    if (!body) return;

    showSkeleton(body, 4);

    let logs;
    try {
      const data = await Utils.apiRequest('/api/logs.php', 'GET');
      logs = (data.logs || []).slice(0, 4);
    } catch (error) {
      body.innerHTML = '';
      const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    if (!logs.length) {
      body.innerHTML = '';
      const e = Utils.emptyState('history_edu', 'Журнал пуст', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    body.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'widget-log-list';

    logs.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'widget-log-row';

      if (entry.date) {
        const date = document.createElement('span');
        date.className = 'widget-log-date';
        date.textContent = entry.date;
        row.appendChild(date);
      }

      const text = document.createElement('span');
      text.className = 'widget-log-text';
      text.textContent = entry.text || '';
      if (entry.style) {
        try { text.style.cssText = entry.style; } catch (_) {}
      }
      row.appendChild(text);

      list.appendChild(row);
    });

    body.appendChild(list);
    body.appendChild(makeWidgetFooter('#/logs', 'history_edu', 'Весь журнал', 'page-logs'));
  }

  // ---------- Виджет: опросы ----------

  async function loadPollsWidget() {
    const body = document.getElementById('widget-polls-body');
    if (!body) return;

    showSkeleton(body, 3);

    let polls;
    try {
      const data = await Utils.apiRequest('/api/polls.php', 'GET');
      polls = Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.status === 401) {
        body.innerHTML = '<span class="text-muted">Войдите, чтобы видеть опросы</span>';
      } else {
        body.innerHTML = '';
        const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
        e.classList.add('empty-state-sm');
        body.appendChild(e);
        return;
      }
      return;
    }

    if (!polls.length) {
      body.innerHTML = '';
      const e = Utils.emptyState('how_to_vote', 'Опросов нет', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    const first = polls[0];
    const options = first.options || [];
    const votes = first.vote_counts || [];
    const totalVotes = first.total_votes || 0;
    const myVotes = first.my_votes || [];

    body.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'widget-event-title';
    title.textContent = first.title;
    body.appendChild(title);

    if (options.length) {
      const list = document.createElement('div');
      list.className = 'widget-poll-list';

      options.forEach((opt, idx) => {
        const count = votes[idx] || 0;
        const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const mine = myVotes.includes(idx);

        const row = document.createElement('div');
        row.className = 'widget-poll-row' + (mine ? ' mine' : '');

        const head = document.createElement('div');
        head.className = 'widget-poll-row-head';

        const optionEl = document.createElement('span');
        optionEl.className = 'widget-poll-option';
        optionEl.textContent = opt;
        head.appendChild(optionEl);

        const percentEl = document.createElement('span');
        percentEl.className = 'widget-poll-percent';
        percentEl.textContent = count + ' · ' + percent + '%';
        head.appendChild(percentEl);

        row.appendChild(head);

        const bar = document.createElement('div');
        bar.className = 'widget-poll-row-bar';
        const fill = document.createElement('div');
        fill.className = 'widget-poll-row-fill';
        fill.style.width = percent + '%';
        bar.appendChild(fill);
        row.appendChild(bar);

        list.appendChild(row);
      });

      body.appendChild(list);
    }

    if (polls.length > 1) {
      const more = document.createElement('div');
      more.className = 'widget-poll-more';
      more.textContent = 'Всего активных: ' + polls.length;
      body.appendChild(more);
    }

    body.appendChild(makeWidgetFooter('#/polls', 'how_to_vote', 'Голосовать', 'page-polls'));
  }

  // ---------- Виджет: погода ----------

  async function loadWeatherWidget() {
    const body = document.getElementById('widget-weather-body');
    if (!body) return;

    showSkeleton(body, 3);

    let events;
    try {
      events = await getEvents();
    } catch (error) {
      if (error.status === 401) {
        body.innerHTML = '<span class="text-muted">Войдите, чтобы видеть прогноз</span>';
      } else {
        body.innerHTML = '';
        const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
        e.classList.add('empty-state-sm');
        body.appendChild(e);
        return;
      }
      return;
    }

    if (!events.length) {
      body.innerHTML = '';
      const e = Utils.emptyState('wb_sunny', 'Событий нет', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    events.sort((a, b) => a.event_date - b.event_date);
    const ev = events[0];
    const evDate = new Date(ev.event_date * 1000);

    // TODO: вынести в конфиг — сейчас хардкод Мурманска
    const LAT = 61.0042;
    const LNG = 69.0019;
    const dateStr = evDate.toISOString().slice(0, 10);

    let weather;
    try {
      weather = await Utils.apiRequest(
        '/api/weather.php?lat=' + LAT + '&lng=' + LNG + '&date=' + encodeURIComponent(dateStr),
        'GET'
      );
    } catch (error) {
      console.error('[Widgets.weather]', error);
      body.innerHTML = '';
      const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    if (!weather.daily || !weather.daily.time || !weather.daily.time.length) {
      body.innerHTML = '';
      const e = Utils.emptyState('error_outline', 'Ошибка загрузки', null);
      e.classList.add('empty-state-sm');
      body.appendChild(e);
      return;
    }

    const d = weather.daily;
    const code = d.weather_code[0];
    const tMax = d.temperature_2m_max[0];
    const tMin = d.temperature_2m_min[0];
    const precip = d.precipitation_probability_max[0];
    const wind = d.wind_speed_10m_max[0];

    body.innerHTML = '';

    const main = document.createElement('div');
    main.className = 'widget-main';

    const evTitle = document.createElement('div');
    evTitle.className = 'widget-event-title';
    evTitle.textContent = ev.title;
    main.appendChild(evTitle);

    const evMeta = document.createElement('div');
    evMeta.className = 'widget-event-meta';
    evMeta.textContent = evDate.toLocaleDateString('ru', { day: '2-digit', month: 'long', weekday: 'short' });
    main.appendChild(evMeta);

    const weatherBox = document.createElement('div');
    weatherBox.className = 'widget-weather-main';

    const iconEl = document.createElement('div');
    iconEl.className = 'widget-weather-icon';
    iconEl.innerHTML = '<span class="material-icons">' + weatherCodeToIcon(code) + '</span>';
    weatherBox.appendChild(iconEl);

    const tempEl = document.createElement('div');
    tempEl.className = 'widget-weather-temp';
    tempEl.textContent = Math.round(tMax) + '°';
    weatherBox.appendChild(tempEl);

    const labelEl = document.createElement('div');
    labelEl.className = 'widget-weather-label';
    labelEl.textContent = weatherCodeToLabel(code);
    weatherBox.appendChild(labelEl);

    main.appendChild(weatherBox);

    const details = document.createElement('div');
    details.className = 'widget-weather-details';
    details.innerHTML =
      '<div class="widget-weather-detail">' +
        '<span class="material-icons">thermostat</span>' +
        '<span>' + Math.round(tMin) + '° / ' + Math.round(tMax) + '°</span>' +
      '</div>' +
      '<div class="widget-weather-detail">' +
        '<span class="material-icons">water_drop</span>' +
        '<span>' + (precip != null ? precip : 0) + '%</span>' +
      '</div>' +
      '<div class="widget-weather-detail">' +
        '<span class="material-icons">air</span>' +
        '<span>' + Math.round(wind) + ' км/ч</span>' +
      '</div>';
    main.appendChild(details);

    body.appendChild(main);
  }

  function weatherCodeToIcon(code) {
    if (code === 0) return 'wb_sunny';
    if (code <= 3) return 'wb_cloudy';
    if (code === 45 || code === 48) return 'foggy';
    if (code >= 51 && code <= 57) return 'grain';
    if (code >= 61 && code <= 67) return 'water_drop';
    if (code >= 71 && code <= 77) return 'ac_unit';
    if (code >= 80 && code <= 82) return 'water_drop';
    if (code >= 85 && code <= 86) return 'ac_unit';
    if (code >= 95) return 'thunderstorm';
    return 'wb_cloudy';
  }

  function weatherCodeToLabel(code) {
    if (code === 0) return 'Ясно';
    if (code <= 3) return 'Малооблачно';
    if (code === 45 || code === 48) return 'Туман';
    if (code >= 51 && code <= 57) return 'Морось';
    if (code >= 61 && code <= 67) return 'Дождь';
    if (code >= 71 && code <= 77) return 'Снег';
    if (code >= 80 && code <= 82) return 'Ливень';
    if (code >= 85 && code <= 86) return 'Снегопад';
    if (code >= 95) return 'Гроза';
    return 'Облачно';
  }

  // ---------- Хелперы ----------

  function showSkeleton(body, rows) {
    const hasContent = body.querySelector('.widget-main, .empty-state, .text-muted, .text-error');
    if (hasContent) return;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'skeleton-stack';
    for (let i = 0; i < rows; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton skeleton-line';
      wrap.appendChild(line);
    }
    body.appendChild(wrap);
  }

  function makeWidgetFooter(href, icon, label, pageId) {
    const footer = document.createElement('div');
    footer.className = 'widget-chat-footer';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'btn btn-secondary btn-sm';
    a.dataset.page = pageId;
    a.innerHTML = '<span class="material-icons">' + icon + '</span>' + label;
    footer.appendChild(a);
    return footer;
  }

  function daysUntil(target) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const t = new Date(target);
    t.setHours(0, 0, 0, 0);
    return Math.round((t - today) / 86400000);
  }

  window.Widgets = {
    loadEventWidget,
    loadLogWidget,
    loadPollsWidget,
    loadWeatherWidget,
    loadAll
  };
})();