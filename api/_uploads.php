<?php
declare(strict_types=1);

function upload_file(
    array $file,
    string $destDir,
    array $allowedExt,
    array $allowedMimes,
    string $prefix
): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        fail(400, 'Ошибка загрузки файла');
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        fail(400, 'Недопустимый формат');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : false;
    if ($finfo) {
        finfo_close($finfo);
    }
    
    // Разрешаем octet-stream, если расширение в белом списке (для старых браузеров)
    $isOctet = ($mime === 'application/octet-stream');
    
    if (!is_string($mime) || (!in_array($mime, $allowedMimes, true) && !$isOctet)) {
        fail(400, 'MIME не совпадает');
    }

    $destDir = rtrim($destDir, '/');
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
        fail(500, 'Не удалось создать папку');
    }

    $filename = $prefix . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = $destDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        fail(500, 'Не удалось сохранить файл');
    }
    @chmod($dest, 0644);

    return $filename;
}

function upload_image(array $file, string $destDir, string $prefix = 'img'): string {
    return upload_file(
        $file,
        $destDir,
        ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        $prefix
    );
}

function upload_audio(array $file, string $destDir, string $prefix = 'track'): string {
    return upload_file(
        $file,
        $destDir,
        ['mp3', 'ogg', 'm4a', 'wav', 'webm'],
        ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'application/ogg'],
        $prefix
    );
}

function upload_geojson(array $file, string $destDir, string $prefix = 'layer'): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        fail(400, 'Ошибка загрузки файла');
    }
    if ($file['size'] > 20 * 1024 * 1024) {
        fail(400, 'Файл больше 20 МБ');
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['geojson', 'json'], true)) {
        fail(400, 'Разрешены только .geojson или .json');
    }

    $content = file_get_contents($file['tmp_name']);
    $parsed = json_decode((string)$content, true);
    if (!is_array($parsed) || !isset($parsed['type'])) {
        fail(400, 'Файл не является валидным GeoJSON');
    }

    $destDir = rtrim($destDir, '/');
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
        fail(500, 'Не удалось создать папку');
    }

    $baseName = pathinfo($file['name'], PATHINFO_FILENAME);
    $baseName = preg_replace('/[^a-zA-Z0-9_\-]/u', '_', $baseName) ?? '';
    $baseName = trim(preg_replace('/_+/', '_', $baseName) ?? '', '_');
    if ($baseName === '') {
        $baseName = $prefix . '_' . time();
    }

    $filename = $baseName . '.geojson';
    $target = $destDir . '/' . $filename;
    $counter = 1;
    while (file_exists($target)) {
        $filename = $baseName . '_' . $counter . '.geojson';
        $target = $destDir . '/' . $filename;
        $counter++;
    }

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        fail(500, 'Не удалось сохранить файл');
    }
    @chmod($target, 0644);

    return $filename;
}

// ---------- Работа с папками photos/ ----------

function ensure_photos_subdir(?string $slug): string {
    $targetDir = ($slug !== null && $slug !== '') ? 'photos/' . $slug : 'photos';
    $absDir = __DIR__ . '/../' . $targetDir;

    if (!is_dir($absDir) && !mkdir($absDir, 0755, true) && !is_dir($absDir)) {
        fail(500, 'Не удалось создать папку');
    }
    @chown($absDir, 'www-data');
    @chgrp($absDir, 'www-data');

    return $targetDir;
}

function resolve_photos_dir(PDO $db, ?int $albumId): string {
    if ($albumId === null) {
        return ensure_photos_subdir(null);
    }

    $stmt = $db->prepare('SELECT slug FROM albums WHERE id = ?');
    $stmt->execute([$albumId]);
    $slug = $stmt->fetchColumn();

    if (!$slug) {
        fail(400, 'Альбом не найден');
    }

    return ensure_photos_subdir((string)$slug);
}