<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_me($db);
$isAdmin = in_array($me['role'], ['admin', 'commander'], true);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    handle_get($db, $me['id'], $isAdmin);
}

if ($method !== 'POST') {
    fail(405, 'Метод не разрешён');
}

$in = read_json();

match ($action) {
    '', 'send' => handle_send($db, $me, $in),
    'edit'     => handle_edit($db, $me, $in),
    'delete'   => handle_delete($db, $me, $isAdmin, $in),
    'react', 'unreact' => handle_reaction($db, $me, $action, $in),
    default    => fail(400, 'Неизвестное действие'),
};

function get_channel_or_fail(PDO $db, int $channelId, int $userId, bool $isAdmin): array {
    $stmt = $db->prepare('SELECT id, slug, name, is_private FROM channels WHERE id = ?');
    $stmt->execute([$channelId]);
    $ch = $stmt->fetch();
    if (!$ch) fail(404, 'Канал не найден');

    if ((int)$ch['is_private'] === 1 && !$isAdmin) {
        $r = $db->prepare('SELECT role FROM channel_roles WHERE channel_id = ? AND user_id = ?');
        $r->execute([$channelId, $userId]);
        if (!$r->fetchColumn()) fail(403, 'Доступ к каналу запрещён');
    }

    return $ch;
}

function get_channel_role(PDO $db, int $channelId, int $userId): ?string {
    $r = $db->prepare('SELECT role FROM channel_roles WHERE channel_id = ? AND user_id = ?');
    $r->execute([$channelId, $userId]);
    $role = $r->fetchColumn();
    return $role === false ? null : $role;
}

