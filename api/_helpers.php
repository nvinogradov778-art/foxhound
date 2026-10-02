<?php
declare(strict_types=1);

function fail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function ok(array $data = []): void {
    echo json_encode(['success' => true] + $data, JSON_UNESCAPED_UNICODE);
    exit;
}

function respond(array $data): void {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
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