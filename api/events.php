<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET – список событий (future + archived)
if ($method === 'GET') {
    $archived = isset($_GET['archived']) ? intval($_GET['archived']) : 0;
    $now = time();
    if ($archived) {
        // Прошедшие события
        $stmt = $db->prepare('
            SELECT e.*, 
                   (SELECT status FROM rsvp WHERE event_id = e.id AND user_id = ?) as rsvp_status,
                   (SELECT COUNT(*) FROM rsvp WHERE event_id = e.id AND status = 1) as going_count
            FROM events e
            WHERE e.event_date < ?
            ORDER BY e.event_date DESC
        ');
        $stmt->execute([$user_id, $now]);
    } else {
        // Будущие события
        $stmt = $db->prepare('
            SELECT e.*, 
                   (SELECT status FROM rsvp WHERE event_id = e.id AND user_id = ?) as rsvp_status,
                   (SELECT COUNT(*) FROM rsvp WHERE event_id = e.id AND status = 1) as going_count
            FROM events e
            WHERE e.event_date >= ?
            ORDER BY e.event_date ASC
        ');
        $stmt->execute([$user_id, $now]);
    }
    $events = $stmt->fetchAll();
    echo json_encode($events);
    exit;
}

// POST – создание или обновление события (админ)
if ($method === 'POST') {
    // Проверка роли
    $roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
    $roleStmt->execute([$user_id]);
    $role = $roleStmt->fetchColumn();
    if ($role !== 'admin') {
        http_response_code(403);
        die(json_encode(['error' => 'Доступ запрещён']));
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    // Обновление события
    if ($action === 'update') {
        $event_id = intval($data['event_id'] ?? 0);
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $event_date = intval($data['event_date'] ?? 0);
        $location = trim($data['location'] ?? '');

        if (!$event_id || empty($title) || !$event_date) {
            http_response_code(400);
            die(json_encode(['error' => 'ID, название и дата обязательны']));
        }

        $stmt = $db->prepare('
            UPDATE events 
            SET title = ?, description = ?, event_date = ?, location = ?
            WHERE id = ?
        ');
        $stmt->execute([$title, $description, $event_date, $location, $event_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // Создание события
    if ($action === 'create') {
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $event_date = intval($data['event_date'] ?? 0);
        $location = trim($data['location'] ?? '');

        if (empty($title) || !$event_date) {
            http_response_code(400);
            die(json_encode(['error' => 'Название и дата обязательны']));
        }

        $stmt = $db->prepare('
            INSERT INTO events (title, description, event_date, location, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $now = time();
        $stmt->execute([$title, $description, $event_date, $location, $user_id, $now]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Неизвестное действие']);
    exit;
}

// PUT – изменение статуса RSVP (для всех)
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $event_id = intval($data['event_id'] ?? 0);
    $status = intval($data['status'] ?? 0); // 1 – иду, 0 – не иду

    if (!$event_id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID события обязательно']));
    }

    // Проверяем существование события
    $check = $db->prepare('SELECT id FROM events WHERE id = ?');
    $check->execute([$event_id]);
    if (!$check->fetch()) {
        http_response_code(404);
        die(json_encode(['error' => 'Событие не найдено']));
    }

    $stmt = $db->prepare('
        INSERT INTO rsvp (event_id, user_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status
    ');
    $stmt->execute([$event_id, $user_id, $status]);
    echo json_encode(['success' => true]);
    exit;
}

// DELETE – удаление события (админ)
if ($method === 'DELETE') {
    $roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
    $roleStmt->execute([$user_id]);
    $role = $roleStmt->fetchColumn();
    if ($role !== 'admin') {
        http_response_code(403);
        die(json_encode(['error' => 'Доступ запрещён']));
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $event_id = intval($data['event_id'] ?? 0);
    if (!$event_id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID события обязательно']));
    }
    $stmt = $db->prepare('DELETE FROM events WHERE id = ?');
    $stmt->execute([$event_id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не разрешён']);
?>