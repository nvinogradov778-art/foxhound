(function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ Service Worker зарегистрирован', reg))
        .catch(err => console.warn('❌ Ошибка регистрации Service Worker', err));
    }

    async function loadLogs() {
        const container = document.getElementById('log-container');
        if (!container) return;
        try {
            const response = await fetch('log_data.json');
            if (!response.ok) throw new Error('Не удалось загрузить журнал');
            const data = await response.json();
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
        } catch (error) {
            console.error('Ошибка загрузки журнала:', error);
            container.innerHTML = '<div class="log-row" style="color: var(--text-muted);">Ошибка загрузки записей.</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (window.Utils && window.Utils.initLightbox) {
            window.Utils.initLightbox();
        }

        window.Auth.checkAuth().then(() => {
            window.Radio.loadRadioData();
            loadLogs();
            window.Gallery.loadPhotos();
            window.Operators.loadOperators();
            window.Instructions.loadInstructions();
            window.Atak.loadAtak();
            window.Regulations.loadRegulations();
            window.Scenarios.loadScenarios();
            window.Devices.loadDevices();
            window.Navigation.showPage('page-home');

            if (document.getElementById('page-profile').classList.contains('active')) {
                window.Auth.loadProfile();
            }

            if (window.Events && typeof window.Events.loadEvents === 'function') {
                const eventsTab = document.getElementById('tab-events');
                if (eventsTab && eventsTab.classList.contains('active-pane')) {
                    window.Events.loadEvents();
                }
            }

            if (window.Polls && typeof window.Polls.loadPolls === 'function') {
                const pollsTab = document.getElementById('tab-polls');
                if (pollsTab && pollsTab.classList.contains('active-pane')) {
                    window.Polls.loadPolls();
                }
            }
        });
    });
})();
