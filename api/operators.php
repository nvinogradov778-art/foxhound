<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, name, role, specialization, description, photo, sort_order
        FROM operators
        ORDER BY sort_order ASC, id ASC
    ')->fetchAll();

    foreach ($rows as &$op) {
        $op['id'] = (int)$op['id'];
        $op['sort_order'] = (int)$op['sort_order'];
    }
    unset($op);

    respond(['operators' => $rows]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

match ($action) {
    'save'   => handle_save($db),
    'delete' => handle_delete($db),
    default  => fail(400, 'Неизвестное действие'),
};

function handle_save(PDO $db): void {
    $id             = isset($_POST['id']) && $_POST['id'] !== '' ? (int)$_POST['id'] : null;
    $name           = trim($_POST['name'] ?? '');
    $role           = trim($_POST['role'] ?? '');
    $specialization = trim($_POST['specialization'] ?? '');
    $description    = trim($_POST['description'] ?? '');

    if ($name === '') fail(400, 'Имя обязательно');

    $newPhoto = null;
    if (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $filename = upload_image($_FILES['photo'], __DIR__ . '/../operators', 'operator');
        $newPhoto = 'operators/' . $filename;
    }

    $now = time();

    if ($id) {
        $stmt = $db->prepare('SELECT photo FROM operators WHERE id = ?');
        $stmt->execute([$id]);
        $oldPhoto = $stmt->fetchColumn();
        if ($oldPhoto === false) fail(404, 'Оперативник не найден');

        $photoPath = $newPhoto;
        if ($newPhoto && $oldPhoto) {
            $oldFile = __DIR__ . '/../' . $oldPhoto;
            if (is_file($oldFile)) @unlink($oldFile);
        } elseif (!$newPhoto) {
            $photoPath = $oldPhoto;
        }

        $db->prepare('
            UPDATE operators
            SET name = ?, role = ?, specialization = ?, description = ?, photo = ?, updated_at = ?
            WHERE id = ?
        ')->execute([$name, $role, $specialization, $description, $photoPath, $now, $id]);

        ok(['id' => $id]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM operators')->fetchColumn();

    $db->prepare('
        INSERT INTO operators (name, role, specialization, description, photo, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([$name, $role, $specialization, $description, $newPhoto, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('SELECT photo FROM operators WHERE id = ?');
    $stmt->execute([$id]);
    $photo = $stmt->fetchColumn();

    if ($photo === false) fail(404, 'Оперативник не найден');

    if ($photo) {
        $path = __DIR__ . '/../' . $photo;
        if (is_file($path)) @unlink($path);
    }

    $db->prepare('DELETE FROM operators WHERE id = ?')->execute([$id]);
    ok();
}