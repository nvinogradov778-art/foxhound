<?php
// create_db_clean.php — минимальная БД без мусора

$db_path = __DIR__ . '/data/foxhound.db';

try {
    $db = new PDO('sqlite:' . $db_path);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("❌ Ошибка подключения: " . $e->getMessage());
}

$sql = "
-- Таблица пользователей
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT 'default.png',
    about TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    registered_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
);

-- Таблица сообщений чата
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица событий (чистая, без мусора)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_date INTEGER NOT NULL,
    location TEXT,
    created_by INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица опросов (с поддержкой типов, без лишних полей)
CREATE TABLE polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'single',
    options TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    show_results INTEGER DEFAULT 1,
    allow_change INTEGER DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица голосов (для одиночного и множественного выбора)
CREATE TABLE votes (
    poll_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    option_index INTEGER NOT NULL,
    PRIMARY KEY (poll_id, user_id, option_index),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица текстовых ответов (оставлена для совместимости с polls.php)
CREATE TABLE text_answers (
    poll_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text_answer TEXT NOT NULL,
    PRIMARY KEY (poll_id, user_id),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_polls_expires_at ON polls(expires_at);
";

try {
    $db->exec($sql);
    echo "✅ Чистая база данных создана!<br>";
    echo "Теперь зарегистрируйте пользователя через сайт, затем запустите make_admin.php, указав логин.";
} catch (PDOException $e) {
    echo "❌ Ошибка: " . $e->getMessage();
}