// gallery.js
(function() {
    let loaded = false;

    function loadPhotos() {
        if (loaded) return;
        const container = document.getElementById('galleryContainer');
        fetch('photo_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Не удалось загрузить данные');
            return res.json();
        })
        .then(data => {
            if (!data.photos || data.photos.length === 0) {
                container.innerHTML = `<div class="no-data">Фотографий пока нет</div>`;
                loaded = true;
                return;
            }
            container.innerHTML = '';
            data.photos.forEach(photo => {
                const card = document.createElement('div');
                card.className = 'photo-card';
                const img = document.createElement('img');
                img.src = photo.image || 'placeholder.webp';
                img.alt = photo.title || 'Фото';
                img.loading = 'lazy';
                img.onerror = function() {
                    this.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\' viewBox=\'0 0 400 200\'%3E%3Crect fill=\'%23333\' width=\'400\' height=\'200\'/%3E%3Ctext fill=\'%23666\' x=\'50\' y=\'115\' font-family=\'sans-serif\' font-size=\'24\'%3EФото отсутствует%3C/text%3E%3C/svg%3E';
                };
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (window.openLightbox) window.openLightbox(this.src);
                });
                    const body = document.createElement('div');
                    body.className = 'card-body';
                    const title = document.createElement('div');
                    title.className = 'card-title';
                    title.textContent = photo.title || 'Без названия';
                    const date = document.createElement('div');
                    date.className = 'card-date';
                    date.innerHTML = photo.date ? `<span class="material-icons" style="font-size:14px; vertical-align:middle;">event</span> ${photo.date}` : '';
                    const desc = document.createElement('div');
                    desc.className = 'card-desc';
                    desc.textContent = photo.description || '';
                    body.appendChild(title);
                    if (photo.date) body.appendChild(date);
                    if (photo.description) body.appendChild(desc);
                    card.appendChild(img);
                card.appendChild(body);
                container.appendChild(card);
            });
            loaded = true;
        })
        .catch(error => {
            console.error('Ошибка загрузки галереи:', error);
            container.innerHTML = `<div class="error-msg">❌ Ошибка загрузки фотографий. Проверьте файл photo_data.json</div>`;
            loaded = true;
        });
    }

    window.Gallery = {
        loadPhotos: loadPhotos
    };
})();
