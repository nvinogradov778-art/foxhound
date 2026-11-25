<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_auth();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Только POST');

if (empty($_FILES['file'])) fail(400, 'Файл не загружен');

$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

$allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'zip', 'txt'];
if (!in_array($ext, $allowedExt, true)) {
    fail(400, 'Недопустимый формат файла. Разрешены: ' . implode(', ', $allowedExt));
}

if ($file['size'] > 20 * 1024 * 1024) {
    fail(400, 'Файл больше 20 МБ');
}

$destDir = __DIR__ . '/../uploads/chat';
if (!is_dir($destDir)) {
    mkdir($destDir, 0775, true);
}

$filename = 'chat_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = $destDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    fail(500, 'Не удалось сохранить файл');
}
@chmod($dest, 0644);

ok(['path' => 'uploads/chat/' . $filename]);