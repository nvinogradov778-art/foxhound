<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_auth();

function count_table(PDO $db, string $table): int {
    try {
        return (int)$db->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

ok([
    'stats' => [
        'operators'    => count_table($db, 'users'),
        'scenarios'    => count_table($db, 'scenarios'),
        'devices'      => count_table($db, 'devices'),
        'radio'        => count_table($db, 'radio_stations'),
        'photos'       => count_table($db, 'photos'),
        'events'       => count_table($db, 'events'),
        'instructions' => count_table($db, 'instructions'),
        'messages'     => count_table($db, 'channel_messages')
    ]
]);