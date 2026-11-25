<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ---------- GET ----------

if ($method === 'GET') {
    $albumId = $_GET['album_id'] ?? null;

    if ($albumId === 'null') {
        $stmt = $db->query('
            SELECT id, title, description, image, date, album_id, sort_order, created_at
            FROM photos WHERE album_id IS NULL
            ORDER BY sort_order ASC, id ASC
        ');
    } elseif ($albumId !== null) {
        $stmt = $db->prepare('
            SELECT id, title, description, image, date, album_id, sort_order, created_at
            FROM photos WHERE album_id = ?
            ORDER BY sort_order ASC, id ASC
        ');
        $stmt->execute([(int)$albumId]);
    } else {
        $stmt = $db->query('
            SELECT id, title, description, image, date, album_id, sort_order, created_at
            FROM photos ORDER BY sort_order ASC, id ASC
        ');
    }

    $photos = $stmt->fetchAll();
    foreach ($photos as &$p) {
        $p['id'] = (int)$p['id'];
        $p['created_at'] = (int)$p['created_at'];
        $p['album_id'] = $p['album_id'] !== null ? (int)$p['album_id'] : null;
    }
    unset($p);

    respond(['photos' => $photos]);
}

// ---------- Действия (только админ) ----------

require_admin($db);

match ($action) {
    'upload'       => handle_upload($db),
    'upload_multi' => handle_upload_multi($db),
    'delete'       => handle_delete($db),
    'reorder'      => handle_reorder($db),
    default        => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function parse_album_id(): ?int {
    $raw = $_POST['album_id'] ?? null;
    if ($raw === null || $raw === '' || $raw === 'null') return null;
    return (int)$raw;
}

function next_sort_order(PDO $db, ?int $albumId): int {
    if ($albumId === null) {
        return (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM photos WHERE album_id IS NULL')->fetchColumn() + 1;
    }
    $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM photos WHERE album_id = ?');
    $stmt->execute([$albumId]);
    return (int)$stmt->fetchColumn() + 1;
}

function insert_photo(
    PDO $db,
    string $title,
    string $description,
    string $image,
    string $date,
    ?int $albumId,
    int $order
): int {
    $db->prepare('
        INSERT INTO photos (title, description, image, date, album_id, sort_order, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $title,
        $description,
        $image,
        $date,
        $albumId,
        $order,
        time(),
        (int)$_SESSION['user_id']
    ]);

    return (int)$db->lastInsertId();
}

function handle_upload(PDO $db): void {
    $title       = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $date        = trim($_POST['date'] ?? '');
    $albumId     = parse_album_id();

    if ($title === '') fail(400, 'Название обязательно');
    if (empty($_FILES['photo'])) fail(400, 'Ошибка загрузки файла');

    $targetDir = resolve_photos_dir($db, $albumId);
    $filename  = upload_image($_FILES['photo'], __DIR__ . '/../' . $targetDir, 'photo');

    $relativePath = $targetDir . '/' . $filename;
    $order = next_sort_order($db, $albumId);

    $id = insert_photo($db, $title, $description, $relativePath, $date, $albumId, $order);

    ok(['id' => $id, 'image' => $relativePath]);
}

function handle_upload_multi(PDO $db): void {
    if (empty($_FILES['photos']) || !is_array($_FILES['photos']['name'])) {
        fail(400, 'Нет файлов');
    }

    $title       = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $date        = trim($_POST['date'] ?? '');
    $albumId     = parse_album_id();

    $targetDir = resolve_photos_dir($db, $albumId);
    $order = next_sort_order($db, $albumId);

    $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);

    $uploaded = 0;
    $errors = [];
    $count = count($_FILES['photos']['name']);

    try {
        for ($i = 0; $i < $count; $i++) {
            $error = $_FILES['photos']['error'][$i];
            $origName = $_FILES['photos']['name'][$i];
            $tmp = $_FILES['photos']['tmp_name'][$i];

            if ($error !== UPLOAD_ERR_OK) {
                $errors[] = $origName . ': ошибка загрузки';
                continue;
            }

            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExt, true)) {
                $errors[] = $origName . ': недопустимый формат';
                continue;
            }

            $mime = finfo_file($finfo, $tmp);
            if (!in_array($mime, $allowedMimes, true)) {
                $errors[] = $origName . ': MIME не совпадает';
                continue;
            }

            // ИСПРАВЛЕНО: Генерация уникального имени с микросекундами и увеличенной энтропией
            $microtime = str_replace('.', '_', (string)microtime(true));
            $filename = 'photo_' . $microtime . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
            $dest = __DIR__ . '/../' . $targetDir . '/' . $filename;

            if (!move_uploaded_file($tmp, $dest)) {
                $errors[] = $origName . ': не удалось сохранить';
                continue;
            }
            @chmod($dest, 0644);

            $baseName = pathinfo($origName, PATHINFO_FILENAME);
            $photoTitle = $title !== '' ? ($title . ' — ' . $baseName) : $baseName;

            insert_photo($db, $photoTitle, $description, $targetDir . '/' . $filename, $date, $albumId, $order++);
            $uploaded++;
        }
    } finally {
        finfo_close($finfo);
    }

    ok(['uploaded' => $uploaded, 'errors' => $errors]);
}

function handle_delete(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('SELECT image FROM photos WHERE id = ?');
    $stmt->execute([$id]);
    $image = $stmt->fetchColumn();
    if ($image === false) fail(404, 'Фото не найдено');

    if ($image) {
        $path = __DIR__ . '/../' . $image;
        if (is_file($path)) @unlink($path);
    }

    $db->prepare('DELETE FROM photos WHERE id = ?')->execute([$id]);
    ok();
}

function handle_reorder(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    $direction = (string)($input['direction'] ?? '');

    if (!$id) fail(400, 'id обязателен');

    $stmt = $db->prepare('SELECT album_id FROM photos WHERE id = ?');
    $stmt->execute([$id]);
    $albumId = $stmt->fetchColumn();
    if ($albumId === false) fail(404, 'Фото не найдено');

    if ($albumId === null) {
        $result = reorder_entity($db, 'photos', $id, $direction, 'album_id IS NULL');
    } else {
        $result = reorder_entity($db, 'photos', $id, $direction, 'album_id = ?', [(int)$albumId]);
    }

    ok($result);
}