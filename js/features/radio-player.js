(function () {
  'use strict';
  if (!window.Utils) throw new Error('[radio-player] utils.js must load first');

  const audio = new Audio();
  let stations = [];
  let stationIndex = 0;
  let trackIndex = 0;
  let isPlaying = false;
  let seeking = false;
  let bound = false;

  let freqEl, purposeEl, trackEl, descEl, ddTrigger, ddMenu, ddLabel;
  let playBtn, prevBtn, nextBtn, progressBar, progressFill, currentTimeEl, durationEl;

  async function load() {
    cacheElements();
    if (!ddTrigger || !playBtn) return;

    if (!bound) {
      bindControls();
      bound = true;
    }

    try {
      const data = await Utils.apiRequest('/api/radio.php', 'GET');
      stations = data.stations || [];
      initSelect();
      updateDisplay();
    } catch (error) {
      console.warn('[RadioPlayer.load]', error);
      if (purposeEl) purposeEl.textContent = 'ОШИБКА ЗАГРУЗКИ';
      if (descEl) descEl.textContent = 'Сервер не отвечает.';
    }
  }

  function cacheElements() {
    freqEl = document.getElementById('radio-freq');
    purposeEl = document.getElementById('radio-purpose');
    trackEl = document.getElementById('radio-track');
    descEl = document.getElementById('radio-desc');
    ddTrigger = document.getElementById('radio-dd-trigger');
    ddMenu = document.getElementById('radio-dd-menu');
    ddLabel = document.getElementById('radio-dd-label');
    playBtn = document.getElementById('radio-play');
    prevBtn = document.getElementById('radio-prev');
    nextBtn = document.getElementById('radio-next');
    progressBar = document.getElementById('radio-progress-bar');
    progressFill = document.getElementById('radio-progress-fill');
    currentTimeEl = document.getElementById('radio-current');
    durationEl = document.getElementById('radio-duration');
  }

  function bindControls() {
    playBtn.addEventListener('click', toggle);
    prevBtn?.addEventListener('click', prev);
    nextBtn?.addEventListener('click', next);

    ddTrigger.addEventListener('click', event => {
      event.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener('click', event => {
      if (!ddTrigger.contains(event.target) && !ddMenu.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeDropdown();
    });

    progressBar?.addEventListener('click', handleSeek);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', next);
  }

  // ---------- Станции ----------

  function initSelect() {
    ddMenu.innerHTML = '';

    if (!stations.length) {
      ddLabel.textContent = '— нет станций —';
      return;
    }

    stations.forEach((station, index) => {
      ddMenu.appendChild(renderStationOption(station, index));
    });

    updateDropdownLabel();
  }

  function renderStationOption(station, index) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'radio-dd-item' + (index === stationIndex ? ' active' : '');
    item.dataset.index = index;

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = 'radio';
    item.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'radio-dd-item-name';
    name.textContent = station.name || '—';
    item.appendChild(name);

    const freq = document.createElement('span');
    freq.className = 'radio-dd-item-freq';
    freq.textContent = station.frequency ? station.frequency + ' MHz' : '';
    item.appendChild(freq);

    item.addEventListener('click', () => {
      selectStation(index);
      closeDropdown();
    });

    return item;
  }

  function updateDropdownLabel() {
    const station = stations[stationIndex];
    ddLabel.textContent = station ? (station.name || '—') : '— нет станций —';

    ddMenu.querySelectorAll('.radio-dd-item').forEach((el, index) => {
      el.classList.toggle('active', index === stationIndex);
    });
  }

  function toggleDropdown() {
    ddMenu.classList.toggle('open');
    ddTrigger.classList.toggle('open');
  }

  function closeDropdown() {
    ddMenu.classList.remove('open');
    ddTrigger.classList.remove('open');
  }

  function selectStation(index) {
    if (index === stationIndex && isPlaying) return;
    stationIndex = index;
    trackIndex = 0;
    updateDropdownLabel();
    changeStation();
  }

  // ---------- Отображение ----------

  function updateDisplay() {
    const station = stations[stationIndex];
    if (!station) {
      freqEl.textContent = 'FREQ: ---.--- MHz';
      purposeEl.textContent = 'СЕТЬ ОТКЛЮЧЕНА';
      trackEl.textContent = 'ШУМ ЭФИРА...';
      descEl.textContent = 'Нет доступных станций.';
      return;
    }

    const tracks = station.tracks || [];
    const track = tracks[trackIndex];

    if (isPlaying) {
      freqEl.textContent = 'FREQ: ' + (station.frequency || '—') + ' MHz';
      purposeEl.textContent = (station.purpose || '').toUpperCase();
      trackEl.textContent = '▶ ' + ((track && track.title) || '—').toUpperCase();
      descEl.textContent = station.desc || '';
      playBtn.innerHTML = '<span class="material-icons">pause</span>';
      updateMediaSession(station, track);
    } else {
      freqEl.textContent = 'FREQ: ---.--- MHz';
      purposeEl.textContent = 'СЕТЬ ОТКЛЮЧЕНА';
      trackEl.textContent = ((track && track.title) || 'ШУМ ЭФИРА...').toUpperCase();
      descEl.textContent = station.desc || 'Для активации нажмите ВКЛ';
      playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
      if (navigator.mediaSession) navigator.mediaSession.metadata = null;
    }
  }

  function updateMediaSession(station, track) {
    if (!navigator.mediaSession || !track || !window.MediaMetadata) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'FOXHOUND TAC-COM',
      album: station.name,
      artwork: [{ src: '/logo-foxhound.webp', sizes: '512x512', type: 'image/webp' }]
    });
  }

  // ---------- Воспроизведение ----------

  function playTrack() {
    const station = stations[stationIndex];
    if (!station) return;

    const tracks = station.tracks || [];
    const track = tracks[trackIndex];
    if (!track) {
      trackIndex = 0;
      if (tracks.length) {
        playTrack();
      }
      return;
    }

    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    let src = track.src || '';
    if (src && !src.startsWith('/') && !/^https?:/i.test(src)) {
      src = '/' + src;
    }

    audio.src = src;
    audio.play().catch(error => {
      if (error.name !== 'AbortError') console.warn('[Radio.play]', error.name, src);
    });

    isPlaying = true;
    updateDisplay();
    progressFill.style.width = '0%';
    if (currentTimeEl) currentTimeEl.textContent = '00:00';
  }

  function toggle() {
    if (!isPlaying) {
      playTrack();
    } else {
      audio.pause();
      isPlaying = false;
      updateDisplay();
    }
  }

  function next() {
    const station = stations[stationIndex];
    if (!station) return;
    const count = (station.tracks || []).length;
    if (!count) return;
    trackIndex = (trackIndex + 1) % count;
    if (isPlaying) playTrack();
    else updateDisplay();
  }

  function prev() {
    const station = stations[stationIndex];
    if (!station) return;
    const count = (station.tracks || []).length;
    if (!count) return;
    trackIndex = (trackIndex - 1 + count) % count;
    if (isPlaying) playTrack();
    else updateDisplay();
  }

  function changeStation() {
    if (isPlaying) {
      playTrack();
      return;
    }

    updateDisplay();
    progressFill.style.width = '0%';
    if (currentTimeEl) currentTimeEl.textContent = '00:00';
    if (durationEl) durationEl.textContent = '00:00';
    audio.removeAttribute('src');
  }

  function handleSeek(event) {
    if (!audio.src || !audio.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const time = x * audio.duration;

    if (!isFinite(time)) return;

    seeking = true;
    audio.currentTime = time;
    progressFill.style.width = (x * 100) + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(time);
    setTimeout(() => { seeking = false; }, 100);
  }

  function handleLoadedMetadata() {
    if (isFinite(audio.duration) && durationEl) {
      durationEl.textContent = formatTime(audio.duration);
    }
  }

  function handleTimeUpdate() {
    if (seeking || !isPlaying) return;
    if (!audio.duration || !isFinite(audio.duration)) return;

    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  window.RadioPlayer = { load };
})();