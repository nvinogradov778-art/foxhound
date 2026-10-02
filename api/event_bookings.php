<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db);
}

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();
$action = $_GET['action'] ?? 'book';
$eventId = (int)($input['event_id'] ?? 0);

if (!$eventId) fail(400, 'event_id обязателен');

$stmt = $db->prepare('SELECT id FROM events WHERE id = ?');
$stmt->execute([$eventId]);
if (!$stmt->fetch()) fail(404, 'Событие не найдено');

match ($action) {
    'cancel' => handle_cancel($db, $me, $eventId),
    'book'   => handle_book($db, $me, $eventId, $input),
    default  => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function handle_get(PDO $db): void {
    $eventId = (int)($_GET['event_id'] ?? 0);
    if (!$eventId) fail(400, 'event_id обязателен');

    $stmt = $db->prepare('
        SELECT b.id, b.driver_id, b.rider_id, b.created_at,
               u.username AS rider_username, u.avatar AS rider_avatar
        FROM event_ride_bookings b
        JOIN users u ON u.id = b.rider_id
        WHERE b.event_id = ?
        ORDER BY b.created_at ASC
    ');
    $stmt->execute([$eventId]);

    $bookings = [];
    foreach ($stmt->fetchAll() as $r) {
        $bookings[] = [
            'id'             => (int)$r['id'],
            'driver_id'      => (int)$r['driver_id'],
            'rider_id'       => (int)$r['rider_id'],
            'rider_username' => $r['rider_username'],
            'rider_avatar'   => $r['rider_avatar'],
            'created_at'     => (int)$r['created_at']
        ];
    }

    respond(['bookings' => $bookings]);
}

function handle_cancel(PDO $db, int $me, int $eventId): void {
    $stmt = $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND rider_id = ?');
    $stmt->execute([$eventId, $me]);

    ok(['cancelled' => $stmt->rowCount() > 0]);
}

function handle_book(PDO $db, int $me, int $eventId, array $input): void {
    $driverId = (int)($input['driver_id'] ?? 0);
    if (!$driverId) fail(400, 'driver_id обязателен');

    // должен быть «Иду»
    $stmt = $db->prepare('SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?');
    $stmt->execute([$eventId, $me]);
    if ($stmt->fetchColumn() !== 'going') {
        fail(403, 'Бронировать место можно только при ответе «Иду»');
    }

    // я сам не водитель
    $stmt = $db->prepare('SELECT is_driver FROM event_logistics WHERE event_id = ? AND user_id = ?');
    $stmt->execute([$eventId, $me]);
    if ((int)$stmt->fetchColumn() === 1) {
        fail(403, 'Вы водитель — сначала снимите галочку «Еду за рулём»');
    }

    // водитель существует и is_driver
    $stmt = $db->prepare('SELECT is_driver, seats FROM event_logistics WHERE event_id = ? AND user_id = ?');
    $stmt->execute([$eventId, $driverId]);
    $driver = $stmt->fetch();
    if (!$driver || (int)$driver['is_driver'] !== 1) {
        fail(404, 'Водитель не найден или не едет за рулём');
    }

    $seats = (int)$driver['seats'];

    // сколько уже занято
    $stmt = $db->prepare('SELECT COUNT(*) FROM event_ride_bookings WHERE event_id = ? AND driver_id = ?');
    $stmt->execute([$eventId, $driverId]);
    $booked = (int)$stmt->fetchColumn();

    if ($booked >= $seats) fail(409, 'У водителя нет свободных мест');

    $db->prepare('
        INSERT INTO event_ride_bookings (event_id, driver_id, rider_id, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(event_id, rider_id) DO UPDATE SET
            driver_id = excluded.driver_id,
            created_at = excluded.created_at
    ')->execute([$eventId, $driverId, $me, time()]);

    ok();
}