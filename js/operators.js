// operators.js
(function() {
    let loaded = false;

    function loadOperators() {
        if (loaded) return;
        const container = document.getElementById('operatorsContainer');
        fetch('operators_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить данные');
            return res.json();
        })
        .then(data => {
            if (!data.operators || data.operators.length === 0) {
                container.innerHTML = `<div class="no-data">Оперативников пока нет</div>`;
                loaded = true;
                return;
            }
            container.innerHTML = '';
            data.operators.forEach(op => {
                const card = document.createElement('div');
                card.className = 'operator-card';
                const avatar = document.createElement('div');
                avatar.className = 'operator-avatar';
                if (op.photo) {
                    const img = document.createElement('img');
                    img.src = op.photo;
                    img.alt = op.name || 'Оператор';
                    img.loading = 'lazy';
                    img.onerror = function() {
                        this.style.display = 'none';
                        avatar.textContent = op.avatar || '👤';
                        avatar.style.fontSize = '56px';
                    };
                    avatar.appendChild(img);
                } else {
                    avatar.textContent = op.avatar || '👤';
                    avatar.style.fontSize = '56px';
                }
                const name = document.createElement('div');
                name.className = 'operator-name';
                name.textContent = op.name || 'Без имени';
                const role = document.createElement('div');
                role.className = 'operator-role';
                role.textContent = op.role || '';
                const desc = document.createElement('div');
                desc.className = 'operator-desc';
                desc.textContent = op.description || '';
                card.appendChild(avatar);
                card.appendChild(name);
                if (op.role) card.appendChild(role);
                if (op.description) card.appendChild(desc);
                if (op.specialization) {
                    const spec = document.createElement('div');
                    spec.className = 'operator-spec';
                    spec.textContent = op.specialization;
                    card.appendChild(spec);
                }
                container.appendChild(card);
            });
            loaded = true;
        })
        .catch(error => {
            console.error('Ошибка загрузки оперативников:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки данных. Проверьте файл operators_data.json</div>`;
            loaded = true;
        });
    }

    window.Operators = {
        loadOperators: loadOperators
    };
})();
