<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db, $me);
}

if ($method !== 'POST') fail(405, 'Метод не разрешён');

handle_post($db, $me);

// ---------- Обработчики ----------

function handle_get(PDO $db, int $me): void {
    $since = time() - 30 * 86400;

    $stmt = $db->prepare('
        SELECT u.id, u.username, u.avatar, u.last_seen,
               COALESCE(s.status, \'offline\') AS status,
               COALESCE(s.custom_text, \'\')  AS custom_text,
               s.updated_at
        FROM users u
        LEFT JOIN user_status s ON s.user_id = u.id
        WHERE u.is_banned = 0 AND (u.last_seen >= ? OR u.id = ?)
        ORDER BY u.username ASC
    ');
    $stmt->execute([$since, $me]);
    $rows = $stmt->fetchAll();

    $groups = ['online' => [], 'away' => [], 'dnd' => [], 'offline' => []];
    $now = time();

    foreach ($rows as $r) {
        $status = $r['status'] ?: 'offline';

        // Если updated_at старше 5 минут — сбрасываем в offline, кроме dnd (ручной)
        if ($status !== 'dnd' && ($now - (int)$r['updated_at']) > 300) {
            $status = 'offline';
        }

        $groups[$status][] = [
            'id'          => (int)$r['id'],
            'username'    => $r['username'],
            'avatar'      => $r['avatar'],
            'status'      => $status,
            'custom_text' => $r['custom_text'],
            'last_seen'   => (int)$r['last_seen']
        ];
    }

    respond([
        'online'  => $groups['online'],
        'away'    => $groups['away'],
        'dnd'     => $groups['dnd'],
        'offline' => $groups['offline']
    ]);
}

function handle_post(PDO $db, int $me): void {
    $input = read_json();
    $status = trim($input['status'] ?? '');
    $custom = trim($input['custom_text'] ?? '');

    if (!in_array($status, ['online', 'away', 'dnd', 'offline'], true)) {
        fail(400, 'status должен быть online / away / dnd / offline');
    }

    if (mb_strlen($custom) > 80) {
        $custom = mb_substr($custom, 0, 80);
    }

    $db->prepare('
        INSERT INTO user_status (user_id, status, custom_text, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            status = excluded.status,
            custom_text = excluded.custom_text,
            updated_at = excluded.updated_at
    ')->execute([$me, $status, $custom, time()]);

    ok();
}