<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_admin($db);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Только POST');
}

$folder = preg_replace('/[^a-zA-Z0-9_\-]/', '', trim($_POST['folder'] ?? '')) ?? '';
if ($folder === '') fail(400, 'folder обязателен');

if (empty($_FILES['file'])) fail(400, 'Ошибка загрузки файла');

$destDir = __DIR__ . '/../geojson/' . $folder;
$filename = upload_geojson($_FILES['file'], $destDir, 'layer');

respond([
    'success' => true,
    'path'    => 'geojson/' . $folder . '/' . $filename,
    'name'    => $filename
]);