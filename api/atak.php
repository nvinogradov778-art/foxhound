<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $row = $db->query('SELECT sections_json FROM atak_sections ORDER BY id LIMIT 1')->fetch();
    $sections = $row ? json_decode($row['sections_json'], true) : [];
    respond(['sections' => $sections ?: []]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();

if (!isset($input['sections']) || !is_array($input['sections'])) {
    fail(400, 'Ожидался {"sections": [...]}');
}

$json = json_encode($input['sections'], JSON_UNESCAPED_UNICODE);

$db->exec('DELETE FROM atak_sections');
$db->prepare('INSERT INTO atak_sections (sections_json, updated_at) VALUES (?, ?)')
   ->execute([$json, time()]);

ok();