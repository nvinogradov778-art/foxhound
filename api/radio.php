<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function expand_station(array $row): array {
    return [
        'id'         => (int)$row['id'],
        'slug'       => $row['slug'],
        'name'       => $row['name'],
        'folder'     => $row['folder'] ?? '',
        'frequency'  => $row['frequency'],
        'purpose'    => $row['purpose'],
        'desc'       => $row['description'],
        'tracks'     => json_decode($row['tracks_json'], true) ?: [],
        'sort_order' => (int)$row['sort_order'],
    ];
}

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, slug, name, folder, frequency, purpose, description, tracks_json, sort_order
        FROM radio_stations
        ORDER BY sort_order ASC, id ASC
    ')->fetchAll();

    respond(['stations' => array_map('expand_station', $rows)]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();

match ($action) {
    'save'   => handle_save($db, $input),
    'delete' => handle_delete($db, $input),
    default  => fail(400, 'Неизвестное действие'),
};

function handle_save(PDO $db, array $input): void {
    $id        = (int)($input['id'] ?? 0);
    $slug      = trim($input['slug'] ?? '');
    $name      = trim($input['name'] ?? '');
    $folder    = preg_replace('/[^a-zA-Z0-9_\-]/', '', trim($input['folder'] ?? '')) ?? '';
    $frequency = trim($input['frequency'] ?? '');
    $purpose   = trim($input['purpose'] ?? '');
    $desc      = trim($input['desc'] ?? '');
    $tracks    = $input['tracks'] ?? [];

    if ($name === '') fail(400, 'Название обязательно');

    $slug = $slug !== '' ? make_slug($slug) : make_slug($name);
    $slug = unique_slug($db, 'radio_stations', $slug, $id);

    $tracksJson = json_encode($tracks, JSON_UNESCAPED_UNICODE);
    $now = time();

    if ($id) {
        $db->prepare('
            UPDATE radio_stations
            SET slug = ?, name = ?, folder = ?, frequency = ?, purpose = ?, description = ?,
                tracks_json = ?, updated_at = ?
            WHERE id = ?
        ')->execute([$slug, $name, $folder, $frequency, $purpose, $desc, $tracksJson, $now, $id]);

        ok(['id' => $id]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM radio_stations')->fetchColumn();

    $db->prepare('
        INSERT INTO radio_stations
            (slug, name, folder, frequency, purpose, description, tracks_json, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([$slug, $name, $folder, $frequency, $purpose, $desc, $tracksJson, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, array $input): void {
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('DELETE FROM radio_stations WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) fail(404, 'Станция не найдена');

    ok();
}