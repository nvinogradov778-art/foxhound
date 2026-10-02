<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function expand_polygon(array $row): array {
    return [
        'id'         => (int)$row['id'],
        'slug'       => $row['slug'],
        'name'       => $row['name'],
        'center'     => [(float)$row['center_lat'], (float)$row['center_lng']],
        'zoom'       => (int)$row['zoom'],
        'layers'     => json_decode($row['layers_json'], true) ?: [],
        'sort_order' => (int)$row['sort_order'],
    ];
}

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, slug, name, center_lat, center_lng, zoom, layers_json, sort_order
        FROM map_polygons
        ORDER BY sort_order ASC, id ASC
    ')->fetchAll();

    respond(['polygons' => array_map('expand_polygon', $rows)]);
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
    $id     = (int)($input['id'] ?? 0);
    $slug   = trim($input['slug'] ?? '');
    $name   = trim($input['name'] ?? '');
    $center = $input['center'] ?? [0, 0];
    $zoom   = (int)($input['zoom'] ?? 14);
    $layers = $input['layers'] ?? [];

    if ($name === '') fail(400, 'Название обязательно');
    if (!is_array($center) || count($center) < 2) fail(400, 'Некорректный center');

    $slug = $slug !== '' ? make_slug($slug) : make_slug($name);
    $slug = unique_slug($db, 'map_polygons', $slug, $id);

    $layersJson = json_encode($layers, JSON_UNESCAPED_UNICODE);
    $now = time();

    if ($id) {
        $db->prepare('
            UPDATE map_polygons
            SET slug = ?, name = ?, center_lat = ?, center_lng = ?, zoom = ?,
                layers_json = ?, updated_at = ?
            WHERE id = ?
        ')->execute([$slug, $name, (float)$center[0], (float)$center[1], $zoom, $layersJson, $now, $id]);

        ok(['id' => $id]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM map_polygons')->fetchColumn();

    $db->prepare('
        INSERT INTO map_polygons
            (slug, name, center_lat, center_lng, zoom, layers_json, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([$slug, $name, (float)$center[0], (float)$center[1], $zoom, $layersJson, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, array $input): void {
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('DELETE FROM map_polygons WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) fail(404, 'Полигон не найден');

    ok();
}