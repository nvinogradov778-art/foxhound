<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_admin($db);

$folder = preg_replace('/[^a-zA-Z0-9_\-]/', '', trim($_GET['folder'] ?? '')) ?? '';
if ($folder === '') fail(400, 'folder обязателен');

$dir = __DIR__ . '/../radio/' . $folder;
if (!is_dir($dir)) {
    respond(['files' => [], 'folder' => $folder]);
}

$allowedExt = ['mp3', 'ogg', 'm4a', 'wav', 'webm'];
$files = [];

foreach (scandir($dir) as $f) {
    if ($f === '.' || $f === '..') continue;
    $path = $dir . '/' . $f;
    if (!is_file($path)) continue;

    $ext = strtolower(pathinfo($f, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) continue;

    $files[] = [
        'name' => $f,
        'path' => 'radio/' . $folder . '/' . $f,
        'size' => filesize($path)
    ];
}

usort($files, fn($a, $b) => strnatcmp($a['name'], $b['name']));

respond(['files' => $files, 'folder' => $folder]);