<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db);
}

if ($method !== 'POST' && $method !== 'DELETE') {
    fail(405, 'Метод не разрешён');
}

$input = read_json();
$action = $input['action'] ?? '';

match ($method) {
    'POST'   => match ($action) {
        'create' => handle_save($db, $input, false),
        'update' => handle_save($db, $input, true),
        default  => fail(400, 'Неизвестное действие'),
    },
    'DELETE' => handle_delete($db, $input),
};

function handle_get(PDO $db): void {
    $archived = (int)($_GET['archived'] ?? 0);
    $now = time();

    $sql = 'SELECT * FROM events WHERE event_date ' . ($archived ? '<' : '>=') . ' ? ORDER BY event_date ASC';
    $stmt = $db->prepare($sql);
    $stmt->execute([$now]);

    $events = $stmt->fetchAll();
    foreach ($events as &$ev) {
        $ev['id'] = (int)$ev['id'];
        $ev['event_date'] = (int)$ev['event_date'];
        $ev['created_at'] = (int)$ev['created_at'];
        $ev['created_by'] = (int)($ev['created_by'] ?? 0);
        $ev['is_past'] = $ev['event_date'] < $now;
        $ev['event_date_formatted'] = date('Y-m-d H:i', $ev['event_date']);
    }
    unset($ev);

    respond($events);
}

function handle_save(PDO $db, array $input, bool $isUpdate): void {
    $admin = require_admin($db);
    $userId = $admin['id'];

    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $eventDate   = (int)($input['event_date'] ?? 0);
    $location    = trim($input['location'] ?? '');

    if ($isUpdate) {
        $eventId = (int)($input['event_id'] ?? 0);
        if (!$eventId || $title === '' || $eventDate < 1) {
            fail(400, 'Все поля обязательны');
        }

        $db->prepare('
            UPDATE events SET title = ?, description = ?, event_date = ?, location = ?
            WHERE id = ?
        ')->execute([$title, $description, $eventDate, $location, $eventId]);

        ok();
    }

    if ($title === '' || $eventDate <= time()) {
        fail(400, 'Название и дата в будущем обязательны');
    }

    $db->prepare('
        INSERT INTO events (title, description, event_date, location, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ')->execute([$title, $description, $eventDate, $location, $userId, time()]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, array $input): void {
    require_admin($db);

    $eventId = (int)($input['event_id'] ?? 0);
    if (!$eventId) fail(400, 'ID события обязательно');

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ?')->execute([$eventId]);
        $db->prepare('DELETE FROM event_logistics WHERE event_id = ?')->execute([$eventId]);
        $db->prepare('DELETE FROM event_rsvp WHERE event_id = ?')->execute([$eventId]);
        
        $stmt = $db->prepare('DELETE FROM events WHERE id = ?');
        $stmt->execute([$eventId]);

        if ($stmt->rowCount() === 0) {
            $db->rollBack();
            fail(404, 'Событие не найдено');
        }

        $db->commit();
        ok();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка удаления события');
    }
}