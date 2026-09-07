// maps.js
(function() {
    let mapInitialized = false;
    let mapInstance = null;
    let currentPolygonId = null;
    let layerGroups = {};

    function loadMaps() {
        const container = document.getElementById('map-container');
        const select = document.getElementById('polygon-select');
        const layersContainer = document.getElementById('map-layers');
        const loading = document.getElementById('map-loading');

        if (!container) {
            console.error('Контейнер карты не найден');
            return;
        }

        loading.style.display = 'block';
        loading.innerHTML = 'Загрузка карт...';

        fetch('/maps_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Файл maps_data.json не найден');
            return res.json();
        })
        .then(data => {
            if (!data.polygons || data.polygons.length === 0) {
                loading.innerHTML = 'Нет доступных полигонов';
                return;
            }

            select.innerHTML = '';
            data.polygons.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            });

            if (!mapInitialized) {
                mapInstance = L.map('map-container', {
                    center: data.polygons[0].center,
                    zoom: data.polygons[0].zoom,
                    zoomControl: true,
                    attributionControl: true
                });
                L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                    maxZoom: 19,
                    attribution: 'Google Satellite'
                }).addTo(mapInstance);
                mapInitialized = true;
            }

            currentPolygonId = data.polygons[0].id;
            switchPolygon(currentPolygonId, data);

            select.addEventListener('change', function() {
                currentPolygonId = this.value;
                switchPolygon(currentPolygonId, data);
            });

            loading.style.display = 'none';
            setTimeout(() => mapInstance.invalidateSize(), 300);
        })
        .catch(err => {
            console.error('Ошибка загрузки карт:', err);
            loading.innerHTML = '❌ Ошибка загрузки карт. Проверьте файл maps_data.json';
            loading.style.color = 'var(--red)';
        });
    }

    function switchPolygon(polygonId, data) {
        const polygon = data.polygons.find(p => p.id === polygonId);
        if (!polygon) return;

        mapInstance.setView(polygon.center, polygon.zoom);

        for (let key in layerGroups) {
            if (mapInstance.hasLayer(layerGroups[key])) {
                mapInstance.removeLayer(layerGroups[key]);
            }
        }
        layerGroups = {};

        const layersContainer = document.getElementById('map-layers');
        layersContainer.innerHTML = '';

        if (!polygon.layers || polygon.layers.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'color: var(--text-muted); font-style: italic;';
            msg.textContent = 'Слои для этого полигона отсутствуют.';
            layersContainer.appendChild(msg);
            return;
        }

        polygon.layers.forEach(layerData => {
            const group = L.layerGroup();
            layerGroups[layerData.id] = group;

            if (layerData.url) {
                fetch(layerData.url)
                .then(res => {
                    if (!res.ok) throw new Error('404');
                    return res.json();
                })
                .then(geojson => {
                    L.geoJSON(geojson, {
                        style: layerData.style || { color: '#ff6600', weight: 2 },
                        onEachFeature: function(feature, layer) {
                            if (feature.properties && feature.properties.name) {
                                layer.bindPopup(feature.properties.name);
                            }
                        }
                    }).addTo(group);
                })
                .catch(err => console.warn('Не удалось загрузить слой:', layerData.url, err));
            } else if (layerData.geojson) {
                L.geoJSON(layerData.geojson, {
                    style: layerData.style || { color: '#ff6600', weight: 2 }
                }).addTo(group);
            }

            if (layerData.visible !== false) {
                mapInstance.addLayer(group);
            }

            const cbWrapper = document.createElement('div');
            cbWrapper.className = 'map-layer-item';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `layer-${layerData.id}`;
            cb.checked = layerData.visible !== false;
            const label = document.createElement('label');
            label.htmlFor = `layer-${layerData.id}`;
            label.textContent = layerData.name || layerData.id;

            cb.addEventListener('change', function() {
                if (this.checked) {
                    mapInstance.addLayer(layerGroups[layerData.id]);
                } else {
                    mapInstance.removeLayer(layerGroups[layerData.id]);
                }
            });

            cbWrapper.appendChild(cb);
            cbWrapper.appendChild(label);
            layersContainer.appendChild(cbWrapper);
        });

        if (polygon.layers.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = 'margin-top:8px; font-weight:700; color: var(--text-muted);';
            header.textContent = 'Слои:';
            layersContainer.prepend(header);
        }

        setTimeout(() => mapInstance.invalidateSize(), 100);
    }

    window.Maps = {
        loadMaps: loadMaps
    };
})();
