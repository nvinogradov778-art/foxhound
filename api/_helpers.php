<?php
declare(strict_types=1);

function fail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function ok(array $data = []): void {
    echo json_encode(['success' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}

function respond(array $data): void {
    ok($data);
}

function read_json(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, 'Некорректный JSON');
    }
    return $data;
}

function make_slug(string $source, string $fallback = 'item'): string {
    $slug = mb_strtolower(trim($source), 'UTF-8');
    $slug = preg_replace('/[^a-z0-9_]+/u', '_', $slug) ?? '';
    $slug = trim(preg_replace('/_+/', '_', $slug) ?? '', '_');
    return $slug !== '' ? $slug : ($fallback . '_' . time());
}

function unique_slug(PDO $db, string $table, string $slug, int $ignoreId = 0): string {
    $stmt = $db->prepare("SELECT 1 FROM {$table} WHERE slug = ? AND id != ? LIMIT 1");
    $base = $slug;
    $counter = 1;
    while (true) {
        $stmt->execute([$slug, $ignoreId]);
        if (!$stmt->fetchColumn()) {
            return $slug;
        }
        $slug = $base . '_' . (++$counter);
    }
}

function check_rate_limit(PDO $db, string $action, int $limit, int $window): void {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (strpos($ip, ',') !== false) {
        $ip = trim(explode(',', $ip)[0]);
    }
    
    $db->exec('CREATE TABLE IF NOT EXISTS rate_limits (ip TEXT, action TEXT, attempts INTEGER DEFAULT 0, last_attempt INTEGER, PRIMARY KEY (ip, action))');
    
    $now = time();
    $stmt = $db->prepare('SELECT attempts, last_attempt FROM rate_limits WHERE ip = ? AND action = ?');
    $stmt->execute([$ip, $action]);
    $row = $stmt->fetch();

    if ($row) {
        if ($now - (int)$row['last_attempt'] > $window) {
            $db->prepare('UPDATE rate_limits SET attempts = 1, last_attempt = ? WHERE ip = ? AND action = ?')->execute([$now, $ip, $action]);
        } elseif ((int)$row['attempts'] >= $limit) {
            fail(429, 'Слишком много попыток. Повторите позже.');
        } else {
            $db->prepare('UPDATE rate_limits SET attempts = attempts + 1, last_attempt = ? WHERE ip = ? AND action = ?')->execute([$now, $ip, $action]);
        }
    } else {
        $db->prepare('INSERT INTO rate_limits (ip, action, attempts, last_attempt) VALUES (?, ?, 1, ?)')->execute([$ip, $action, $now]);
    }
}