<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_admin($db);

$base = __DIR__ . '/../geojson';
if (!is_dir($base)) {
    respond(['folders' => []]);
}

$result = [];

foreach (scandir($base) as $folder) {
    if ($folder === '.' || $folder === '..') continue;

    $folderPath = $base . '/' . $folder;
    if (!is_dir($folderPath)) continue;

    $files = [];
    foreach (scandir($folderPath) as $f) {
        if ($f === '.' || $f === '..') continue;

        $path = $folderPath . '/' . $f;
        if (!is_file($path)) continue;
        if (strtolower(pathinfo($f, PATHINFO_EXTENSION)) !== 'geojson') continue;

        $files[] = [
            'name' => $f,
            'path' => 'geojson/' . $folder . '/' . $f
        ];
    }

    if ($files) {
        $result[] = ['folder' => $folder, 'files' => $files];
    }
}

respond(['folders' => $result]);