<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db, $me);
}

if ($method === 'POST') {
    handle_post($db, $me);
}

if ($method === 'DELETE') {
    handle_delete($db, $me);
}

fail(405, 'Метод не разрешён');

// ---------- Обработчики ----------

function handle_get(PDO $db, int $me): void {
    $eventId = (int)($_GET['event_id'] ?? 0);
    if (!$eventId) fail(400, 'event_id обязателен');

    // Логистика всех участников
    $stmt = $db->prepare('
        SELECT l.user_id, l.is_driver, l.seats, l.pickup_point,
               l.needs_ride, l.ride_area, l.updated_at,
               u.username
        FROM event_logistics l
        JOIN users u ON l.user_id = u.id
        WHERE l.event_id = ?
        ORDER BY l.is_driver DESC, l.needs_ride DESC, u.username
    ');
    $stmt->execute([$eventId]);
    $rows = $stmt->fetchAll();

    $drivers = [];
    $needsRide = [];
    $mine = null;

    foreach ($rows as $r) {
        $row = [
            'user_id'      => (int)$r['user_id'],
            'username'     => $r['username'],
            'is_driver'    => (int)$r['is_driver'],
            'seats'        => (int)$r['seats'],
            'pickup_point' => $r['pickup_point'],
            'needs_ride'   => (int)$r['needs_ride'],
            'ride_area'    => $r['ride_area'],
            'updated_at'   => (int)$r['updated_at']
        ];
        if ($row['is_driver'])  $drivers[]   = $row;
        if ($row['needs_ride']) $needsRide[] = $row;
        if ($row['user_id'] === $me) $mine = $row;
    }

    if (!$mine) {
        $mine = [
            'user_id'      => $me,
            'is_driver'    => 0,
            'seats'        => 0,
            'pickup_point' => '',
            'needs_ride'   => 0,
            'ride_area'    => ''
        ];
    }

    // Бронирования
    $bStmt = $db->prepare('
        SELECT b.id, b.driver_id, b.rider_id, b.created_at,
               u.username AS rider_username, u.avatar AS rider_avatar
        FROM event_ride_bookings b
        JOIN users u ON u.id = b.rider_id
        WHERE b.event_id = ?
        ORDER BY b.created_at ASC
    ');
    $bStmt->execute([$eventId]);
    $bookingsRaw = $bStmt->fetchAll();

    $bookingsByDriver = [];
    $myBooking = null;

    foreach ($bookingsRaw as $b) {
        $did = (int)$b['driver_id'];
        if (!isset($bookingsByDriver[$did])) $bookingsByDriver[$did] = [];

        $entry = [
            'id'             => (int)$b['id'],
            'rider_id'       => (int)$b['rider_id'],
            'rider_username' => $b['rider_username'],
            'rider_avatar'   => $b['rider_avatar']
        ];
        $bookingsByDriver[$did][] = $entry;

        if ((int)$b['rider_id'] === $me) {
            $myBooking = ['driver_id' => $did] + $entry;
        }
    }

    foreach ($drivers as &$d) {
        $did = (int)$d['user_id'];
        $list = $bookingsByDriver[$did] ?? [];
        $d['booked_count'] = count($list);
        $d['booked_list']  = $list;
        $d['free_seats']   = max(0, (int)$d['seats'] - count($list));
    }
    unset($d);

    respond([
        'drivers'          => $drivers,
        'needs_ride'       => $needsRide,
        'mine'             => $mine,
        'my_booking'       => $myBooking,
        'total_seats'      => array_sum(array_column($drivers, 'seats')),
        'total_free'       => array_sum(array_column($drivers, 'free_seats')),
        'total_booked'     => array_sum(array_column($drivers, 'booked_count')),
        'total_needs_ride' => count($needsRide)
    ]);
}

function handle_post(PDO $db, int $me): void {
    $input = read_json();
    $eventId = (int)($input['event_id'] ?? 0);
    if (!$eventId) fail(400, 'event_id обязателен');

    $stmt = $db->prepare('SELECT id FROM events WHERE id = ?');
    $stmt->execute([$eventId]);
    if (!$stmt->fetch()) fail(404, 'Событие не найдено');

    $stmt = $db->prepare('SELECT status FROM event_rsvp WHERE event_id = ? AND user_id = ?');
    $stmt->execute([$eventId, $me]);
    if ($stmt->fetchColumn() !== 'going') {
        fail(403, 'Логистику можно заполнять только при ответе «Иду»');
    }

    $isDriver    = !empty($input['is_driver'])  ? 1 : 0;
    $seats       = max(0, min(8, (int)($input['seats'] ?? 0)));
    $pickupPoint = trim($input['pickup_point'] ?? '');
    $needsRide   = !empty($input['needs_ride']) ? 1 : 0;
    $rideArea    = trim($input['ride_area'] ?? '');

    if ($isDriver) {
        $needsRide = 0;
        $rideArea = '';
    }
    if ($needsRide) {
        $isDriver = 0;
        $seats = 0;
        $pickupPoint = '';
    }

    $oldStmt = $db->prepare('SELECT is_driver, seats FROM event_logistics WHERE event_id = ? AND user_id = ?');
    $oldStmt->execute([$eventId, $me]);
    $old = $oldStmt->fetch();
    $oldIsDriver = $old ? (int)$old['is_driver'] : 0;
    $oldSeats    = $old ? (int)$old['seats']    : 0;

    $db->prepare('
        INSERT INTO event_logistics
            (event_id, user_id, is_driver, seats, pickup_point, needs_ride, ride_area, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_id, user_id) DO UPDATE SET
            is_driver = excluded.is_driver,
            seats = excluded.seats,
            pickup_point = excluded.pickup_point,
            needs_ride = excluded.needs_ride,
            ride_area = excluded.ride_area,
            updated_at = excluded.updated_at
    ')->execute([$eventId, $me, $isDriver, $seats, $pickupPoint, $needsRide, $rideArea, time()]);

    $becameNotDriver = ($oldIsDriver === 1 && $isDriver === 0);
    $reducedSeats    = ($oldIsDriver === 1 && $isDriver === 1 && $seats < $oldSeats);

    if ($becameNotDriver || $reducedSeats) {
        $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND driver_id = ?')
           ->execute([$eventId, $me]);
    }

    ok();
}

function handle_delete(PDO $db, int $me): void {
    $input = read_json();
    $eventId = (int)($input['event_id'] ?? 0);
    if (!$eventId) fail(400, 'event_id обязателен');

    $db->prepare('DELETE FROM event_logistics WHERE event_id = ? AND user_id = ?')
       ->execute([$eventId, $me]);

    ok();
}