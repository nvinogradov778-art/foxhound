<?php
require_once 'db.php';

$action = $_GET['action'] ?? '';

if ($action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (strlen($username) < 3 || strlen($password) < 4) {
        http_response_code(400);
        die(json_encode(['error' => 'Имя пользователя (мин. 3 символа) и пароль (мин. 4) обязательны']));
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        die(json_encode(['error' => 'Пользователь уже существует']));
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $now = time();
    $stmt = $db->prepare('INSERT INTO users (username, password_hash, registered_at, last_seen) VALUES (?, ?, ?, ?)');
    $stmt->execute([$username, $hash, $now, $now]);

    $_SESSION['user_id'] = $db->lastInsertId();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $db->prepare('UPDATE users SET last_seen = ? WHERE id = ?')->execute([time(), $user['id']]);
        echo json_encode(['success' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Неверное имя пользователя или пароль']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        $stmt = $db->prepare('SELECT id, username, avatar, about, role, registered_at, last_seen FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            $db->prepare('UPDATE users SET last_seen = ? WHERE id = ?')->execute([time(), $user['id']]);
            echo json_encode(['loggedin' => true, 'user' => $user]);
        } else {
            session_destroy();
            echo json_encode(['loggedin' => false]);
        }
    } else {
        echo json_encode(['loggedin' => false]);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Неизвестное действие']);
?>
