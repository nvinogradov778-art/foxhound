<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handle_get($db, $me);
}

if ($method !== 'POST' && $method !== 'DELETE') {
    fail(405, 'Метод не разрешён');
}

$input = read_json();

if ($method === 'DELETE') {
    handle_delete($db, $me, $input);
}

$action = $input['action'] ?? '';

match ($action) {
    'vote'   => handle_vote($db, $me, $input),
    'create' => handle_create($db, $input),
    default  => fail(400, 'Неизвестное действие'),
};

function handle_get(PDO $db, int $me): void {
    $archived = (int)($_GET['archived'] ?? 0);
    $now = time();

    $sql = 'SELECT * FROM polls WHERE expires_at ' . ($archived ? '<=' : '>') . ' ? ORDER BY created_at DESC';
    $stmt = $db->prepare($sql);
    $stmt->execute([$now]);
    $polls = $stmt->fetchAll();

    if (!$polls) {
        ok(['polls' => []]);
    }

    $pollIds = array_map(fn($p) => (int)$p['id'], $polls);
    $placeholders = implode(',', array_fill(0, count($pollIds), '?'));

    $votesStmt = $db->prepare("
        SELECT poll_id, option_index, COUNT(*) AS cnt
        FROM votes
        WHERE poll_id IN ($placeholders)
        GROUP BY poll_id, option_index
    ");
    $votesStmt->execute($pollIds);

    $votesMap = [];
    foreach ($votesStmt->fetchAll() as $r) {
        $pid = (int)$r['poll_id'];
        $idx = (int)$r['option_index'];
        if (!isset($votesMap[$pid])) $votesMap[$pid] = [];
        $votesMap[$pid][$idx] = (int)$r['cnt'];
    }

    $myVotesStmt = $db->prepare("
        SELECT poll_id, option_index
        FROM votes
        WHERE poll_id IN ($placeholders) AND user_id = ?
    ");
    $myVotesStmt->execute(array_merge($pollIds, [$me]));

    $myVotesMap = [];
    foreach ($myVotesStmt->fetchAll() as $r) {
        $pid = (int)$r['poll_id'];
        if (!isset($myVotesMap[$pid])) $myVotesMap[$pid] = [];
        $myVotesMap[$pid][] = (int)$r['option_index'];
    }

    foreach ($polls as &$poll) {
        $pid = (int)$poll['id'];
        $poll['id'] = $pid;
        $poll['options'] = json_decode($poll['options'], true) ?: [];
        $poll['expires_at'] = (int)$poll['expires_at'];
        $poll['created_at'] = (int)$poll['created_at'];
        $poll['created_by'] = (int)($poll['created_by'] ?? 0);

        $counts = [];
        foreach ($poll['options'] as $idx => $_) {
            $counts[] = $votesMap[$pid][$idx] ?? 0;
        }
        $poll['vote_counts'] = $counts;
        $poll['total_votes'] = array_sum($counts);
        $poll['my_votes'] = $myVotesMap[$pid] ?? [];
    }
    unset($poll);

    ok(['polls' => $polls]);
}

function handle_vote(PDO $db, int $me, array $input): void {
    $pollId = (int)($input['poll_id'] ?? 0);
    $indexes = $input['option_indexes'] ?? [];

    if (!$pollId || !is_array($indexes) || !count($indexes)) {
        fail(400, 'Неверные данные голосования');
    }

    $stmt = $db->prepare('SELECT expires_at, options FROM polls WHERE id = ?');
    $stmt->execute([$pollId]);
    $poll = $stmt->fetch();

    if (!$poll || (int)$poll['expires_at'] <= time()) {
        fail(400, 'Опрос завершён');
    }

    $options = json_decode($poll['options'], true) ?: [];
    $maxIdx = count($options) - 1;
    foreach ($indexes as $idx) {
        if (!is_numeric($idx) || (int)$idx < 0 || (int)$idx > $maxIdx) {
            fail(400, 'Неверный индекс варианта');
        }
    }

    $db->beginTransaction();
    try {
        $db->prepare('DELETE FROM votes WHERE poll_id = ? AND user_id = ?')->execute([$pollId, $me]);
        $insert = $db->prepare('INSERT INTO votes (poll_id, user_id, option_index) VALUES (?, ?, ?)');
        foreach ($indexes as $idx) {
            $insert->execute([$pollId, $me, (int)$idx]);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка голосования');
    }

    ok();
}

function handle_create(PDO $db, array $input): void {
    $admin = require_admin($db);
    $me = $admin['id'];

    $title     = trim($input['title'] ?? '');
    $type      = trim($input['type'] ?? 'single');
    $options   = $input['options'] ?? [];
    $expiresAt = (int)($input['expires_at'] ?? 0);

    if ($title === '' || !is_array($options) || count($options) < 2 || $expiresAt <= time()) {
        fail(400, 'Заполните все поля (минимум 2 варианта, дата в будущем)');
    }

    if (!in_array($type, ['single', 'multiple'], true)) {
        $type = 'single';
    }

    $now = time();
    $db->prepare('
        INSERT INTO polls (title, type, options, created_by, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ')->execute([$title, $type, json_encode($options, JSON_UNESCAPED_UNICODE), $me, $now, $expiresAt]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, int $me, array $input): void {
    require_admin($db);

    $pollId = (int)($input['poll_id'] ?? 0);
    if (!$pollId) fail(400, 'ID опроса не указан');

    $stmt = $db->prepare('DELETE FROM polls WHERE id = ?');
    $stmt->execute([$pollId]);

    ok();
}