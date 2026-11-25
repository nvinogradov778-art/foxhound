<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_me($db);
$isAdmin = in_array($me['role'], ['admin', 'commander'], true);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ---------- GET ----------

if ($method === 'GET') {
    init_reads($db, $me['id']);
    $channels = fetch_channels($db, $me['id'], $isAdmin);
    respond(['channels' => $channels]);
}

// ---------- POST ----------

if ($method !== 'POST') {
    fail(405, 'Метод не разрешён');
}

match ($action) {
    'create'    => handle_create($db, $isAdmin),
    'delete'    => handle_delete($db, $isAdmin),
    'mark_read' => handle_mark_read($db, $me['id']),
    default     => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function init_reads(PDO $db, int $userId): void {
    $db->prepare('
        INSERT INTO channel_reads (channel_id, user_id, last_read_message_id, updated_at)
        SELECT c.id, ?, COALESCE((SELECT MAX(id) FROM channel_messages WHERE channel_id = c.id), 0), ?
        FROM channels c
        WHERE NOT EXISTS (
            SELECT 1 FROM channel_reads r
            WHERE r.channel_id = c.id AND r.user_id = ?
        )
    ')->execute([$userId, time(), $userId]);
}

function fetch_channels(PDO $db, int $userId, bool $isAdmin): array {
    if ($isAdmin) {
        $stmt = $db->prepare('
            SELECT c.id, c.slug, c.name, c.category, c.description,
                   c.sort_order, c.is_private,
                   COALESCE(r.last_read_message_id, 0) AS last_read,
                   (SELECT COUNT(*) FROM channel_messages m 
                    WHERE m.channel_id = c.id 
                      AND m.id > COALESCE(r.last_read_message_id, 0) 
                      AND m.is_deleted = 0) AS unread
            FROM channels c
            LEFT JOIN channel_reads r ON r.channel_id = c.id AND r.user_id = ?
            ORDER BY c.sort_order ASC, c.id ASC
        ');
        $stmt->execute([$userId]);
    } else {
        $stmt = $db->prepare('
            SELECT c.id, c.slug, c.name, c.category, c.description,
                   c.sort_order, c.is_private,
                   COALESCE(r.last_read_message_id, 0) AS last_read,
                   (SELECT COUNT(*) FROM channel_messages m 
                    WHERE m.channel_id = c.id 
                      AND m.id > COALESCE(r.last_read_message_id, 0) 
                      AND m.is_deleted = 0) AS unread
            FROM channels c
            LEFT JOIN channel_reads r ON r.channel_id = c.id AND r.user_id = ?
            WHERE c.is_private = 0
               OR EXISTS (
                    SELECT 1 FROM channel_roles cr
                    WHERE cr.channel_id = c.id AND cr.user_id = ?
               )
            ORDER BY c.sort_order ASC, c.id ASC
        ');
        $stmt->execute([$userId, $userId]);
    }

    $rows = $stmt->fetchAll();
    $channels = [];

    foreach ($rows as $r) {
        $channels[] = [
            'id'          => (int)$r['id'],
            'slug'        => $r['slug'],
            'name'        => $r['name'],
            'category'    => $r['category'],
            'description' => $r['description'],
            'sort_order'  => (int)$r['sort_order'],
            'is_private'  => (int)$r['is_private'],
            'unread'      => (int)$r['unread']
        ];
    }

    return $channels;
}

function handle_create(PDO $db, bool $isAdmin): void {
    if (!$isAdmin) fail(403, 'Доступ запрещён');

    $in = read_json();
    $name     = trim($in['name'] ?? '');
    $category = trim($in['category'] ?? 'Разное');
    $desc     = trim($in['description'] ?? '');
    $private  = !empty($in['is_private']) ? 1 : 0;

    if ($name === '') fail(400, 'Имя канала обязательно');

    $slug = make_slug($name, 'channel');
    $slug = unique_slug($db, 'channels', $slug);

    $max = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM channels')->fetchColumn();

    $db->prepare('
        INSERT INTO channels (slug, name, category, description, sort_order, is_private, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ')->execute([$slug, $name, $category, $desc, $max + 1, $private, time()]);

    ok(['id' => (int)$db->lastInsertId(), 'slug' => $slug]);
}

function handle_delete(PDO $db, bool $isAdmin): void {
    if (!$isAdmin) fail(403, 'Доступ запрещён');

    $in = read_json();
    $id = (int)($in['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM channel_reactions WHERE message_id IN (SELECT id FROM channel_messages WHERE channel_id = ?)')->execute([$id]);
        $db->prepare('DELETE FROM channel_messages WHERE channel_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM channel_reads WHERE channel_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM channel_roles WHERE channel_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM channels WHERE id = ?')->execute([$id]);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка удаления');
    }

    ok();
}

function handle_mark_read(PDO $db, int $userId): void {
    $in = read_json();
    $channelId = (int)($in['channel_id'] ?? 0);
    $lastId    = (int)($in['last_read_message_id'] ?? 0);

    if (!$channelId) fail(400, 'channel_id обязателен');

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
    ')->execute([$channelId, $userId, $lastId, time()]);

    ok();
}
