// scenarios.js
(function() {
    function loadScenarios() {
        const container = document.getElementById('scenariosContainer');
        fetch('scenarios_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить сценарии');
            return res.json();
        })
        .then(data => {
            if (!data.scenarios || data.scenarios.length === 0) {
                container.innerHTML = `<div class="no-data">Сценариев пока нет</div>`;
                return;
            }
            container.innerHTML = '';
            data.scenarios.forEach((scenario) => {
                const card = document.createElement('div');
                card.className = 'item-card';
                const titleDiv = document.createElement('div');
                titleDiv.className = 'item-title';
                titleDiv.innerHTML = `
                <span>${scenario.title || 'Без названия'}</span>
                <span class="arrow">▶</span>
                `;
                card.appendChild(titleDiv);
                const details = document.createElement('div');
                details.className = 'item-details';
                if (scenario.description) {
                    const descDiv = document.createElement('div');
                    descDiv.style.cssText = 'margin-bottom:10px; color: var(--text-color); font-size:16px; line-height:1.5;';
                    descDiv.textContent = scenario.description;
                    details.appendChild(descDiv);
                }
                if (scenario.video_link) {
                    const videoDiv = document.createElement('div');
                    videoDiv.className = 'item-video';
                    const iframe = document.createElement('iframe');
                    iframe.width = '100%';
                    iframe.height = '315';
                    iframe.src = scenario.video_link;
                    iframe.style.border = 'none';
                    iframe.allowFullscreen = true;
                    iframe.loading = 'lazy';
                    videoDiv.appendChild(iframe);
                    details.appendChild(videoDiv);
                }
                if (scenario.phases && scenario.phases.length > 0) {
                    const phasesDiv = document.createElement('div');
                    phasesDiv.style.marginTop = '10px';
                    const phasesTitle = document.createElement('div');
                    phasesTitle.style.cssText = 'font-weight:700; color: var(--accent-color); margin-bottom:6px;';
                    phasesTitle.innerHTML = '<span class="material-icons" style="font-size:18px; vertical-align:middle;">layers</span> Фазы';
                    phasesDiv.appendChild(phasesTitle);
                    scenario.phases.forEach(phase => {
                        const phaseBlock = document.createElement('div');
                        phaseBlock.style.cssText = 'margin-bottom:12px; padding-left:10px; border-left:2px solid var(--accent-color);';
                        const phaseName = document.createElement('div');
                        phaseName.style.cssText = 'font-weight:700; color:#fff; font-size:16px;';
                        phaseName.textContent = `${phase.name} (${phase.time})`;
                        phaseBlock.appendChild(phaseName);
                        if (phase.description) {
                            const desc = document.createElement('div');
                            desc.style.cssText = 'color: var(--text-color); font-size:15px; margin:4px 0;';
                            desc.textContent = phase.description;
                            phaseBlock.appendChild(desc);
                        }
                        if (phase.map_image) {
                            const img = document.createElement('img');
                            img.src = phase.map_image;
                            img.loading = 'lazy';
                            img.style.cssText = 'max-width:100%; height:auto; border:1px solid var(--border-color); margin-top:6px;';
                            img.alt = phase.name;
                            phaseBlock.appendChild(img);
                        }
                        phasesDiv.appendChild(phaseBlock);
                    });
                    details.appendChild(phasesDiv);
                }
                if (scenario.inventory && scenario.inventory.length > 0) {
                    const invDiv = document.createElement('div');
                    invDiv.style.marginTop = '10px';
                    const invTitle = document.createElement('div');
                    invTitle.style.cssText = 'font-weight:700; color: var(--accent-color); margin-bottom:6px;';
                    invTitle.innerHTML = '<span class="material-icons" style="font-size:18px; vertical-align:middle;">inventory</span> Инвентарь';
                    invDiv.appendChild(invTitle);
                    const list = document.createElement('ul');
                    list.style.cssText = 'margin-left:20px; color: var(--text-color);';
                    scenario.inventory.forEach(item => {
                        const li = document.createElement('li');
                        li.textContent = item;
                        list.appendChild(li);
                    });
                    invDiv.appendChild(list);
                    details.appendChild(invDiv);
                }
                if (scenario.files && scenario.files.length > 0) {
                    const filesDiv = document.createElement('div');
                    filesDiv.className = 'item-files';
                    const filesTitle = document.createElement('div');
                    filesTitle.style.cssText = 'font-weight:700; color: var(--accent-color); margin-bottom:6px;';
                    filesTitle.innerHTML = '<span class="material-icons" style="font-size:18px; vertical-align:middle;">folder</span> Файлы';
                    filesDiv.appendChild(filesTitle);
                    const list = document.createElement('ul');
                    scenario.files.forEach(file => {
                        const li = document.createElement('li');
                        const link = document.createElement('a');
                        link.href = file.link;
                        link.target = '_blank';
                        link.textContent = file.name;
                        link.style.cssText = 'color: var(--blue); text-decoration: none; font-weight:700; border:1px solid var(--blue); padding:4px 14px; transition:0.2s; display:inline-block;';
                        li.appendChild(link);
                        list.appendChild(li);
                    });
                    filesDiv.appendChild(list);
                    details.appendChild(filesDiv);
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
            console.error('Ошибка загрузки сценариев:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки сценариев. Проверьте файл scenarios_data.json</div>`;
        });
    }

    window.Scenarios = {
        loadScenarios: loadScenarios
    };
})();
