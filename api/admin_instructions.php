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

if ($action === 'add') {
    $input = json_decode(file_get_contents('php://input'), true);
    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $link = trim($input['link'] ?? '');
    if (empty($title) || empty($link)) {
        http_response_code(400);
        die(json_encode(['error' => 'Название и ссылка обязательны']));
    }
    $jsonPath = __DIR__ . '/../instructions_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['documents'])) $data['documents'] = [];
    $data['documents'][] = [
        'title' => $title,
        'description' => $description,
        'link' => $link
    ];
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
    $jsonPath = __DIR__ . '/../instructions_data.json';
    $data = json_decode(file_get_contents($jsonPath), true);
    if (!isset($data['documents'][$index])) {
        http_response_code(404);
        die(json_encode(['error' => 'Инструкция не найдена']));
    }
    array_splice($data['documents'], $index, 1);
    file_put_contents($jsonPath, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Неизвестное действие']);
?>