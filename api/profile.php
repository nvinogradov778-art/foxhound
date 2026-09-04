<?php
require_once 'db.php';

// Проверяем авторизацию
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

$user_id = $_SESSION['user_id'];

// GET – данные профиля
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('SELECT id, username, avatar, about, role, registered_at, last_seen FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(404);
        die(json_encode(['error' => 'Пользователь не найден']));
    }
    echo json_encode($user);
    exit;
}

// POST – обновление about
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';

    if ($action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);
        $about = trim($data['about'] ?? '');
        $stmt = $db->prepare('UPDATE users SET about = ? WHERE id = ?');
        $stmt->execute([$about, $user_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'avatar') {
        // Проверяем файл
        if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            die(json_encode(['error' => 'Ошибка загрузки файла']));
        }
        $file = $_FILES['avatar'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            die(json_encode(['error' => 'Разрешены только JPG, PNG, GIF, WEBP']));
        }
        // Генерируем имя
        $filename = 'avatar_' . $user_id . '.' . $ext;
        $dest = __DIR__ . '/../uploads/avatars/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            http_response_code(500);
            die(json_encode(['error' => 'Не удалось сохранить файл']));
        }
        // Обновляем в БД
        $stmt = $db->prepare('UPDATE users SET avatar = ? WHERE id = ?');
        $stmt->execute([$filename, $user_id]);
        echo json_encode(['success' => true, 'avatar' => $filename]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Неизвестное действие']);
}
?>