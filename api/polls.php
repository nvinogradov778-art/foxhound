<?php
require_once 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET – список опросов (активные или архив)
if ($method === 'GET') {
    $archived = isset($_GET['archived']) ? intval($_GET['archived']) : 0;
    $now = time();

    if ($archived) {
        // Завершённые опросы
        $stmt = $db->prepare('
            SELECT p.*,
                   (SELECT option_index FROM votes WHERE poll_id = p.id AND user_id = ?) as my_vote,
                   (SELECT COUNT(*) FROM votes WHERE poll_id = p.id) as total_votes
            FROM polls p
            WHERE p.expires_at <= ?
            ORDER BY p.created_at DESC
        ');
    } else {
        // Активные опросы
        $stmt = $db->prepare('
            SELECT p.*,
                   (SELECT option_index FROM votes WHERE poll_id = p.id AND user_id = ?) as my_vote,
                   (SELECT COUNT(*) FROM votes WHERE poll_id = p.id) as total_votes
            FROM polls p
            WHERE p.expires_at > ?
            ORDER BY p.created_at DESC
        ');
    }
    $stmt->execute([$user_id, $now]);
    $polls = $stmt->fetchAll();

    foreach ($polls as &$poll) {
        $options = json_decode($poll['options'], true);
        $voteCounts = [];
        foreach ($options as $idx => $label) {
            $cnt = $db->prepare('SELECT COUNT(*) FROM votes WHERE poll_id = ? AND option_index = ?');
            $cnt->execute([$poll['id'], $idx]);
            $voteCounts[] = $cnt->fetchColumn();
        }
        $poll['vote_counts'] = $voteCounts;
        $poll['options'] = $options;
    }
    echo json_encode($polls);
    exit;
}

// POST – голосование или создание/обновление опроса
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';

    // Голосование
    if ($action === 'vote') {
        $poll_id = intval($data['poll_id'] ?? 0);
        $option_index = intval($data['option_index'] ?? -1);
        if (!$poll_id || $option_index < 0) {
            http_response_code(400);
            die(json_encode(['error' => 'Некорректные данные']));
        }
        // Проверяем, активен ли опрос
        $check = $db->prepare('SELECT expires_at FROM polls WHERE id = ?');
        $check->execute([$poll_id]);
        $row = $check->fetch();
        if (!$row || $row['expires_at'] <= time()) {
            http_response_code(400);
            die(json_encode(['error' => 'Опрос завершён']));
        }
        $stmt = $db->prepare('
            INSERT INTO votes (poll_id, user_id, option_index)
            VALUES (?, ?, ?)
            ON CONFLICT(poll_id, user_id) DO UPDATE SET option_index = excluded.option_index
        ');
        $stmt->execute([$poll_id, $user_id, $option_index]);
        echo json_encode(['success' => true]);
        exit;
    }

    // Создание опроса (админ)
    if ($action === 'create') {
        $roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
        $roleStmt->execute([$user_id]);
        $role = $roleStmt->fetchColumn();
        if ($role !== 'admin') {
            http_response_code(403);
            die(json_encode(['error' => 'Доступ запрещён']));
        }

        $title = trim($data['title'] ?? '');
        $options = $data['options'] ?? [];
        $expires_at = intval($data['expires_at'] ?? 0);

        if (empty($title) || count($options) < 2 || !$expires_at) {
            http_response_code(400);
            die(json_encode(['error' => 'Заполните все поля (минимум 2 варианта)']));
        }
        $optionsJson = json_encode($options);
        $stmt = $db->prepare('
            INSERT INTO polls (title, options, created_by, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ');
        $now = time();
        $stmt->execute([$title, $optionsJson, $user_id, $now, $expires_at]);
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        exit;
    }

    // Обновление опроса (админ)
    if ($action === 'update') {
        $roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
        $roleStmt->execute([$user_id]);
        $role = $roleStmt->fetchColumn();
        if ($role !== 'admin') {
            http_response_code(403);
            die(json_encode(['error' => 'Доступ запрещён']));
        }

        $poll_id = intval($data['poll_id'] ?? 0);
        $title = trim($data['title'] ?? '');
        $options = $data['options'] ?? [];
        $expires_at = intval($data['expires_at'] ?? 0);

        if (!$poll_id || empty($title) || count($options) < 2 || !$expires_at) {
            http_response_code(400);
            die(json_encode(['error' => 'Все поля обязательны']));
        }
        $optionsJson = json_encode($options);
        $stmt = $db->prepare('
            UPDATE polls SET title = ?, options = ?, expires_at = ? WHERE id = ?
        ');
        $stmt->execute([$title, $optionsJson, $expires_at, $poll_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Неизвестное действие']);
    exit;
}

// DELETE – удаление опроса (админ)
if ($method === 'DELETE') {
    $roleStmt = $db->prepare('SELECT role FROM users WHERE id = ?');
    $roleStmt->execute([$user_id]);
    $role = $roleStmt->fetchColumn();
    if ($role !== 'admin') {
        http_response_code(403);
        die(json_encode(['error' => 'Доступ запрещён']));
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $poll_id = intval($data['poll_id'] ?? 0);
    if (!$poll_id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID опроса обязательно']));
    }
    $stmt = $db->prepare('DELETE FROM polls WHERE id = ?');
    $stmt->execute([$poll_id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Метод не разрешён']);
?>