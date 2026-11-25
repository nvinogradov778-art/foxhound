<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/../api/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

$stmt = $db->prepare('SELECT role, username FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !in_array($user['role'], ['admin', 'commander'])) {
    header('Location: /');
    exit;
}

$navItems = [
    'photos'       => ['icon' => 'photo_library',      'label' => 'Фото'],
    'operators'    => ['icon' => 'groups',             'label' => 'Оперативники'],
    'instructions' => ['icon' => 'description',        'label' => 'Инструкции'],
    'docs'         => ['icon' => 'article',            'label' => 'Регламенты'],
    'atak'         => ['icon' => 'satellite_alt',      'label' => 'ATAK'],
    'regulations'  => ['icon' => 'gavel',              'label' => 'Устав'],
    'scenarios'    => ['icon' => 'movie',              'label' => 'Сценарии'],
    'devices'      => ['icon' => 'build',              'label' => 'Девайсы'],
    'radio'        => ['icon' => 'radio',              'label' => 'Радио'],
    'maps'         => ['icon' => 'map',                'label' => 'Карты'],
    'logs'         => ['icon' => 'history_edu',        'label' => 'Журнал'],
    'users'        => ['icon' => 'admin_panel_settings','label' => 'Пользователи'],
];
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FOXHOUND · АДМИН-ПАНЕЛЬ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="/assets/main.css">
</head>
<body class="admin-body">

<header class="app-header">
    <div class="app-header-inner">
        <a href="/" class="app-logo" title="На главную">
            <img src="/logo-foxhound.webp" alt="FOXHOUND" />
            <span class="app-logo-text">FOXHOUND</span>
        </a>
        <div class="app-header-right">
            <?php if (($user['role'] ?? '') === 'commander'): ?>
                <a href="/admin/command.php" class="btn btn-secondary btn-sm" title="Командование">Командование</a>
            <?php endif; ?>
            <a href="/#/profile" class="btn btn-primary btn-sm" title="В профиль">Профиль</a>
        </div>
    </div>
</header>

