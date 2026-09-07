(function() {
    let pollsArchived = false;

    function loadPolls() {
        const container = document.getElementById('polls-list');
        container.innerHTML = '<p>Загрузка...</p>';
        const url = '/api/polls.php' + (pollsArchived ? '?archived=1' : '');
        fetch(url)
        .then(res => res.json())
        .then(polls => {
            if (!polls.length) {
                container.innerHTML = '<p style="color: var(--text-muted);">' + (pollsArchived ? 'Нет завершённых опросов.' : 'Нет активных голосований.') + '</p>';
                return;
            }
            let html = '';
            polls.forEach(poll => {
                html += renderPoll(poll);
            });
            container.innerHTML = html;
        })
        .catch(err => {
            container.innerHTML = '<p style="color: var(--red);">Ошибка загрузки опросов</p>';
            console.error(err);
        });
    }

    function renderPoll(poll) {
        const isActive = poll.expires_at > Math.floor(Date.now() / 1000);
        const canVote = isActive;
        const showStats = true;

        const options = poll.options || [];
        const votes = poll.vote_counts || [];
        const total = poll.total_votes || 0;
        const myVotes = poll.my_votes || [];
        const type = poll.type || 'single';

        let optionsHtml = options.map((label, idx) => {
            const count = votes[idx] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            const checked = myVotes.includes(idx) ? 'checked' : '';
            const disabled = !canVote ? 'disabled' : '';

            let inputHtml = '';
            if (type === 'multiple') {
                inputHtml = `<input type="checkbox" name="poll-${poll.id}" value="${idx}" ${checked} ${disabled} />`;
            } else {
                inputHtml = `<input type="radio" name="poll-${poll.id}" value="${idx}" ${checked} ${disabled} />`;
            }

            let statsHtml = '';
            if (showStats) {
                statsHtml = `
                <span style="float:right;">${count} (${percent}%)</span>
                <div style="width:100%; height:4px; background:#2a2a2a; border-radius:2px; margin-top:2px;">
                <div style="width:${percent}%; height:100%; background:var(--accent-color); border-radius:2px;"></div>
                </div>
                `;
            }

            return `<div style="margin: 4px 0;">
            <label style="display:flex; align-items:center; gap:8px; cursor:${canVote ? 'pointer' : 'default'};">
            ${inputHtml}
            <span>${label}</span>
            </label>
            ${statsHtml}
            </div>`;
        }).join('');

        let voteButtonHtml = '';
        if (canVote) {
            if (type === 'multiple') {
                voteButtonHtml = `<button class="radio-btn" style="font-size:14px; padding:6px 20px; margin-top:6px;" onclick="window.Polls.submitMultiple(${poll.id})">Отправить</button>`;
            } else {
                voteButtonHtml = `<button class="radio-btn" style="font-size:14px; padding:6px 20px; margin-top:6px;" onclick="window.Polls.submitSingle(${poll.id})">Отправить</button>`;
            }
        }

        const status = isActive
        ? '<span class="material-icons" style="font-size:16px; vertical-align:middle; color:var(--green);">check_circle</span> Активен'
        : '<span class="material-icons" style="font-size:16px; vertical-align:middle; color:var(--red);">cancel</span> Завершён';
        const dateStr = new Date(poll.expires_at * 1000).toLocaleString();

        let adminActions = '';
        if (window.Auth.currentUser() && window.Auth.currentUser().role === 'admin') {
            adminActions = `
            <div style="margin-top: 10px;">
            <button class="radio-btn" style="font-size:13px; padding:4px 12px; border-color: var(--red); color: var(--red);" onclick="window.Polls.deletePoll(${poll.id})">
            <span class="material-icons" style="font-size:16px; vertical-align:middle;">delete</span> Удалить опрос
            </button>
            </div>
            `;
        }

        return `
        <div style="background: #0a0a0a; border: 1px solid var(--border-color); padding: 12px; margin-bottom: 10px;">
        <strong style="color: #fff;">${poll.title}</strong>
        <span style="font-size:12px; color:#666; margin-left:10px;">${status}</span>
        <div style="font-size: 13px; color: #666;">До: ${dateStr} | Тип: ${type === 'multiple' ? 'Множественный' : 'Одиночный'}</div>
        <div style="margin: 8px 0;">${optionsHtml}</div>
        ${voteButtonHtml}
        ${adminActions}
        </div>
        `;
    }

    function submitSingle(pollId) {
        const selected = document.querySelector(`input[name="poll-${pollId}"]:checked`);
        if (!selected) return alert('Выберите вариант');
        const optionIndex = parseInt(selected.value);
        submitVote(pollId, [optionIndex]);
    }

    function submitMultiple(pollId) {
        const checked = document.querySelectorAll(`input[name="poll-${pollId}"]:checked`);
        if (!checked.length) return alert('Выберите хотя бы один вариант');
        const indexes = Array.from(checked).map(cb => parseInt(cb.value));
        submitVote(pollId, indexes);
    }

    function submitVote(pollId, optionIndexes) {
        if (!window.Auth.currentUser()) return alert('Войдите в аккаунт');
        const payload = {
            action: 'vote',
            poll_id: pollId,
            option_indexes: optionIndexes
        };
        Utils.apiRequest('/api/polls.php', 'POST', payload)
        .then(data => {
            if (data.success) {
                loadPolls();
            } else {
                alert('Ошибка: ' + (data.error || 'Неизвестно'));
            }
        })
        .catch(err => alert('Ошибка сети: ' + err.message));
    }

    function deletePoll(pollId) {
        if (!confirm('Удалить опрос?')) return;
        Utils.apiRequest('/api/polls.php', 'DELETE', { poll_id: pollId })
        .then(data => {
            if (data.success) loadPolls();
            else alert('Ошибка: ' + (data.error || 'Неизвестно'));
        })
        .catch(err => alert('Ошибка сети'));
    }

    document.getElementById('polls-toggle-archived')?.addEventListener('click', function() {
        pollsArchived = !pollsArchived;
        this.textContent = pollsArchived ? 'Показать активные' : 'Показать архив';
        loadPolls();
    });

    const pollForm = document.getElementById('poll-form');
    if (pollForm) {
        pollForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('poll-title').value.trim();
            const optionsRaw = document.getElementById('poll-options').value.trim();
            const expiresInput = document.getElementById('poll-expires');
            const expiresValue = expiresInput.value;

            if (!title || !optionsRaw || !expiresValue) {
                alert('Заполните все поля');
                return;
            }
            const options = optionsRaw.split(',').map(s => s.trim()).filter(s => s);
            if (options.length < 2) {
                alert('Минимум 2 варианта');
                return;
            }
            const dateObj = new Date(expiresValue);
            const expires_at = Math.floor(dateObj.getTime() / 1000);
            if (isNaN(expires_at) || expires_at <= Math.floor(Date.now() / 1000)) {
                alert('Дата должна быть в будущем');
                return;
            }

            const typeEl = document.getElementById('poll-type');
            const type = typeEl ? typeEl.value : 'single';

            const payload = {
                action: 'create',
                title: title,
                options: options,
                expires_at: expires_at,
                type: type
            };
            Utils.apiRequest('/api/polls.php', 'POST', payload)
            .then(data => {
                if (data.success) {
                    loadPolls();
                    pollForm.reset();
                } else {
                    alert('Ошибка: ' + (data.error || 'Неизвестно'));
                }
            })
            .catch(err => alert('Ошибка сети: ' + err.message));
        });
    }

    function updatePollFormVisibility() {
        const form = document.getElementById('poll-create-form');
        if (form) {
            const user = window.Auth.currentUser();
            if (user && user.role === 'admin') {
                form.style.display = 'block';
            } else {
                form.style.display = 'none';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        updatePollFormVisibility();
        if (document.getElementById('tab-polls').classList.contains('active-pane')) {
            loadPolls();
        }
    });

    window.Polls = {
        loadPolls: loadPolls,
        submitSingle: submitSingle,
        submitMultiple: submitMultiple,
        deletePoll: deletePoll,
        updatePollFormVisibility: updatePollFormVisibility
    };
})();
