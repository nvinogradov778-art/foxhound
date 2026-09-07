// radio.js
(function() {
    let radioStations = [];
    let currentStationIndex = 0;
    let currentTrackIndex = 0;
    let isPlaying = false;
    const audio = new Audio();

    const radioFreq = document.getElementById('radio-freq');
    const radioPurpose = document.getElementById('radio-purpose');
    const trackTitle = document.getElementById('track-title');
    const radioDesc = document.getElementById('radio-desc');
    const playlistSelect = document.getElementById('playlist-select');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressFill = document.getElementById('progress-fill');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationTimeEl = document.getElementById('duration-time');
    let isSeeking = false;

    async function loadRadioData() {
        try {
            const response = await fetch('radio_data.json');
            if (!response.ok) throw new Error('Не удалось загрузить плейлист');
            const data = await response.json();
            radioStations = data.stations;
            initRadio();
        } catch (error) {
            console.error('Ошибка загрузки радио:', error);
            radioPurpose.innerText = 'ОШИБКА ЗАГРУЗКИ';
            radioDesc.innerText = 'Проверьте наличие файла radio_data.json';
        }
    }

    function initRadio() {
        playlistSelect.innerHTML = '';
        radioStations.forEach((station, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.innerText = station.name;
            playlistSelect.appendChild(opt);
        });
        updateDisplay();
    }

    function updateDisplay() {
        const station = radioStations[currentStationIndex];
        if (!station) return;
        const track = station.tracks[currentTrackIndex];
        if (isPlaying) {
            radioFreq.innerText = `FREQ: ${station.frequency} MHz`;
            radioPurpose.innerText = station.purpose.toUpperCase();
            trackTitle.innerText = `▶ ${track.title.toUpperCase()}`;
            radioDesc.innerText = station.desc;
            playBtn.innerHTML = '<span class="material-icons">pause</span>';
            if (navigator.mediaSession) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: 'FOXHOUND TAC-COM',
                    album: station.name,
                    artwork: [{ src: '/logo-foxhound.webp', sizes: '512x512', type: 'image/webp' }]
                });
                navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) toggleRadio(); });
                navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) toggleRadio(); });
                navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
                navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
            }
        } else {
            radioFreq.innerText = 'FREQ: ---.--- MHz';
            radioPurpose.innerText = 'СЕТЬ ОТКЛЮЧЕНА';
            trackTitle.innerText = track ? track.title.toUpperCase() : 'ШУМ ЭФИРА...';
            radioDesc.innerText = station.desc || 'Для активации нажмите ВКЛ';
            playBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
            if (navigator.mediaSession) navigator.mediaSession.metadata = null;
        }
        if (audio.src) updateProgress();
    }

    function toggleRadio() {
        if (!isPlaying) {
            if (!audio.src || audio.ended) playTrack();
            else { audio.play().catch(console.warn); isPlaying = true; updateDisplay(); }
        } else {
            audio.pause(); isPlaying = false; updateDisplay();
        }
    }

    function playTrack() {
        const station = radioStations[currentStationIndex];
        if (!station) return;
        const track = station.tracks[currentTrackIndex];
        if (!track) { currentTrackIndex = 0; playTrack(); return; }
        audio.src = track.src;
        audio.play().catch(console.warn);
        isPlaying = true;
        updateDisplay();
        progressFill.style.width = '0%';
        currentTimeEl.textContent = '00:00';
    }

    function changeChannel() {
        currentStationIndex = parseInt(playlistSelect.value);
        currentTrackIndex = 0;
        if (isPlaying) playTrack();
        else { updateDisplay(); progressFill.style.width = '0%'; currentTimeEl.textContent = '00:00'; durationTimeEl.textContent = '00:00'; audio.src = ''; }
    }

    function nextTrack() {
        const station = radioStations[currentStationIndex];
        if (!station) return;
        currentTrackIndex++;
        if (currentTrackIndex >= station.tracks.length) currentTrackIndex = 0;
        if (isPlaying) playTrack(); else updateDisplay();
    }

    function prevTrack() {
        const station = radioStations[currentStationIndex];
        if (!station) return;
        currentTrackIndex--;
        if (currentTrackIndex < 0) currentTrackIndex = station.tracks.length - 1;
        if (isPlaying) playTrack(); else updateDisplay();
    }

    function updateProgress() {
        if (!audio.src || !isFinite(audio.duration)) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        currentTimeEl.textContent = Utils.formatTime(audio.currentTime);
        const dur = audio.duration;
        if (isFinite(dur) && durationTimeEl.textContent === '00:00') durationTimeEl.textContent = Utils.formatTime(dur);
    }

    audio.addEventListener('loadedmetadata', function() {
        const dur = audio.duration;
        if (isFinite(dur)) durationTimeEl.textContent = Utils.formatTime(dur);
    });
        audio.addEventListener('timeupdate', function() {
            if (!isSeeking && isPlaying) updateProgress();
        });
            audio.addEventListener('ended', nextTrack);

            progressBar.addEventListener('click', function(e) {
                if (!audio.src) return;
                const rect = this.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const seekTime = x * audio.duration;
                if (isFinite(seekTime)) {
                    isSeeking = true;
                    audio.currentTime = seekTime;
                    progressFill.style.width = (x * 100) + '%';
                    currentTimeEl.textContent = Utils.formatTime(seekTime);
                    setTimeout(() => { isSeeking = false; }, 100);
                }
            });

            playBtn.addEventListener('click', toggleRadio);
            prevBtn.addEventListener('click', prevTrack);
            nextBtn.addEventListener('click', nextTrack);
            playlistSelect.addEventListener('change', changeChannel);

            window.Radio = {
                loadRadioData: loadRadioData,
                toggleRadio: toggleRadio,
                nextTrack: nextTrack,
                prevTrack: prevTrack
            };
})();
