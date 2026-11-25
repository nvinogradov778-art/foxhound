<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_me($db); // Исправлено
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Только POST');

$in = read_json();
$channelId = (int)($in['channel_id'] ?? 0);

if (!$channelId) fail(400, 'channel_id обязателен');

$db->prepare('
    INSERT INTO user_typing (user_id, channel_id, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, channel_id) DO UPDATE SET updated_at = excluded.updated_at
')->execute([$me['id'], $channelId, time()]);

// Отправляем пуш в WebSocket сервер
$wsPayload = json_encode([
    'type' => 'typing',
    'channel_id' => $channelId,
    'username' => $me['username']
]);

$ch = curl_init('http://127.0.0.1:8082');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['data' => $wsPayload]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 1);
curl_exec($ch);
curl_close($ch);

ok();
