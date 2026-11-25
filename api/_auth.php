<?php
declare(strict_types=1);

function require_auth(): int {
    if (empty($_SESSION['user_id'])) {
        fail(401, 'Не авторизован');
    }
    return (int)$_SESSION['user_id'];
}

function require_me(PDO $db): array {
    $userId = require_auth();
    $stmt = $db->prepare('SELECT id, username, avatar, role, is_banned FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        fail(401, 'Пользователь не найден');
    }
    if ((int)$user['is_banned'] === 1) {
        fail(403, 'Аккаунт заблокирован');
    }

    $user['id'] = (int)$user['id'];
    $user['is_banned'] = (int)$user['is_banned'];
    return $user;
}

function require_admin(PDO $db): array {
    $user = require_me($db);
    if ($user['role'] !== 'admin' && $user['role'] !== 'commander') {
        fail(403, 'Доступ запрещён');
    }
    return $user;
}

function require_commander(PDO $db): array {
    $user = require_me($db);
    if ($user['role'] !== 'commander') {
        fail(403, 'Доступ только для Командира');
    }
    return $user;
}