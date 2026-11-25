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

if (!$user || $user['role'] !== 'commander') {
    header('Location: /admin/');
    exit;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FOXHOUND · КОМАНДОВАНИЕ</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Sans+Narrow:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <link rel="stylesheet" href="/assets/main.css">

    <style>
        /* Специфичные стили для страницы командования (только уникальные элементы) */
        body { background: var(--bg-base); margin: 0; padding: 0; }

        .command-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-6) var(--space-5);
            display: grid;
            grid-template-columns: 240px 1fr;
            gap: var(--space-6);
            min-height: calc(100vh - 60px);
        }

        /* Сетка главной зоны */
        .cmd-main { display: flex; flex-direction: column; gap: var(--space-5); }

        /* Дашборд */
        .cmd-dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
        .cmd-dash-card {
            background: var(--bg-elevated); border: 1px solid var(--border);
            border-radius: var(--radius-md); padding: var(--space-4);
            display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
        }
        .cmd-dash-value { font-family: var(--font-heading); font-size: 32px; font-weight: 700; color: #fff; line-height: 1; margin-bottom: 6px; }
        .cmd-dash-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

        /* Таблицы */
        .cmd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .cmd-table th {
            text-align: left; padding: 12px; background: var(--bg-deep);
            color: var(--accent); font-family: var(--font-heading);
            letter-spacing: 1px; border-bottom: 1px solid var(--border);
            cursor: pointer; user-select: none;
        }
        .cmd-table th:hover { color: #fff; }
        .cmd-table td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
        .cmd-table tr:hover td { background: var(--bg-hover); }

        /* Гант */
        .gantt-container { overflow-x: auto; padding-bottom: 10px; }
        .gantt-grid { display: grid; grid-template-columns: 300px repeat(12, minmax(50px, 1fr)); gap: 2px; min-width: 900px; }
        .gantt-cell {
            padding: 8px; background: var(--bg-deep); border: 1px solid var(--border);
            font-size: 12px; display: flex; align-items: center;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .gantt-cell:first-child { color: #fff; font-weight: 700; }
        .gantt-header { background: var(--bg-hover); color: var(--accent); font-family: var(--font-heading); text-transform: uppercase; font-size: 10px; justify-content: center; font-weight: 700; }
        .gantt-bar { height: 20px; border-radius: 3px; width: 100%; }
        .gantt-bar.done { background: var(--success); box-shadow: 0 0 8px rgba(51,204,51,0.3); }
        .gantt-bar.work { background: var(--warning); box-shadow: 0 0 8px rgba(255,170,0,0.3); }
        .gantt-bar.plan { background: var(--text-disabled); }

        /* Карточки бойцов */
        .roster-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .roster-card {
            background: var(--bg-elevated); border: 1px solid var(--border);
            border-radius: var(--radius-md); display: flex; flex-direction: column;
            gap: 10px; padding: 16px; transition: all 0.2s; position: relative;
        }
        .roster-card:hover { border-color: var(--accent); box-shadow: 0 0 15px rgba(255,102,0,0.1); }
        .roster-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .roster-photo {
            width: 56px; height: 56px; border: 2px solid var(--border-strong); border-radius: 50%;
            background: var(--bg-deep); flex-shrink: 0; display: flex; align-items: center;
            justify-content: center; font-size: 24px; color: var(--text-disabled); overflow: hidden;
        }
        .roster-photo img { width: 100%; height: 100%; object-fit: cover; }
        .roster-name { font-family: var(--font-heading); font-size: 18px; color: #fff; letter-spacing: 0.5px; line-height: 1.1; }
        .roster-role { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .roster-details { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border); }
        .roster-detail-row { display: flex; justify-content: space-between; font-size: 12px; }
        .roster-detail-label { color: var(--text-muted); }
        .roster-detail-value { color: var(--text-secondary); font-weight: 700; }
        .roster-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
        .roster-status { font-size: 11px; display: flex; align-items: center; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot.online { background: var(--success); box-shadow: 0 0 8px var(--success); }
        .dot.offline { background: var(--text-disabled); }
        .roster-bd { font-size: 11px; color: var(--accent); background: var(--accent-dim); padding: 2px 8px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 4px; }
        .roster-actions { position: absolute; top: 12px; right: 12px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
        .roster-card:hover .roster-actions { opacity: 1; }
        .btn-icon-sm { background: var(--bg-deep); border: 1px solid var(--border); color: var(--text-secondary); width: 28px; height: 28px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .btn-icon-sm:hover { border-color: var(--accent); color: var(--accent); }
        .btn-icon-sm .material-icons { font-size: 16px; }

        /* Модалки */
        .cmd-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; align-items: center; justify-content: center; }
        .cmd-modal.active { display: flex; }
        .cmd-modal-content { background: var(--bg-elevated); border: 1px solid var(--accent); padding: 24px; width: 450px; max-width: 90%; border-radius: var(--radius-md); max-height: 90vh; overflow-y: auto; }
        .cmd-modal-title { font-family: var(--font-heading); font-size: 16px; color: var(--accent); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .cmd-modal .form-group { margin-bottom: 12px; }
        .cmd-modal label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .cmd-modal input, .cmd-modal select, .cmd-modal textarea { width: 100%; background: var(--bg-deep); border: 1px solid var(--border); color: #fff; padding: 8px 10px; border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px; }
        .cmd-modal input:focus, .cmd-modal select:focus { outline: none; border-color: var(--accent); }
        .cmd-modal input:disabled { opacity: 0.5; cursor: not-allowed; }
        .cmd-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

        .tab-content { display: none; flex-direction: column; gap: var(--space-5); }
        .tab-content.active { display: flex; }
    </style>
</head>
<body class="admin-body">

<!-- ШАПКА -->
<header class="app-header">
    <div class="app-header-inner">
    <!-- Логотип ведет на главную сайта -->
    <a href="/" class="app-logo" title="На главную">
        <img src="/logo-foxhound.webp" alt="FOXHOUND" />
        <span class="app-logo-text">FOXHOUND</span>
    </a>

    <div class="app-header-right">
        <a href="/admin/" class="btn btn-secondary btn-sm" title="Вернуться в админку">Админ-панель</a>
        <a href="/#/profile" class="btn btn-primary btn-sm" title="В профиль">Профиль</a>
    </div>
    </div>
</header>

<!-- ОСНОВНОЙ КОНТЕНТ -->
<main class="command-container">

    <!-- ЛЕВОЕ МЕНЮ (используем классы админки) -->
    <aside class="admin-sidebar">
        <a href="#plan" class="admin-nav-item active" data-tab="plan">
            <span class="material-icons">event_note</span> План на год
        </a>
        <a href="#roster" class="admin-nav-item" data-tab="roster">
            <span class="material-icons">groups</span> Личный состав
        </a>
        <a href="#actions" class="admin-nav-item" data-tab="actions">
            <span class="material-icons">military_tech</span> Поощрения
        </a>
        <a href="#recruit" class="admin-nav-item" data-tab="recruit">
            <span class="material-icons">person_add</span> Рекрутинг
        </a>
    </aside>

    <!-- ПРАВАЯ ЗОНА -->
    <div class="cmd-main">

        <!-- Заголовок (используем классы админки) -->
        <div class="admin-main-header">
            <h1 id="page-title" class="admin-main-title">План на год</h1>
            <div class="admin-main-meta">
                FOXHOUND TAC-COM · <?= date('H:i') ?>
            </div>
        </div>

        <!-- ==================== ВКЛАДКА 1: ПЛАН ==================== -->
        <div class="tab-content active" id="tab-plan">

            <div class="cmd-dash-grid" id="plan-dashboard-top"></div>

            <div class="card" style="padding:0; overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border);">
                <div style="padding: 15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <span class="card-title" style="margin:0; font-size:14px;">СПИСОК ЗАДАЧ</span>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-sm btn-primary" onclick="switchPlanView('table')" id="view-btn-table" style="font-size:11px;">Таблица</button>
                        <button class="btn btn-sm btn-secondary" onclick="switchPlanView('gantt')" id="view-btn-gantt" style="font-size:11px;">Гант</button>
                        <button class="btn btn-sm btn-secondary" onclick="switchPlanView('dashboard')" id="view-btn-dashboard" style="font-size:11px;">Сводка</button>
                        <button class="btn btn-sm btn-primary" id="btn-add-plan" style="font-size:11px;">+ Добавить</button>
                    </div>
                </div>

                <div id="plan-view-table">
                    <table class="cmd-table">
                        <thead>
                            <tr>
                                <th data-sort="direction">Направление ↕</th>
                                <th data-sort="task">Задача ↕</th>
                                <th data-sort="assignee">Ответственный ↕</th>
                                <th data-sort="priority">Приоритет ↕</th>
                                <th data-sort="status">Статус ↕</th>
                                <th data-sort="end_date">Срок ↕</th>
                                <th style="width:60px; cursor:default;">Действия</th>
                            </tr>
                        </thead>
                        <tbody id="plan-list"></tbody>
                    </table>
                </div>

                <div id="plan-view-gantt" style="display:none; padding: 20px;">
                    <div class="gantt-container" id="gantt-container"></div>
                </div>

                <div id="plan-view-dashboard" style="display:none; padding: 20px;">
                    <h3 style="margin-top:0; color:var(--accent); font-family:var(--font-heading);">СВОДКА ПО НАПРАВЛЕНИЯМ</h3>
                    <table class="cmd-table">
                        <thead>
                            <tr>
                                <th>НАПРАВЛЕНИЕ</th>
                                <th style="width: 80px; text-align: center;">ВСЕГО</th>
                                <th style="width: 80px; text-align: center;">ГОТОВО</th>
                                <th style="width: 80px; text-align: right;">%</th>
                            </tr>
                        </thead>
                        <tbody id="plan-dashboard-breakdown"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ==================== ВКЛАДКА 2: ЛИЧНЫЙ СОСТАВ ==================== -->
        <div class="tab-content" id="tab-roster">
            <div class="cmd-dash-grid">
                <div class="cmd-dash-card"><div class="cmd-dash-value" id="dash-total">0</div><div class="cmd-dash-label">Всего бойцов</div></div>
                <div class="cmd-dash-card"><div class="cmd-dash-value" id="dash-online" style="color:var(--success)">0</div><div class="cmd-dash-label">На связи</div></div>
                <div class="cmd-dash-card"><div class="cmd-dash-value" id="dash-offline" style="color:var(--warning)">0</div><div class="cmd-dash-label">Не на связи</div></div>
                <div class="cmd-dash-card"><div class="cmd-dash-value" id="dash-bd" style="color:var(--accent)">0</div><div class="cmd-dash-label">Дней до ДР</div></div>
            </div>

            <div class="roster-grid" id="roster-list"></div>
        </div>

        <!-- ==================== ВКЛАДКА 3: ПООЩРЕНИЯ ==================== -->
        <div class="tab-content" id="tab-actions">
            <div class="card" style="padding:0; overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border);">
                <div style="padding: 15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-title" style="margin:0; font-size:14px;">ЖУРНАЛ</span>
                    <button class="btn btn-sm btn-primary" id="btn-add-action" style="font-size:11px;">+ Добавить</button>
                </div>
                <table class="cmd-table">
                    <thead>
                        <tr><th>Дата</th><th>Позывной</th><th>Тип</th><th>Основание</th><th>Кем подписано</th><th></th></tr>
                    </thead>
                    <tbody id="actions-list"></tbody>
                </table>
            </div>
        </div>

        <!-- ==================== ВКЛАДКА 4: РЕКРУТИНГ ==================== -->
        <div class="tab-content" id="tab-recruit">
            <div class="card" style="padding:0; overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border);">
                <div style="padding: 15px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <span class="card-title" style="margin:0; font-size:14px;">ЗАЯВКИ НА ВСТУПЛЕНИЕ</span>
                </div>
                <table class="cmd-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Позывной</th>
                            <th>ФИО</th>
                            <th>Дата рождения</th>
                            <th>Статус</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="recruit-list"></tbody>
                </table>
            </div>
        </div>

    </div>
</main>

<!-- МОДАЛКИ -->
<div class="cmd-modal" id="modal-plan">
    <div class="cmd-modal-content">
        <div class="cmd-modal-title">Задача плана</div>
        <input type="hidden" id="pl-id">
        <div class="form-group">
            <label>Направление *</label>
            <select id="pl-direction">
                <option value="🇺🇳 Организация">🇺🇳 Организация</option>
                <option value="👨‍💻 Разработка">👨‍💻 Разработка</option>
                <option value="👩‍🎨 Контент">👩‍🎨 Контент</option>
                <option value="🎬 Сценарии/игры">🎬 Сценарии/игры</option>
                <option value="💪 Тренировки">💪 Тренировки</option>
                <option value="👔 Экипировка">👔 Экипировка</option>
                <option value="📚 Обучение">📚 Обучение</option>
                <option value="♾️ Постоянная деятельность">♾️ Постоянная деятельность</option>
            </select>
        </div>
        <div class="form-group"><label>Задача *</label><input type="text" id="pl-task"></div>
        <div class="form-group"><label>Ответственный</label><select id="pl-assignee"></select></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group">
                <label>Приоритет</label>
                <select id="pl-priority">
                    <option value="🔴 Высокий">🔴 Высокий</option>
                    <option value="🟡 Средний" selected>🟡 Средний</option>
                    <option value="🟢 Низкий">🟢 Низкий</option>
                </select>
            </div>
            <div class="form-group">
                <label>Статус</label>
                <select id="pl-status">
                    <option value="📕 План">📕 План</option>
                    <option value="✏️ В работе">✏️ В работе</option>
                    <option value="🤝 На согласовании">🤝 На согласовании</option>
                    <option value="✔️ Готово">✔️ Готово</option>
                    <option value="❌ Отменено">❌ Отменено</option>
                    <option value="❗ Просрочено">❗ Просрочено</option>
                    <option value="♾️ Постоянная деятельность">♾️ Постоянная деятельность</option>
                </select>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="form-group"><label>Начало</label><input type="date" id="pl-start"></div>
            <div class="form-group"><label>Конец</label><input type="date" id="pl-end"></div>
        </div>
        <div class="cmd-modal-actions">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-plan').classList.remove('active')">Отмена</button>
            <button class="btn btn-primary btn-sm" id="btn-save-plan">Сохранить</button>
        </div>
    </div>
</div>

<div class="cmd-modal" id="modal-operator">
    <div class="cmd-modal-content">
        <div class="cmd-modal-title">Оперативные данные бойца</div>
        <input type="hidden" id="op-id">
        <div class="form-group"><label>Позывной (только чтение)</label><input type="text" id="op-name" disabled></div>
        <div class="form-group"><label>Роль (только чтение)</label><input type="text" id="op-role" disabled></div>
        <div class="form-group"><label>ФИО</label><input type="text" id="op-fullname"></div>
        <div class="form-group"><label>Дата рождения</label><input type="date" id="op-birth"></div>
        <div class="form-group"><label>Телефон</label><input type="text" id="op-phone"></div>
        <div class="form-group"><label>Статус</label>
            <select id="op-status">
                <option value="На связи">На связи</option>
                <option value="Отпуск">Отпуск</option>
                <option value="Госпиталь">Госпиталь</option>
                <option value="Командировка">Командировка</option>
            </select>
        </div>
        <div class="cmd-modal-actions">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-operator').classList.remove('active')">Отмена</button>
            <button class="btn btn-primary btn-sm" id="btn-save-operator">Сохранить</button>
        </div>
    </div>
</div>

<div class="cmd-modal" id="modal-action">
    <div class="cmd-modal-content">
        <div class="cmd-modal-title">Поощрение / Взыскание</div>
        <div class="form-group"><label>Боец *</label><select id="ac-operator"></select></div>
        <div class="form-group"><label>Дата</label><input type="date" id="ac-date"></div>
        <div class="form-group"><label>Тип *</label>
            <select id="ac-type">
                <option value="Благодарность">Благодарность</option>
                <option value="Ценный подарок">Ценный подарок</option>
                <option value="Повышение в должности">Повышение в должности</option>
                <option value="Замечание">Замечание</option>
                <option value="Выговор">Выговор</option>
                <option value="Строгий выговор">Строгий выговор</option>
                <option value="Понижение в должности">Понижение в должности</option>
            </select>
        </div>
        <div class="form-group"><label>Основание</label><textarea id="ac-reason" rows="2"></textarea></div>
        <div class="form-group"><label>Кем подписано</label><input type="text" id="ac-signed" value="Командир"></div>
        <div class="cmd-modal-actions">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-action').classList.remove('active')">Отмена</button>
            <button class="btn btn-primary btn-sm" id="btn-save-action">Сохранить</button>
        </div>
    </div>
</div>

<div class="cmd-modal" id="modal-recruit">
    <div class="cmd-modal-content" style="width:600px;">
        <div class="cmd-modal-title">Карточка рекрута</div>
        <input type="hidden" id="rec-modal-id">

        <div style="margin-bottom:15px; padding:10px; background:var(--bg-deep); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text-secondary); line-height:1.6;">
            <strong>Позывной:</strong> <span id="m-rec-callsign"></span><br>
            <strong>ФИО:</strong> <span id="m-rec-fullname"></span><br>
            <strong>ДР:</strong> <span id="m-rec-birth"></span><br>
            <strong>Телефон:</strong> <span id="m-rec-phone"></span><br>
            <strong>Telegram:</strong> <span id="m-rec-tg"></span><br>
            <strong>VK:</strong> <span id="m-rec-vk"></span><br>
            <hr style="border-color:var(--border); margin:8px 0;">
            <strong>Мотивация:</strong><br><span id="m-rec-motivation"></span>
        </div>

        <div class="form-group">
            <label>Статус</label>
            <select id="m-rec-status">
                <option value="Новая">Новая</option>
                <option value="На рассмотрении">На рассмотрении</option>
                <option value="Принят">Принят</option>
                <option value="Отклонен">Отклонен</option>
            </select>
        </div>
        <div class="form-group">
            <label>Комментарий командира</label>
            <textarea id="m-rec-comment" rows="3" placeholder="Например: ТБ сдан, готов к вступлению"></textarea>
        </div>

        <div class="cmd-modal-actions">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-recruit').classList.remove('active')">Закрыть</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecruit()">Удалить</button>
            <button class="btn btn-primary btn-sm" onclick="saveRecruit()">Сохранить</button>
        </div>
    </div>
</div>

<script>
    // ==========================================
    // ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК + ХЕШ
    // ==========================================
    function switchTab(tabKey) {
        // Меняем активный класс (используем классы админки)
        document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        const btn = document.querySelector(`.admin-nav-item[data-tab="${tabKey}"]`);
        const content = document.getElementById('tab-' + tabKey);

        if (btn && content) {
            btn.classList.add('active');
            content.classList.add('active');
        }

        const titles = {
            'plan': 'План на год',
            'roster': 'Личный состав',
            'actions': 'Поощрения / Взыскания',
            'recruit': 'Рекрутинг'
        };
        document.getElementById('page-title').textContent = titles[tabKey] || 'Командование';

        // Синхронизируем хеш (без перезагрузки)
        if (location.hash !== '#' + tabKey) {
            history.replaceState(null, null, '#' + tabKey);
        }
    }

    // При клике на кнопку (используем классы админки)
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(btn.dataset.tab);
        });
    });

    // При загрузке страницы — читаем хеш
    document.addEventListener('DOMContentLoaded', () => {
        const initialTab = location.hash ? location.hash.substring(1) : 'plan';
        if (['plan', 'roster', 'actions', 'recruit'].includes(initialTab)) {
            switchTab(initialTab);
        }
    });

    // ==========================================
    // API
    // ==========================================
    let CSRF = null;
    let PLAN = [];
    let ROSTER = [];
    let RECRUITS = [];
    let currentSort = { column: 'id', direction: 1 };

    async function apiGet(action) {
        const res = await fetch(`/api/command.php?action=${action}`, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }

    async function apiPost(action, body) {
        if (!CSRF) {
            const r = await fetch('/api/auth.php?action=check', { credentials: 'same-origin' });
            const d = await r.json();
            CSRF = d.csrf_token;
        }
        const res = await fetch(`/api/command.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        });
        return await res.json();
    }

    // ==========================================
    // ПЛАН
    // ==========================================
    function renderPlanDashboard() {
        const total = PLAN.length;
        const permanent = PLAN.filter(p => p.status === '♾️ Постоянная деятельность').length;
        const project = total - permanent;
        const done = PLAN.filter(p => p.status === '✔️ Готово').length;
        const work = PLAN.filter(p => p.status === '✏️ В работе').length;
        const overdue = PLAN.filter(p => p.status === '❗ Просрочено').length;

        document.getElementById('plan-dashboard-top').innerHTML = `
            <div class="cmd-dash-card"><div class="cmd-dash-value">${total}</div><div class="cmd-dash-label">Всего задач</div></div>
            <div class="cmd-dash-card"><div class="cmd-dash-value" style="color:var(--success)">${done}</div><div class="cmd-dash-label">Готово</div></div>
            <div class="cmd-dash-card"><div class="cmd-dash-value" style="color:var(--warning)">${work}</div><div class="cmd-dash-label">В работе</div></div>
            <div class="cmd-dash-card"><div class="cmd-dash-value" style="color:var(--error)">${overdue}</div><div class="cmd-dash-label">Просрочено</div></div>
        `;

        const directions = {};
        PLAN.forEach(p => {
            if (!directions[p.direction]) directions[p.direction] = { total: 0, done: 0 };
            directions[p.direction].total++;
            if (p.status === '✔️ Готово') directions[p.direction].done++;
        });

        let html = '';
        for (const [dir, stats] of Object.entries(directions)) {
            const percent = stats.total > 0 ? ((stats.done / stats.total) * 100).toFixed(2) : '0.00';
            html += `<tr><td>${dir}</td><td style="text-align:center;">${stats.total}</td><td style="text-align:center;">${stats.done}</td><td style="text-align:right;">${percent}%</td></tr>`;
        }
        document.getElementById('plan-dashboard-breakdown').innerHTML = html;
    }

    function renderPlan() {
        const tbody = document.getElementById('plan-list');

        const sorted = [...PLAN].sort((a, b) => {
            let valA = a[currentSort.column] || '';
            let valB = b[currentSort.column] || '';
            if (currentSort.column === 'priority') {
                const p = { '🔴 Высокий': 3, '🟡 Средний': 2, '🟢 Низкий': 1 };
                valA = p[valA] || 0; valB = p[valB] || 0;
            }
            if (currentSort.column === 'end_date') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }
            if (valA < valB) return -1 * currentSort.direction;
            if (valA > valB) return 1 * currentSort.direction;
            return 0;
        });

        if (!sorted.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">Задач нет.</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(p => {
            let stColor = 'var(--text-secondary)';
            if (p.status.includes('Готово')) stColor = 'var(--success)';
            else if (p.status.includes('В работе')) stColor = 'var(--warning)';
            else if (p.status.includes('Отменено') || p.status.includes('Просрочено')) stColor = 'var(--error)';
            let prColor = 'var(--text-secondary)';
            if (p.priority.includes('Высокий')) prColor = 'var(--error)';
            else if (p.priority.includes('Средний')) prColor = 'var(--warning)';

            return `
                <tr>
                    <td>${p.direction}</td>
                    <td>${p.task}</td>
                    <td>${p.assignee || '—'}</td>
                    <td style="color:${prColor}">${p.priority}</td>
                    <td style="color:${stColor}; font-weight:700;">${p.status}</td>
                    <td>${p.end_date ? formatDate(p.end_date) : '—'}</td>
                    <td>
                        <button class="btn-icon-sm" onclick="editPlan(${p.id})"><span class="material-icons">edit</span></button>
                        <button class="btn-icon-sm" onclick="deletePlan(${p.id})" style="color:var(--error); border-color:var(--border);"><span class="material-icons">delete</span></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    document.querySelectorAll('.cmd-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (currentSort.column === col) currentSort.direction *= -1;
            else { currentSort.column = col; currentSort.direction = 1; }

            document.querySelectorAll('.cmd-table th[data-sort]').forEach(t => {
                t.textContent = t.textContent.replace(/ ↕| ↓| ↑/g, '') + ' ↕';
            });
            th.textContent = th.textContent.replace(/ ↕| ↓| ↑/g, '') + (currentSort.direction === 1 ? ' ↓' : ' ↑');
            renderPlan();
        });
    });

    function renderGantt() {
        const container = document.getElementById('gantt-container');
        const months = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
        let html = '<div class="gantt-grid">';
        html += '<div class="gantt-cell gantt-header">Задача</div>';
        months.forEach(m => html += `<div class="gantt-cell gantt-header">${m}</div>`);

        PLAN.forEach(p => {
            html += `<div class="gantt-cell">${p.task}</div>`;
            let startMonth = 0, endMonth = 11;
            if (p.start_date) { const d = new Date(p.start_date); if (!isNaN(d)) startMonth = d.getMonth(); }
            if (p.end_date) { const d = new Date(p.end_date); if (!isNaN(d)) endMonth = d.getMonth(); }
            let cls = 'plan';
            if (p.status.includes('Готово')) cls = 'done';
            else if (p.status.includes('В работе')) cls = 'work';

            for (let i = 0; i < 12; i++) {
                if (i >= startMonth && i <= endMonth) html += `<div class="gantt-cell" style="padding:0;"><div class="gantt-bar ${cls}" style="width:100%;margin:4px 0;"></div></div>`;
                else html += `<div class="gantt-cell"></div>`;
            }
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function switchPlanView(view) {
        document.getElementById('plan-view-table').style.display = 'none';
        document.getElementById('plan-view-gantt').style.display = 'none';
        document.getElementById('plan-view-dashboard').style.display = 'none';
        document.getElementById('plan-view-' + view).style.display = 'block';

        document.getElementById('view-btn-table').className = 'btn btn-sm ' + (view === 'table' ? 'btn-primary' : 'btn-secondary');
        document.getElementById('view-btn-gantt').className = 'btn btn-sm ' + (view === 'gantt' ? 'btn-primary' : 'btn-secondary');
        document.getElementById('view-btn-dashboard').className = 'btn btn-sm ' + (view === 'dashboard' ? 'btn-primary' : 'btn-secondary');

        if (view === 'gantt') renderGantt();
        if (view === 'dashboard') renderPlanDashboard();
    }

    // ==========================================
    // МОДАЛКИ ПЛАНА
    // ==========================================
    document.getElementById('btn-add-plan').addEventListener('click', () => openPlanModal());
    document.getElementById('btn-save-plan').addEventListener('click', async () => {
        const payload = {
            id: document.getElementById('pl-id').value || null,
            direction: document.getElementById('pl-direction').value,
            task: document.getElementById('pl-task').value.trim(),
            assignee: document.getElementById('pl-assignee').value,
            priority: document.getElementById('pl-priority').value,
            status: document.getElementById('pl-status').value,
            start_date: document.getElementById('pl-start').value,
            end_date: document.getElementById('pl-end').value,
        };
        if (!payload.task) return alert('Введите задачу');
        const res = await apiPost('save_plan', payload);
        if (res.id) { document.getElementById('modal-plan').classList.remove('active'); loadData(); }
        else alert('Ошибка: ' + (res.error || 'неизвестно'));
    });

    function openPlanModal(p = null) {
        document.getElementById('pl-id').value = p ? p.id : '';
        document.getElementById('pl-direction').value = p ? p.direction : '🇺🇳 Организация';
        document.getElementById('pl-task').value = p ? p.task : '';
        document.getElementById('pl-priority').value = p ? p.priority : '🟡 Средний';
        document.getElementById('pl-status').value = p ? p.status : '📕 План';
        document.getElementById('pl-start').value = p ? (p.start_date || '') : '';
        document.getElementById('pl-end').value = p ? (p.end_date || '') : '';

        const sel = document.getElementById('pl-assignee');
        sel.innerHTML = '<option value="">— Не выбран —</option>' + ROSTER.map(op => `<option value="${op.name}">${op.name}</option>`).join('');
        if (p && p.assignee) sel.value = p.assignee;
        document.getElementById('modal-plan').classList.add('active');
    }

    function editPlan(id) {
        const p = PLAN.find(x => x.id === id);
        if (p) openPlanModal(p);
    }

    async function deletePlan(id) {
        if (!confirm('Удалить задачу?')) return;
        await apiPost('delete_plan', { id });
        loadData();
    }

    // ==========================================
    // ЛИЧНЫЙ СОСТАВ
    // ==========================================
    function renderRoster(roster) {
        ROSTER = roster;
        const list = document.getElementById('roster-list');

        const online = roster.filter(r => r.status === 'На связи').length;
        const offline = roster.filter(r => r.status !== 'На связи').length;
        const nextBd = roster.find(r => r.days_to_bd !== null && r.days_to_bd !== undefined);

        document.getElementById('dash-total').textContent = roster.length;
        document.getElementById('dash-online').textContent = online;
        document.getElementById('dash-offline').textContent = offline;
        document.getElementById('dash-bd').textContent = nextBd ? nextBd.days_to_bd : '—';

        if (!roster.length) {
            list.innerHTML = '<div style="color:var(--text-muted); text-align: center; padding: 20px; grid-column: 1/-1;">Нет бойцов.</div>';
            return;
        }

        list.innerHTML = roster.map(op => {
            const photo = op.photo ? `<img src="/${op.photo}" onerror="this.remove()">` : `<span class="material-icons">person</span>`;
            const statusDot = op.status === 'На связи' ? 'online' : 'offline';
            const bdHTML = op.days_to_bd !== null ? `<div class="roster-bd"><span class="material-icons">cake</span> ${op.days_to_bd} дн.</div>` : '';

            return `
                <div class="roster-card">
                    <div class="roster-actions">
                        <button class="btn-icon-sm" onclick="editOperator(${op.id})" title="Редактировать"><span class="material-icons">edit</span></button>
                    </div>
                    <div class="roster-header">
                        <div class="roster-photo">${photo}</div>
                        <div>
                            <div class="roster-name">${op.name}</div>
                            <div class="roster-role">${op.role || 'Боец'}</div>
                        </div>
                    </div>
                    <div class="roster-details">
                        <div class="roster-detail-row"><span class="roster-detail-label">ФИО</span><span class="roster-detail-value">${op.full_name || '—'}</span></div>
                        <div class="roster-detail-row"><span class="roster-detail-label">Телефон</span><span class="roster-detail-value">${op.phone || '—'}</span></div>
                        <div class="roster-detail-row"><span class="roster-detail-label">ДР</span><span class="roster-detail-value">${op.birth_date ? formatDate(op.birth_date) : '—'}</span></div>
                        <div class="roster-detail-row"><span class="roster-detail-label">Поощрения</span><span class="roster-detail-value" style="color:var(--success);">+${op.rewards || 0}</span></div>
                        <div class="roster-detail-row"><span class="roster-detail-label">Взыскания</span><span class="roster-detail-value" style="color:${(op.penalties || 0) > 0 ? 'var(--error)' : 'inherit'};">-${op.penalties || 0}</span></div>
                    </div>
                    <div class="roster-footer">
                        <div class="roster-status"><span class="dot ${statusDot}"></span> ${op.status || 'На связи'}</div>
                        ${bdHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('btn-save-operator').addEventListener('click', async () => {
        const payload = {
            id: document.getElementById('op-id').value,
            full_name: document.getElementById('op-fullname').value.trim(),
            birth_date: document.getElementById('op-birth').value,
            phone: document.getElementById('op-phone').value.trim(),
            status: document.getElementById('op-status').value
        };
        const res = await apiPost('save_operator', payload);
        if (res.id) { document.getElementById('modal-operator').classList.remove('active'); loadData(); }
        else alert('Ошибка: ' + (res.error || 'неизвестно'));
    });

    function editOperator(id) {
        const op = ROSTER.find(x => x.id === id);
        if (!op) return;
        document.getElementById('op-id').value = op.id;
        document.getElementById('op-name').value = op.name || '';
        document.getElementById('op-role').value = op.role || '';
        document.getElementById('op-fullname').value = op.full_name || '';
        document.getElementById('op-birth').value = op.birth_date || '';
        document.getElementById('op-phone').value = op.phone || '';
        document.getElementById('op-status').value = op.status || 'На связи';
        document.getElementById('modal-operator').classList.add('active');
    }

    // ==========================================
    // ЖУРНАЛ
    // ==========================================
    function renderActions(actions) {
        const tbody = document.getElementById('actions-list');
        if (!actions.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Записей нет.</td></tr>';
            return;
        }
        tbody.innerHTML = actions.map(a => {
            const color = a.is_reward ? 'var(--success)' : 'var(--error)';
            return `
                <tr>
                    <td>${formatDate(a.date)}</td>
                    <td>${a.name}</td>
                    <td style="color:${color}">${a.type}</td>
                    <td>${a.reason || '—'}</td>
                    <td>${a.signed_by || '—'}</td>
                    <td><button class="btn-icon-sm" onclick="deleteAction(${a.id})" style="color:var(--error); border-color:var(--border);"><span class="material-icons">delete</span></button></td>
                </tr>
            `;
        }).join('');
    }

    document.getElementById('btn-add-action').addEventListener('click', () => {
        document.getElementById('ac-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('ac-reason').value = '';
        document.getElementById('modal-action').classList.add('active');
    });

    document.getElementById('btn-save-action').addEventListener('click', async () => {
        const type = document.getElementById('ac-type').value;
        const isReward = ['Благодарность', 'Ценный подарок', 'Повышение в должности'].includes(type) ? 1 : 0;
        const payload = {
            operator_id: parseInt(document.getElementById('ac-operator').value, 10),
            date: document.getElementById('ac-date').value,
            type: type,
            reason: document.getElementById('ac-reason').value.trim(),
            signed_by: document.getElementById('ac-signed').value.trim(),
            is_reward: isReward
        };
        const res = await apiPost('save_action', payload);
        if (res.success) { document.getElementById('modal-action').classList.remove('active'); loadData(); }
        else alert('Ошибка: ' + (res.error || 'неизвестно'));
    });

    async function deleteAction(id) {
        if (!confirm('Удалить запись?')) return;
        await apiPost('delete_action', { id });
        loadData();
    }

    // ==========================================
    // РЕКРУТИНГ
    // ==========================================

    async function loadRecruitments() {
        try {
            const res = await fetch('/api/recruitment.php', { credentials: 'same-origin' });
            if (!res.ok) return;
            const data = await res.json();
            RECRUITS = data.recruitments || [];

            const tbody = document.getElementById('recruit-list');
            if (!RECRUITS.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">Заявок пока нет.</td></tr>';
                return;
            }

            tbody.innerHTML = RECRUITS.map(r => {
                let statusColor = 'var(--text-muted)';
            if (r.status === 'Новая') statusColor = 'var(--accent)';
            else if (r.status === 'Принят') statusColor = 'var(--success)';
            else if (r.status === 'Отклонен') statusColor = 'var(--error)';
            else if (r.status === 'На рассмотрении') statusColor = 'var(--warning)';

            return `
            <tr>
                <td>${new Date(r.created_at * 1000).toLocaleDateString()}</td>
                <td>${r.callsign}</td>
                <td>${r.full_name}</td>
                <td>${r.birth_date ? formatDate(r.birth_date) : '—'}</td>
                <td style="color:${statusColor}; font-weight:700;">${r.status}</td>
                <td><button class="btn-icon-sm" onclick="openRecruitModal(${r.id})"><span class="material-icons">visibility</span></button></td>
            </tr>
            `;
            }).join('');
        } catch (e) { console.error(e); }
    }

    function openRecruitModal(id) {
        const r = RECRUITS.find(x => x.id === id);
        if (!r) return;

        document.getElementById('rec-modal-id').value = r.id;
        document.getElementById('m-rec-callsign').textContent = r.callsign;
        document.getElementById('m-rec-fullname').textContent = r.full_name;
        document.getElementById('m-rec-birth').textContent = r.birth_date;
        document.getElementById('m-rec-phone').textContent = r.phone;
        document.getElementById('m-rec-tg').textContent = r.telegram || '—';
        document.getElementById('m-rec-vk').textContent = r.vk || '—';
        document.getElementById('m-rec-motivation').textContent = r.motivation;
        document.getElementById('m-rec-status').value = r.status;
        document.getElementById('m-rec-comment').value = r.admin_comment || '';

        document.getElementById('modal-recruit').classList.add('active');
    }

    async function saveRecruit() {
        const id = parseInt(document.getElementById('rec-modal-id').value, 10);
        const status = document.getElementById('m-rec-status').value;
        const comment = document.getElementById('m-rec-comment').value.trim();

        if (!CSRF) {
            const r = await fetch('/api/auth.php?action=check', { credentials: 'same-origin' });
            const d = await r.json();
            CSRF = d.csrf_token;
        }

        const res = await fetch('/api/recruitment.php?action=update_status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
            credentials: 'same-origin',
            body: JSON.stringify({ id, status, admin_comment: comment })
        });
        const result = await res.json();

        if (result.success) {
            document.getElementById('modal-recruit').classList.remove('active');
            loadRecruitments();
        } else {
            alert('Ошибка: ' + (result.error || 'неизвестно'));
        }
    }

    async function deleteRecruit() {
        if (!confirm('Удалить заявку?')) return;
        const id = parseInt(document.getElementById('rec-modal-id').value, 10);

        if (!CSRF) {
            const r = await fetch('/api/auth.php?action=check', { credentials: 'same-origin' });
            const d = await r.json();
            CSRF = d.csrf_token;
        }

        const res = await fetch('/api/recruitment.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF },
            credentials: 'same-origin',
            body: JSON.stringify({ id })
        });
        const result = await res.json();

        if (result.success) {
            document.getElementById('rec-modal-id').value = '';
            document.getElementById('modal-recruit').classList.remove('active');
            loadRecruitments();
        } else {
            alert('Ошибка: ' + (result.error || 'неизвестно'));
        }
    }

    // ==========================================
    // ОБЩИЕ
    // ==========================================
    function formatDate(iso) {
        if (!iso) return '—';
        const [y, m, d] = iso.split('-');
        return `${d}.${m}.${y}`;
    }

    async function loadData() {
        try {
            const data = await apiGet('get_data');
            renderRoster(data.roster);

            const planData = await apiGet('get_plan');
            PLAN = planData.plan;

            renderPlanDashboard();
            renderPlan();

            const sel = document.getElementById('ac-operator');
            sel.innerHTML = data.roster.map(op => `<option value="${op.id}">${op.name}</option>`).join('');

            renderActions(data.recent_actions);

            loadRecruitments();
        } catch (e) {
            console.error(e);
            alert('Ошибка загрузки: ' + e.message);
        }
    }

    // Синхронизация хеша при загрузке
    const initialTab = location.hash ? location.hash.substring(1) : 'plan';
    if (['plan', 'roster', 'actions', 'recruit'].includes(initialTab)) {
        switchTab(initialTab);
    }

    loadData();
</script>
</body>
</html>
