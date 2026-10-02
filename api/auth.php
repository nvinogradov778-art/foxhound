<?php
declare(strict_types=1);

define('CSRF_OPTIONAL', true);

require_once __DIR__ . '/_bootstrap.php';

$action = $_GET['action'] ?? '';

match ($action) {
    'register' => handle_register($db),
    'login'    => handle_login($db),
    'logout'   => handle_logout(),
    'check'    => handle_check($db),
    default    => fail(400, 'Неизвестное действие'),
};

function handle_register(PDO $db): void {
    $data = read_json();
    $username = trim($data['username'] ?? '');
    $password = (string)($data['password'] ?? '');

    if (mb_strlen($username) < 3 || strlen($password) < 4) {
        fail(400, 'Имя пользователя (мин. 3 символа) и пароль (мин. 4) обязательны');
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        fail(409, 'Пользователь уже существует');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $now = time();

    $db->prepare('INSERT INTO users (username, password_hash, registered_at, last_seen) VALUES (?, ?, ?, ?)')
       ->execute([$username, $hash, $now, $now]);

    $_SESSION['user_id'] = (int)$db->lastInsertId();
    ok();
}

function handle_login(PDO $db): void {
    $data = read_json();
    $username = trim($data['username'] ?? '');
    $password = (string)($data['password'] ?? '');

    $stmt = $db->prepare('SELECT id, password_hash, is_banned, banned_reason FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && (int)$user['is_banned'] === 1) {
        $reason = trim((string)($user['banned_reason'] ?? ''));
        fail(403, $reason ? ('Аккаунт заблокирован: ' . $reason) : 'Аккаунт заблокирован');
    }

    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail(401, 'Неверное имя пользователя или пароль');
    }

    $_SESSION['user_id'] = (int)$user['id'];
    $db->prepare('UPDATE users SET last_seen = ? WHERE id = ?')->execute([time(), (int)$user['id']]);

    ok();
}

function handle_logout(): void {
    session_destroy();
    ok();
}

function handle_check(PDO $db): void {
    if (empty($_SESSION['user_id'])) {
        respond(['loggedin' => false, 'csrf_token' => null]);
    }

    $stmt = $db->prepare('SELECT id, username, avatar, about, role, registered_at, last_seen FROM users WHERE id = ?');
    $stmt->execute([(int)$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        session_destroy();
        respond(['loggedin' => false, 'csrf_token' => null]);
    }

    $db->prepare('UPDATE users SET last_seen = ? WHERE id = ?')
       ->execute([time(), (int)$user['id']]);

    respond([
        'loggedin'   => true,
        'user'       => $user,
        'csrf_token' => $_SESSION['csrf_token'] ?? null
    ]);
}