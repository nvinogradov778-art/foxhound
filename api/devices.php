<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function expand_device(array $row): array {
    return [
        'id'             => (int)$row['id'],
        'slug'           => $row['slug'],
        'name'           => $row['name'],
        'description'    => $row['description'],
        'photo'          => $row['photo'],
        'video_link'     => $row['video_link'],
        'schematic_link' => $row['schematic_link'],
        'docs_link'      => $row['docs_link'],
        'files'          => json_decode($row['files_json'], true) ?: [],
        'sort_order'     => (int)$row['sort_order'],
    ];
}

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, slug, name, description, photo, video_link,
               schematic_link, docs_link, files_json, sort_order
        FROM devices
        ORDER BY sort_order ASC, id ASC
    ')->fetchAll();

    $devices = array_map('expand_device', $rows);

    if ($action === 'export') {
        $export = [];
        foreach ($devices as $d) {
            $export[] = [
                'id'             => $d['slug'],
                'name'           => $d['name'],
                'description'    => $d['description'],
                'photo'          => $d['photo'],
                'video_link'     => $d['video_link'],
                'schematic_link' => $d['schematic_link'],
                'docs_link'      => $d['docs_link'],
                'files'          => $d['files'],
            ];
        }
        respond(['devices' => $export]);
    }

    respond(['devices' => $devices]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

match ($action) {
    'save'   => handle_save($db),
    'delete' => handle_delete($db),
    default  => fail(400, 'Неизвестное действие'),
};

function parse_save_input(): array {
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;

    if ($isMultipart) {
        return [
            'id'             => !empty($_POST['id']) ? (int)$_POST['id'] : 0,
            'slug'           => trim($_POST['slug'] ?? ''),
            'name'           => trim($_POST['name'] ?? ''),
            'description'    => trim($_POST['description'] ?? ''),
            'video_link'     => trim($_POST['video_link'] ?? ''),
            'schematic_link' => trim($_POST['schematic_link'] ?? ''),
            'docs_link'      => trim($_POST['docs_link'] ?? ''),
            'files'          => json_decode($_POST['files'] ?? '[]', true) ?: [],
        ];
    }

    $in = read_json();
    return [
        'id'             => (int)($in['id'] ?? 0),
        'slug'           => trim($in['slug'] ?? ''),
        'name'           => trim($in['name'] ?? ''),
        'description'    => trim($in['description'] ?? ''),
        'video_link'     => trim($in['video_link'] ?? ''),
        'schematic_link' => trim($in['schematic_link'] ?? ''),
        'docs_link'      => trim($in['docs_link'] ?? ''),
        'files'          => $in['files'] ?? [],
    ];
}

function handle_save(PDO $db): void {
    $data = parse_save_input();

    if ($data['name'] === '') fail(400, 'Название обязательно');

    $slug = $data['slug'] !== '' ? make_slug($data['slug']) : make_slug($data['name']);
    $slug = unique_slug($db, 'devices', $slug, $data['id']);

    $newPhoto = null;
    if (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $filename = upload_image($_FILES['photo'], __DIR__ . '/../devices', 'device');
        $newPhoto = 'devices/' . $filename;
    }

    $filesJson = json_encode($data['files'], JSON_UNESCAPED_UNICODE);
    $now = time();

    if ($data['id']) {
        $stmt = $db->prepare('SELECT photo FROM devices WHERE id = ?');
        $stmt->execute([$data['id']]);
        $oldPhoto = $stmt->fetchColumn();
        if ($oldPhoto === false) fail(404, 'Устройство не найдено');

        $photo = $newPhoto;
        if ($newPhoto && $oldPhoto) {
            $oldFile = __DIR__ . '/../' . $oldPhoto;
            if (is_file($oldFile)) @unlink($oldFile);
        } elseif (!$newPhoto) {
            $photo = $oldPhoto;
        }

        $db->prepare('
            UPDATE devices
            SET slug = ?, name = ?, description = ?, photo = ?,
                video_link = ?, schematic_link = ?, docs_link = ?,
                files_json = ?, updated_at = ?
            WHERE id = ?
        ')->execute([
            $slug, $data['name'], $data['description'], $photo,
            $data['video_link'], $data['schematic_link'], $data['docs_link'],
            $filesJson, $now, $data['id']
        ]);

        ok(['id' => $data['id']]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM devices')->fetchColumn();

    $db->prepare('
        INSERT INTO devices
            (slug, name, description, photo, video_link, schematic_link, docs_link,
             files_json, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $slug, $data['name'], $data['description'], $newPhoto,
        $data['video_link'], $data['schematic_link'], $data['docs_link'],
        $filesJson, $maxOrder + 1, $now, $now
    ]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('SELECT photo FROM devices WHERE id = ?');
    $stmt->execute([$id]);
    $photo = $stmt->fetchColumn();

    if ($photo === false) fail(404, 'Не найдено');

    if ($photo) {
        $path = __DIR__ . '/../' . $photo;
        if (is_file($path)) @unlink($path);
    }

    $db->prepare('DELETE FROM devices WHERE id = ?')->execute([$id]);
    ok();
}