<main class="admin-layout">
    <aside class="admin-sidebar">
        <?php foreach ($navItems as $key => $item): ?>
            <a href="#<?= $key ?>" class="admin-nav-item" data-section="<?= $key ?>">
                <span class="material-icons"><?= $item['icon'] ?></span>
                <?= $item['label'] ?>
            </a>
        <?php endforeach; ?>
    </aside>

    <div class="admin-main">
        <div class="admin-main-header">
            <h1 id="page-title" class="admin-main-title">Медиа-галерея</h1>
            <div class="admin-main-meta">
                FOXHOUND TAC-COM · <?= date('H:i') ?>
            </div>
        </div>

        <div id="section-photos" class="admin-section">
            <div class="admin-actions">
                <button type="button" class="btn btn-sm btn-primary" id="photo-new-album-btn">
                    <span class="material-icons">add</span> Новый альбом
                </button>
                <button type="button" class="btn btn-sm btn-secondary" id="photo-collapse-all">
                    <span class="material-icons">unfold_less</span> Свернуть всё
                </button>
            </div>
            <div id="album-editor" class="admin-editor-block" hidden>
                <h3 id="album-editor-title" class="admin-editor-title">Новый альбом</h3>
                <input type="hidden" id="album-id" value="">
                <div class="form-group"><label>Название</label><input type="text" id="album-title"></div>
                <div class="form-group"><label>Slug (латиница, опционально)</label><input type="text" id="album-slug" placeholder="black_hawk_2026"></div>
                <div class="form-group"><label>Описание</label><textarea id="album-desc"></textarea></div>
                <div class="form-group">
                    <label>Обложка</label>
                    <div id="album-cover-current" class="admin-current-preview"></div>
                    <input type="file" id="album-cover" accept="image/*">
                </div>
                <div class="admin-actions">
                    <button type="button" class="btn btn-sm btn-primary" id="album-save">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="album-cancel">Отмена</button>
                </div>
            </div>
            <div id="photo-list"></div>
        </div>

        <div id="section-operators" class="admin-section">
            <form id="operator-form" enctype="multipart/form-data" class="admin-editor-block">
                <h3 class="admin-editor-title">Карточка оперативника</h3>
                <div class="form-group"><label>Имя</label><input type="text" id="op-name" required></div>
                <div class="form-group"><label>Роль</label><input type="text" id="op-role"></div>
                <div class="form-group"><label>Специализация</label><input type="text" id="op-spec"></div>
                <div class="form-group"><label>Описание</label><textarea id="op-desc"></textarea></div>
                <div class="form-group file-input-wrapper">
                    <input type="file" id="op-photo" accept="image/*">
                    <button type="submit" class="btn btn-sm btn-primary">Добавить / Обновить</button>
                </div>
                <input type="hidden" id="op-id" value="">
            </form>
            <div id="operator-list"></div>
        </div>

        <div id="section-instructions" class="admin-section">
            <form id="instruction-form" class="admin-editor-block">
                <h3 class="admin-editor-title">Карточка инструкции</h3>
                <input type="hidden" id="inst-id" value="">
                <div class="form-group"><label>Название</label><input type="text" id="inst-title" required></div>
                <div class="form-group"><label>Описание</label><textarea id="inst-desc"></textarea></div>
                <div class="form-group"><label>Ссылка на PDF</label><input type="url" id="inst-link" required></div>
                <div class="admin-actions">
                    <button type="submit" class="btn btn-sm btn-primary" id="inst-submit-btn">Добавить инструкцию</button>
                </div>
            </form>
            <div id="instruction-list"></div>
        </div>

        <div id="section-docs" class="admin-section">
            <form id="docs-form" class="admin-editor-block">
                <h3 class="admin-editor-title">Карточка регламента</h3>
                <input type="hidden" id="doc-id" value="">
                <div class="form-group"><label>Название</label><input type="text" id="doc-title" required></div>
                <div class="admin-inline-fields">
                    <div class="form-group"><label>Номер</label><input type="text" id="doc-number" placeholder="напр. 12/2026"></div>
                    <div class="form-group"><label>Дата</label><input type="text" id="doc-date" placeholder="напр. 16.09.2026"></div>
                </div>
                <div class="form-group"><label>Описание</label><textarea id="doc-desc"></textarea></div>
                <div class="form-group"><label>Ссылка на документ (PDF)</label><input type="url" id="doc-link" required></div>
                <div class="admin-actions">
                    <button type="submit" class="btn btn-sm btn-primary" id="doc-submit-btn">Добавить регламент</button>
                </div>
            </form>
            <div id="docs-list"></div>
        </div>

        <div id="section-atak" class="admin-section">
            <p class="text-muted">Дерево разделов. Редактируется как JSON.</p>
            <div class="admin-actions">
                <button type="button" class="btn btn-sm btn-secondary" id="atak-load-btn"><span class="material-icons">cloud_download</span> Загрузить из БД</button>
                <button type="button" class="btn btn-sm btn-primary" id="atak-save-btn"><span class="material-icons">save</span> Сохранить в БД</button>
                <button type="button" class="btn btn-sm btn-secondary" id="atak-format-btn"><span class="material-icons">code</span> Форматировать</button>
            </div>
            <textarea id="atak-editor" class="admin-editor"></textarea>
            <div id="atak-status" class="admin-status"></div>
        </div>

        <div id="section-regulations" class="admin-section">
            <p class="text-muted">Дерево разделов. Редактируется как JSON.</p>
            <div class="admin-actions">
                <button type="button" class="btn btn-sm btn-secondary" id="reg-load-btn"><span class="material-icons">cloud_download</span> Загрузить из БД</button>
                <button type="button" class="btn btn-sm btn-primary" id="reg-save-btn"><span class="material-icons">save</span> Сохранить в БД</button>
                <button type="button" class="btn btn-sm btn-secondary" id="reg-format-btn"><span class="material-icons">code</span> Форматировать</button>
            </div>
            <textarea id="reg-editor" class="admin-editor"></textarea>
            <div id="reg-status" class="admin-status"></div>
        </div>

        <div id="section-scenarios" class="admin-section">
            <div class="admin-actions">
                <select id="scenario-select" class="admin-select"><option value="">— Выберите сценарий —</option></select>
                <button type="button" class="btn btn-sm btn-primary" id="scenario-new-btn">+ Новый сценарий</button>
                <button type="button" class="btn btn-sm btn-danger" id="scenario-delete-btn" hidden>Удалить</button>
            </div>
            <div id="scenario-editor" class="admin-editor-block" hidden>
                <h3 class="admin-editor-title">Редактор сценария</h3>
                <div class="form-group"><label>Название</label><input type="text" id="sc-title"></div>
                <div class="form-group"><label>Slug</label><input type="text" id="sc-slug" placeholder="black_hawk"></div>
                <div class="form-group"><label>Описание</label><textarea id="sc-description"></textarea></div>
                <div class="form-group"><label>Ссылка на видео</label><input type="text" id="sc-video"></div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Фазы</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="phase-add-btn">+ Добавить фазу</button>
                    </label>
                    <div id="phase-list"></div>
                </div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Инвентарь</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="inv-add-btn">+ Добавить</button>
                    </label>
                    <div id="inv-list"></div>
                </div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Файлы</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="file-add-btn">+ Добавить</button>
                    </label>
                    <div id="file-list"></div>
                </div>
                <div class="admin-row-end">
                    <button type="button" class="btn btn-sm btn-primary" id="sc-save-btn">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="sc-cancel-btn">Отмена</button>
                </div>
            </div>
        </div>

        <div id="section-devices" class="admin-section">
            <div class="admin-actions">
                <select id="device-select" class="admin-select"><option value="">— Выберите устройство —</option></select>
                <button type="button" class="btn btn-sm btn-primary" id="device-new-btn">+ Новое устройство</button>
                <button type="button" class="btn btn-sm btn-danger" id="device-delete-btn" hidden>Удалить</button>
            </div>
            <div id="device-editor" class="admin-editor-block" hidden>
                <h3 class="admin-editor-title">Редактор устройства</h3>
                <div class="form-group"><label>Slug</label><input type="text" id="dv-slug" placeholder="esp32_timer"></div>
                <div class="form-group"><label>Название</label><input type="text" id="dv-name"></div>
                <div class="form-group"><label>Описание</label><textarea id="dv-description"></textarea></div>
                <div class="form-group"><label>Ссылка на видео</label><input type="text" id="dv-video"></div>
                <div class="form-group"><label>Ссылка на схему</label><input type="text" id="dv-schematic"></div>
                <div class="form-group"><label>Ссылка на документацию</label><input type="text" id="dv-docs"></div>
                <div class="form-group">
                    <label>Фото</label>
                    <div id="dv-photo-current" class="admin-current-preview"></div>
                    <input type="file" id="dv-photo" accept="image/*">
                </div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Файлы</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="dv-file-add-btn">+ Добавить файл</button>
                    </label>
                    <div id="dv-file-list"></div>
                </div>
                <div class="admin-row-end">
                    <button type="button" class="btn btn-sm btn-primary" id="dv-save-btn">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="dv-cancel-btn">Отмена</button>
                </div>
            </div>
        </div>

        <div id="section-radio" class="admin-section">
            <div class="admin-actions">
                <select id="radio-select" class="admin-select"><option value="">— Выберите станцию —</option></select>
                <button type="button" class="btn btn-sm btn-primary" id="radio-new-btn">+ Новая станция</button>
                <button type="button" class="btn btn-sm btn-danger" id="radio-delete-btn" hidden>Удалить</button>
            </div>
            <div id="radio-editor" class="admin-editor-block" hidden>
                <h3 class="admin-editor-title">Редактор станции</h3>
                <div class="form-group"><label>Slug</label><input type="text" id="rd-slug" placeholder="main_hq"></div>
                <div class="form-group"><label>Папка плейлиста</label><input type="text" id="rd-folder" placeholder="playlist_rock"></div>
                <div class="form-group"><label>Название</label><input type="text" id="rd-name" placeholder="CH 1: Главный Штаб"></div>
                <div class="form-group"><label>Частота</label><input type="text" id="rd-frequency"></div>
                <div class="form-group"><label>Purpose</label><input type="text" id="rd-purpose"></div>
                <div class="form-group"><label>Описание</label><textarea id="rd-desc"></textarea></div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Треки</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="rd-track-add-btn">+ Добавить трек</button>
                    </label>
                    <div id="rd-track-list"></div>
                </div>
                <div class="admin-row-end">
                    <button type="button" class="btn btn-sm btn-primary" id="rd-save-btn">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="rd-cancel-btn">Отмена</button>
                </div>
            </div>
        </div>

        <div id="section-maps" class="admin-section">
            <div class="admin-actions">
                <select id="map-select" class="admin-select"><option value="">— Выберите полигон —</option></select>
                <button type="button" class="btn btn-sm btn-primary" id="map-new-btn">+ Новый полигон</button>
                <button type="button" class="btn btn-sm btn-danger" id="map-delete-btn" hidden>Удалить</button>
            </div>
            <div id="map-editor" class="admin-editor-block" hidden>
                <h3 class="admin-editor-title">Редактор полигона</h3>
                <div class="form-group"><label>Slug</label><input type="text" id="mp-slug" placeholder="lyaminskaya"></div>
                <div class="form-group"><label>Название</label><input type="text" id="mp-name"></div>
                <div class="admin-inline-fields">
                    <div class="form-group"><label>Широта</label><input type="number" id="mp-lat" step="0.000001"></div>
                    <div class="form-group"><label>Долгота</label><input type="number" id="mp-lng" step="0.000001"></div>
                    <div class="form-group admin-field-narrow"><label>Увеличение</label><input type="number" id="mp-zoom" min="1" max="20" value="14"></div>
                </div>
                <div class="form-group">
                    <label class="admin-label-row">
                        <span>Слои (GeoJSON)</span>
                        <button type="button" class="btn btn-sm btn-secondary" id="mp-layer-add-btn">+ Добавить слой</button>
                    </label>
                    <div id="mp-layer-list"></div>
                </div>
                <div class="admin-row-end">
                    <button type="button" class="btn btn-sm btn-primary" id="mp-save-btn">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="mp-cancel-btn">Отмена</button>
                </div>
            </div>
        </div>

        <div id="section-users" class="admin-section">
            <div class="admin-filter-bar">
                <span class="admin-filter-label">Фильтр:</span>
                <button type="button" class="btn btn-sm btn-primary" id="uf-all">Все</button>
                <button type="button" class="btn btn-sm btn-secondary" id="uf-admins">Админы</button>
                <button type="button" class="btn btn-sm btn-secondary" id="uf-banned">Забаненные</button>
            </div>
            <div id="users-list"></div>
        </div>

        <div id="section-logs" class="admin-section">
            <div class="admin-actions">
                <button type="button" class="btn btn-sm btn-primary" id="log-new-btn">+ Добавить запись</button>
            </div>
            <div id="log-editor" class="admin-editor-block" hidden>
                <h3 class="admin-editor-title">Редактор записи</h3>
                <input type="hidden" id="lg-id" value="">
                <div class="form-group"><label>Дата</label><input type="text" id="lg-date" placeholder="[11.05]"></div>
                <div class="form-group"><label>Текст</label><textarea id="lg-text" required></textarea></div>
                <div class="form-group"><label>Стиль (CSS)</label><input type="text" id="lg-style" placeholder="color: #2ecc71;"></div>
                <div class="admin-row-end">
                    <button type="button" class="btn btn-sm btn-primary" id="lg-save-btn">Сохранить</button>
                    <button type="button" class="btn btn-sm btn-secondary" id="lg-cancel-btn">Отмена</button>
                </div>
            </div>
            <div id="log-list"></div>
        </div>

    </div>
