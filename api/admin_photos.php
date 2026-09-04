<?php
require_once 'db.php';
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}
$stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
if ($stmt->fetchColumn() !== 'admin') {
    http_response_code(403);
    die(json_encode(['error' => 'Доступ запрещён']));
}

$action = $_GET['action'] ?? '';

if ($action === 'upload') {
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $date = $_POST['date'] ?? '';
    if (empty($title)) {
        http_response_code(400);
        die(json_encode(['error' => 'Название обязательно']));
    }
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        die(json_encode(['error' => 'Ошибка загрузки файла']));
    }
    $file = $_FILES['photo'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','gif','webp'];
    if (!in_array($ext, $allowed)) {
        http_response_code(400);
        die(json_encode(['error' => 'Недопустимый формат']));
    }
    // Генерируем имя
    $filename = 'photo_' . time() . '.' . $ext;
    $dest = __DIR__ . '/../photos/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        http_response_code(500);
        die(json_encode(['error' => 'Не удалось сохранить файл']));
    }
    // Обновляем JSON
    $jsonPath = __DIR__ . '/../photo_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['photos'])) $data['photos'] = [];
    $newPhoto = [
        'id' => count($data['photos']) + 1,
        'title' => $title,
        'description' => $description,
        'image' => 'photos/' . $filename,
        'date' => $date
    ];
    $data['photos'][] = $newPhoto;
    file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID не указан']));
    }
    $jsonPath = __DIR__ . '/../photo_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['photos'])) {
        http_response_code(404);
        die(json_encode(['error' => 'Нет фото']));
    }
    $found = false;
    foreach ($data['photos'] as $index => $photo) {
        if ($photo['id'] == $id) {
            // Удаляем файл
            $filePath = __DIR__ . '/../' . $photo['image'];
            if (file_exists($filePath)) unlink($filePath);
            unset($data['photos'][$index]);
            $found = true;
            break;
        }
    }
    if (!$found) {
        http_response_code(404);
        die(json_encode(['error' => 'Фото не найдено']));
    }
    $data['photos'] = array_values($data['photos']);
    file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Неизвестное действие']);
?>