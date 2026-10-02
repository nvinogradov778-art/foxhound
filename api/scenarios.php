<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function expand_scenario(array $row): array {
    return [
        'id'          => (int)$row['id'],
        'slug'        => $row['slug'],
        'title'       => $row['title'],
        'description' => $row['description'],
        'video_link'  => $row['video_link'],
        'phases'      => json_decode($row['phases_json'],    true) ?: [],
        'inventory'   => json_decode($row['inventory_json'], true) ?: [],
        'files'       => json_decode($row['files_json'],     true) ?: [],
        'sort_order'  => (int)$row['sort_order'],
    ];
}

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, slug, title, description, video_link,
               phases_json, inventory_json, files_json,
               sort_order
        FROM scenarios
        ORDER BY sort_order ASC, id ASC
    ')->fetchAll();

    $scenarios = array_map('expand_scenario', $rows);

    if ($action === 'export') {
        $export = [];
        foreach ($scenarios as $s) {
            $export[] = [
                'id'          => $s['slug'],
                'title'       => $s['title'],
                'description' => $s['description'],
                'video_link'  => $s['video_link'],
                'phases'      => $s['phases'],
                'inventory'   => $s['inventory'],
                'files'       => $s['files'],
            ];
        }
        respond(['scenarios' => $export]);
    }

    respond(['scenarios' => $scenarios]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();

match ($action) {
    'save'   => handle_save($db, $input),
    'delete' => handle_delete($db, $input),
    'import' => handle_import($db, $input),
    default  => fail(400, 'Неизвестное действие'),
};

function handle_save(PDO $db, array $input): void {
    $id          = (int)($input['id'] ?? 0);
    $slug        = trim($input['slug'] ?? '');
    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $videoLink   = trim($input['video_link'] ?? '');
    $phases      = $input['phases']    ?? [];
    $inventory   = $input['inventory'] ?? [];
    $files       = $input['files']     ?? [];

    if ($title === '') fail(400, 'Название обязательно');

    $slug = $slug !== '' ? make_slug($slug) : make_slug($title);
    $slug = unique_slug($db, 'scenarios', $slug, $id);

    $phasesJson    = json_encode($phases,    JSON_UNESCAPED_UNICODE);
    $inventoryJson = json_encode($inventory, JSON_UNESCAPED_UNICODE);
    $filesJson     = json_encode($files,     JSON_UNESCAPED_UNICODE);

    $now = time();

    if ($id) {
        $db->prepare('
            UPDATE scenarios
            SET slug = ?, title = ?, description = ?, video_link = ?,
                phases_json = ?, inventory_json = ?, files_json = ?, updated_at = ?
            WHERE id = ?
        ')->execute([
            $slug, $title, $description, $videoLink,
            $phasesJson, $inventoryJson, $filesJson, $now, $id
        ]);

        ok(['id' => $id]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM scenarios')->fetchColumn();

    $db->prepare('
        INSERT INTO scenarios
            (slug, title, description, video_link,
             phases_json, inventory_json, files_json,
             sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $slug, $title, $description, $videoLink,
        $phasesJson, $inventoryJson, $filesJson,
        $maxOrder + 1, $now, $now
    ]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, array $input): void {
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('DELETE FROM scenarios WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) fail(404, 'Сценарий не найден');

    ok();
}

function handle_import(PDO $db, array $input): void {
    if (!isset($input['scenarios']) || !is_array($input['scenarios'])) {
        fail(400, 'Ожидался объект {"scenarios": [...]}');
    }

    $now = time();
    $db->beginTransaction();

    try {
        $db->exec('DELETE FROM scenarios');

        $insert = $db->prepare('
            INSERT INTO scenarios
                (slug, title, description, video_link,
                 phases_json, inventory_json, files_json,
                 sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');

        $order = 0;
        foreach ($input['scenarios'] as $s) {
            $slug  = trim($s['id'] ?? '');
            $title = trim($s['title'] ?? '');
            if ($slug === '' || $title === '') continue;

            $insert->execute([
                $slug,
                $title,
                trim($s['description'] ?? ''),
                trim($s['video_link'] ?? ''),
                json_encode($s['phases']    ?? [], JSON_UNESCAPED_UNICODE),
                json_encode($s['inventory'] ?? [], JSON_UNESCAPED_UNICODE),
                json_encode($s['files']     ?? [], JSON_UNESCAPED_UNICODE),
                $order++,
                $now,
                $now
            ]);
        }

        $db->commit();
        ok();
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка импорта: ' . $e->getMessage());
    }
}