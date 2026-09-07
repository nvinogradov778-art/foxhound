<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

$stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$user_id]);
$user = $stmt->fetch();
$is_admin = ($user && $user['role'] === 'admin');

if ($method === 'GET') {
    try {
        $archived = isset($_GET['archived']) ? intval($_GET['archived']) : 0;
        $now = time();

        $sql = 'SELECT * FROM events';
        if ($archived) {
            $sql .= ' WHERE event_date < ?';
            $params = [$now];
        } else {
            $sql .= ' WHERE event_date >= ?';
            $params = [$now];
        }
        $sql .= ' ORDER BY event_date ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $events = $stmt->fetchAll();

        foreach ($events as &$ev) {
            $ev['is_past'] = ($ev['event_date'] < $now);
            $ev['event_date_formatted'] = date('Y-m-d H:i', $ev['event_date']);
        }

        header('Content-Type: application/json');
        echo json_encode($events);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
    }
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if ($data === null) {
        http_response_code(400);
        die(json_encode(['error' => 'Неверный JSON']));
    }
    $action = $data['action'] ?? '';

    if ($action === 'create') {
        if (!$is_admin) {
            http_response_code(403);
            die(json_encode(['error' => 'Доступ запрещён (нужна роль admin)']));
        }

        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $event_date = intval($data['event_date'] ?? 0);
        $location = trim($data['location'] ?? '');

        if (empty($title) || $event_date <= time()) {
            http_response_code(400);
            die(json_encode(['error' => 'Название и дата в будущем обязательны']));
        }

        try {
            $stmt = $db->prepare('
            INSERT INTO events (title, description, event_date, location, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ');
            $now = time();
            $stmt->execute([$title, $description, $event_date, $location, $user_id, $now]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
        }
    }

    if ($action === 'update') {
        if (!$is_admin) {
            http_response_code(403);
            die(json_encode(['error' => 'Доступ запрещён']));
        }

        $event_id = intval($data['event_id'] ?? 0);
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $event_date = intval($data['event_date'] ?? 0);
        $location = trim($data['location'] ?? '');

        if (!$event_id || empty($title) || $event_date < 1) {
            http_response_code(400);
            die(json_encode(['error' => 'Все поля обязательны']));
        }

        try {
            $stmt = $db->prepare('
            UPDATE events SET title = ?, description = ?, event_date = ?, location = ?
            WHERE id = ?
            ');
            $stmt->execute([$title, $description, $event_date, $location, $event_id]);
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'Неизвестное действие']);
    exit;
}

if ($method === 'DELETE') {
    if (!$is_admin) {
        http_response_code(403);
        die(json_encode(['error' => 'Доступ запрещён']));
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $event_id = intval($data['event_id'] ?? 0);
    if (!$event_id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID события обязательно']));
    }

    try {
        $stmt = $db->prepare('DELETE FROM events WHERE id = ?');
        $stmt->execute([$event_id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            die(json_encode(['error' => 'Событие не найдено']));
        }
        echo json_encode(['success' => true]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
    }
}

http_response_code(405);
echo json_encode(['error' => 'Метод не разрешён']);
