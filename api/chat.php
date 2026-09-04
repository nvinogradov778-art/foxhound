<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

// Получение сообщений (последние 100)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $since = intval($_GET['since'] ?? 0);
    $stmt = $db->prepare('
    SELECT m.id, m.user_id, u.username, u.avatar, m.message, m.timestamp
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id > ?
    ORDER BY m.id ASC
    LIMIT 100
    ');
    $stmt->execute([$since]);
    $messages = $stmt->fetchAll();
    echo json_encode($messages);
    exit;
}

// Отправка сообщения
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $text = trim($data['message'] ?? '');
    if (empty($text)) {
        http_response_code(400);
        die(json_encode(['error' => 'Сообщение не может быть пустым']));
    }
    $now = time();
    $db->beginTransaction();
    try {
        // Вставляем новое сообщение
        $stmt = $db->prepare('INSERT INTO messages (user_id, message, timestamp) VALUES (?, ?, ?)');
        $stmt->execute([$_SESSION['user_id'], $text, $now]);
        $id = $db->lastInsertId();

        // Проверяем общее количество сообщений
        $countStmt = $db->query('SELECT COUNT(*) FROM messages');
        $count = $countStmt->fetchColumn();

        // Если больше 100, удаляем самые старые
        if ($count > 100) {
            $deleteStmt = $db->prepare('
            DELETE FROM messages
            WHERE id IN (
                SELECT id FROM messages
                ORDER BY id ASC
                LIMIT :limit
            )
            ');
            $toDelete = $count - 100;
            $deleteStmt->bindParam(':limit', $toDelete, PDO::PARAM_INT);
            $deleteStmt->execute();
        }

        $db->commit();

        // Возвращаем новое сообщение с данными пользователя
        $stmt = $db->prepare('
        SELECT m.id, m.user_id, u.username, u.avatar, m.message, m.timestamp
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
        ');
        $stmt->execute([$id]);
        $msg = $stmt->fetch();
        echo json_encode($msg);
    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка сохранения сообщения']);
    }
    exit;
}
?>
