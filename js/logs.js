// logs.js
(function() {
    function loadLogs() {
        const container = document.getElementById('log-container');
        if (!container) {
            console.warn('Контейнер для логов не найден');
            return;
        }
        container.innerHTML = '<div class="log-row" style="color: var(--text-muted);">Загрузка записей...</div>';

        fetch('/log_data.json')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить журнал');
            return response.json();
        })
        .then(data => {
            if (!data.logs || data.logs.length === 0) {
                container.innerHTML = '<div class="log-row" style="color: var(--text-muted);">Нет записей в журнале.</div>';
                return;
            }
            container.innerHTML = '';
            data.logs.forEach(entry => {
                const row = document.createElement('div');
                row.className = 'log-row';
                if (entry.style) row.style.cssText = entry.style;
                const dateSpan = document.createElement('span');
                dateSpan.className = 'log-date';
                dateSpan.textContent = entry.date;
                const textSpan = document.createElement('span');
                textSpan.textContent = entry.text;
                row.appendChild(dateSpan);
                row.appendChild(textSpan);
                container.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки журнала:', error);
            container.innerHTML = '<div class="log-row" style="color: var(--text-muted);">Ошибка загрузки записей.</div>';
        });
    }

    window.Logs = {
        loadLogs: loadLogs
    };
})();
