// auth.js
(function() {
    let currentUser = null;
    let lastMessageId = 0;
    let pollInterval = null;

    const loginBtn = document.getElementById('login-btn');
    const profileLink = document.getElementById('profile-link');
    const logoutBtn = document.getElementById('logout-btn');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.getElementById('close-modal');
    const authForm = document.getElementById('auth-form');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitch = document.getElementById('auth-switch-link');
    const authModalTitle = document.getElementById('auth-modal-title');
    let isLoginMode = true;

    const profileAvatar = document.getElementById('profile-avatar');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    const profileUsername = document.getElementById('profile-username');
    const profileRole = document.getElementById('profile-role');
    const profileStats = document.getElementById('profile-stats');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');

    function checkAuth() {
        return Utils.apiRequest('/api/auth.php?action=check', 'GET')
        .then(data => {
            if (data.loggedin) {
                currentUser = data.user;
                updateAuthUI();
                loadProfile();
                if (window.Chat) window.Chat.startPolling();
                if (window.Polls && typeof window.Polls.updatePollFormVisibility === 'function') {
                    window.Polls.updatePollFormVisibility();
                }
            } else {
                currentUser = null;
                updateAuthUI();
                if (window.Chat) window.Chat.stopPolling();
                if (window.Polls && typeof window.Polls.updatePollFormVisibility === 'function') {
                    window.Polls.updatePollFormVisibility();
                }
            }
            return data;
        });
    }

    function login(username, password) {
        return Utils.apiRequest('/api/auth.php?action=login', 'POST', { username, password })
        .then(data => {
            if (data.success) {
                return checkAuth();
            } else {
                alert(data.error || 'Ошибка входа');
                return null;
            }
        });
    }

    function register(username, password) {
        return Utils.apiRequest('/api/auth.php?action=register', 'POST', { username, password })
        .then(data => {
            if (data.success) {
                alert('Регистрация успешна! Вы автоматически вошли.');
                return checkAuth();
            } else {
                alert(data.error || 'Ошибка регистрации');
                return null;
            }
        });
    }

    function logout() {
        return Utils.apiRequest('/api/auth.php?action=logout', 'GET')
        .then(() => {
            currentUser = null;
            updateAuthUI();
            if (window.Chat) window.Chat.stopPolling();
            window.Navigation.showPage('page-home');
            chatMessages.innerHTML = '<div style="color: var(--text-muted); text-align: center;">Авторизуйтесь, чтобы видеть сообщения.</div>';
            if (window.Polls && typeof window.Polls.updatePollFormVisibility === 'function') {
                window.Polls.updatePollFormVisibility();
            }
        });
    }

    function loadProfile() {
        if (!currentUser) return;
        profileUsername.textContent = currentUser.username || 'Боец';
        const roleMap = { 'admin': 'АДМИН', 'user': 'ПОЛЬЗОВАТЕЛЬ' };
        profileRole.textContent = roleMap[currentUser.role] || 'Пользователь';
        const regDate = currentUser.registered_at ? new Date(currentUser.registered_at * 1000).toLocaleDateString() : '—';
        profileStats.textContent = `Зарегистрирован: ${regDate}`;
        const avatarUrl = (currentUser.avatar && currentUser.avatar !== 'default.png') ? '/uploads/avatars/' + currentUser.avatar : null;
        if (avatarUrl) {
            profileAvatar.src = avatarUrl;
            profileAvatar.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
        } else {
            profileAvatar.style.display = 'none';
            avatarPlaceholder.style.display = 'flex';
        }
        updateAdminUI();
        if (window.Polls && typeof window.Polls.updatePollFormVisibility === 'function') {
            window.Polls.updatePollFormVisibility();
        }
        const activeTab = document.querySelector('.profile-sidebar .tab-menu button.active-tab');
        if (activeTab) {
            const tabId = activeTab.dataset.tab;
            if (tabId === 'polls' && window.Polls) window.Polls.loadPolls();
            if (tabId === 'events' && window.Events) window.Events.loadEvents();
        }
    }

    function updateAdminUI() {
        const isAdmin = currentUser && currentUser.role === 'admin';
        const adminBtn = document.getElementById('admin-tab-btn');
        if (adminBtn) adminBtn.style.display = isAdmin ? 'block' : 'none';
        const eventForm = document.getElementById('event-create-form');
        if (eventForm) eventForm.style.display = isAdmin ? 'block' : 'none';
    }

    function updateAuthUI() {
        if (currentUser) {
            loginBtn.style.display = 'none';
            profileLink.style.display = 'inline-block';
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            if (document.getElementById('page-profile').classList.contains('active')) loadProfile();
        } else {
            loginBtn.style.display = 'inline-block';
            profileLink.style.display = 'none';
            chatInput.disabled = true;
            chatSendBtn.disabled = true;
            if (document.getElementById('page-profile').classList.contains('active')) window.Navigation.showPage('page-home');
        }
    }

    loginBtn.addEventListener('click', () => authModal.classList.add('active-modal'));
    closeModal.addEventListener('click', () => authModal.classList.remove('active-modal'));
    authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.remove('active-modal'); });
    authSwitch.addEventListener('click', function() {
        isLoginMode = !isLoginMode;
        authModalTitle.textContent = isLoginMode ? 'Вход' : 'Регистрация';
        authSubmitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        authSwitch.textContent = isLoginMode ? 'Зарегистрироваться' : 'Войти';
    });
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value.trim();
        if (isLoginMode) {
            login(username, password).then(() => authModal.classList.remove('active-modal'));
        } else {
            register(username, password).then(() => authModal.classList.remove('active-modal'));
        }
    });
    logoutBtn.addEventListener('click', function() { if (confirm('Выйти из аккаунта?')) logout(); });

    const avatarForm = document.getElementById('avatar-form');
    const avatarFileInput = document.getElementById('avatar-file');
    avatarForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!currentUser) {
            alert('Сначала войдите в аккаунт.');
            return;
        }
        const file = avatarFileInput.files[0];
        if (!file) {
            alert('Выберите файл для загрузки.');
            return;
        }
        const formData = new FormData();
        formData.append('avatar', file);
        fetch('/api/profile.php?action=avatar', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Аватар обновлён!');
                if (data.avatar) {
                    profileAvatar.src = '/uploads/avatars/' + data.avatar;
                    profileAvatar.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                    if (currentUser) currentUser.avatar = data.avatar;
                }
                loadProfile();
            } else {
                alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
            }
        })
        .catch(err => alert('Ошибка сети: ' + err.message));
    });

    const passwordForm = document.getElementById('change-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const old = document.getElementById('old-password').value.trim();
            const newpwd = document.getElementById('new-password').value.trim();
            if (!old || !newpwd) {
                alert('Заполните оба поля.');
                return;
            }
            alert('Функция смены пароля будет реализована позже.');
        });
    }

    const tabButtons = document.querySelectorAll('.profile-sidebar .tab-menu button[data-tab]');
    const tabPanes = {
        chat: document.getElementById('tab-chat'),
 polls: document.getElementById('tab-polls'),
 events: document.getElementById('tab-events'),
 settings: document.getElementById('tab-settings'),
 admin: document.getElementById('tab-admin')
    };
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            tabButtons.forEach(b => b.classList.remove('active-tab'));
            this.classList.add('active-tab');
            Object.keys(tabPanes).forEach(key => {
                tabPanes[key].classList.remove('active-pane');
            });
            const tabId = this.dataset.tab;
            if (tabPanes[tabId]) {
                tabPanes[tabId].classList.add('active-pane');
            }
            if (tabId === 'polls' && window.Polls) window.Polls.loadPolls();
            if (tabId === 'events' && window.Events) window.Events.loadEvents();
        });
    });

    window.Auth = {
        currentUser: () => currentUser,
 checkAuth: checkAuth,
 loadProfile: loadProfile,
 updateAuthUI: updateAuthUI
    };
})();
