<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    $stmt = $db->query('
        SELECT id, title, description, link, doc_date, doc_number, sort_order
        FROM docs
        ORDER BY sort_order ASC, id ASC
    ');

    $documents = $stmt->fetchAll();
    foreach ($documents as &$d) {
        $d['id'] = (int)$d['id'];
        $d['sort_order'] = (int)$d['sort_order'];
    }
    unset($d);

    respond(['documents' => $documents]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();

match ($action) {
    'add'    => handle_add($db, $input),
    'update' => handle_update($db, $input),
    'delete' => handle_delete($db, $input),
    default  => fail(400, 'Неизвестное действие'),
};

function validate_link(string $link): void {
    if ($link === '') fail(400, 'Ссылка обязательна');
    if (!preg_match('#^https?://#i', $link)) {
        fail(400, 'Ссылка должна начинаться с http:// или https://');
    }
}

function handle_add(PDO $db, array $input): void {
    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $link        = trim($input['link'] ?? '');
    $docDate     = trim($input['doc_date'] ?? '');
    $docNumber   = trim($input['doc_number'] ?? '');

    if ($title === '') fail(400, 'Название обязательно');
    validate_link($link);

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM docs')->fetchColumn();
    $now = time();

    $db->prepare('
        INSERT INTO docs (title, description, link, doc_date, doc_number, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([$title, $description, $link, $docDate, $docNumber, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_update(PDO $db, array $input): void {
    $id          = (int)($input['id'] ?? 0);
    $title       = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $link        = trim($input['link'] ?? '');
    $docDate     = trim($input['doc_date'] ?? '');
    $docNumber   = trim($input['doc_number'] ?? '');

    if (!$id) fail(400, 'ID обязателен');
    if ($title === '') fail(400, 'Название обязательно');
    validate_link($link);

    $db->prepare('
        UPDATE docs
        SET title = ?, description = ?, link = ?, doc_date = ?, doc_number = ?, updated_at = ?
        WHERE id = ?
    ')->execute([$title, $description, $link, $docDate, $docNumber, time(), $id]);

    ok();
}

function handle_delete(PDO $db, array $input): void {
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('DELETE FROM docs WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) fail(404, 'Регламент не найден');

    ok();
}