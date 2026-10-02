<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ---------- Хелперы ----------

function expand_album(array $row): array {
    return [
        'id'          => (int)$row['id'],
        'slug'        => $row['slug'],
        'title'       => $row['title'],
        'description' => $row['description'],
        'cover_photo' => $row['cover_photo'],
        'sort_order'  => (int)$row['sort_order'],
        'photo_count' => (int)($row['photo_count'] ?? 0),
    ];
}

function album_abs_dir(string $slug): string {
    return __DIR__ . '/../photos/' . $slug;
}

// ---------- GET ----------

if ($method === 'GET') {
    if ($id = (int)($_GET['id'] ?? 0)) {
        $stmt = $db->prepare('
            SELECT a.*,
                   (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count
            FROM albums a
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) fail(404, 'Альбом не найден');

        respond(['album' => expand_album($row)]);
    }

    $rows = $db->query('
        SELECT a.*,
               (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) AS photo_count
        FROM albums a
        ORDER BY a.sort_order ASC, a.id ASC
    ')->fetchAll();

    respond(['albums' => array_map('expand_album', $rows)]);
}

// ---------- Действия (только админ) ----------

require_admin($db);

match ($action) {
    'save'    => handle_save($db),
    'delete'  => handle_delete($db),
    'attach'  => handle_attach($db),
    'reorder' => handle_reorder($db),
    default   => fail(400, 'Неизвестное действие'),
};

// ---------- Обработчики ----------

function handle_save(PDO $db): void {
    $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;

    if ($isMultipart) {
        $id          = !empty($_POST['id']) ? (int)$_POST['id'] : 0;
        $slug        = trim($_POST['slug'] ?? '');
        $title       = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
    } else {
        $input       = read_json();
        $id          = (int)($input['id'] ?? 0);
        $slug        = trim($input['slug'] ?? '');
        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
    }

    if ($title === '') fail(400, 'Название обязательно');

    $slug = $slug !== '' ? make_slug($slug) : make_slug($title);
    $slug = unique_slug($db, 'albums', $slug, $id);

    $albumDir = ensure_photos_subdir($slug);
    $newCover = handle_cover_upload($albumDir);

    $now = time();

    if ($id) {
        save_existing_album($db, $id, $slug, $title, $description, $newCover, $now);
    } else {
        create_album($db, $slug, $title, $description, $newCover, $now);
    }
}

function handle_cover_upload(string $albumDir): ?string {
    if (empty($_FILES['cover']) || $_FILES['cover']['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $filename = upload_image($_FILES['cover'], __DIR__ . '/../' . $albumDir, '_cover');
    return $albumDir . '/' . $filename;
}

function save_existing_album(
    PDO $db,
    int $id,
    string $slug,
    string $title,
    string $description,
    ?string $newCover,
    int $now
): void {
    $stmt = $db->prepare('SELECT cover_photo, slug FROM albums WHERE id = ?');
    $stmt->execute([$id]);
    $old = $stmt->fetch();
    if (!$old) fail(404, 'Альбом не найден');

    $oldCover = $old['cover_photo'];
    $oldSlug  = $old['slug'];

    if ($oldSlug && $oldSlug !== $slug) {
        rename_album_dir($db, $id, $oldSlug, $slug);

        if ($oldCover && strpos($oldCover, 'photos/' . $oldSlug . '/') === 0) {
            $oldCover = 'photos/' . $slug . '/' . substr($oldCover, strlen('photos/' . $oldSlug . '/'));
        }
    }

    $cover = $newCover ?: $oldCover;

    if ($newCover && $oldCover && $oldCover !== $newCover) {
        $oldPath = __DIR__ . '/../' . $oldCover;
        if (is_file($oldPath)) @unlink($oldPath);
    }

    $db->prepare('
        UPDATE albums
        SET slug = ?, title = ?, description = ?, cover_photo = ?, updated_at = ?
        WHERE id = ?
    ')->execute([$slug, $title, $description, $cover, $now, $id]);

    ok(['id' => $id]);
}

function rename_album_dir(PDO $db, int $albumId, string $oldSlug, string $newSlug): void {
    $oldDir = album_abs_dir($oldSlug);
    $newDir = album_abs_dir($newSlug);

    if (is_dir($oldDir) && !is_dir($newDir)) {
        rename($oldDir, $newDir);
    }

    $oldPrefix = 'photos/' . $oldSlug . '/';
    $newPrefix = 'photos/' . $newSlug . '/';

    $db->prepare('
        UPDATE photos
        SET image = CONCAT(?, SUBSTRING(image, ?))
        WHERE album_id = ? AND image LIKE ?
    ')->execute([$newPrefix, strlen($oldPrefix) + 1, $albumId, $oldPrefix . '%']);
}

function create_album(
    PDO $db,
    string $slug,
    string $title,
    string $description,
    ?string $cover,
    int $now
): void {
    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM albums')->fetchColumn();

    $db->prepare('
        INSERT INTO albums (slug, title, description, cover_photo, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ')->execute([$slug, $title, $description, $cover, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $db->prepare('UPDATE photos SET album_id = NULL WHERE album_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM albums WHERE id = ?')->execute([$id]);

    ok();
}

function handle_attach(PDO $db): void {
    $input = read_json();
    $photoId = (int)($input['photo_id'] ?? 0);
    $albumId = isset($input['album_id']) && $input['album_id'] !== null && $input['album_id'] !== ''
        ? (int)$input['album_id']
        : null;

    if (!$photoId) fail(400, 'photo_id обязателен');

    if ($albumId !== null) {
        $stmt = $db->prepare('SELECT id FROM albums WHERE id = ?');
        $stmt->execute([$albumId]);
        if (!$stmt->fetch()) fail(404, 'Альбом не найден');
    }

    $stmt = $db->prepare('SELECT image, album_id FROM photos WHERE id = ?');
    $stmt->execute([$photoId]);
    $photo = $stmt->fetch();
    if (!$photo) fail(404, 'Фото не найдено');

    $oldImage   = $photo['image'];
    $oldAlbumId = $photo['album_id'] !== null ? (int)$photo['album_id'] : null;

    if ($oldAlbumId === $albumId) {
        ok(['moved' => false]);
    }

    $targetDir = resolve_photos_dir($db, $albumId);
    $newRelative = move_photo_file($oldImage, $targetDir);

    $db->prepare('UPDATE photos SET album_id = ?, image = ? WHERE id = ?')
       ->execute([$albumId, $newRelative, $photoId]);

    ok(['moved' => true, 'image' => $newRelative]);
}

function move_photo_file(string $oldImage, string $targetDir): string {
    $oldPath = __DIR__ . '/../' . $oldImage;
    $filename = basename($oldImage);
    $newRelative = $targetDir . '/' . $filename;
    $newPath = __DIR__ . '/../' . $newRelative;

    if (!file_exists($oldPath)) {
        return $newRelative;
    }

    if (file_exists($newPath) && $oldPath !== $newPath) {
        $base = pathinfo($filename, PATHINFO_FILENAME);
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        $filename = $base . '_' . time() . '.' . $ext;
        $newRelative = $targetDir . '/' . $filename;
        $newPath = __DIR__ . '/../' . $newRelative;
    }

    if (!rename($oldPath, $newPath)) {
        fail(500, 'Не удалось переместить файл');
    }

    return $newRelative;
}

function handle_reorder(PDO $db): void {
    $input = read_json();
    $id = (int)($input['id'] ?? 0);
    $direction = (string)($input['direction'] ?? '');

    $result = reorder_entity($db, 'albums', $id, $direction);
    ok($result);
}