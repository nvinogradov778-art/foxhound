<?php
// make_admin.php — назначить администратора по логину

require_once 'api/db.php';

$login = 'ЕРЕТИК'; // ← замените на реальный логин

try {
    $stmt = $db->prepare("SELECT id, role FROM users WHERE username = ?");
    $stmt->execute([$login]);
    $user = $stmt->fetch();

    if (!$user) {
        die("❌ Пользователь '$login' не найден.");
    }

    if ($user['role'] === 'admin') {
        die("ℹ️ Пользователь '$login' уже администратор.");
    }

    $update = $db->prepare("UPDATE users SET role = 'admin' WHERE id = ?");
    $update->execute([$user['id']]);

    echo "✅ Пользователь '$login' теперь администратор!";
} catch (PDOException $e) {
    echo "❌ Ошибка: " . $e->getMessage();
}
