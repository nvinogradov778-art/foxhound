<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_uploads.php';
require_once __DIR__ . '/_reorder.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'submit') {
    $input = read_json();
    
    $callsign = trim($input['callsign'] ?? '');
    $full_name = trim($input['full_name'] ?? '');
    $birth_date = trim($input['birth_date'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $telegram = trim($input['telegram'] ?? '');
    $vk = trim($input['vk'] ?? '');
    $motivation = trim($input['motivation'] ?? '');

    if (!$callsign || !$full_name || !$birth_date || !$phone || !$motivation) {
        fail(400, 'Заполните обязательные поля');
    }

    $db->prepare('INSERT INTO recruitments (callsign, full_name, birth_date, phone, telegram, vk, motivation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
       ->execute([$callsign, $full_name, $birth_date, $phone, $telegram, $vk, $motivation, time()]);
       
    ok(['message' => 'Заявка отправлена! С вами свяжутся.']);
}

require_commander($db);
csrf_check();

if ($method === 'GET') {
    $rows = $db->query('SELECT * FROM recruitments ORDER BY created_at DESC')->fetchAll();
    respond(['recruitments' => $rows]);
}

if ($method === 'POST') {
    $input = read_json();
    
    if ($action === 'update_status') {
        $id = (int)($input['id'] ?? 0);
        $status = trim($input['status'] ?? '');
        $comment = trim($input['admin_comment'] ?? '');
        
        $allowed = ['Новая', 'На рассмотрении', 'Принят', 'Отклонен'];
        if (!$id || !in_array($status, $allowed)) fail(400, 'Неверные данные');
        
        $db->prepare('UPDATE recruitments SET status = ?, admin_comment = ? WHERE id = ?')
           ->execute([$status, $comment, $id]);
        ok();
    }
    
    if ($action === 'delete') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) fail(400, 'ID не указан');
        $db->prepare('DELETE FROM recruitments WHERE id = ?')->execute([$id]);
        ok();
    }
}
fail(400, 'Неизвестное действие');