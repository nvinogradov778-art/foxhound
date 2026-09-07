// devices.js
(function() {
    function loadDevices() {
        const container = document.getElementById('devicesContainer');
        fetch('devices_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить устройства');
            return res.json();
        })
        .then(data => {
            if (!data.devices || data.devices.length === 0) {
                container.innerHTML = `<div class="no-data">Устройств пока нет</div>`;
                return;
            }
            container.innerHTML = '';
            data.devices.forEach((device) => {
                const card = document.createElement('div');
                card.className = 'item-card';
                const titleDiv = document.createElement('div');
                titleDiv.className = 'item-title';
                titleDiv.innerHTML = `
                <span>${device.name || 'Без названия'}</span>
                <span class="arrow">▶</span>
                `;
                card.appendChild(titleDiv);
                const details = document.createElement('div');
                details.className = 'item-details';
                if (device.photo) {
                    const photo = document.createElement('img');
                    photo.src = device.photo;
                    photo.className = 'item-photo';
                    photo.loading = 'lazy';
                    photo.style.maxWidth = '100%';
                    photo.style.border = '1px solid var(--border-color)';
                    details.appendChild(photo);
                }
                if (device.description) {
                    const desc = document.createElement('div');
                    desc.className = 'item-description';
                    desc.textContent = device.description;
                    details.appendChild(desc);
                }
                if (device.video_link) {
                    const videoDiv = document.createElement('div');
                    videoDiv.className = 'item-video';
                    const iframe = document.createElement('iframe');
                    iframe.width = '100%';
                    iframe.height = '315';
                    iframe.src = device.video_link;
                    iframe.style.border = 'none';
                    iframe.allowFullscreen = true;
                    iframe.loading = 'lazy';
                    videoDiv.appendChild(iframe);
                    details.appendChild(videoDiv);
                }
                const linksDiv = document.createElement('div');
                linksDiv.className = 'item-links';
                if (device.schematic_link) {
                    const a = document.createElement('a');
                    a.href = device.schematic_link;
                    a.target = '_blank';
                    a.innerHTML = '<span class="material-icons" style="font-size:16px; vertical-align:middle;">architecture</span> Схема';
                    linksDiv.appendChild(a);
                }
                if (device.docs_link) {
                    const a = document.createElement('a');
                    a.href = device.docs_link;
                    a.target = '_blank';
                    a.innerHTML = '<span class="material-icons" style="font-size:16px; vertical-align:middle;">description</span> Документация';
                    linksDiv.appendChild(a);
                }
                if (device.files && device.files.length > 0) {
                    device.files.forEach(file => {
                        const a = document.createElement('a');
                        a.href = file.link;
                        a.target = '_blank';
                        a.textContent = file.name;
                        linksDiv.appendChild(a);
                    });
                }
                if (linksDiv.children.length > 0) {
                    details.appendChild(linksDiv);
                }
                card.appendChild(details);
                titleDiv.addEventListener('click', function() {
                    const isOpen = details.classList.contains('open');
                    if (isOpen) {
                        details.classList.remove('open');
                        this.querySelector('.arrow').classList.remove('open');
                    } else {
                        details.classList.add('open');
                        this.querySelector('.arrow').classList.add('open');
                    }
                });
                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки устройств:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки устройств. Проверьте файл devices_data.json</div>`;
        });
    }

    window.Devices = {
        loadDevices: loadDevices
    };
})();
