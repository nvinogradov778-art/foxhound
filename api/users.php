<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_admin($db);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db);
}

if ($method !== 'POST') {
    fail(405, 'Метод не разрешён');
}

$input = read_json();
$action = $_GET['action'] ?? '';

$targetId = (int)($input['user_id'] ?? 0);
if (!$targetId) fail(400, 'user_id обязателен');

$stmt = $db->prepare('SELECT id, username, role, is_banned FROM users WHERE id = ?');
$stmt->execute([$targetId]);
$target = $stmt->fetch();
if (!$target) fail(404, 'Пользователь не найден');

$targetIsAdmin = $target['role'] === 'admin';

match ($action) {
    'role'     => handle_role($db, $me['id'], $targetId, $targetIsAdmin, $input),
    'password' => handle_password($db, $targetId, $input),
    'ban'      => handle_ban($db, $me['id'], $targetId, $targetIsAdmin, $input),
    'unban'    => handle_unban($db, $targetId),
    'delete'   => handle_delete($db, $me['id'], $targetId, $targetIsAdmin),
    default    => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function handle_get(PDO $db): void {
    $stmt = $db->query('
        SELECT id, username, role, registered_at, last_seen,
               is_banned, banned_at, banned_by, banned_reason, avatar
        FROM users
        ORDER BY CASE role WHEN \'admin\' THEN 0 ELSE 1 END, username ASC
    ');

    $users = $stmt->fetchAll();
    foreach ($users as &$u) {
        $u['id'] = (int)$u['id'];
        $u['registered_at'] = (int)$u['registered_at'];
        $u['last_seen'] = (int)$u['last_seen'];
        $u['is_banned'] = (int)$u['is_banned'];
        $u['banned_at'] = (int)$u['banned_at'];
        $u['banned_by'] = (int)$u['banned_by'];
    }
    unset($u);

    respond(['users' => $users]);
}

function handle_role(PDO $db, int $meId, int $targetId, bool $targetIsAdmin, array $input): void {
    $newRole = trim($input['role'] ?? '');
    if (!in_array($newRole, ['user', 'admin'], true)) {
        fail(400, 'Роль должна быть user или admin');
    }

    if ($targetId === $meId) fail(400, 'Нельзя изменить свою роль');

    if ($targetIsAdmin && $newRole === 'user') {
        $adminsCount = (int)$db->query('SELECT COUNT(*) FROM users WHERE role = \'admin\'')->fetchColumn();
        if ($adminsCount <= 1) fail(400, 'Нельзя понизить последнего админа');
    }

    $db->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$newRole, $targetId]);
    ok();
}

function handle_password(PDO $db, int $targetId, array $input): void {
    $newPass = trim($input['password'] ?? '');
    if (strlen($newPass) < 4) fail(400, 'Пароль минимум 4 символа');

    $hash = password_hash($newPass, PASSWORD_DEFAULT);
    $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, $targetId]);
    ok();
}

function handle_ban(PDO $db, int $meId, int $targetId, bool $targetIsAdmin, array $input): void {
    if ($targetId === $meId) fail(400, 'Нельзя забанить себя');
    if ($targetIsAdmin) fail(400, 'Нельзя забанить админа. Сначала понизьте роль.');

    $reason = trim($input['reason'] ?? '');

    $db->prepare('
        UPDATE users
        SET is_banned = 1, banned_at = ?, banned_by = ?, banned_reason = ?
        WHERE id = ?
    ')->execute([time(), $meId, $reason, $targetId]);

    ok();
}

function handle_unban(PDO $db, int $targetId): void {
    $db->prepare('
        UPDATE users
        SET is_banned = 0, banned_at = 0, banned_by = 0, banned_reason = \'\'
        WHERE id = ?
    ')->execute([$targetId]);

    ok();
}

function handle_delete(PDO $db, int $meId, int $targetId, bool $targetIsAdmin): void {
    if ($targetId === $meId) fail(400, 'Нельзя удалить себя');

    if ($targetIsAdmin) {
        $adminsCount = (int)$db->query('SELECT COUNT(*) FROM users WHERE role = \'admin\'')->fetchColumn();
        if ($adminsCount <= 1) fail(400, 'Нельзя удалить последнего админа');
    }

    $db->beginTransaction();
    try {
        // Очищаем сообщения и реакции удаляемого пользователя
        $db->prepare('UPDATE channel_messages SET is_deleted = 1, text = \'\' WHERE user_id = ?')->execute([$targetId]);
        $db->prepare('DELETE FROM channel_reactions WHERE user_id = ?')->execute([$targetId]);
        
        // Удаляем пользователя
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$targetId]);
        
        $db->commit();
        ok();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка удаления пользователя');
    }
}