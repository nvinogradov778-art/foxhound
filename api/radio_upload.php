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

$file = $_FILES['file'];

if ($file['size'] > 30 * 1024 * 1024) {
    fail(400, 'Файл больше 30 МБ');
}

$destDir = __DIR__ . '/../radio/' . $folder;

// upload_audio сам проверит ext и MIME
$filename = upload_audio($file, $destDir, 'track');

respond([
    'success' => true,
    'path'    => 'radio/' . $folder . '/' . $filename,
    'name'    => $filename,
    'size'    => filesize($destDir . '/' . $filename)
]);