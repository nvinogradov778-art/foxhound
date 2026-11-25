<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_me($db); // Используем require_me, чтобы получить массив с данными
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Только POST');

$in = read_json();
$endpoint = trim($in['endpoint'] ?? '');
$p256dh   = trim($in['p256dh'] ?? '');
$auth     = trim($in['auth'] ?? '');

if (!$endpoint || !$p256dh || !$auth) fail(400, 'Неверные данные подписки');

$db->prepare('
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth
')->execute([$me['id'], $endpoint, $p256dh, $auth, time()]);

ok();
