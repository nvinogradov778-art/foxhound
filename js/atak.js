// atak.js
(function() {
    let loaded = false;

    function loadAtak() {
        if (loaded) return;
        const container = document.getElementById('atakContainer');
        fetch('atak_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить руководство ATAK');
            return res.json();
        })
        .then(data => {
            if (!data.sections || data.sections.length === 0) {
                container.innerHTML = `<div class="no-data">Разделы отсутствуют</div>`;
                loaded = true;
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
            loaded = true;
        })
        .catch(error => {
            console.error('Ошибка загрузки ATAK:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки руководства ATAK. Проверьте файл atak_data.json</div>`;
            loaded = true;
        });
    }

    window.Atak = {
        loadAtak: loadAtak
    };
})();
