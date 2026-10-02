<?php
declare(strict_types=1);

/**
 * Меняет sort_order местами с соседом.
 *
 * @param string      $table       Имя таблицы (только [a-z_])
 * @param int         $id          ID перемещаемой записи
 * @param string      $direction   'up' | 'down'
 * @param string|null $scopeSql    Доп. условие, напр. 'album_id = ?'
 * @param array       $scopeParams Параметры для $scopeSql
 */
function reorder_entity(
    PDO $db,
    string $table,
    int $id,
    string $direction,
    ?string $scopeSql = null,
    array $scopeParams = []
): array {
    if ($id <= 0) {
        fail(400, 'id обязателен');
    }
    if (!in_array($direction, ['up', 'down'], true)) {
        fail(400, 'direction должен быть up или down');
    }

    $stmt = $db->prepare("SELECT sort_order FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $current = $stmt->fetchColumn();
    if ($current === false) {
        fail(404, 'Запись не найдена');
    }
    $current = (int)$current;

    $cmp = $direction === 'up' ? '<' : '>';
    $ord = $direction === 'up' ? 'DESC' : 'ASC';
    $scope = $scopeSql ? " AND {$scopeSql}" : '';

    $stmt = $db->prepare("
        SELECT id, sort_order FROM {$table}
        WHERE (sort_order {$cmp} ? OR (sort_order = ? AND id {$cmp} ?)){$scope}
        ORDER BY sort_order {$ord}, id {$ord}
        LIMIT 1
    ");
    $stmt->execute(array_merge([$current, $current, $id], $scopeParams));
    $neighbor = $stmt->fetch();

    if (!$neighbor) {
        return ['moved' => false];
    }

    $db->beginTransaction();
    try {
        $upd = $db->prepare("UPDATE {$table} SET sort_order = ? WHERE id = ?");
        $upd->execute([(int)$neighbor['sort_order'], $id]);
        $upd->execute([$current, (int)$neighbor['id']]);
        $db->commit();
        return ['moved' => true];
    } catch (Throwable $e) {
        $db->rollBack();
        fail(500, 'Ошибка сортировки');
    }
}