(function () {
  'use strict';
  if (!window.Utils) throw new Error('[maps] utils.js must load first');

  const CACHE_TTL = 60 * 1000;
  const LEAFLET_WAIT_INTERVAL = 100;
  const LEAFLET_WAIT_TIMEOUT = 10000;

  let mapInstance = null;
  let mapReady = false;
  let polygons = [];
  let layerGroups = {};
  let loadedAt = 0;
  let inFlight = null;

  async function load(options = {}) {
    const container = document.getElementById('map-container');
    const select = document.getElementById('polygon-select');
    const layersBox = document.getElementById('map-layers');
    const loading = document.getElementById('map-loading');
    if (!container || !select) return;

    // Leaflet может грузиться асинхронно
    if (typeof L === 'undefined') {
      await waitForLeaflet();
      if (typeof L === 'undefined') {
        if (loading) {
          loading.style.display = 'block';
          loading.style.color = '';
          loading.innerHTML = '';
          loading.appendChild(Utils.emptyState(
            'error_outline',
            'Ошибка загрузки',
            'Не удалось загрузить карту'
          ));
        }
        return;
      }
    }

    if (mapReady) {
      setTimeout(() => mapInstance.invalidateSize(), 100);
      return;
    }

    if (!options.force && Date.now() - loadedAt < CACHE_TTL) return;
    if (inFlight) return inFlight;

    if (loading) {
      loading.style.display = 'block';
      loading.style.color = '';
      loading.textContent = 'Загрузка карт…';
    }

    inFlight = (async () => {
      try {
        const data = await Utils.apiRequest('/api/maps.php', 'GET');
        polygons = data.polygons || [];

        if (!polygons.length) {
          if (loading) {
            loading.innerHTML = '';
            loading.appendChild(Utils.emptyState(
              'map',
              'Полигонов нет',
              'Карты полигонов ещё не добавлены'
            ));
          }
          return;
        }

        buildMap(container, select, layersBox);
        loadedAt = Date.now();
      } catch (error) {
        console.error('[Maps.load]', error);
        if (loading) {
          loading.style.display = 'block';
          loading.style.color = '';
          loading.innerHTML = '';
          loading.appendChild(Utils.emptyState(
            'error_outline',
            'Ошибка загрузки',
            'Не удалось загрузить карты'
          ));
        }
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  function waitForLeaflet() {
    return new Promise(resolve => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (typeof L !== 'undefined' || Date.now() - start > LEAFLET_WAIT_TIMEOUT) {
          clearInterval(timer);
          resolve();
        }
      }, LEAFLET_WAIT_INTERVAL);
    });
  }

  function buildMap(container, select, layersBox) {
    select.innerHTML = '';
    polygons.forEach(polygon => {
      const option = document.createElement('option');
      option.value = polygon.slug;
      option.textContent = polygon.name;
      select.appendChild(option);
    });

    const first = polygons[0];

    mapInstance = L.map('map-container', {
      center: first.center,
      zoom: first.zoom || 14,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 19,
      attribution: 'Google Satellite'
    }).addTo(mapInstance);

    mapReady = true;

    select.value = first.slug;
    switchPolygon(first.slug, layersBox);

    select.addEventListener('change', function () {
      switchPolygon(this.value, layersBox);
    });

    const loading = document.getElementById('map-loading');
    if (loading) loading.style.display = 'none';

    setTimeout(() => mapInstance.invalidateSize(), 300);
  }

  function switchPolygon(slug, layersBox) {
    if (!layersBox) layersBox = document.getElementById('map-layers');
    if (!layersBox || !mapInstance) return;

    const polygon = polygons.find(p => p.slug === slug);
    if (!polygon) return;

    mapInstance.setView(polygon.center, polygon.zoom || 14);

    Object.keys(layerGroups).forEach(key => {
      if (mapInstance.hasLayer(layerGroups[key])) {
        mapInstance.removeLayer(layerGroups[key]);
      }
    });
    layerGroups = {};

    layersBox.innerHTML = '';

    if (!polygon.layers || !polygon.layers.length) {
      const empty = document.createElement('div');
      empty.className = 'map-empty';
      empty.textContent = 'Слои для этого полигона отсутствуют.';
      layersBox.appendChild(empty);
      return;
    }

    const title = document.createElement('div');
    title.className = 'map-layers-title';
    title.innerHTML = '<span class="material-icons">layers</span> Слои карты';
    layersBox.appendChild(title);

    const list = document.createElement('div');
    list.className = 'map-layers-list';
    layersBox.appendChild(list);

    polygon.layers.forEach(layerData => {
      attachLayer(layerData, list);
    });

    setTimeout(() => mapInstance.invalidateSize(), 100);
  }

  function attachLayer(layerData, listContainer) {
    const group = L.layerGroup();
    const layerKey = layerData.id || layerData.name;
    layerGroups[layerKey] = group;

    if (layerData.url) {
      loadGeojsonFromUrl(layerData, group);
    } else if (layerData.geojson) {
      L.geoJSON(layerData.geojson, {
        style: layerData.style || { color: '#ff6600', weight: 2 }
      }).addTo(group);
    }

    const visible = layerData.visible !== false;
    if (visible) mapInstance.addLayer(group);

    listContainer.appendChild(renderLayerToggle(layerData, group, visible));
  }

  async function loadGeojsonFromUrl(layerData, group) {
    let url = String(layerData.url).trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
      url = '/' + url;
    }

    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const geojson = await response.json();

      L.geoJSON(geojson, {
        style: layerData.style || { color: '#ff6600', weight: 2 },
        onEachFeature: (feature, layer) => {
          if (!feature.properties) return;
          const rows = Object.entries(feature.properties)
            .filter(([key, value]) => key !== 'fid' && value !== null && value !== undefined && value !== '')
            .map(([key, value]) => '<strong>' + escapeForPopup(key) + ':</strong> ' + escapeForPopup(value));

          if (rows.length) layer.bindPopup(rows.join('<br>'));
        }
      }).addTo(group);
    } catch (error) {
      console.warn('[Maps] Не удалось загрузить слой:', url, error);
    }
  }

  function escapeForPopup(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderLayerToggle(layerData, group, visible) {
    const row = document.createElement('label');
    row.className = 'map-layer-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = visible;

    const swatch = document.createElement('span');
    swatch.className = 'map-layer-swatch';
    swatch.style.background = (layerData.style && layerData.style.color) || '#ff6600';

    const name = document.createElement('span');
    name.className = 'map-layer-name';
    name.textContent = layerData.name || layerData.id || 'Слой';

    checkbox.addEventListener('change', function () {
      if (this.checked) mapInstance.addLayer(group);
      else mapInstance.removeLayer(group);
    });

    row.appendChild(checkbox);
    row.appendChild(swatch);
    row.appendChild(name);
    return row;
  }

  window.Maps = { load };
})();