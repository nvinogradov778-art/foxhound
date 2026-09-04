<?php
require_once 'db.php';
// Проверка админа – аналогично
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

if ($action === 'save') {
    $index = isset($_POST['index']) ? intval($_POST['index']) : null;
    $name = trim($_POST['name'] ?? '');
    $role = trim($_POST['role'] ?? '');
    $specialization = trim($_POST['specialization'] ?? '');
    $description = trim($_POST['description'] ?? '');
    if (empty($name)) {
        http_response_code(400);
        die(json_encode(['error' => 'Имя обязательно']));
    }

    $jsonPath = __DIR__ . '/../operators_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['operators'])) $data['operators'] = [];

    $operator = [
        'name' => $name,
        'role' => $role,
        'specialization' => $specialization,
        'description' => $description
    ];

    // Обработка фото
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['photo'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp'];
        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            die(json_encode(['error' => 'Недопустимый формат']));
        }
        $filename = 'operator_' . time() . '.' . $ext;
        $dest = __DIR__ . '/../operators/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            http_response_code(500);
            die(json_encode(['error' => 'Не удалось сохранить фото']));
        }
        $operator['photo'] = 'operators/' . $filename;
    } else {
        // Если не загружено, сохраняем старое фото (если редактирование)
        if ($index !== null && isset($data['operators'][$index]['photo'])) {
            $operator['photo'] = $data['operators'][$index]['photo'];
        } else {
            $operator['photo'] = null; // или заглушка
        }
    }

    if ($index !== null && isset($data['operators'][$index])) {
        // Обновление
        $data['operators'][$index] = $operator;
    } else {
        // Добавление
        $data['operators'][] = $operator;
    }
    file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $index = intval($input['index'] ?? -1);
    if ($index < 0) {
        http_response_code(400);
        die(json_encode(['error' => 'Индекс не указан']));
    }
    $jsonPath = __DIR__ . '/../operators_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['operators'][$index])) {
        http_response_code(404);
        die(json_encode(['error' => 'Оперативник не найден']));
    }
    // Удаляем фото
    if (isset($data['operators'][$index]['photo'])) {
        $filePath = __DIR__ . '/../' . $data['operators'][$index]['photo'];
        if (file_exists($filePath)) unlink($filePath);
    }
    array_splice($data['operators'], $index, 1);
    file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Неизвестное действие']);
?>