function handle_get(PDO $db, int $userId, bool $isAdmin): void {
    $channelId = (int)($_GET['channel_id'] ?? 0);
    $beforeId  = (int)($_GET['before_id'] ?? 0);
    $limit     = (int)($_GET['limit'] ?? 50);

    if ($limit < 1) $limit = 50;
    if ($limit > 100) $limit = 100;

    if (!$channelId) fail(400, 'channel_id обязателен');
    get_channel_or_fail($db, $channelId, $userId, $isAdmin);

    $rows = fetch_message_rows($db, $channelId, $beforeId, $limit);
    
    $messages = [];
    $hasMore = false;

    if ($rows) {
        $rows = array_reverse($rows);

        $messageIds = array_map(fn($r) => (int)$r['id'], $rows);
        $replyIds   = array_values(array_filter(array_map(fn($r) => (int)$r['reply_to_id'], $rows)));

        $replyMap = fetch_replies($db, $replyIds);
        $reactionsMap = fetch_reactions($db, $messageIds);

        foreach ($rows as $r) {
            $messages[] = format_message($r, $userId, $replyMap, $reactionsMap);
        }

        $oldestId = $messages[0]['id'] ?? 0;
        if ($oldestId) {
            $hc = $db->prepare('SELECT COUNT(*) FROM channel_messages WHERE channel_id = ? AND id < ?');
            $hc->execute([$channelId, $oldestId]);
            $hasMore = ((int)$hc->fetchColumn()) > 0;
        }
    }

    $typingStmt = $db->prepare('
        SELECT u.username 
        FROM user_typing t 
        JOIN users u ON u.id = t.user_id 
        WHERE t.channel_id = ? AND t.updated_at > ? AND t.user_id != ?
    ');
    $typingStmt->execute([$channelId, time() - 5, $userId]);
    $typing = $typingStmt->fetchAll(PDO::FETCH_COLUMN);

    respond([
        'messages' => $messages, 
        'has_more' => $hasMore,
        'typing'   => $typing
    ]);
}

function fetch_message_rows(PDO $db, int $channelId, int $beforeId, int $limit): array {
    $base = '
        SELECT m.id, m.user_id, m.text, m.attachment, m.reply_to_id, m.is_deleted,
               m.edited_at, m.created_at,
               u.username, u.avatar
        FROM channel_messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.channel_id = ?';

    if ($beforeId > 0) {
        $stmt = $db->prepare($base . ' AND m.id < ? ORDER BY m.id DESC LIMIT ?');
        $stmt->execute([$channelId, $beforeId, $limit]);
    } else {
        $stmt = $db->prepare($base . ' ORDER BY m.id DESC LIMIT ?');
        $stmt->execute([$channelId, $limit]);
    }

    return $stmt->fetchAll();
}

function fetch_replies(PDO $db, array $replyIds): array {
    if (empty($replyIds)) return [];
    $ph = implode(',', array_fill(0, count($replyIds), '?'));
    $stmt = $db->prepare("
        SELECT m.id, m.text, m.is_deleted, u.username
        FROM channel_messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.id IN ($ph)
    ");
    $stmt->execute(array_values($replyIds));

    $map = [];
    foreach ($stmt->fetchAll() as $r) {
        $map[(int)$r['id']] = [
            'id'         => (int)$r['id'],
            'username'   => $r['username'],
            'text'       => $r['is_deleted'] ? '' : $r['text'],
            'is_deleted' => (int)$r['is_deleted']
        ];
    }
    return $map;
}

function fetch_reactions(PDO $db, array $messageIds): array {
    if (empty($messageIds)) return [];
    $ph = implode(',', array_fill(0, count($messageIds), '?'));
    $stmt = $db->prepare("
        SELECT r.message_id, r.emoji, r.user_id, u.username
        FROM channel_reactions r
        JOIN users u ON u.id = r.user_id
        WHERE r.message_id IN ($ph)
        ORDER BY r.created_at ASC
    ");
    $stmt->execute($messageIds);

    $map = [];
    foreach ($stmt->fetchAll() as $r) {
        $mid = (int)$r['message_id'];
        $em  = $r['emoji'];
        if (!isset($map[$mid])) $map[$mid] = [];
        if (!isset($map[$mid][$em])) $map[$mid][$em] = ['users' => [], 'count' => 0];
        $map[$mid][$em]['users'][] = ['id' => (int)$r['user_id'], 'username' => $r['username']];
        $map[$mid][$em]['count']++;
    }
    return $map;
}

function format_message(array $row, int $userId, array $replyMap, array $reactionsMap): array {
    $mid = (int)$row['id'];

    $reactions = [];
    if (isset($reactionsMap[$mid])) {
        foreach ($reactionsMap[$mid] as $emoji => $info) {
            $reactions[] = [
                'emoji' => $emoji,
                'count' => $info['count'],
                'users' => $info['users'],
                'mine'  => in_array($userId, array_column($info['users'], 'id'), true)
            ];
        }
    }

    $rid = (int)$row['reply_to_id'];
    $reply = ($rid > 0 && isset($replyMap[$rid])) ? $replyMap[$rid] : null;

    return [
        'id'         => $mid,
        'user_id'    => (int)$row['user_id'],
        'username'   => $row['username'],
        'avatar'     => $row['avatar'],
        'text'       => (int)$row['is_deleted'] === 1 ? '' : $row['text'],
        'attachment' => (int)$row['is_deleted'] === 1 ? null : $row['attachment'],
        'is_deleted' => (int)$row['is_deleted'],
        'edited_at'  => (int)$row['edited_at'],
        'created_at' => (int)$row['created_at'],
        'reply_to'   => $reply,
        'reactions'  => $reactions
    ];
}

function handle_send(PDO $db, array $me, array $in): void {
    $channelId  = (int)($in['channel_id'] ?? 0);
    $text       = trim($in['text'] ?? '');
    $replyTo    = (int)($in['reply_to_id'] ?? 0);
    $attachment = trim($in['attachment'] ?? '');

    if (!$channelId) fail(400, 'channel_id обязателен');
    if ($text === '' && $attachment === '') fail(400, 'Сообщение не может быть пустым');
    if (mb_strlen($text) > 4000) fail(400, 'Сообщение слишком длинное (макс. 4000)');

    get_channel_or_fail($db, $channelId, $me['id'], $me['role'] === 'admin' || $me['role'] === 'commander');

    if ($replyTo > 0) {
        $r = $db->prepare('SELECT channel_id FROM channel_messages WHERE id = ?');
        $r->execute([$replyTo]);
        $row = $r->fetch();
        if (!$row || (int)$row['channel_id'] !== $channelId) $replyTo = 0;
    }

    $now = time();
    $db->prepare('
        INSERT INTO channel_messages (channel_id, user_id, text, attachment, reply_to_id, is_deleted, edited_at, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    ')->execute([$channelId, $me['id'], $text, $attachment ?: null, $replyTo, $now]);

    $newId = (int)$db->lastInsertId();

    $db->prepare('
        INSERT INTO channel_reads (channel_id, user_id, last_read_message_id, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(channel_id, user_id) DO UPDATE SET
            last_read_message_id = CASE
                WHEN excluded.last_read_message_id > channel_reads.last_read_message_id
                THEN excluded.last_read_message_id
                ELSE channel_reads.last_read_message_id
            END,
            updated_at = excluded.updated_at
    ')->execute([$channelId, $me['id'], $newId, $now]);

    $reply = null;
    if ($replyTo > 0) {
        $rq = $db->prepare('
            SELECT m.id, m.text, m.is_deleted, u.username
            FROM channel_messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.id = ?
        ');
        $rq->execute([$replyTo]);
        $rr = $rq->fetch();
        if ($rr) {
            $reply = [
                'id'         => (int)$rr['id'],
                'username'   => $rr['username'],
                'text'       => $rr['is_deleted'] ? '' : $rr['text'],
                'is_deleted' => (int)$rr['is_deleted']
            ];
        }
    }

    $messageData = [
        'id'         => $newId,
        'user_id'    => $me['id'],
        'username'   => $me['username'],
        'avatar'     => $me['avatar'],
        'text'       => $text,
        'attachment' => $attachment ?: null,
        'is_deleted' => 0,
        'edited_at'  => 0,
        'created_at' => $now,
        'reply_to'   => $reply,
        'reactions'  => []
    ];

    $wsPayload = json_encode([
        'channel_id' => $channelId,
        'message'    => $messageData
    ]);

    if (function_exists('fastcgi_finish_request')) {
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'message' => $messageData]);
        fastcgi_finish_request();
    } else {
        ignore_user_abort(true);
        set_time_limit(5);
        ob_start();
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true, 'message' => $messageData]);
        ob_end_flush();
        flush();
    }

    $ch = curl_init('http://127.0.0.1:8082');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['data' => $wsPayload]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_exec($ch);
    curl_close($ch);
    exit;
}

function handle_edit(PDO $db, array $me, array $in): void {
    $msgId = (int)($in['id'] ?? 0);
    $text  = trim($in['text'] ?? '');

    if (!$msgId || $text === '') fail(400, 'id и text обязательны');

    $stmt = $db->prepare('SELECT user_id, is_deleted FROM channel_messages WHERE id = ?');
    $stmt->execute([$msgId]);
    $row = $stmt->fetch();

    if (!$row) fail(404, 'Сообщение не найдено');
    if ((int)$row['is_deleted'] === 1) fail(400, 'Сообщение удалено');
    if ((int)$row['user_id'] !== $me['id']) fail(403, 'Можно редактировать только свои сообщения');

    $db->prepare('UPDATE channel_messages SET text = ?, edited_at = ? WHERE id = ?')
       ->execute([$text, time(), $msgId]);

    ok();
}

function handle_delete(PDO $db, array $me, bool $isAdmin, array $in): void {
    $msgId = (int)($in['id'] ?? 0);
    if (!$msgId) fail(400, 'id обязателен');

    $stmt = $db->prepare('SELECT user_id, channel_id, is_deleted FROM channel_messages WHERE id = ?');
    $stmt->execute([$msgId]);
    $row = $stmt->fetch();
    if (!$row) fail(404, 'Сообщение не найдено');

    if ((int)$row['is_deleted'] === 1) ok();

    $isOwner = ((int)$row['user_id'] === $me['id']);
    $channelRole = get_channel_role($db, (int)$row['channel_id'], $me['id']);
    $canModerate = $isAdmin || in_array($channelRole, ['admin', 'moderator'], true);

    if (!$isOwner && !$canModerate) fail(403, 'Нет прав на удаление');

    $db->beginTransaction();
    try {
        $db->prepare('UPDATE channel_messages SET is_deleted = 1, text = \'\', attachment = NULL WHERE id = ?')->execute([$msgId]);
        $db->prepare('DELETE FROM channel_reactions WHERE message_id = ?')->execute([$msgId]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка удаления');
    }

    ok();
}

function handle_reaction(PDO $db, array $me, string $action, array $in): void {
    $msgId = (int)($in['id'] ?? 0);
    $emoji = trim($in['emoji'] ?? '');

    if (!$msgId || $emoji === '') fail(400, 'id и emoji обязательны');
    if (mb_strlen($emoji) > 8) fail(400, 'Некорректный emoji');

    $stmt = $db->prepare('SELECT channel_id, is_deleted FROM channel_messages WHERE id = ?');
    $stmt->execute([$msgId]);
    $row = $stmt->fetch();
    if (!$row) fail(404, 'Сообщение не найдено');
    if ((int)$row['is_deleted'] === 1) fail(400, 'Сообщение удалено');

    get_channel_or_fail($db, (int)$row['channel_id'], $me['id'], $me['role'] === 'admin' || $me['role'] === 'commander');

    if ($action === 'react') {
        $db->prepare('
            INSERT OR IGNORE INTO channel_reactions (message_id, user_id, emoji, created_at)
            VALUES (?, ?, ?, ?)
        ')->execute([$msgId, $me['id'], $emoji, time()]);
    } else {
        $db->prepare('DELETE FROM channel_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
           ->execute([$msgId, $me['id'], $emoji]);
    }

    $rq = $db->prepare('
        SELECT r.emoji, r.user_id, u.username
        FROM channel_reactions r
        JOIN users u ON u.id = r.user_id
        WHERE r.message_id = ?
        ORDER BY r.created_at ASC
    ');
    $rq->execute([$msgId]);

    $grouped = [];
    foreach ($rq->fetchAll() as $r) {
        $em = $r['emoji'];
        if (!isset($grouped[$em])) $grouped[$em] = ['users' => [], 'count' => 0];
        $grouped[$em]['users'][] = ['id' => (int)$r['user_id'], 'username' => $r['username']];
        $grouped[$em]['count']++;
    }

    $out = [];
    foreach ($grouped as $em => $info) {
        $out[] = [
            'emoji' => $em,
            'count' => $info['count'],
            'users' => $info['users'],
            'mine'  => in_array($me['id'], array_column($info['users'], 'id'), true)
        ];
    }

    ok(['reactions' => $out]);
}
