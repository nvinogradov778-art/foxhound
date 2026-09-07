// regulations.js
(function() {
    function loadRegulations() {
        const container = document.getElementById('regulationsContainer');
        fetch('regulations_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить устав');
            return res.json();
        })
        .then(data => {
            if (!data.sections || data.sections.length === 0) {
                container.innerHTML = `<div class="no-data">Разделы устава отсутствуют</div>`;
                return;
            }
            container.innerHTML = '';
            const tree = document.createElement('div');
            tree.className = 'atak-tree';
            data.sections.forEach(section => {
                const node = Utils.createTreeNode(section);
                tree.appendChild(node);
            });
            container.appendChild(tree);
        })
        .catch(error => {
            console.error('Ошибка загрузки устава:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки устава. Проверьте файл regulations_data.json</div>`;
        });
    }

    window.Regulations = {
        loadRegulations: loadRegulations
    };
})();
