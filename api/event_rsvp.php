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

    $stmt = $db->prepare('
        SELECT r.status, r.comment, r.updated_at,
               u.id AS user_id, u.username, u.avatar
        FROM event_rsvp r
        JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ?
        ORDER BY
            CASE r.status
                WHEN \'going\' THEN 0
                WHEN \'maybe\' THEN 1
                WHEN \'not_going\' THEN 2
            END,
            u.username
    ');
    $stmt->execute([$eventId]);
    $rows = $stmt->fetchAll();

    $counts = ['going' => 0, 'maybe' => 0, 'not_going' => 0];
    $myStatus = null;
    $myComment = '';

    foreach ($rows as &$r) {
        $r['user_id'] = (int)$r['user_id'];
        $r['updated_at'] = (int)$r['updated_at'];
        if (isset($counts[$r['status']])) $counts[$r['status']]++;
        if ($r['user_id'] === $me) {
            $myStatus = $r['status'];
            $myComment = $r['comment'];
        }
    }
    unset($r);

    respond([
        'responses'  => $rows,
        'counts'     => $counts,
        'my_status'  => $myStatus,
        'my_comment' => $myComment
    ]);
}

function handle_post(PDO $db, int $me): void {
    $input = read_json();
    $eventId = (int)($input['event_id'] ?? 0);
    $status  = trim($input['status'] ?? '');
    $comment = trim($input['comment'] ?? '');

    if (!$eventId) fail(400, 'event_id обязателен');
    if (!in_array($status, ['going', 'not_going', 'maybe'], true)) {
        fail(400, 'status должен быть going / not_going / maybe');
    }

    $stmt = $db->prepare('SELECT id FROM events WHERE id = ?');
    $stmt->execute([$eventId]);
    if (!$stmt->fetch()) fail(404, 'Событие не найдено');

    $db->prepare('
        INSERT INTO event_rsvp (event_id, user_id, status, comment, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(event_id, user_id) DO UPDATE SET
            status = excluded.status,
            comment = excluded.comment,
            updated_at = excluded.updated_at
    ')->execute([$eventId, $me, $status, $comment, time()]);

    if ($status !== 'going') {
        $db->prepare('DELETE FROM event_logistics WHERE event_id = ? AND user_id = ?')
           ->execute([$eventId, $me]);

        $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND rider_id = ?')
           ->execute([$eventId, $me]);

        $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND driver_id = ?')
           ->execute([$eventId, $me]);
    }

    ok();
}

function handle_delete(PDO $db, int $me): void {
    $input = read_json();
    $eventId = (int)($input['event_id'] ?? 0);
    if (!$eventId) fail(400, 'event_id обязателен');

    $db->prepare('DELETE FROM event_rsvp WHERE event_id = ? AND user_id = ?')
       ->execute([$eventId, $me]);

    $db->prepare('DELETE FROM event_logistics WHERE event_id = ? AND user_id = ?')
       ->execute([$eventId, $me]);

    $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND rider_id = ?')
       ->execute([$eventId, $me]);

    $db->prepare('DELETE FROM event_ride_bookings WHERE event_id = ? AND driver_id = ?')
       ->execute([$eventId, $me]);

    ok();
}