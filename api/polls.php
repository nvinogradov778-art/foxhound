<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Не авторизован']));
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

$stmt = $db->prepare('SELECT role FROM users WHERE id = ?');
$stmt->execute([$user_id]);
$user = $stmt->fetch();
$is_admin = ($user && $user['role'] === 'admin');

if ($method === 'GET') {
    try {
        $archived = isset($_GET['archived']) ? intval($_GET['archived']) : 0;
        $now = time();

        $sql = 'SELECT * FROM polls';
        if ($archived) {
            $sql .= ' WHERE expires_at <= ?';
            $params = [$now];
        } else {
            $sql .= ' WHERE expires_at > ?';
            $params = [$now];
        }
        $sql .= ' ORDER BY created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $polls = $stmt->fetchAll();

        foreach ($polls as &$poll) {
            $options = json_decode($poll['options'], true);
            $poll['options'] = $options;

            $voteCounts = [];
            foreach ($options as $idx => $label) {
                $cnt = $db->prepare('SELECT COUNT(*) FROM votes WHERE poll_id = ? AND option_index = ?');
                $cnt->execute([$poll['id'], $idx]);
                $voteCounts[] = $cnt->fetchColumn();
            }
            $poll['vote_counts'] = $voteCounts;
            $poll['total_votes'] = array_sum($voteCounts);

            $myVotesStmt = $db->prepare('SELECT option_index FROM votes WHERE poll_id = ? AND user_id = ?');
            $myVotesStmt->execute([$poll['id'], $user_id]);
            $poll['my_votes'] = $myVotesStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        header('Content-Type: application/json');
        echo json_encode($polls);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
    }
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if ($data === null) {
        http_response_code(400);
        die(json_encode(['error' => 'Неверный JSON']));
    }
    $action = $data['action'] ?? '';

    if ($action === 'vote') {
        $poll_id = intval($data['poll_id'] ?? 0);
        $option_indexes = $data['option_indexes'] ?? [];

        if (!$poll_id || !is_array($option_indexes) || empty($option_indexes)) {
            http_response_code(400);
            die(json_encode(['error' => 'Неверные данные голосования']));
        }

        try {
            $check = $db->prepare('SELECT expires_at FROM polls WHERE id = ?');
            $check->execute([$poll_id]);
            $row = $check->fetch();
            if (!$row || $row['expires_at'] <= time()) {
                http_response_code(400);
                die(json_encode(['error' => 'Опрос завершён']));
            }

            $db->prepare('DELETE FROM votes WHERE poll_id = ? AND user_id = ?')->execute([$poll_id, $user_id]);

            $insert = $db->prepare('INSERT INTO votes (poll_id, user_id, option_index) VALUES (?, ?, ?)');
            foreach ($option_indexes as $idx) {
                $insert->execute([$poll_id, $user_id, $idx]);
            }

            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
        }
    }

    if ($action === 'create') {
        if (!$is_admin) {
            http_response_code(403);
            die(json_encode(['error' => 'Доступ запрещён (нужна роль admin)']));
        }

        $title = trim($data['title'] ?? '');
        $type = trim($data['type'] ?? 'single');
        $options = $data['options'] ?? [];
        $expires_at = intval($data['expires_at'] ?? 0);

        if (empty($title) || count($options) < 2 || $expires_at <= time()) {
            http_response_code(400);
            die(json_encode(['error' => 'Заполните все поля (минимум 2 варианта, дата в будущем)']));
        }

        $optionsJson = json_encode($options);
        try {
            $stmt = $db->prepare('INSERT INTO polls (title, type, options, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
            $now = time();
            $stmt->execute([$title, $type, $optionsJson, $user_id, $now, $expires_at]);
            echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'Неизвестное действие']);
    exit;
}

if ($method === 'DELETE') {
    if (!$is_admin) {
        http_response_code(403);
        die(json_encode(['error' => 'Доступ запрещён']));
    }
    $data = json_decode(file_get_contents('php://input'), true);
    $poll_id = intval($data['poll_id'] ?? 0);
    if (!$poll_id) {
        http_response_code(400);
        die(json_encode(['error' => 'ID опроса не указан']));
    }
    try {
        $db->prepare('DELETE FROM votes WHERE poll_id = ?')->execute([$poll_id]);
        $db->prepare('DELETE FROM polls WHERE id = ?')->execute([$poll_id]);
        echo json_encode(['success' => true]);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Ошибка БД: ' . $e->getMessage()]));
    }
}

http_response_code(405);
echo json_encode(['error' => 'Метод не разрешён']);
?>
