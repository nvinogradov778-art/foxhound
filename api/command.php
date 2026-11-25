<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$me = require_commander($db);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    if ($action === 'get_data') {
        $roster = $db->query('SELECT * FROM operators ORDER BY sort_order ASC, id ASC')->fetchAll();

        $actionsStatsRaw = $db->query('
            SELECT operator_id,
                   SUM(CASE WHEN is_reward = 1 THEN 1 ELSE 0 END) as rewards,
                   SUM(CASE WHEN is_reward = 0 THEN 1 ELSE 0 END) as penalties
            FROM command_actions
            GROUP BY operator_id
        ')->fetchAll();

        $actionsStats = [];
        foreach ($actionsStatsRaw as $row) {
            $actionsStats[(int)$row['operator_id']] = [
                'rewards'   => (int)$row['rewards'],
                'penalties' => (int)$row['penalties'],
            ];
        }

        $now = new DateTime();

        foreach ($roster as &$op) {
            $op['id'] = (int)$op['id'];
            $op['rewards']   = (int)($actionsStats[$op['id']]['rewards']   ?? 0);
            $op['penalties'] = (int)($actionsStats[$op['id']]['penalties'] ?? 0);
            $op['balance']   = $op['rewards'] - $op['penalties'];

            $op['days_to_bd'] = null;
            if (!empty($op['birth_date'])) {
                try {
                    $bd = new DateTime($op['birth_date']);
                    $bd->setDate((int)$now->format('Y'), (int)$bd->format('m'), (int)$bd->format('d'));
                    if ($bd < $now) {
                        $bd->modify('+1 year');
                    }
                    $op['days_to_bd'] = (int)$now->diff($bd)->days;
                } catch (Exception $e) {
                }
            }
        }
        unset($op);

        usort($roster, function ($a, $b) {
            if ($a['days_to_bd'] !== null && $b['days_to_bd'] !== null) {
                return $a['days_to_bd'] <=> $b['days_to_bd'];
            }
            if ($a['days_to_bd'] !== null) return -1;
            if ($b['days_to_bd'] !== null) return 1;
            return strcmp($a['name'], $b['name']);
        });

        $recentActions = $db->query('
            SELECT a.*, o.name
            FROM command_actions a
            JOIN operators o ON o.id = a.operator_id
            ORDER BY a.date DESC, a.id DESC
            LIMIT 10
        ')->fetchAll();

        respond([
            'roster'         => $roster,
            'recent_actions' => $recentActions,
        ]);
    }

    if ($action === 'get_plan') {
        $rows = $db->query('SELECT * FROM command_plan ORDER BY sort_order ASC, id ASC')->fetchAll();
        respond(['plan' => $rows]);
    }

    fail(400, 'Неизвестное действие');
}

if ($method === 'POST') {
    $input = read_json();

    if ($action === 'save_operator') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) fail(403, 'Создание новых бойцов доступно только в основной Админ-панели.');

        $full_name  = trim($input['full_name'] ?? '');
        $birth_date = trim($input['birth_date'] ?? '');
        $phone      = trim($input['phone'] ?? '');
        $status     = trim($input['status'] ?? 'На связи');

        $db->prepare('UPDATE operators SET full_name=?, birth_date=?, phone=?, status=? WHERE id=?')
           ->execute([$full_name, $birth_date, $phone, $status, $id]);

        ok(['id' => $id]);
    }

    if ($action === 'delete_operator') {
        fail(403, 'Удаление бойцов доступно только в основной Админ-панели.');
    }

    if ($action === 'save_action') {
        $operator_id = (int)($input['operator_id'] ?? 0);
        $date        = trim($input['date'] ?? date('Y-m-d'));
        $type        = trim($input['type'] ?? '');
        $reason      = trim($input['reason'] ?? '');
        $signed_by   = trim($input['signed_by'] ?? 'Командир');
        $is_reward   = !empty($input['is_reward']) ? 1 : 0;

        if (!$operator_id || $type === '') fail(400, 'Выберите бойца и тип');

        $db->prepare('
            INSERT INTO command_actions (operator_id, date, type, reason, signed_by, is_reward)
            VALUES (?, ?, ?, ?, ?, ?)
        ')->execute([$operator_id, $date, $type, $reason, $signed_by, $is_reward]);

        ok();
    }

    if ($action === 'delete_action') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) fail(400, 'ID не указан');
        $db->prepare('DELETE FROM command_actions WHERE id = ?')->execute([$id]);
        ok();
    }

    if ($action === 'save_plan') {
        $id = (int)($input['id'] ?? 0);

        $data = [
            trim($input['direction'] ?? ''),
            trim($input['task'] ?? ''),
            trim($input['assignee'] ?? ''),
            trim($input['priority'] ?? 'Средний'),
            trim($input['status'] ?? 'План'),
            trim($input['start_date'] ?? ''),
            trim($input['end_date'] ?? ''),
            (float)($input['budget'] ?? 0),
            trim($input['comment'] ?? ''),
        ];

        if ($data[1] === '') fail(400, 'Задача обязательна');

        if ($id) {
            $db->prepare('
                UPDATE command_plan
                SET direction=?, task=?, assignee=?, priority=?, status=?,
                    start_date=?, end_date=?, budget=?, comment=?
                WHERE id=?
            ')->execute([...$data, $id]);
        } else {
            $maxOrder = (int)$db->query('SELECT COALESCE(MAX(sort_order), -1) FROM command_plan')->fetchColumn();
            $db->prepare('
                INSERT INTO command_plan
                    (direction, task, assignee, priority, status,
                     start_date, end_date, budget, comment, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([...$data, $maxOrder + 1]);
            $id = (int)$db->lastInsertId();
        }

        ok(['id' => $id]);
    }

    if ($action === 'delete_plan') {
        $id = (int)($input['id'] ?? 0);
        if (!$id) fail(400, 'ID не указан');
        $db->prepare('DELETE FROM command_plan WHERE id = ?')->execute([$id]);
        ok();
    }

    fail(400, 'Неизвестное действие');
}

fail(405, 'Метод не разрешён');