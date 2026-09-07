// instructions.js
(function() {
    let loaded = false;

    function loadInstructions() {
        if (loaded) return;
        const container = document.getElementById('docsContainer');
        fetch('instructions_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить инструкции');
            return res.json();
        })
        .then(data => {
            if (!data.documents || data.documents.length === 0) {
                container.innerHTML = `<div class="no-data">Документов пока нет</div>`;
                loaded = true;
                return;
            }
            container.innerHTML = '';
            data.documents.forEach(doc => {
                const card = document.createElement('div');
                card.className = 'doc-card';
                const title = document.createElement('div');
                title.className = 'doc-title';
                title.textContent = doc.title || 'Без названия';
                const desc = document.createElement('div');
                desc.className = 'doc-desc';
                desc.textContent = doc.description || '';
                const link = document.createElement('a');
                link.className = 'doc-link';
                link.href = doc.link || '#';
                link.target = '_blank';
                link.innerHTML = '<span class="material-icons" style="font-size:16px; vertical-align:middle;">picture_as_pdf</span> Открыть PDF';
                link.rel = 'noopener noreferrer';
                card.appendChild(title);
                if (doc.description) card.appendChild(desc);
                card.appendChild(link);
                container.appendChild(card);
            });
            loaded = true;
        })
        .catch(error => {
            console.error('Ошибка загрузки инструкций:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки инструкций. Проверьте файл instructions_data.json</div>`;
            loaded = true;
        });
    }

    window.Instructions = {
        loadInstructions: loadInstructions
    };
})();
