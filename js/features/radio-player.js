import { Utils } from '../core/utils.js';

const audio = new Audio();
let stations = [];
let stationIndex = 0;
let trackIndex = 0;
let isPlaying = false;
let seeking = false;
let isDragging = false;
let bound = false;
let isSwitchingTrack = false;
let lastMediaTitle = '';

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
    initMediaSessionHandlers();
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

function initMediaSessionHandlers() {
  if (!navigator.mediaSession) return;
  
  try {
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('stop', () => { audio.pause(); audio.currentTime = 0; });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
          updateProgressUI();
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (details.seekOffset || 10));
          updateProgressUI();
      });
  } catch (e) {}
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

  if (progressBar) {
      const handleSeek = (clientX) => {
          if (!audio.src || !audio.duration) return;
          const rect = progressBar.getBoundingClientRect();
          let x = (clientX - rect.left) / rect.width;
          if (x < 0) x = 0;
          if (x > 1) x = 1;
          
          const time = x * audio.duration;
          if (!isFinite(time)) return;

          audio.currentTime = time;
          updateProgressUI();
      };

      progressBar.addEventListener('pointerdown', (e) => {
          isDragging = true;
          progressBar.setPointerCapture(e.pointerId);
          handleSeek(e.clientX);
      });
      
      progressBar.addEventListener('pointermove', (e) => {
          if (isDragging) handleSeek(e.clientX);
      });
      
      progressBar.addEventListener('pointerup', (e) => {
          isDragging = false;
          progressBar.releasePointerCapture(e.pointerId);
      });
  }

  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
  audio.addEventListener('timeupdate', handleTimeUpdate);
  audio.addEventListener('ended', next);
  
  audio.addEventListener('play', () => {
      isPlaying = true;
      updateDisplay();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
  });
  
  audio.addEventListener('pause', () => {
      isPlaying = false;
      updateDisplay();
      if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
  });
}

function updateProgressUI() {
    if (!audio.duration || !isFinite(audio.duration)) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
}

function initSelect() {
  ddMenu.innerHTML = '';
  if (!stations.length) { ddLabel.textContent = '— нет станций —'; return; }
  stations.forEach((station, index) => {
    ddMenu.appendChild(renderStationOption(station, index));
  });
  updateDropdownLabel();
}

function renderStationOption(station, index) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'radio-dd-item' + (index === stationIndex ? ' active' : '');
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
  item.addEventListener('click', () => { selectStation(index); closeDropdown(); });
  return item;
}

function updateDropdownLabel() {
  const station = stations[stationIndex];
  ddLabel.textContent = station ? (station.name || '—') : '— нет станций —';
  ddMenu.querySelectorAll('.radio-dd-item').forEach((el, index) => {
    el.classList.toggle('active', index === stationIndex);
  });
}

function toggleDropdown() { ddMenu.classList.toggle('open'); ddTrigger.classList.toggle('open'); }
function closeDropdown() { ddMenu.classList.remove('open'); ddTrigger.classList.remove('open'); }

function selectStation(index) {
  if (index === stationIndex && isPlaying) return;
  stationIndex = index;
  trackIndex = 0;
  updateDropdownLabel();
  playCurrentTrack(true); 
}

function updateDisplay() {
  const station = stations[stationIndex];
  if (!station) return;

  const track = (station.tracks || [])[trackIndex];

  if (isPlaying) {
    freqEl.textContent = 'FREQ: ' + (station.frequency || '—') + ' MHz';
    purposeEl.textContent = (station.purpose || '').toUpperCase();
    trackEl.textContent = '▶ ' + ((track && track.title) || '—').toUpperCase();
    descEl.textContent = station.desc || '';
    playBtn.innerHTML = '<span class="material-icons">pause</span>';
  } else {
    freqEl.textContent = 'FREQ: ---.--- MHz';
    purposeEl.textContent = 'СЕТЬ ОТКЛЮЧЕНА';
    trackEl.textContent = ((track && track.title) || 'ШУМ ЭФИРА...').toUpperCase();
    descEl.textContent = station.desc || 'Для активации нажмите ВКЛ';
    playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
  }

  if (track) updateMediaSession(station, track);
}

function updateMediaSession(station, track) {
  if (!navigator.mediaSession || !window.MediaMetadata) return;
  
  const currentTitle = track ? track.title : station.name;
  
  if (lastMediaTitle === currentTitle) return;
  lastMediaTitle = currentTitle;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: currentTitle,
    artist: 'FOXHOUND TAC-COM',
    album: station.name,
    artwork: [{ src: '/logo-foxhound.webp', sizes: '512x512', type: 'image/webp' }]
  });
}

function playCurrentTrack(forceStart = false) {
  const station = stations[stationIndex];
  if (!station) return;

  const tracks = station.tracks || [];
  const track = tracks[trackIndex];
  if (!track) return;

  let src = track.src || '';
  if (src && !src.startsWith('/') && !/^https?:/i.test(src)) {
    src = '/' + src;
  }

  if (audio.src !== window.location.origin + src && audio.src !== src) {
      audio.src = src;
  }

  audio.play().catch(error => {
    if (error.name !== 'AbortError') console.warn('[Radio.play]', error.name, src);
  });

  if (forceStart) {
      progressFill.style.width = '0%';
      if (currentTimeEl) currentTimeEl.textContent = '00:00';
  }
}

function toggle() {
  if (audio.paused) {
      if (!audio.src) {
          playCurrentTrack(true);
      } else {
          audio.play();
      }
  } else {
      audio.pause();
  }
}

function switchTrack(direction) {
  if (isSwitchingTrack) return;
  isSwitchingTrack = true;
  
  const station = stations[stationIndex];
  if (!station) { isSwitchingTrack = false; return; }
  
  const count = (station.tracks || []).length;
  if (!count) { isSwitchingTrack = false; return; }

  if (direction === 'prev' && audio.currentTime > 3) {
      audio.currentTime = 0;
  } else {
      trackIndex = (trackIndex + direction + count) % count;
      playCurrentTrack(true);
  }

  setTimeout(() => { isSwitchingTrack = false; }, 500);
}

function next() { switchTrack(1); }
function prev() { switchTrack(-1); }

function handleLoadedMetadata() {
  if (isFinite(audio.duration) && durationEl) {
    durationEl.textContent = formatTime(audio.duration);
  }
}

function handleTimeUpdate() {
  if (seeking || isDragging || !isPlaying) return;
  updateProgressUI();
}

function formatTime(sec) {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export const RadioPlayer = { load };