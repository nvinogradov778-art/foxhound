<?php
// Проверка авторизации и роли
session_start();
require_once __DIR__ . '/../api/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

$stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$role = $stmt->fetchColumn();
if ($role !== 'admin') {
    header('Location: /');
    exit;
}

// Определяем активный раздел
$section = $_GET['section'] ?? 'photos';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Админ-панель FOXHOUND</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap" rel="stylesheet" />
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #c0c0c0; font-family: 'PT Sans', sans-serif; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: #111; border: 2px solid #ff6600; padding: 20px; }
        h1 { color: #ff6600; font-family: 'PT Sans Narrow', sans-serif; letter-spacing: 2px; border-bottom: 1px solid #2a2a2a; padding-bottom: 10px; }
        .nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
        .nav a { background: transparent; border: 1px solid #2a2a2a; color: #c0c0c0; padding: 8px 16px; text-decoration: none; font-weight: 700; font-family: 'PT Sans Narrow', sans-serif; letter-spacing: 1px; }
        .nav a.active, .nav a:hover { border-color: #ff6600; color: #ff6600; background: rgba(255,102,0,0.1); }
        .section { display: none; margin-top: 20px; }
        .section.active { display: block; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px 12px; background: #0a0a0a; border: 1px solid #2a2a2a; color: #fff; border-radius: 4px; font-family: 'PT Sans', sans-serif; }
        .form-group textarea { min-height: 80px; }
        .btn { background: #ff6600; color: #0a0a0a; border: none; padding: 10px 20px; font-weight: 700; cursor: pointer; border-radius: 4px; font-family: 'PT Sans Narrow', sans-serif; letter-spacing: 1px; }
        .btn:hover { background: #ff8833; }
        .btn-danger { background: #ff3333; color: #0a0a0a; }
        .btn-danger:hover { background: #ff5555; }
        .list-item { background: #0a0a0a; border: 1px solid #2a2a2a; padding: 10px 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .list-item .actions { display: flex; gap: 8px; }
        .list-item .actions .btn { padding: 4px 12px; font-size: 13px; }
        .preview-img { max-width: 100px; max-height: 100px; object-fit: cover; border: 1px solid #2a2a2a; }
        .file-input-wrapper { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .file-input-wrapper input[type="file"] { flex: 1; min-width: 150px; }
        @media (max-width: 600px) { .list-item { flex-direction: column; align-items: stretch; gap: 8px; } }
    </style>
</head>
<body>
<div class="container">
    <h1>🛠️ Администрирование FOXHOUND</h1>
    <div class="nav">
        <a href="?section=photos" class="<?= $section === 'photos' ? 'active' : '' ?>">📸 Фото</a>
        <a href="?section=operators" class="<?= $section === 'operators' ? 'active' : '' ?>">👥 Оперативники</a>
        <a href="?section=instructions" class="<?= $section === 'instructions' ? 'active' : '' ?>">📄 Инструкции</a>
        <a href="?section=atak" class="<?= $section === 'atak' ? 'active' : '' ?>">📡 ATAK</a>
        <a href="?section=regulations" class="<?= $section === 'regulations' ? 'active' : '' ?>">📜 Устав</a>
        <a href="?section=scenarios" class="<?= $section === 'scenarios' ? 'active' : '' ?>">🎯 Сценарии</a>
        <a href="?section=devices" class="<?= $section === 'devices' ? 'active' : '' ?>">🛠️ Девайсы</a>
        <a href="?section=json" class="<?= $section === 'json' ? 'active' : '' ?>">📝 JSON-редактор</a>
        <a href="/" style="margin-left: auto;">🏠 На сайт</a>
    </div>

    <!-- ===== Раздел Фото ===== -->
    <div id="section-photos" class="section <?= $section === 'photos' ? 'active' : '' ?>">
        <h2>Управление фотографиями</h2>
        <form id="photo-form" enctype="multipart/form-data">
            <div class="form-group">
                <label>Заголовок</label>
                <input type="text" id="photo-title" required />
            </div>
            <div class="form-group">
                <label>Описание</label>
                <textarea id="photo-desc"></textarea>
            </div>
            <div class="form-group">
                <label>Дата</label>
                <input type="date" id="photo-date" />
            </div>
            <div class="form-group file-input-wrapper">
                <input type="file" id="photo-file" accept="image/*" required />
                <button type="submit" class="btn">Добавить фото</button>
            </div>
        </form>
        <div id="photo-list"></div>
    </div>

    <!-- ===== Раздел Оперативники ===== -->
    <div id="section-operators" class="section <?= $section === 'operators' ? 'active' : '' ?>">
        <h2>Управление оперативниками</h2>
        <form id="operator-form" enctype="multipart/form-data">
            <div class="form-group"><label>Имя</label><input type="text" id="op-name" required /></div>
            <div class="form-group"><label>Роль</label><input type="text" id="op-role" /></div>
            <div class="form-group"><label>Специализация</label><input type="text" id="op-spec" /></div>
            <div class="form-group"><label>Описание</label><textarea id="op-desc"></textarea></div>
            <div class="form-group file-input-wrapper">
                <input type="file" id="op-photo" accept="image/*" />
                <button type="submit" class="btn">Добавить / Обновить</button>
            </div>
            <input type="hidden" id="op-id" value="" />
        </form>
        <div id="operator-list"></div>
    </div>

    <!-- ===== Раздел Инструкции ===== -->
    <div id="section-instructions" class="section <?= $section === 'instructions' ? 'active' : '' ?>">
        <h2>Управление инструкциями</h2>
        <form id="instruction-form">
            <div class="form-group"><label>Название</label><input type="text" id="inst-title" required /></div>
            <div class="form-group"><label>Описание</label><textarea id="inst-desc"></textarea></div>
            <div class="form-group"><label>Ссылка на PDF</label><input type="url" id="inst-link" required /></div>
            <button type="submit" class="btn">Добавить инструкцию</button>
        </form>
        <div id="instruction-list"></div>
    </div>

    <!-- ===== Раздел ATAK (дерево) ===== -->
    <div id="section-atak" class="section <?= $section === 'atak' ? 'active' : '' ?>">
        <h2>Редактор ATAK</h2>
        <p>Используйте JSON-редактор для изменения структуры ATAK (раздел JSON).</p>
        <button onclick="location.href='?section=json&file=atak_data.json'" class="btn">Перейти к ATAK JSON</button>
    </div>

    <!-- ===== Раздел Устав (дерево) ===== -->
    <div id="section-regulations" class="section <?= $section === 'regulations' ? 'active' : '' ?>">
        <h2>Редактор Устава</h2>
        <p>Используйте JSON-редактор для изменения структуры Устава.</p>
        <button onclick="location.href='?section=json&file=regulations_data.json'" class="btn">Перейти к Уставу JSON</button>
    </div>

    <!-- ===== Раздел Сценарии ===== -->
    <div id="section-scenarios" class="section <?= $section === 'scenarios' ? 'active' : '' ?>">
        <h2>Управление сценариями</h2>
        <p>Редактируйте сценарии через JSON-редактор.</p>
        <button onclick="location.href='?section=json&file=scenarios_data.json'" class="btn">Перейти к сценариям JSON</button>
    </div>

    <!-- ===== Раздел Девайсы ===== -->
    <div id="section-devices" class="section <?= $section === 'devices' ? 'active' : '' ?>">
        <h2>Управление девайсами</h2>
        <p>Редактируйте девайсы через JSON-редактор.</p>
        <button onclick="location.href='?section=json&file=devices_data.json'" class="btn">Перейти к девайсам JSON</button>
    </div>

    <!-- ===== JSON-редактор ===== -->
    <div id="section-json" class="section <?= $section === 'json' ? 'active' : '' ?>">
        <h2>Редактор JSON-файлов</h2>
        <div style="margin-bottom: 10px;">
            <label>Выберите файл:</label>
            <select id="json-file-select">
                <option value="photo_data.json">photo_data.json</option>
                <option value="operators_data.json">operators_data.json</option>
                <option value="instructions_data.json">instructions_data.json</option>
                <option value="atak_data.json">atak_data.json</option>
                <option value="regulations_data.json">regulations_data.json</option>
                <option value="scenarios_data.json">scenarios_data.json</option>
                <option value="devices_data.json">devices_data.json</option>
            </select>
            <button class="btn" id="json-load-btn">Загрузить</button>
        </div>
        <textarea id="json-editor" style="width:100%; height:400px; background:#0a0a0a; color:#33ff33; border:1px solid #2a2a2a; padding:10px; font-family:monospace;"></textarea>
        <div style="margin-top: 10px;">
            <button class="btn" id="json-save-btn">💾 Сохранить</button>
            <button class="btn" id="json-format-btn">🔧 Форматировать</button>
        </div>
        <div id="json-status" style="margin-top:10px; padding:10px; border:1px solid #2a2a2a; display:none;"></div>
    </div>

</div>

<script>
    (function() {
        'use strict';

        // ================================================================
        // Общие функции для работы с JSON
        // ================================================================
        function apiRequest(url, method, body) {
            return fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            }).then(res => res.json());
        }

        function showStatus(msg, type) {
            const el = document.getElementById('json-status');
            el.style.display = 'block';
            el.textContent = msg;
            el.style.color = type === 'success' ? '#33cc33' : '#ff3333';
            el.style.borderColor = type === 'success' ? '#33cc33' : '#ff3333';
            setTimeout(() => { el.style.display = 'none'; }, 5000);
        }

        // ================================================================
        // Фото
        // ================================================================
        function loadPhotos() {
            fetch('/photo_data.json')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('photo-list');
                    container.innerHTML = '';
                    if (!data.photos || data.photos.length === 0) {
                        container.innerHTML = '<p style="color:#666;">Нет фотографий.</p>';
                        return;
                    }
                    data.photos.forEach(photo => {
                        const div = document.createElement('div');
                        div.className = 'list-item';
                        div.innerHTML = `
                            <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                                <img src="${photo.image}" alt="${photo.title}" class="preview-img" onerror="this.style.display='none'" />
                                <div>
                                    <strong>${photo.title}</strong>
                                    <div style="font-size:14px; color:#666;">${photo.description || ''}</div>
                                    <div style="font-size:12px; color:#666;">${photo.date || ''}</div>
                                </div>
                            </div>
                            <div class="actions">
                                <button class="btn btn-danger" onclick="deletePhoto(${photo.id})">Удалить</button>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                })
                .catch(err => console.error('Ошибка загрузки фото:', err));
        }

        window.deletePhoto = function(id) {
            if (!confirm('Удалить фото?')) return;
            fetch('/api/admin_photos.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) loadPhotos();
                else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        };

        document.getElementById('photo-form')?.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('title', document.getElementById('photo-title').value.trim());
            formData.append('description', document.getElementById('photo-desc').value.trim());
            formData.append('date', document.getElementById('photo-date').value);
            const fileInput = document.getElementById('photo-file');
            if (fileInput.files.length) {
                formData.append('photo', fileInput.files[0]);
            } else {
                alert('Выберите файл');
                return;
            }
            fetch('/api/admin_photos.php?action=upload', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadPhotos();
                    this.reset();
                } else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        });

        // ================================================================
        // Оперативники
        // ================================================================
        function loadOperators() {
            fetch('/operators_data.json')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('operator-list');
                    container.innerHTML = '';
                    if (!data.operators || data.operators.length === 0) {
                        container.innerHTML = '<p style="color:#666;">Нет оперативников.</p>';
                        return;
                    }
                    data.operators.forEach((op, index) => {
                        const div = document.createElement('div');
                        div.className = 'list-item';
                        div.innerHTML = `
                            <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                                ${op.photo ? `<img src="${op.photo}" alt="${op.name}" class="preview-img" onerror="this.style.display='none'" />` : ''}
                                <div>
                                    <strong>${op.name}</strong>
                                    <div style="font-size:14px; color:#ff6600;">${op.role || ''}</div>
                                    <div style="font-size:14px; color:#666;">${op.specialization || ''}</div>
                                    <div style="font-size:13px; color:#666;">${op.description || ''}</div>
                                </div>
                            </div>
                            <div class="actions">
                                <button class="btn" onclick="editOperator(${index})">✏️</button>
                                <button class="btn btn-danger" onclick="deleteOperator(${index})">🗑️</button>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                })
                .catch(err => console.error('Ошибка загрузки оперативников:', err));
        }

        window.editOperator = function(index) {
            fetch('/operators_data.json')
                .then(res => res.json())
                .then(data => {
                    const op = data.operators[index];
                    if (!op) return;
                    document.getElementById('op-id').value = index;
                    document.getElementById('op-name').value = op.name || '';
                    document.getElementById('op-role').value = op.role || '';
                    document.getElementById('op-spec').value = op.specialization || '';
                    document.getElementById('op-desc').value = op.description || '';
                    document.getElementById('op-photo').value = ''; // сброс
                })
                .catch(err => alert('Ошибка загрузки данных'));
        };

        window.deleteOperator = function(index) {
            if (!confirm('Удалить оперативника?')) return;
            fetch('/api/admin_operators.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: index })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) loadOperators();
                else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        };

        document.getElementById('operator-form')?.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData();
            const index = document.getElementById('op-id').value;
            if (index) formData.append('index', index);
            formData.append('name', document.getElementById('op-name').value.trim());
            formData.append('role', document.getElementById('op-role').value.trim());
            formData.append('specialization', document.getElementById('op-spec').value.trim());
            formData.append('description', document.getElementById('op-desc').value.trim());
            const fileInput = document.getElementById('op-photo');
            if (fileInput.files.length) {
                formData.append('photo', fileInput.files[0]);
            }
            fetch('/api/admin_operators.php?action=save', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadOperators();
                    this.reset();
                    document.getElementById('op-id').value = '';
                } else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        });

        // ================================================================
        // Инструкции
        // ================================================================
        function loadInstructions() {
            fetch('/instructions_data.json')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('instruction-list');
                    container.innerHTML = '';
                    if (!data.documents || data.documents.length === 0) {
                        container.innerHTML = '<p style="color:#666;">Нет инструкций.</p>';
                        return;
                    }
                    data.documents.forEach((doc, index) => {
                        const div = document.createElement('div');
                        div.className = 'list-item';
                        div.innerHTML = `
                            <div>
                                <strong>${doc.title}</strong>
                                <div style="font-size:14px; color:#666;">${doc.description || ''}</div>
                                <div><a href="${doc.link}" target="_blank">${doc.link}</a></div>
                            </div>
                            <div class="actions">
                                <button class="btn btn-danger" onclick="deleteInstruction(${index})">🗑️</button>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                })
                .catch(err => console.error('Ошибка загрузки инструкций:', err));
        }

        window.deleteInstruction = function(index) {
            if (!confirm('Удалить инструкцию?')) return;
            fetch('/api/admin_instructions.php?action=delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: index })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) loadInstructions();
                else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        };

        document.getElementById('instruction-form')?.addEventListener('submit', function(e) {
            e.preventDefault();
            const data = {
                title: document.getElementById('inst-title').value.trim(),
                description: document.getElementById('inst-desc').value.trim(),
                link: document.getElementById('inst-link').value.trim()
            };
            fetch('/api/admin_instructions.php?action=add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadInstructions();
                    this.reset();
                } else alert('Ошибка: ' + data.error);
            })
            .catch(err => alert('Ошибка сети'));
        });

        // ================================================================
        // JSON-редактор
        // ================================================================
        let currentJsonFile = document.getElementById('json-file-select').value;

        document.getElementById('json-load-btn')?.addEventListener('click', function() {
            const file = document.getElementById('json-file-select').value;
            fetch('/' + file)
                .then(res => {
                    if (!res.ok) throw new Error('Файл не найден');
                    return res.text();
                })
                .then(text => {
                    document.getElementById('json-editor').value = text;
                    currentJsonFile = file;
                    showStatus('Загружено: ' + file, 'success');
                })
                .catch(err => {
                    showStatus('Ошибка загрузки: ' + err.message, 'error');
                });
        });

        document.getElementById('json-save-btn')?.addEventListener('click', function() {
            const content = document.getElementById('json-editor').value;
            try {
                JSON.parse(content); // валидация
            } catch (e) {
                showStatus('Неверный JSON: ' + e.message, 'error');
                return;
            }
            fetch('/api/admin_json.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: currentJsonFile, content: content })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) showStatus('Сохранено!', 'success');
                else showStatus('Ошибка: ' + data.error, 'error');
            })
            .catch(err => showStatus('Ошибка сети: ' + err.message, 'error'));
        });

        document.getElementById('json-format-btn')?.addEventListener('click', function() {
            const editor = document.getElementById('json-editor');
            try {
                const parsed = JSON.parse(editor.value);
                editor.value = JSON.stringify(parsed, null, 4);
                showStatus('Отформатировано', 'success');
            } catch (e) {
                showStatus('Неверный JSON: ' + e.message, 'error');
            }
        });

        // ================================================================
        // Инициализация
        // ================================================================
        // При загрузке страницы загружаем данные для активного раздела
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            const id = activeSection.id;
            if (id === 'section-photos') loadPhotos();
            else if (id === 'section-operators') loadOperators();
            else if (id === 'section-instructions') loadInstructions();
            else if (id === 'section-json') document.getElementById('json-load-btn').click();
        }

        // При переключении навигации загружаем данные
        document.querySelectorAll('.nav a').forEach(link => {
            link.addEventListener('click', function(e) {
                // данные загрузятся при отображении раздела – используем setTimeout
                setTimeout(() => {
                    const active = document.querySelector('.section.active');
                    if (active) {
                        const id = active.id;
                        if (id === 'section-photos') loadPhotos();
                        else if (id === 'section-operators') loadOperators();
                        else if (id === 'section-instructions') loadInstructions();
                        else if (id === 'section-json') document.getElementById('json-load-btn').click();
                    }
                }, 100);
            });
        });

    })();
</script>
</body>
</html>