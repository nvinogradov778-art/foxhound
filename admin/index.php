<?php
declare(strict_types=1);
session_start();
require_once __DIR__ . '/../api/db.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

$stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
if ($stmt->fetchColumn() !== 'admin') {
    header('Location: /');
    exit;
}

$section = $_GET['section'] ?? 'photos';

$navItems = [
    'photos'       => ['icon' => 'photo_library',      'label' => 'Фото'],
    'operators'    => ['icon' => 'groups',             'label' => 'Оперативники'],
    'instructions' => ['icon' => 'description',        'label' => 'Инструкции'],
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
<title>Админ-панель FOXHOUND</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link rel="stylesheet" href="/css/design-system.css">
<link rel="stylesheet" href="/admin/css/admin.css">
</head>
<body class="admin">
<div class="admin-container">

<h1 class="admin-title">
    <span class="material-icons">build</span>
    Администрирование FOXHOUND
</h1>

<nav class="admin-nav">
    <div class="admin-nav-links">
        <?php foreach ($navItems as $key => $item): ?>
            <a href="?section=<?= htmlspecialchars($key, ENT_QUOTES) ?>"
               class="<?= $section === $key ? 'active' : '' ?>">
                <span class="material-icons"><?= htmlspecialchars($item['icon'], ENT_QUOTES) ?></span>
                <?= htmlspecialchars($item['label'], ENT_QUOTES) ?>
            </a>
        <?php endforeach; ?>
    </div>
    <div class="admin-nav-right">
        <a href="/" class="nav-home">
            <span class="material-icons">home</span> На сайт
        </a>
    </div>
</nav>

<!-- ==================== ФОТО ==================== -->
<div id="section-photos" class="admin-section <?= $section === 'photos' ? 'active' : '' ?>">
    <h2><span class="material-icons">photo_library</span> Медиа-галерея</h2>

    <div class="admin-actions">
        <button type="button" class="btn" id="photo-new-album-btn">
            <span class="material-icons">add</span> Новый альбом
        </button>
        <button type="button" class="btn btn-secondary" id="photo-collapse-all">
            <span class="material-icons">unfold_less</span> Свернуть всё
        </button>
    </div>

    <div id="album-editor" style="display:none; background:#0d0d0d; border:1px solid #ff6600; padding:15px; margin-bottom:20px;">
        <h3 style="color:#ff6600; margin-bottom:12px;" id="album-editor-title">Новый альбом</h3>
        <input type="hidden" id="album-id" value="">
        <div class="form-group"><label>Название</label><input type="text" id="album-title"></div>
        <div class="form-group"><label>Slug (латиница, опционально)</label><input type="text" id="album-slug" placeholder="black_hawk_2026"></div>
        <div class="form-group"><label>Описание</label><textarea id="album-desc"></textarea></div>
        <div class="form-group">
            <label>Обложка</label>
            <div id="album-cover-current" style="margin-bottom:8px;"></div>
            <input type="file" id="album-cover" accept="image/*">
        </div>
        <div class="admin-actions">
            <button type="button" class="btn" id="album-save">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="album-cancel">Отмена</button>
        </div>
    </div>

    <div id="photo-list"></div>
</div>

<!-- ==================== ОПЕРАТИВНИКИ ==================== -->
<div id="section-operators" class="admin-section <?= $section === 'operators' ? 'active' : '' ?>">
    <h2><span class="material-icons">groups</span> Управление оперативниками</h2>
    <form id="operator-form" enctype="multipart/form-data">
        <div class="form-group"><label>Имя</label><input type="text" id="op-name" required></div>
        <div class="form-group"><label>Роль</label><input type="text" id="op-role"></div>
        <div class="form-group"><label>Специализация</label><input type="text" id="op-spec"></div>
        <div class="form-group"><label>Описание</label><textarea id="op-desc"></textarea></div>
        <div class="form-group file-input-wrapper">
            <input type="file" id="op-photo" accept="image/*">
            <button type="submit" class="btn">Добавить / Обновить</button>
        </div>
        <input type="hidden" id="op-id" value="">
    </form>
    <div id="operator-list"></div>
</div>

<!-- ==================== ИНСТРУКЦИИ ==================== -->
<div id="section-instructions" class="admin-section <?= $section === 'instructions' ? 'active' : '' ?>">
    <h2><span class="material-icons">description</span> Управление инструкциями</h2>
    <form id="instruction-form">
        <input type="hidden" id="inst-id" value="">
        <div class="form-group"><label>Название</label><input type="text" id="inst-title" required></div>
        <div class="form-group"><label>Описание</label><textarea id="inst-desc"></textarea></div>
        <div class="form-group"><label>Ссылка на PDF</label><input type="url" id="inst-link" required></div>
        <div class="admin-actions">
            <button type="submit" class="btn" id="inst-submit-btn">Добавить инструкцию</button>
        </div>
    </form>
    <div id="instruction-list"></div>
</div>

<!-- ==================== ATAK ==================== -->
<div id="section-atak" class="admin-section <?= $section === 'atak' ? 'active' : '' ?>">
    <h2><span class="material-icons">satellite_alt</span> Редактор ATAK</h2>
    <p class="text-muted">Дерево разделов. Редактируется как JSON.</p>
    <div class="admin-actions">
        <button type="button" class="btn btn-secondary" id="atak-load-btn">
            <span class="material-icons">cloud_download</span> Загрузить из БД
        </button>
        <button type="button" class="btn" id="atak-save-btn">
            <span class="material-icons">save</span> Сохранить в БД
        </button>
        <button type="button" class="btn btn-secondary" id="atak-format-btn">
            <span class="material-icons">code</span> Форматировать
        </button>
    </div>
    <textarea id="atak-editor" class="admin-editor"></textarea>
    <div id="atak-status" class="admin-status"></div>
</div>

<!-- ==================== УСТАВ ==================== -->
<div id="section-regulations" class="admin-section <?= $section === 'regulations' ? 'active' : '' ?>">
    <h2><span class="material-icons">gavel</span> Редактор Устава</h2>
    <p class="text-muted">Дерево разделов. Редактируется как JSON.</p>
    <div class="admin-actions">
        <button type="button" class="btn btn-secondary" id="reg-load-btn">
            <span class="material-icons">cloud_download</span> Загрузить из БД
        </button>
        <button type="button" class="btn" id="reg-save-btn">
            <span class="material-icons">save</span> Сохранить в БД
        </button>
        <button type="button" class="btn btn-secondary" id="reg-format-btn">
            <span class="material-icons">code</span> Форматировать
        </button>
    </div>
    <textarea id="reg-editor" class="admin-editor"></textarea>
    <div id="reg-status" class="admin-status"></div>
</div>

<!-- ==================== СЦЕНАРИИ ==================== -->
<div id="section-scenarios" class="admin-section <?= $section === 'scenarios' ? 'active' : '' ?>">
    <h2><span class="material-icons">movie</span> Управление сценариями</h2>
    <div class="admin-actions">
        <select id="scenario-select" class="admin-select">
            <option value="">— Выберите сценарий —</option>
        </select>
        <button type="button" class="btn" id="scenario-new-btn">+ Новый сценарий</button>
        <button type="button" class="btn btn-danger" id="scenario-delete-btn" style="display:none;">Удалить</button>
    </div>
    <div id="scenario-editor" style="display:none;">
        <div class="form-group"><label>Название</label><input type="text" id="sc-title"></div>
        <div class="form-group"><label>Slug</label><input type="text" id="sc-slug" placeholder="black_hawk"></div>
        <div class="form-group"><label>Описание</label><textarea id="sc-description"></textarea></div>
        <div class="form-group"><label>Ссылка на видео</label><input type="text" id="sc-video"></div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Фазы</span>
                <button type="button" class="btn btn-sm" id="phase-add-btn">+ Добавить фазу</button>
            </label>
            <div id="phase-list"></div>
        </div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Инвентарь</span>
                <button type="button" class="btn btn-sm" id="inv-add-btn">+ Добавить</button>
            </label>
            <div id="inv-list"></div>
        </div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Файлы</span>
                <button type="button" class="btn btn-sm" id="file-add-btn">+ Добавить</button>
            </label>
            <div id="file-list"></div>
        </div>
        <div class="admin-row-end">
            <button type="button" class="btn" id="sc-save-btn">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="sc-cancel-btn">Отмена</button>
        </div>
    </div>
</div>

<!-- ==================== ДЕВАЙСЫ ==================== -->
<div id="section-devices" class="admin-section <?= $section === 'devices' ? 'active' : '' ?>">
    <h2><span class="material-icons">build</span> Управление девайсами</h2>
    <div class="admin-actions">
        <select id="device-select" class="admin-select">
            <option value="">— Выберите устройство —</option>
        </select>
        <button type="button" class="btn" id="device-new-btn">+ Новое устройство</button>
        <button type="button" class="btn btn-danger" id="device-delete-btn" style="display:none;">Удалить</button>
    </div>
    <div id="device-editor" style="display:none;">
        <div class="form-group"><label>Slug</label><input type="text" id="dv-slug" placeholder="esp32_timer"></div>
        <div class="form-group"><label>Название</label><input type="text" id="dv-name"></div>
        <div class="form-group"><label>Описание</label><textarea id="dv-description"></textarea></div>
        <div class="form-group"><label>Ссылка на видео</label><input type="text" id="dv-video"></div>
        <div class="form-group"><label>Ссылка на схему</label><input type="text" id="dv-schematic"></div>
        <div class="form-group"><label>Ссылка на документацию</label><input type="text" id="dv-docs"></div>
        <div class="form-group">
            <label>Фото</label>
            <div id="dv-photo-current" style="margin-bottom:8px;"></div>
            <input type="file" id="dv-photo" accept="image/*">
        </div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Файлы</span>
                <button type="button" class="btn btn-sm" id="dv-file-add-btn">+ Добавить файл</button>
            </label>
            <div id="dv-file-list"></div>
        </div>
        <div class="admin-row-end">
            <button type="button" class="btn" id="dv-save-btn">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="dv-cancel-btn">Отмена</button>
        </div>
    </div>
</div>

<!-- ==================== РАДИО ==================== -->
<div id="section-radio" class="admin-section <?= $section === 'radio' ? 'active' : '' ?>">
    <h2><span class="material-icons">radio</span> Управление радио</h2>
    <div class="admin-actions">
        <select id="radio-select" class="admin-select">
            <option value="">— Выберите станцию —</option>
        </select>
        <button type="button" class="btn" id="radio-new-btn">+ Новая станция</button>
        <button type="button" class="btn btn-danger" id="radio-delete-btn" style="display:none;">Удалить</button>
    </div>
    <div id="radio-editor" style="display:none;">
        <div class="form-group"><label>Slug</label><input type="text" id="rd-slug" placeholder="main_hq"></div>
        <div class="form-group"><label>Папка плейлиста</label><input type="text" id="rd-folder" placeholder="playlist_rock"></div>
        <div class="form-group"><label>Название</label><input type="text" id="rd-name" placeholder="CH 1: Главный Штаб"></div>
        <div class="form-group"><label>Частота</label><input type="text" id="rd-frequency"></div>
        <div class="form-group"><label>Purpose</label><input type="text" id="rd-purpose"></div>
        <div class="form-group"><label>Описание</label><textarea id="rd-desc"></textarea></div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Треки</span>
                <button type="button" class="btn btn-sm" id="rd-track-add-btn">+ Добавить трек</button>
            </label>
            <div id="rd-track-list"></div>
        </div>
        <div class="admin-row-end">
            <button type="button" class="btn" id="rd-save-btn">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="rd-cancel-btn">Отмена</button>
        </div>
    </div>
</div>

<!-- ==================== КАРТЫ ==================== -->
<div id="section-maps" class="admin-section <?= $section === 'maps' ? 'active' : '' ?>">
    <h2><span class="material-icons">map</span> Управление картами</h2>
    <div class="admin-actions">
        <select id="map-select" class="admin-select">
            <option value="">— Выберите полигон —</option>
        </select>
        <button type="button" class="btn" id="map-new-btn">+ Новый полигон</button>
        <button type="button" class="btn btn-danger" id="map-delete-btn" style="display:none;">Удалить</button>
    </div>
    <div id="map-editor" style="display:none;">
        <div class="form-group"><label>Slug</label><input type="text" id="mp-slug" placeholder="lyaminskaya"></div>
        <div class="form-group"><label>Название</label><input type="text" id="mp-name"></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div class="form-group" style="flex:1; min-width:120px;"><label>Широта</label><input type="number" id="mp-lat" step="0.000001"></div>
            <div class="form-group" style="flex:1; min-width:120px;"><label>Долгота</label><input type="number" id="mp-lng" step="0.000001"></div>
            <div class="form-group" style="flex:0 0 100px;"><label>Увеличение</label><input type="number" id="mp-zoom" min="1" max="20" value="14"></div>
        </div>
        <div class="form-group">
            <label style="display:flex; justify-content:space-between; align-items:center;">
                <span>Слои (GeoJSON)</span>
                <button type="button" class="btn btn-sm" id="mp-layer-add-btn">+ Добавить слой</button>
            </label>
            <div id="mp-layer-list"></div>
        </div>
        <div class="admin-row-end">
            <button type="button" class="btn" id="mp-save-btn">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="mp-cancel-btn">Отмена</button>
        </div>
    </div>
</div>

<!-- ==================== ПОЛЬЗОВАТЕЛИ ==================== -->
<div id="section-users" class="admin-section <?= $section === 'users' ? 'active' : '' ?>">
    <h2><span class="material-icons">admin_panel_settings</span> Пользователи</h2>

    <div style="margin-bottom:15px;">
        <label style="font-size:13px; color:#888; margin-right:10px;">Фильтр:</label>
        <button type="button" class="btn btn-sm" id="uf-all">Все</button>
        <button type="button" class="btn btn-sm" id="uf-admins">Админы</button>
        <button type="button" class="btn btn-sm" id="uf-banned">Забаненные</button>
    </div>

    <div id="users-list"></div>
</div>

<!-- ==================== ЖУРНАЛ ==================== -->
<div id="section-logs" class="admin-section <?= $section === 'logs' ? 'active' : '' ?>">
    <h2><span class="material-icons">history_edu</span> Бортовой журнал</h2>
    <div class="admin-actions">
        <button type="button" class="btn" id="log-new-btn">+ Добавить запись</button>
    </div>
    <div id="log-editor" style="display:none; margin-bottom:20px;">
        <input type="hidden" id="lg-id" value="">
        <div class="form-group"><label>Дата</label><input type="text" id="lg-date" placeholder="[11.05]"></div>
        <div class="form-group"><label>Текст</label><textarea id="lg-text" required></textarea></div>
        <div class="form-group"><label>Стиль (CSS)</label><input type="text" id="lg-style" placeholder="color: #2ecc71;"></div>
        <div class="admin-row-end">
            <button type="button" class="btn" id="lg-save-btn">Сохранить</button>
            <button type="button" class="btn btn-secondary" id="lg-cancel-btn">Отмена</button>
        </div>
    </div>
    <div id="log-list"></div>
</div>

<!-- ==================== МОДАЛКИ ==================== -->
<div id="pwd-modal" class="admin-modal-backdrop">
    <div class="admin-modal">
        <h3><span class="material-icons">key</span> Сброс пароля</h3>
        <div class="form-group">
            <label>Пользователь</label>
            <input type="text" id="pwd-user" readonly>
        </div>
        <div class="form-group">
            <label>Новый пароль</label>
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" id="pwd-value" style="flex:1; font-family:'Consolas', monospace;">
                <button type="button" class="btn btn-secondary btn-icon" id="pwd-generate" title="Сгенерировать">
                    <span class="material-icons">casino</span>
                </button>
                <button type="button" class="btn btn-secondary btn-icon" id="pwd-copy" title="Скопировать">
                    <span class="material-icons">content_copy</span>
                </button>
            </div>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="pwd-cancel">Отмена</button>
            <button type="button" class="btn" id="pwd-save">Сбросить</button>
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
            <button type="button" class="btn btn-secondary" id="ban-cancel">Отмена</button>
            <button type="button" class="btn btn-danger" id="ban-save">Забанить</button>
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
        <p class="text-muted" style="font-size:13px; margin-bottom:12px; line-height:1.5;">
            Это действие необратимо. Сообщения в чате будут удалены.<br>
            Введите имя пользователя для подтверждения:
        </p>
        <div class="form-group">
            <input type="text" id="del-confirm" placeholder="Введите имя">
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="del-cancel">Отмена</button>
            <button type="button" class="btn btn-danger" id="del-save" disabled>Удалить</button>
        </div>
    </div>
</div>

</div><!-- /.admin-container -->

<!-- Ядро сайта -->
<script src="/js/core/utils.js"></script>
<script src="/js/core/modal.js"></script>

<!-- Админка -->
<script src="/admin/js/_shared.js"></script>
<script src="/admin/js/photos.js"></script>
<script src="/admin/js/operators.js"></script>
<script src="/admin/js/instructions.js"></script>
<script src="/admin/js/trees.js"></script>
<script src="/admin/js/scenarios.js"></script>
<script src="/admin/js/devices.js"></script>
<script src="/admin/js/radio.js"></script>
<script src="/admin/js/maps.js"></script>
<script src="/admin/js/users.js"></script>
<script src="/admin/js/logs.js"></script>

<!-- Инициализатор — в самом конце -->
<script src="/admin/js/app.js"></script>
</body>
</html>