</main>

<div id="pwd-modal" class="admin-modal-backdrop">
    <div class="admin-modal">
        <h3><span class="material-icons">key</span> Сброс пароля</h3>
        <div class="form-group">
            <label>Пользователь</label>
            <input type="text" id="pwd-user" readonly>
        </div>
        <div class="form-group">
            <label>Новый пароль</label>
            <div class="admin-inline-row">
                <input type="text" id="pwd-value" class="admin-mono-input">
                <button type="button" class="btn btn-sm btn-secondary btn-icon" id="pwd-generate" title="Сгенерировать">
                    <span class="material-icons">casino</span>
                </button>
                <button type="button" class="btn btn-sm btn-secondary btn-icon" id="pwd-copy" title="Скопировать">
                    <span class="material-icons">content_copy</span>
                </button>
            </div>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="pwd-cancel">Отмена</button>
            <button type="button" class="btn btn-sm btn-primary" id="pwd-save">Сбросить</button>
        </div>
    </div>
</div>

<div id="ban-modal" class="admin-modal-backdrop">
    <div class="admin-modal">
        <h3><span class="material-icons">block</span> Блокировка</h3>
        <div class="form-group">
            <label>Пользователь</label>
            <input type="text" id="ban-user" readonly>
        </div>
        <div class="form-group">
            <label>Причина (необязательно)</label>
            <textarea id="ban-reason" rows="3"></textarea>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="ban-cancel">Отмена</button>
            <button type="button" class="btn btn-sm btn-danger" id="ban-save">Забанить</button>
        </div>
    </div>
