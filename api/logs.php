<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

function expand_log(array $row): array {
    return [
        'id'         => (int)$row['id'],
        'date'       => $row['date'],
        'text'       => $row['text'],
        'style'      => $row['style'],
        'sort_order' => (int)$row['sort_order'],
    ];
}

if ($method === 'GET') {
    $rows = $db->query('
        SELECT id, date, text, style, sort_order
        FROM logs
        ORDER BY sort_order DESC, id DESC
    ')->fetchAll();

    respond(['logs' => array_map('expand_log', $rows)]);
}

require_admin($db);

if ($method !== 'POST') fail(405, 'Метод не разрешён');

$input = read_json();

match ($action) {
    'save'   => handle_save($db, $input),
    'delete' => handle_delete($db, $input),
    default  => fail(400, 'Неизвестное действие'),
};

function handle_save(PDO $db, array $input): void {
    $id    = (int)($input['id'] ?? 0);
    $date  = trim($input['date'] ?? '');
    $text  = trim($input['text'] ?? '');
    $style = trim($input['style'] ?? '');

    if ($text === '') fail(400, 'Текст обязателен');

    // ИСПРАВЛЕНО: Жесткая фильтрация CSS.
    if ($style !== '') {
        // Разрешаем только безопасные символы для CSS (буквы, цифры, дефисы, скобки и т.д.)
        $cleanStyle = preg_replace('/[^a-zA-Z0-9\s\-:;().,#%]/', '', $style);
        
        // Блокируем опасные конструкции (url, javascript, expression)
        if (preg_match('/(url|javascript|expression|behavior|@import)/i', $cleanStyle)) {
            $style = ''; // Сброс при попытке инъекции
        } else {
            $style = $cleanStyle;
        }
    }

    $now = time();

    if ($id) {
        $db->prepare('UPDATE logs SET date = ?, text = ?, style = ?, updated_at = ? WHERE id = ?')
           ->execute([$date, $text, $style, $now, $id]);
        ok(['id' => $id]);
    }

    $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM logs')->fetchColumn();

    $db->prepare('
        INSERT INTO logs (date, text, style, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ')->execute([$date, $text, $style, $maxOrder + 1, $now, $now]);

    ok(['id' => (int)$db->lastInsertId()]);
}

function handle_delete(PDO $db, array $input): void {
    $id = (int)($input['id'] ?? 0);
    if (!$id) fail(400, 'ID не указан');

    $stmt = $db->prepare('DELETE FROM logs WHERE id = ?');
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) fail(404, 'Запись не найдена');

    ok();
}