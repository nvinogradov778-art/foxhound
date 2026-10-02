(function () {
  'use strict';
  if (!window.Utils) throw new Error('[event-logistics] utils.js must load first');
  if (!window.Modal) throw new Error('[event-logistics] modal.js must load first');

  /**
   * Рендерит блок логистики в контейнер.
   *
   * @param {number} eventId
   * @param {HTMLElement} container — куда рендерить
   * @param {HTMLElement} rsvpContainer — контейнер RSVP (читаем my_status)
   */
  async function render(eventId, container, rsvpContainer) {
    if (!container) return;

    const myStatus = rsvpContainer ? rsvpContainer.dataset.myStatus : '';
    if (myStatus !== 'going') {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = '';
    container.innerHTML = '';
    container.appendChild(buildLoadingState());

    try {
      const data = await Utils.apiRequest(
        '/api/event_logistics.php?event_id=' + encodeURIComponent(eventId),
        'GET'
      );
      paint(eventId, container, data, rsvpContainer);
    } catch (error) {
      console.error('[EventLogistics.render]', error);
      container.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'text-error';
      err.textContent = 'Ошибка загрузки логистики';
      container.appendChild(err);
    }
  }

  function buildLoadingState() {
    const wrap = document.createElement('div');
    wrap.className = 'logistics-title';
    wrap.innerHTML =
      '<div class="logistics-title-label">' +
        '<span class="material-icons">local_shipping</span> Логистика' +
      '</div>';
    return wrap;
  }

  function paint(eventId, container, data, rsvpContainer) {
    container.innerHTML = '';

    const drivers = data.drivers || [];
    const needsRide = data.needs_ride || [];
    const myBooking = data.my_booking;
    const mine = data.mine || {};
    const iAmDriver = !!mine.is_driver;

    container.appendChild(renderTitle(data));

    const inner = document.createElement('div');
    inner.className = 'logistics-inner';

    const hasAny = drivers.length || needsRide.length;
    if (hasAny) {
      inner.appendChild(renderSummary(eventId, drivers, needsRide, myBooking, iAmDriver, container, rsvpContainer));
    } else {
      inner.appendChild(renderEmpty());
    }

    inner.appendChild(renderForm(eventId, mine, container, rsvpContainer));
    container.appendChild(inner);
  }

  function renderTitle(data) {
    const title = document.createElement('div');
    title.className = 'logistics-title';

    const label = document.createElement('div');
    label.className = 'logistics-title-label';
    label.innerHTML = '<span class="material-icons">local_shipping</span> Логистика';
    title.appendChild(label);

    const badges = document.createElement('div');
    badges.className = 'logistics-title-badges';

    badges.appendChild(makeBadge('is-free', 'event_seat', 'Свободно', data.total_free || 0));
    badges.appendChild(makeBadge('is-booked', 'how_to_reg', 'Занято', data.total_booked || 0));
    badges.appendChild(makeBadge('is-needs', 'person_pin_circle', 'Требуется', data.total_needs_ride || 0));

    title.appendChild(badges);
    return title;
  }

  function makeBadge(cls, icon, label, value) {
    const el = document.createElement('span');
    el.className = 'logistics-title-badge ' + cls + (value === 0 ? ' is-zero' : '');

    const iconEl = document.createElement('span');
    iconEl.className = 'material-icons';
    iconEl.textContent = icon;
    el.appendChild(iconEl);

    el.appendChild(document.createTextNode(label + ': ' + value));
    return el;
  }

  function renderSummary(eventId, drivers, needsRide, myBooking, iAmDriver, container, rsvpContainer) {
    const grid = document.createElement('div');
    grid.className = 'logistics-summary-grid';

    if (drivers.length) {
      grid.appendChild(renderDriversBox(eventId, drivers, myBooking, iAmDriver, container, rsvpContainer));
    }
    if (needsRide.length) {
      grid.appendChild(renderRidersBox(needsRide));
    }

    return grid;
  }

  function renderDriversBox(eventId, drivers, myBooking, iAmDriver, container, rsvpContainer) {
    const box = document.createElement('div');
    box.className = 'logistics-summary-box logistics-summary-drivers';

    const head = document.createElement('div');
    head.className = 'logistics-summary-head';
    head.innerHTML = '<span class="material-icons">directions_car</span><span>За рулём</span>';
    box.appendChild(head);

    const list = document.createElement('div');
    list.className = 'logistics-summary-list';

    drivers.forEach(driver => {
      list.appendChild(renderDriverCard(eventId, driver, myBooking, iAmDriver, container, rsvpContainer));
    });

    box.appendChild(list);
    return box;
  }

  function renderRidersBox(needsRide) {
    const box = document.createElement('div');
    box.className = 'logistics-summary-box logistics-summary-riders';

    const head = document.createElement('div');
    head.className = 'logistics-summary-head';
    head.innerHTML = '<span class="material-icons">person_pin_circle</span><span>Нужно место</span>';
    box.appendChild(head);

    const list = document.createElement('div');
    list.className = 'logistics-summary-list';

    needsRide.forEach(rider => {
      const item = document.createElement('div');
      item.className = 'logistics-rider-card';

      const name = document.createElement('div');
      name.className = 'logistics-rider-name';
      name.textContent = rider.username;
      item.appendChild(name);

      if (rider.ride_area) {
        const area = document.createElement('div');
        area.className = 'logistics-rider-area';

        const icon = document.createElement('span');
        icon.className = 'material-icons';
        icon.textContent = 'place';
        area.appendChild(icon);

        area.appendChild(document.createTextNode(rider.ride_area));
        item.appendChild(area);
      }

      list.appendChild(item);
    });

    box.appendChild(list);
    return box;
  }

  function renderDriverCard(eventId, driver, myBooking, iAmDriver, container, rsvpContainer) {
    const card = document.createElement('div');
    card.className = 'logistics-driver-card';

    const name = document.createElement('div');
    name.className = 'logistics-driver-name';
    name.textContent = driver.username;
    card.appendChild(name);

    card.appendChild(renderSeatsBadges(driver));

    if (driver.pickup_point) {
      const chips = document.createElement('div');
      chips.className = 'logistics-driver-chips';

      const chip = document.createElement('span');
      chip.className = 'logistics-chip logistics-chip-place';

      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = 'place';
      chip.appendChild(icon);

      chip.appendChild(document.createTextNode(driver.pickup_point));
      chips.appendChild(chip);

      card.appendChild(chips);
    }

    if (driver.booked_list && driver.booked_list.length) {
      const passengers = document.createElement('div');
      passengers.className = 'logistics-driver-passengers';

      const icon = document.createElement('span');
      icon.className = 'material-icons';
      icon.textContent = 'event_seat';
      passengers.appendChild(icon);

      passengers.appendChild(document.createTextNode(
        driver.booked_list.map(p => p.rider_username).join(', ')
      ));

      card.appendChild(passengers);
    }

    if (!iAmDriver) {
      card.appendChild(renderBookingButton(eventId, driver, myBooking, container, rsvpContainer));
    }

    return card;
  }

  function renderSeatsBadges(driver) {
    const seats = driver.seats || 0;
    const booked = driver.booked_count || 0;
    const free = driver.free_seats || 0;

    const box = document.createElement('div');
    box.className = 'logistics-seats-badges';

    if (seats === 0) {
      const noSeats = document.createElement('span');
      noSeats.className = 'logistics-seats-badge is-empty';
      noSeats.innerHTML = '<span class="material-icons">block</span> Мест нет';
      box.appendChild(noSeats);
      return box;
    }

    const freeBadge = document.createElement('span');
    freeBadge.className = 'logistics-seats-badge is-free' + (free === 0 ? ' is-zero' : '');
    freeBadge.innerHTML = '<span class="material-icons">event_seat</span> Свободно: ' + free;
    box.appendChild(freeBadge);

    const bookedBadge = document.createElement('span');
    bookedBadge.className = 'logistics-seats-badge is-booked' + (booked === 0 ? ' is-zero' : '');
    bookedBadge.innerHTML = '<span class="material-icons">how_to_reg</span> Занято: ' + booked;
    box.appendChild(bookedBadge);

    return box;
  }

  function renderBookingButton(eventId, driver, myBooking, container, rsvpContainer) {
    const row = document.createElement('div');
    row.className = 'logistics-driver-action';

    const isMyBooking = myBooking && myBooking.driver_id === driver.user_id;
    const isBookedElsewhere = myBooking && !isMyBooking;
    const free = driver.free_seats || 0;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm logistics-book-btn';

    if (isMyBooking) {
      btn.classList.add('btn-danger');
      btn.innerHTML = '<span class="material-icons">close</span> Отменить бронь';
      btn.addEventListener('click', () => cancelBooking(eventId, container, rsvpContainer));
    } else if (isBookedElsewhere) {
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      btn.textContent = 'Вы уже забронированы';
    } else if (free === 0) {
      btn.classList.add('btn-secondary');
      btn.disabled = true;
      btn.textContent = 'Нет свободных мест';
    } else {
      btn.classList.add('btn-primary');
      btn.innerHTML = '<span class="material-icons">event_seat</span> Забронировать место';
      btn.addEventListener('click', () => bookRide(eventId, driver.user_id, container, rsvpContainer));
    }

    row.appendChild(btn);
    return row;
  }

  function renderEmpty() {
    const empty = document.createElement('div');
    empty.className = 'logistics-empty';
    empty.innerHTML =
      '<span class="material-icons">directions_car</span>' +
      '<span>Пока никто не отметился</span>';
    return empty;
  }

  function renderForm(eventId, mine, container, rsvpContainer) {
    const form = document.createElement('div');
    form.className = 'logistics-form';

    const formTitle = document.createElement('div');
    formTitle.className = 'logistics-form-title';
    formTitle.innerHTML = '<span class="material-icons">person</span> Моя логистика';
    form.appendChild(formTitle);

    const isDriver = !!mine.is_driver;
    const needsRide = !!mine.needs_ride;
    const hasChoice = isDriver || needsRide;

    const modes = document.createElement('div');
    modes.className = 'logistics-modes';

    const driverTile = buildModeTile('driver', 'directions_car', 'Еду за рулём', 'Забираю попутчиков', isDriver);
    const riderTile = buildModeTile('rider', 'person_pin_circle', 'Нужно место', 'Ищу, кто подвезёт', needsRide);
    modes.appendChild(driverTile);
    modes.appendChild(riderTile);
    form.appendChild(modes);

    const driverFields = buildDriverFields(eventId, mine, isDriver);
    const riderFields = buildRiderFields(mine, needsRide);
    form.appendChild(driverFields);
    form.appendChild(riderFields);

    const actions = document.createElement('div');
    actions.className = 'logistics-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary btn-sm logistics-save';
    saveBtn.innerHTML = '<span class="material-icons">check</span> Сохранить';
    saveBtn.addEventListener('click', () => {
      const isDriverNow = driverTile.classList.contains('active');
      const needsRideNow = riderTile.classList.contains('active');
      const seatsInput = driverFields.querySelector('.lg-seats');
      const pickupInput = driverFields.querySelector('.lg-pickup');
      const areaInput = riderFields.querySelector('.lg-area');

      const payload = {
        event_id: eventId,
        is_driver: isDriverNow,
        seats: isDriverNow ? (parseInt(seatsInput.value, 10) || 0) : 0,
        pickup_point: isDriverNow ? (pickupInput.value.trim()) : '',
        needs_ride: needsRideNow,
        ride_area: needsRideNow ? (areaInput.value.trim()) : ''
      };

      saveLogistics(eventId, payload, container, rsvpContainer);
    });
    actions.appendChild(saveBtn);

    if (hasChoice) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn btn-ghost btn-sm logistics-clear';
      clearBtn.innerHTML = '<span class="material-icons">close</span> Очистить';
      clearBtn.addEventListener('click', async () => {
        const confirmed = await Modal.confirm({
          title: 'Очистить логистику?',
          message: 'Ваши данные «За рулём» / «Нужно место» будут удалены.',
          danger: true,
          okText: 'Очистить'
        });
        if (confirmed) clearMyLogistics(eventId, container, rsvpContainer);
      });
      actions.appendChild(clearBtn);
    }

    form.appendChild(actions);

    bindModeToggle(driverTile, riderTile, driverFields, riderFields);
    bindSeatsCounter(driverFields);

    return form;
  }

  function buildModeTile(mode, icon, label, sub, active) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'logistics-mode' + (active ? ' active' : '');
    btn.dataset.mode = mode;

    const iconEl = document.createElement('span');
    iconEl.className = 'material-icons logistics-mode-icon';
    iconEl.textContent = icon;
    btn.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.className = 'logistics-mode-label';
    labelEl.textContent = label;
    btn.appendChild(labelEl);

    const subEl = document.createElement('span');
    subEl.className = 'logistics-mode-sub';
    subEl.textContent = sub;
    btn.appendChild(subEl);

    return btn;
  }

  function buildDriverFields(eventId, mine, isDriver) {
    const wrap = document.createElement('div');
    wrap.className = 'logistics-fields';
    wrap.style.display = isDriver ? '' : 'none';

    const seatsField = document.createElement('div');
    seatsField.className = 'logistics-field';

    const seatsLabel = document.createElement('label');
    seatsLabel.textContent = 'Свободных мест';
    seatsField.appendChild(seatsLabel);

    const seatsBox = document.createElement('div');
    seatsBox.className = 'logistics-seats';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'logistics-seat-btn';
    minus.dataset.dir = '-1';
    minus.textContent = '−';
    seatsBox.appendChild(minus);

    const value = document.createElement('span');
    value.className = 'lg-seats-value';
    value.textContent = mine.seats || 0;
    seatsBox.appendChild(value);

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'logistics-seat-btn';
    plus.dataset.dir = '1';
    plus.textContent = '+';
    seatsBox.appendChild(plus);

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.className = 'lg-seats';
    hidden.value = mine.seats || 0;
    seatsBox.appendChild(hidden);

    seatsField.appendChild(seatsBox);
    wrap.appendChild(seatsField);

    const pickupField = document.createElement('div');
    pickupField.className = 'logistics-field';

    const pickupLabel = document.createElement('label');
    pickupLabel.textContent = 'Откуда забираю';
    pickupField.appendChild(pickupLabel);

    const pickupInput = document.createElement('input');
    pickupInput.type = 'text';
    pickupInput.className = 'lg-pickup';
    pickupInput.value = mine.pickup_point || '';
    pickupInput.placeholder = 'Например: Академический';
    pickupField.appendChild(pickupInput);

    wrap.appendChild(pickupField);
    return wrap;
  }

  function buildRiderFields(mine, needsRide) {
    const wrap = document.createElement('div');
    wrap.className = 'logistics-fields';
    wrap.style.display = needsRide ? '' : 'none';

    const field = document.createElement('div');
    field.className = 'logistics-field';

    const label = document.createElement('label');
    label.textContent = 'Мой район';
    field.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'lg-area';
    input.value = mine.ride_area || '';
    input.placeholder = 'Например: Пионерский';
    field.appendChild(input);

    wrap.appendChild(field);
    return wrap;
  }

  function bindModeToggle(driverTile, riderTile, driverFields, riderFields) {
    driverTile.addEventListener('click', () => {
      const active = driverTile.classList.contains('active');
      if (active) {
        driverTile.classList.remove('active');
        driverFields.style.display = 'none';
      } else {
        driverTile.classList.add('active');
        riderTile.classList.remove('active');
        driverFields.style.display = '';
        riderFields.style.display = 'none';
      }
    });

    riderTile.addEventListener('click', () => {
      const active = riderTile.classList.contains('active');
      if (active) {
        riderTile.classList.remove('active');
        riderFields.style.display = 'none';
      } else {
        riderTile.classList.add('active');
        driverTile.classList.remove('active');
        riderFields.style.display = '';
        driverFields.style.display = 'none';
      }
    });
  }

  function bindSeatsCounter(driverFields) {
    const valueEl = driverFields.querySelector('.lg-seats-value');
    const inputEl = driverFields.querySelector('.lg-seats');

    driverFields.querySelectorAll('.logistics-seat-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        let v = parseInt(valueEl.textContent, 10) || 0;
        v += parseInt(this.dataset.dir, 10);
        if (v < 0) v = 0;
        if (v > 8) v = 8;
        valueEl.textContent = v;
        inputEl.value = v;
      });
    });
  }

  async function bookRide(eventId, driverId, container, rsvpContainer) {
    try {
      await Utils.apiRequest('/api/event_bookings.php?action=book', 'POST', {
        event_id: eventId,
        driver_id: driverId
      });
      render(eventId, container, rsvpContainer);
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось забронировать место',
        danger: true
      });
    }
  }

  async function cancelBooking(eventId, container, rsvpContainer) {
    const confirmed = await Modal.confirm({
      title: 'Отменить бронь?',
      message: 'Место освободится для других пассажиров.',
      okText: 'Отменить',
      danger: true
    });
    if (!confirmed) return;

    try {
      await Utils.apiRequest('/api/event_bookings.php?action=cancel', 'POST', {
        event_id: eventId
      });
      render(eventId, container, rsvpContainer);
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось отменить бронь',
        danger: true
      });
    }
  }

  async function saveLogistics(eventId, payload, container, rsvpContainer) {
    try {
      await Utils.apiRequest('/api/event_logistics.php', 'POST', payload);
      render(eventId, container, rsvpContainer);
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось сохранить',
        danger: true
      });
    }
  }

  async function clearMyLogistics(eventId, container, rsvpContainer) {
    try {
      await Utils.apiRequest('/api/event_logistics.php', 'DELETE', { event_id: eventId });
      render(eventId, container, rsvpContainer);
    } catch (error) {
      Modal.alert({
        title: 'Ошибка',
        message: error.message || 'Не удалось очистить',
        danger: true
      });
    }
  }

  window.EventLogistics = { render };
})();