</div>

<div id="del-modal" class="admin-modal-backdrop">
    <div class="admin-modal danger">
        <h3><span class="material-icons">delete_forever</span> Удаление пользователя</h3>
        <div class="form-group">
            <label>Пользователь</label>
            <input type="text" id="del-user" readonly>
        </div>
        <p class="text-muted admin-modal-hint">
            Это действие необратимо. Сообщения в чате будут удалены.<br>
            Введите имя пользователя для подтверждения:
        </p>
        <div class="form-group">
            <input type="text" id="del-confirm" placeholder="Введите имя">
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="del-cancel">Отмена</button>
            <button type="button" class="btn btn-sm btn-danger" id="del-save" disabled>Удалить</button>
        </div>
    </div>
</div>

<script type="module" src="/assets/admin.js"></script>

<script>
(function() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const sections = document.querySelectorAll('.admin-section');

    const TITLES = {
        photos:       'Медиа-галерея',
        operators:    'Оперативники',
        instructions: 'Инструкции',
        docs:         'Регламенты',
        atak:         'ATAK',
        regulations:  'Устав',
        scenarios:    'Сценарии',
        devices:      'Девайсы',
        radio:        'Радио',
        maps:         'Карты',
        logs:         'Журнал',
        users:        'Пользователи'
    };

    function activateSection(key) {
        navItems.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        const navBtn = document.querySelector(`.admin-nav-item[data-section="${key}"]`);
        const section = document.getElementById('section-' + key);
        const title = document.getElementById('page-title');

        if (navBtn && section) {
            navBtn.classList.add('active');
            section.classList.add('active');
        }
        if (title) {
            title.textContent = TITLES[key] || 'Админ-панель';
        }

        if (location.hash !== '#' + key) {
            history.replaceState(null, null, '#' + key);
        }

        if (window.AdminApp && window.AdminApp.loadSection) {
            window.AdminApp.loadSection(key);
        }
    }

    navItems.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            activateSection(btn.dataset.section);
        });
    });

    let initialSection = location.hash ? location.hash.substring(1) : 'photos';
    if (!location.hash && new URLSearchParams(location.search).has('section')) {
        initialSection = new URLSearchParams(location.search).get('section');
    }
    activateSection(initialSection);
})();
</script>

</body>
</html>
