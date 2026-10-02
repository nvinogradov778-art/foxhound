(function () {
  'use strict';
  if (!window.Utils) throw new Error('[profile-settings] utils.js must load first');
  if (!window.Modal) throw new Error('[profile-settings] modal.js must load first');

  function loadSettings() {
    const root = document.getElementById('settings-root');
    if (!root) return;

    const user = window.Auth && window.Auth.currentUser();
    if (!user) {
      root.innerHTML = '<div class="text-muted text-center">Войдите, чтобы открыть настройки.</div>';
      return;
    }

    root.innerHTML = '';
    root.appendChild(buildProfileCard(user));
    root.appendChild(buildPasswordCard());
  }

  function buildProfileCard(user) {
    const card = document.createElement('div');
    card.className = 'settings-card';

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.innerHTML = '<span class="material-icons">account_circle</span> Профиль';
    card.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'settings-grid';

    // Аватар
    const avatarBox = document.createElement('div');
    avatarBox.className = 'settings-avatar';
    if (user.avatar && user.avatar !== 'default.png') {
      const img = document.createElement('img');
      img.src = '/uploads/avatars/' + user.avatar;
      img.alt = user.username;
      img.onerror = function () {
        this.remove();
        avatarBox.innerHTML = '<span class="material-icons">person</span>';
      };
      avatarBox.appendChild(img);
    } else {
      avatarBox.innerHTML = '<span class="material-icons">person</span>';
    }
    grid.appendChild(avatarBox);

    // Поля
    const fields = document.createElement('div');
    fields.className = 'settings-fields';

    // Аватар
    const avatarGroup = document.createElement('div');
    avatarGroup.className = 'form-group';

    const avatarLabel = document.createElement('label');
    avatarLabel.textContent = 'Аватар';
    avatarGroup.appendChild(avatarLabel);

    const fileLabel = document.createElement('label');
    fileLabel.className = 'file-input';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'settings-avatar-input';
    fileLabel.appendChild(fileInput);

    const fileBtn = document.createElement('span');
    fileBtn.className = 'file-input-btn';
    fileBtn.innerHTML = '<span class="material-icons">upload_file</span> Выбрать файл';
    fileLabel.appendChild(fileBtn);

    const fileName = document.createElement('span');
    fileName.className = 'file-input-name';
    fileName.id = 'settings-avatar-name';
    fileName.textContent = 'Файл не выбран';
    fileLabel.appendChild(fileName);

    avatarGroup.appendChild(fileLabel);
    fields.appendChild(avatarGroup);

    const avatarSaveBtn = document.createElement('button');
    avatarSaveBtn.type = 'button';
    avatarSaveBtn.className = 'btn btn-primary';
    avatarSaveBtn.id = 'settings-avatar-save';
    avatarSaveBtn.disabled = true;
    avatarSaveBtn.innerHTML = '<span class="material-icons">upload</span> Загрузить';
    fields.appendChild(avatarSaveBtn);

    grid.appendChild(fields);
    card.appendChild(grid);

    // О себе
    const aboutGroup = document.createElement('div');
    aboutGroup.className = 'form-group';
    aboutGroup.style.marginTop = 'var(--space-4)';

    const aboutLabel = document.createElement('label');
    aboutLabel.textContent = 'О себе';
    aboutGroup.appendChild(aboutLabel);

    const aboutTextarea = document.createElement('textarea');
    aboutTextarea.id = 'settings-about';
    aboutTextarea.placeholder = 'Пара слов о себе…';
    aboutTextarea.value = user.about || '';
    aboutGroup.appendChild(aboutTextarea);

    card.appendChild(aboutGroup);

    const aboutSaveBtn = document.createElement('button');
    aboutSaveBtn.type = 'button';
    aboutSaveBtn.className = 'btn btn-primary';
    aboutSaveBtn.id = 'settings-about-save';
    aboutSaveBtn.innerHTML = '<span class="material-icons">save</span> Сохранить';
    card.appendChild(aboutSaveBtn);

    // Привязки
    fileInput.addEventListener('change', function () {
      avatarSaveBtn.disabled = !this.files.length;
      fileName.textContent = this.files.length ? this.files[0].name : 'Файл не выбран';
    });

    avatarSaveBtn.addEventListener('click', () => uploadAvatar(fileInput, avatarSaveBtn));
    aboutSaveBtn.addEventListener('click', () => saveAbout(aboutTextarea, aboutSaveBtn));

    return card;
  }

  function buildPasswordCard() {
    const card = document.createElement('div');
    card.className = 'settings-card';

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.innerHTML = '<span class="material-icons">lock</span> Смена пароля';
    card.appendChild(title);

    const oldGroup = document.createElement('div');
    oldGroup.className = 'form-group';
    oldGroup.innerHTML = '<label>Текущий пароль</label>';
    const oldInput = document.createElement('input');
    oldInput.type = 'password';
    oldInput.id = 'settings-old-pass';
    oldInput.autocomplete = 'current-password';
    oldGroup.appendChild(oldInput);
    card.appendChild(oldGroup);

    const newGroup = document.createElement('div');
    newGroup.className = 'form-group';
    newGroup.innerHTML = '<label>Новый пароль</label>';
    const newInput = document.createElement('input');
    newInput.type = 'password';
    newInput.id = 'settings-new-pass';
    newInput.autocomplete = 'new-password';
    newGroup.appendChild(newInput);
    card.appendChild(newGroup);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.id = 'settings-pass-save';
    saveBtn.innerHTML = '<span class="material-icons">save</span> Изменить пароль';
    saveBtn.addEventListener('click', () => changePassword(oldInput, newInput, saveBtn));
    card.appendChild(saveBtn);

    return card;
  }

  async function uploadAvatar(fileInput, button) {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span class="material-icons">hourglass_empty</span> Загрузка…';

    try {
      const response = await fetch('/api/profile.php?action=avatar', {
        method: 'POST',
        headers: { 'X-CSRF-Token': window.__csrfToken || '' },
        credentials: 'same-origin',
        body: formData
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить аватар');
      }

      Modal.alert({ title: 'Готово', message: 'Аватар обновлён' });
      await window.Auth.checkAuth();
      loadSettings();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  async function saveAbout(textarea, button) {
    const about = textarea.value.trim();
    button.disabled = true;

    try {
      await Utils.apiRequest('/api/profile.php?action=update', 'POST', { about });
      Modal.alert({ title: 'Готово', message: 'Сохранено' });
      await window.Auth.checkAuth();
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    } finally {
      button.disabled = false;
    }
  }

  async function changePassword(oldInput, newInput, button) {
    const oldP = oldInput.value;
    const newP = newInput.value;

    if (!oldP || !newP) {
      Modal.alert({ title: 'Заполните оба поля', danger: true });
      return;
    }
    if (newP.length < 4) {
      Modal.alert({ title: 'Пароль — минимум 4 символа', danger: true });
      return;
    }

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span class="material-icons">hourglass_empty</span> Отправка…';

    try {
      await Utils.apiRequest('/api/profile.php?action=password', 'POST', {
        old_password: oldP,
        new_password: newP
      });
      Modal.alert({ title: 'Готово', message: 'Пароль изменён' });
      oldInput.value = '';
      newInput.value = '';
    } catch (error) {
      Modal.alert({ title: 'Ошибка', message: error.message, danger: true });
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  window.ProfileSettings = { load: loadSettings };
})();