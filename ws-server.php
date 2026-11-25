<?php
use Workerman\Worker;
use Workerman\Connection\TcpConnection;
use Workerman\Protocols\Http\Request;
use Workerman\Timer;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

require_once __DIR__ . '/vendor/autoload.php';

$db = new PDO('sqlite:' . __DIR__ . '/data/foxhound.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$db->exec('PRAGMA busy_timeout = 5000');
$db->exec('PRAGMA journal_mode = WAL');

$vapidPath = __DIR__ . '/data/vapid.json';
$vapid = file_exists($vapidPath) ? json_decode(file_get_contents($vapidPath), true) : null;

$channel_server = new Channel\Server('127.0.0.1', 2206);

$ws_worker = new Worker('websocket://0.0.0.0:8081');
$ws_worker->count = 1;
$connections = [];

$ws_worker->onWorkerStart = function($worker) use (&$connections) {
    Channel\Client::connect('127.0.0.1', 2206);
    Channel\Client::on('broadcast', function($data) use (&$connections) {
        $targetChannel = (int)$data['channel_id'];
        $payload = json_encode($data);
        
        $sentCount = 0;
        foreach ($connections as $conn) {
            if ($conn->channelId === $targetChannel) {
                $conn->send($payload);
                $sentCount++;
            }
        }
    });
};

$ws_worker->onWebSocketConnect = function(TcpConnection $connection, Request $request) use (&$connections) {
    $channelId = (int)$request->get('channel_id', 0);
    $connection->channelId = $channelId;
    $connections[$connection->id] = $connection;
};

$ws_worker->onClose = function(TcpConnection $connection) use (&$connections) {
    unset($connections[$connection->id]);
};

$http_worker = new Worker('http://0.0.0.0:8082');
$http_worker->count = 1;

$http_worker->onWorkerStart = function($worker) {
    Channel\Client::connect('127.0.0.1', 2206);
};

$http_worker->onMessage = function(TcpConnection $connection, Request $request) use ($db, $vapid) {
    $postData = $request->post();
    $data = json_decode($postData['data'] ?? '{}', true);

    if ($data && isset($data['channel_id'])) {
        Channel\Client::publish('broadcast', $data);
        
        if ($vapid && isset($data['message']) && isset($data['message']['id'])) {
            $msg = $data['message'];
            $channelId = $data['channel_id'];
            
            $stmt = $db->prepare('SELECT name FROM channels WHERE id = ?');
            $stmt->execute([$channelId]);
            $channelName = $stmt->fetchColumn() ?: 'чат';

            $avatarPath = (!empty($msg['avatar']) && $msg['avatar'] !== 'default.png') 
                ? '/uploads/avatars/' . $msg['avatar'] 
                : '/logo-foxhound.webp';

            Timer::add(0.01, function() use ($db, $vapid, $msg, $channelName, $avatarPath) {
                $stmt = $db->prepare('SELECT * FROM push_subscriptions WHERE user_id != ?');
                $stmt->execute([$msg['user_id']]);
                $subscriptions = $stmt->fetchAll();

                if ($subscriptions) {
                    $webPush = new WebPush([
                        'VAPID' => [
                            'subject' => 'mailto:admin@foxhound-team.ru',
                            'publicKey' => $vapid['publicKey'],
                            'privateKey' => $vapid['privateKey'],
                        ],
                    ]);

                    foreach ($subscriptions as $sub) {
                        $webPush->queueNotification(
                            Subscription::create([
                                'endpoint' => $sub['endpoint'],
                                'publicKey' => $sub['p256dh'],
                                'authToken' => $sub['auth'],
                            ]),
                            json_encode([
                                'title' => $msg['username'] . ' в #' . $channelName,
                                'body' => mb_strimwidth($msg['text'] ?: 'Вложение', 0, 100, '...'),
                                'url' => '/#/chat',
                                'avatar' => $avatarPath
                            ])
                        );
                    }
                    
                    foreach ($webPush->flush() as $report) {
                        if (!$report->isSuccess() && $report->isSubscriptionExpired()) {
                            $db->prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')->execute([$report->getEndpoint()]);
                        }
                    }
                }
            }, [], false);
        }
    }
    
    $connection->send("OK");
};

Worker::runAll();