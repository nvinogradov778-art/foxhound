<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db, $me);
}

if ($method !== 'POST') {
    fail(405, 'Метод не разрешён');
}

$action = $_GET['action'] ?? '';

match ($action) {
    'update'   => handle_update($db, $me),
    'password' => handle_password($db, $me),
    'avatar'   => handle_avatar($db, $me),
    default    => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function handle_get(PDO $db, int $userId): void {
    $stmt = $db->prepare('SELECT id, username, avatar, about, role, registered_at, last_seen FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) fail(404, 'Пользователь не найден');

    $user['id'] = (int)$user['id'];
    $user['registered_at'] = (int)$user['registered_at'];
    $user['last_seen'] = (int)$user['last_seen'];

    respond($user);
}

function handle_update(PDO $db, int $userId): void {
    $data = read_json();
    $about = trim($data['about'] ?? '');

    $db->prepare('UPDATE users SET about = ? WHERE id = ?')->execute([$about, $userId]);

    ok();
}

function handle_password(PDO $db, int $userId): void {
    $data = read_json();
    $old = (string)($data['old_password'] ?? '');
    $new = (string)($data['new_password'] ?? '');

    if (strlen($new) < 4) {
        fail(400, 'Новый пароль — минимум 4 символа');
    }

    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $hash = $stmt->fetchColumn();

    if (!$hash || !password_verify($old, $hash)) {
        fail(400, 'Текущий пароль неверный');
    }

    $newHash = password_hash($new, PASSWORD_DEFAULT);
    $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$newHash, $userId]);

    ok();
}

function handle_avatar(PDO $db, int $userId): void {
    if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        fail(400, 'Ошибка загрузки файла');
    }

    // Проверим MIME до удаления старого
    $avatarDir = __DIR__ . '/../uploads/avatars';
    $filename = upload_image($_FILES['avatar'], $avatarDir, 'avatar_' . $userId);

    // Удаляем старый (если был и не default)
    $stmt = $db->prepare('SELECT avatar FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $oldAvatar = $stmt->fetchColumn();

    if ($oldAvatar && $oldAvatar !== 'default.png' && $oldAvatar !== $filename) {
        $oldPath = $avatarDir . '/' . $oldAvatar;
        if (is_file($oldPath)) @unlink($oldPath);
    }

    $db->prepare('UPDATE users SET avatar = ? WHERE id = ?')->execute([$filename, $userId]);

    ok(['avatar' => $filename]);
}