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

$input = json_decode(file_get_contents('php://input'), true);
$file = $input['file'] ?? '';
$content = $input['content'] ?? '';
$allowed = ['photo_data.json','operators_data.json','instructions_data.json','atak_data.json','regulations_data.json','scenarios_data.json','devices_data.json'];
if (!in_array($file, $allowed)) {
    http_response_code(400);
    die(json_encode(['error' => 'Недопустимый файл']));
}
$path = __DIR__ . '/../' . $file;
if (file_put_contents($path, $content) === false) {
    http_response_code(500);
    die(json_encode(['error' => 'Не удалось сохранить файл']));
}
echo json_encode(['success' => true]);
?>