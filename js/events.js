// events.js
(function() {
    let currentDate = new Date();
    let selectedDate = null;
    let eventsCache = [];
    let showArchived = false;

    function loadEvents() {
        const container = document.getElementById('calendar-events-list');
        const gridContainer = document.getElementById('calendar-grid');
        if (!gridContainer) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const start = new Date(year, month, 1).getTime() / 1000;
        const end = new Date(year, month + 1, 0).getTime() / 1000;

        const archivedParam = showArchived ? 1 : 0;
        fetch('/api/events.php?archived=' + archivedParam)
        .then(res => res.json())
        .then(data => {
            eventsCache = data.filter(ev => ev.event_date >= start && ev.event_date <= end);
            eventsCache.sort((a, b) => a.event_date - b.event_date);
            renderCalendar();
            if (selectedDate) {
                renderEventsForDate(selectedDate);
            } else {
                const today = new Date();
                const todayStr = today.toDateString();
                const hasToday = eventsCache.some(ev => new Date(ev.event_date * 1000).toDateString() === todayStr);
                if (hasToday) {
                    selectedDate = today;
                    renderEventsForDate(selectedDate);
                } else {
                    const firstEvent = eventsCache[0];
                    if (firstEvent) {
                        selectedDate = new Date(firstEvent.event_date * 1000);
                        renderEventsForDate(selectedDate);
                    } else {
                        document.getElementById('calendar-events-list').innerHTML = '<div style="color: var(--text-muted); text-align:center;">Нет событий в этом месяце</div>';
                    }
                }
            }
            const user = window.Auth.currentUser();
            const createBtn = document.getElementById('event-create-btn');
            if (createBtn) {
                createBtn.style.display = (user && user.role === 'admin') ? 'inline-block' : 'none';
            }
        })
        .catch(err => {
            console.error('Ошибка загрузки событий:', err);
            document.getElementById('calendar-events-list').innerHTML = '<p style="color: var(--red);">Ошибка загрузки</p>';
        });
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
        document.getElementById('calendar-month-year').textContent = monthNames[month] + ' ' + year;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = '<tr>';
        let startOffset = (firstDay === 0) ? 6 : firstDay - 1;
        for (let i = 0; i < startOffset; i++) {
            html += '<td></td>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const ts = Math.floor(dateObj.getTime() / 1000);
            const hasEvent = eventsCache.some(ev => {
                const d2 = new Date(ev.event_date * 1000);
                return d2.getFullYear() === year && d2.getMonth() === month && d2.getDate() === d;
            });
            const isToday = (d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear());
            const isSelected = (selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d);

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isSelected) classes += ' selected';
            if (hasEvent) classes += ' has-event';

            html += `<td class="${classes}" data-date="${ts}" data-day="${d}">${d}</td>`;

            if ((d + startOffset) % 7 === 0) {
                html += '</tr><tr>';
            }
        }
        const totalCells = startOffset + daysInMonth;
        const remainder = totalCells % 7;
        if (remainder > 0) {
            for (let i = 0; i < 7 - remainder; i++) {
                html += '<td></td>';
            }
        }
        html += '</tr>';

        document.getElementById('calendar-body').innerHTML = html;

        document.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('click', function() {
                const ts = parseInt(this.dataset.date);
                if (ts) {
                    selectedDate = new Date(ts * 1000);
                    renderCalendar();
                    renderEventsForDate(selectedDate);
                }
            });
        });
    }

    function renderEventsForDate(date) {
        const container = document.getElementById('calendar-events-list');
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        const dayEvents = eventsCache.filter(ev => {
            const d = new Date(ev.event_date * 1000);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        }).sort((a, b) => a.event_date - b.event_date);

        if (dayEvents.length === 0) {
            container.innerHTML = `<div style="color: var(--text-muted); text-align:center;">На ${day}.${month+1}.${year} событий нет</div>`;
            return;
        }

        let html = `<div style="font-weight:700; color:#fff; margin-bottom:8px;">События на ${day}.${month+1}.${year}:</div>`;
        const user = window.Auth.currentUser();
        const isAdmin = user && user.role === 'admin';

        dayEvents.forEach(ev => {
            const time = new Date(ev.event_date * 1000).toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' });
            const location = ev.location ? `<span class="material-icons" style="font-size:14px; vertical-align:middle;">place</span> ${ev.location}` : '';
            html += `
            <div style="background:#0a0a0a; border:1px solid var(--accent-color); padding:8px 12px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
            <strong style="color:#fff;">${ev.title}</strong>
            <div style="color:#999; font-size:14px;">${ev.description || ''}</div>
            <div style="color:#666; font-size:13px;">${time} ${location}</div>
            </div>
            ${isAdmin ? `<button onclick="window.Events.deleteEvent(${ev.id})" style="background:#a00;color:#fff;border:none;padding:4px 12px;cursor:pointer;border-radius:3px;"><span class="material-icons" style="font-size:16px; vertical-align:middle;">delete</span> Удалить</button>` : ''}
            </div>
            `;
        });
        container.innerHTML = html;
    }

    function prevMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        loadEvents();
    }
    function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        loadEvents();
    }

    function toggleArchive() {
        showArchived = !showArchived;
        const btn = document.getElementById('events-toggle-archived');
        if (btn) {
            btn.textContent = showArchived ? 'Показать предстоящие' : 'Показать архив';
        }
        loadEvents();
    }

    function deleteEvent(eventId) {
        if (!confirm('Удалить событие?')) return;
        fetch('/api/events.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_id: eventId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadEvents();
            } else {
                alert('Ошибка удаления: ' + (data.error || 'Неизвестно'));
            }
        })
        .catch(err => alert('Ошибка сети: ' + err.message));
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('calendar-prev')?.addEventListener('click', prevMonth);
        document.getElementById('calendar-next')?.addEventListener('click', nextMonth);
        document.getElementById('events-toggle-archived')?.addEventListener('click', toggleArchive);

        const createBtn = document.getElementById('event-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', function() {
                document.getElementById('event-modal-title').textContent = 'Создать событие';
                document.getElementById('event-id').value = '';
                document.getElementById('event-title').value = '';
                document.getElementById('event-desc').value = '';
                document.getElementById('event-date').value = '';
                document.getElementById('event-location').value = '';
                document.getElementById('event-modal').classList.add('active-modal');
            });
        }

        document.getElementById('close-event-modal')?.addEventListener('click', function() {
            document.getElementById('event-modal').classList.remove('active-modal');
        });
        document.getElementById('event-modal')?.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active-modal');
        });

            document.getElementById('event-form-modal')?.addEventListener('submit', function(e) {
                e.preventDefault();
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Отправка...';
                }

                const id = document.getElementById('event-id').value;
                const data = {
                    action: id ? 'update' : 'create',
                    title: document.getElementById('event-title').value.trim(),
                                                                          description: document.getElementById('event-desc').value.trim(),
                                                                          event_date: Math.floor(new Date(document.getElementById('event-date').value).getTime() / 1000),
                                                                          location: document.getElementById('event-location').value.trim()
                };
                if (id) data.event_id = id;

                fetch('/api/events.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        loadEvents();
                        document.getElementById('event-modal').classList.remove('active-modal');
                    } else {
                        alert('Ошибка: ' + (result.error || 'Неизвестно'));
                    }
                })
                .catch(err => alert('Ошибка сети: ' + err.message))
                .finally(() => {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = id ? 'Обновить' : 'Создать';
                    }
                });
            });

            loadEvents();
    });

    window.Events = {
        loadEvents: loadEvents,
        deleteEvent: deleteEvent,
        toggleArchive: toggleArchive,
        prevMonth: prevMonth,
        nextMonth: nextMonth
    };
})();
