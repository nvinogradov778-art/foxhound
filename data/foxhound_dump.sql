PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT 'default.png',
    about TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    registered_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
, is_banned INTEGER DEFAULT 0, banned_at INTEGER DEFAULT 0, banned_by INTEGER DEFAULT 0, banned_reason TEXT DEFAULT '');
INSERT INTO users VALUES(1,'ЕРЕТИК','$2y$10$YNKmA4YEla/OZRmM.0G2nO1Q4pfAi0EgMbl4UQJUkuSZBCSfsnMvW','avatar_1_1790690519_2519a327.webp','Основатель и главный идеолог FOXHOUND. Определяю вектор технического развития, отвечаю за стратегическое планирование и боевую координацию.','commander',1788748179,1795429973,0,0,0,'');
INSERT INTO users VALUES(4,'Нексор','$2y$10$OkNxvgXHAA/re6js865RaO176qBfWxnJzA033I0AbBRZn4dVasfLK','avatar_4_1790868038_cdceb1bd.webp','Меняй мир к лучшему и меняйся вместе с ним:)','admin',1790360671,1791305271,0,0,0,'');
INSERT INTO users VALUES(6,'ЭДИК','$2y$10$02WFw99cicLH/cj7Sr4/hOwIdzy0CBQpFlmT7Iiryjqp7MLBH/rBi','avatar_6_1794588267_61d1e1e5.png','','admin',1790667104,1794767333,0,0,0,'');
INSERT INTO users VALUES(7,'Медик','$2y$10$H2NqQcskMX0lCycavOHHYurN29ut1fMJ6/mseCT5YynDTyqM05iRu','default.png','','commander',1791015404,1793373815,0,0,0,'');
INSERT INTO users VALUES(8,'Вепс','$2y$10$CvGBKmUBLXE/nBL98Qy3pu62rokS.ObP5GzXh8HJHWOETxPdHCnBC','default.png','','admin',1791017079,1794848345,0,0,0,'');
INSERT INTO users VALUES(11,'Рейнард','$2y$10$RucSREPlbEFWy0P.e4RRbeDsCJDaJSZPwaBPtgCtLacsfNwD3JnCa','default.png','','admin',1792429081,1792559825,0,0,0,'');
INSERT INTO users VALUES(15,'Субур','$2y$10$BxpBGach6ownr/J9usTnXeNTHbujmV8VSwQkd4x21PRfen0faUnm.','default.png','','admin',1794828520,1794828521,0,0,0,'');
INSERT INTO users VALUES(16,'Арс','$2y$10$h6pYtTMwKOs81Wwicpc2MeHbYfkNf4GA660iRBCOg/xuUedN6mQaG','default.png','','admin',1794828574,1794828574,0,0,0,'');
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
CREATE TABLE votes (
    poll_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    option_index INTEGER NOT NULL,
    PRIMARY KEY (poll_id, user_id, option_index),
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE photos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    image        TEXT NOT NULL,
    date         TEXT DEFAULT '',
    created_at   INTEGER NOT NULL,
    created_by   INTEGER, album_id INTEGER DEFAULT NULL, sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO photos VALUES(18,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857475_c4632a1e.jpg','',1790857475,1,9,0);
INSERT INTO photos VALUES(19,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857476_bb2799b6.jpg','',1790857476,1,9,1);
INSERT INTO photos VALUES(20,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857477_0b2ca702.jpg','',1790857477,1,9,5);
INSERT INTO photos VALUES(21,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857477_98a0a1ca.jpg','',1790857477,1,9,2);
INSERT INTO photos VALUES(22,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857478_109f4119.jpg','',1790857478,1,9,3);
INSERT INTO photos VALUES(23,'Операция «Черный Ястреб» 19.07.2026','','photos/black_hawk_2026/photo_1790857478_edfc9781.jpg','',1790857478,1,9,4);
CREATE TABLE operators (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    role            TEXT DEFAULT '',
    specialization  TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    photo           TEXT DEFAULT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
, full_name TEXT DEFAULT '', birth_date TEXT DEFAULT '', phone TEXT DEFAULT '', status TEXT DEFAULT 'На связи');
INSERT INTO operators VALUES(2,'Медик','Заместитель командира команды по медицинской части','Медицина','Специалист по оказанию первой помощи в полевых условиях. Обеспечивает медицинское сопровождение выездов.','operators/operator_1789299478.webp',1,1790323127,1790323127,'Семёнова Елизавета Сергеевна','2005-05-28','89963957176','На связи');
INSERT INTO operators VALUES(3,'Вепс','Заместитель командира команды по правовым вопросам','Военное право / Юридическая защита','Эксперт по правовому обеспечению и защите интересов подразделения. Гарантирует законность приказов, координирует документооборот и разрешает правовые споры.','operators/operator_1789299510.webp',2,1790323127,1790323127,'Семенов Ярослав Дмитриевич','1996-06-01','89527160628','На связи');
INSERT INTO operators VALUES(5,'Субур','Инженер по радиосвязи','Радиосвязь','Специалист по развертыванию защищенной связи . Обеспечивает радиоэлектронную поддержку','operators/operator_1789299544.webp',4,1790323127,1792754008,'Кошкаров Георгий Александрович','2006-01-30','89527104544','На связи');
INSERT INTO operators VALUES(6,'Нексор','Штурмовик / Огневая поддержка','Штурм','Мобильный ударный элемент. Отвечает за динамичное продвижение и подавление огневых точек противника.','operators/operator_1789531541.webp',5,1790323127,1792753966,'Максимов Илья Евгеньевич','2003-08-06','89048869358','На связи');
INSERT INTO operators VALUES(7,'Арс','Штурмовик / Огневая поддержка','Штурм','Мобильный ударный элемент. Отвечает за динамичное продвижение и подавление огневых точек противника.',NULL,6,1790323127,1790323127,'Касымов Аслан Алиханович','1997-03-22','89128126399','На связи');
INSERT INTO operators VALUES(11,'Рейнард','Штурмовик / Огневая поддержка','Штурм','Мобильный ударный элемент. Отвечает за динамичное продвижение и подавление огневых точек противника.',NULL,7,1792431417,1792570324,'Дворянов Даниил Эдуардович','2003-08-18','89120880108','На связи');
INSERT INTO operators VALUES(13,'ЕРЕТИК','Командир команды','Стратегия / Тактика','Основатель и главный идеолог FOXHOUND. Определяю вектор технического развития, отвечаю за стратегическое планирование и боевую координацию.','operators/operator_1793275229_d735e670.webp',0,1790323127,1793275285,'Виноградов Никита Артёмович','1998-12-17','+7 (923) 671-75-66','На связи');
CREATE TABLE instructions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    link         TEXT NOT NULL,
    sort_order   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
INSERT INTO instructions VALUES(1,'Инструкция по эксплуатации Baofeng UV-5R для подразделения FOXHOUND','Подробное руководство по программированию частот, настройке шумоподавления и работе с рацией.','https://drive.google.com/file/d/1lqhdzkjiZO5rINonas9uNr1Ic5Z-ysun/view?usp=drive_link',0,1790324723,1790324723);
INSERT INTO instructions VALUES(2,'Гирбоксы AEG: Устройство, версии и совместимость','Экспресс-курс по внутреннему устройству страйкбольного оружия','https://drive.google.com/file/d/1eb9yoIiE1l06ZQBDJUmWL-1WQ1SUfOfq/view?usp=drive_link',1,1790324723,1790324723);
INSERT INTO instructions VALUES(3,'Экспресс-курс по медицине','Медицинское сопровождение в страйболе для подразделения FOXHOUND','https://drive.google.com/file/d/1Ims0YoqZX4VOx1a2c9_7fI3kb66dw6_E/view?usp=drive_link',2,1790324723,1790324723);
INSERT INTO instructions VALUES(4,'Практическое руководство по ATAK-CIV 5.7.0','Справочное пособие по основам навигации, целеуказания и обмена данными в геоинформационной системе ATAK-CIV версии 5.7.0','https://drive.google.com/file/d/1-Z4KqSWaH679kor9GjKnWna398S4OnIa/view?usp=drive_link',3,1790324723,1790324723);
INSERT INTO instructions VALUES(5,'Набор инструментов для подразделения FOXHOUND','Комплектация рюкзака для быстрого устранения неисправностей привода и экипировки в полевых условиях.','https://drive.google.com/file/d/1sOuHQts5pvEayIZoOs_RngRIOpoLBdFB/view?usp=drive_link',4,1790324723,1790324723);
INSERT INTO instructions VALUES(7,'Катулин А. Н. — «Тактическая медицина. Первая помощь в экстремальных условиях».','Практический курс для быстрого обучения солдата и отделения.','https://drive.google.com/file/d/1gaZL2yxlW8coYdc0ubMzN5GGdtNxEjoC/view?usp=drive_link',6,1790324723,1790324723);
INSERT INTO instructions VALUES(8,'Кивилев А. Н., Маркин А. В. — «Ускоренная тактическая подготовка»','Практический курс для быстрого обучения солдата и отделения.','https://drive.google.com/file/d/1WTSmvCnW4w2RukR0mJ6SoQdNl9pbDhbh/view?usp=drive_link',7,1790324723,1790324723);
INSERT INTO instructions VALUES(9,'Маркин А. В. — «Альбом тактических схем»','Наглядное пособие для работы в малых группах.','https://drive.google.com/file/d/1dwb1_fBqqHO7rTVak9T-cc39U3Ubcq7Q/view?usp=drive_lin',8,1790324723,1790324723);
INSERT INTO instructions VALUES(10,'MARCH - учебные карты','Подробный разбор протокола MARCH','https://drive.google.com/file/d/1RUm_6DWTv3Vc6drF0Mvk5iqaYRCK8SUT/view?usp=drive_link',9,1790324723,1790324723);
INSERT INTO instructions VALUES(11,'SH 21-76 Rangers (на русском)','Данная книга является переводом Учебника рейнджера Армии США (SH 21-76 Ranger Handbook) издания 2000 года.  Книга используется в качестве учебного пособия при подготовке рейнджеров и рассчитана как на курсантов учебной  бригады рейнджеров, так и на всех военнослужащих 75-го пехотного полка рейнджеров Армии США.','https://drive.google.com/file/d/1VnS7R-bBPipRmWJrKrFoy8Cpddqd9ueu/view?usp=drive_link',10,1790324723,1790696592);
INSERT INTO instructions VALUES(12,'CQB: Схемы зачистки помещений','Визуальный гид','https://drive.google.com/file/d/1jBJbmhhT7FI0X0DszklK4H0aDsC9icli/view?usp=drive_link',11,1790324723,1790324723);
INSERT INTO instructions VALUES(15,'Инструкция по работе с сайтом FOXHOUND (v2.0)','Инструкция по работе в веб-платформе инженерно-тактической страйкбольной команды FOXHOUND.','https://drive.google.com/file/d/1lQvEODW0qEuz2vdozARww5Mt4AfU2Tg9/view?usp=drive_link',12,1790696544,1790696544);
CREATE TABLE scenarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    video_link      TEXT DEFAULT '',
    phases_json     TEXT DEFAULT '[]',
    inventory_json  TEXT DEFAULT '[]',
    files_json      TEXT DEFAULT '[]',
    sort_order      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
INSERT INTO scenarios VALUES(1,'black_hawk','Операция «Чёрный ястреб»','Элитная штурмовая группа FOXHOUND выбрасывается в эпицентр восстания. Задача — эвакуировать VIP-информатора и раненого пилота, прорываясь через кольцо Ополчения. Три фазы, параллельные задачи и жёсткий финал с одной жизнью у защитников.','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239031&hash=9d7947a764e141cb&hd=3','[{"name":"Фаза 1: Прорыв к VIP","time":"00:00 – 25:00","description":"Спецназ штурмует здание c VIP, Ополчение держит оборону.","map_image":"scenarios\/BHD\/ЧЕРНЫЙ ЯСТРЕБ Ф1.webp"},{"name":"Фаза 2: Параллельная эвакуация","time":"25:00 – 55:00","description":"Падение вертолёта, активация пилота. Паралельная эвакуация VIPa и пилота","map_image":"scenarios\/BHD\/ЧЕРНЫЙ ЯСТРЕБ Ф2.webp"},{"name":"Фаза 3: Осада базы","time":"55:00 – 75:00","description":"Спецназ удерживает базу с 1 жизнью, Ополчение штурмует волнами","map_image":"scenarios\/BHD\/ЧЕРНЫЙ ЯСТРЕБ Ф3.webp"}]','["Рации для организаторов","Мощный мегафон","Носилки для манекена","Манекен пилота","Костюм VIP","Секундомеры (или телефоны с таймерами)","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND","Свистки","Ламинированные карты полигона с разметкой","Вода (из расчёта 2 л на человека)","Аптечка"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1s9Gt8Z1THdteMnFt6vBptvGrjfM1TzfS\/view?usp=drive_link"}]',0,1790328176,1791097270);
INSERT INTO scenarios VALUES(5,'strelkovy_den','Стрелковый день','Тренировка по стрельбе. Цель — отработка кучности, скорости и работы парами. Игрового сюжета нет.','','[{"name":"БЛОК 1. ПРИСТРЕЛКА","time":"00:00-30:00","description":"Все бойцы проверяют прицелы и хоп-ап.\nПристрелка на 25 м — по 5 выстрелов.\nКорректировка прицелов по результатам.","map_image":"scenarios\/strelkovy_den\/1.webp"},{"name":"БЛОК 2. СТРЕЛКОВЫЕ УПРАЖНЕНИЯ","time":"40:00 - 80:00","description":"Кучность на 15 м — 5 выстрелов.\nКучность на 25 м — 5 выстрелов.\nКучность на 40 м — 5 выстрелов.\nСкорость: 10 выстрелов по 3 мишеням.","map_image":"scenarios\/strelkovy_den\/2.webp"},{"name":"БЛОК 3. РАБОТА ПАРАМИ","time":"90:00 - 120:00","description":"Перекаты вперёд: стоя → на колено → лёжа.\nОтход назад перекатами.\nФормула: «на позиции — держу — пошёл — иду».\nДистанция рывка: 10 шагов на открытой местности.","map_image":"scenarios\/strelkovy_den\/3.webp"},{"name":"БЛОК 4. РАЗБОР","time":"130:00 - 150:00","description":"Обратная связь по каждому блоку.\nПлан на следующую тренировку.\nОбъявления командира.","map_image":""}]','["Мишени (бумажные или попперы)","Секундомер","Аптечка"]','[{"name":"ПОЛНЫЙ ТЕКСТ СЦЕНАРИЯ (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1fRL0Qic-uNBBcrZXaGNLglOG6iJcWAvW\/view?usp=drive_link"}]',1,1791017409,1791806815);
INSERT INTO scenarios VALUES(6,'tochki_interesa','Точки интереса','Две группы борются за контроль над тремя ключевыми точками. Точки дают очки тому, кто их удерживает. Побеждает команда с большим количеством очков к концу матча','','[{"name":"ФАЗА N","time":"00:00 - 00:45","description":"Задачи: Спецназ и Ополчение захватывают и удерживают 3 точки (западная, центральная, восточная). Респаун: 3 мин у обеих команд, выход по свистку судьи. Очки: 1 очко в секунду за любую точку","map_image":"scenarios\/tochki_interesa\/1.webp"}]','["Флаги \/ маркеры точек","Рации для организаторов","Свисток","Точки интереса на базе ESP32 \/ Компонент цифрового арсенала FOXHOUND \"Точки интереса \"","Аптечка","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1mlOOpIvsV4fvyawmBJtVPctVijTUcD7T\/view?usp=drive_link"}]',2,1791034997,1791806964);
INSERT INTO scenarios VALUES(7,'konvoy','Конвой','Конвой ведёт VIP через полигон. Засада пытается VIP уничтожить.','','[{"name":"ФАЗА N","time":"00:00 - 00:40","description":"Респаун 5 мин у обеих команд (выход по свистку судьи); VIP безоружен, идет быстрым шагом, не служит укрытием, при попадании садится на 1 минуту; намеренная стрельба в VIP запрещены. Условия победы: Конвой победил, если VIP доведён до точки эвакуации живым; Засада победила, если VIP уничтожен или время вышло.","map_image":"scenarios\/konvoy\/1.webp"}]','["Рации","Костюм VIP","Свисток","Секундомер","Дымовые шашки","Аптечка","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1zouL-xNt44CnO4nc6wmt5nebqWEdmpHq\/view?usp=drive_link"}]',3,1791039627,1791807013);
INSERT INTO scenarios VALUES(8,'cqb_zachistka','CQB-зачистка здания','Штурм зачищает здание с 2 этажами. Оборона удерживает. Штурм побеждает, если зачистил и удержал здание. Оборона — если удержал','','[{"name":"ФАЗА N","time":"00:00 – 00:45","description":"Штурм входит и зачищает 1 этаж, затем 2 этаж. Оборона держит коридоры и комнаты. Респаун: Штурм — 5 мин (вне здания), Оборона — 3 мин (2 этаж). Последние 5 минут респаун Обороны отключается. По лестнице — движение «ручейком», бег запрещён, огонь только при визуальном контакте. Штурм побеждает, если зачистил оба этажа и удержал здание. Оборона — если удержала хотя бы один этаж до конца.","map_image":"scenarios\/cqb_zachistka\/1.webp"}]','["Рации","Секундомер","Аптечка","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1lAxPAyb_6K2RI_fEm6yX3yO1I2Lmw_sH\/view?usp=drive_link"}]',4,1791095874,1791807089);
INSERT INTO scenarios VALUES(9,'bomba','Бомба','Террористы несут бомбу к точке А или Б. Спецназ защищает обе точки. Террористы побеждают, если бомба взорвалась. Спецназ — если разминировал.','','[{"name":"ФАЗА N","time":"00:00 – 00:45","description":"Террористы получают бомбу и выдвигаются к точке А или Б. Спецназ занимает оборону. Террористы закладывают бомбу и вводят код — запускается таймер 1–2 мин. Спецназ пытается разминировать. Респаун — 5 мин у обеих команд. Точки А и Б обозначены флагами.  Террористы побеждают, если бомба взорвалась. Спецназ — если разминировал или не дал заложить до конца времени.","map_image":"scenarios\/bomba\/1.webp"}]','["Бомба (на базе ESP32) \/ Бомба (Компонент цифрового арсенала FOXHOUND)","Флаги точек А и Б","Рации","Секундомер","Аптечка","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1WcRnIwp3_notRe7Wq7WPg7N8Uzk34dfe\/view?usp=drive_link"}]',5,1791097123,1791807134);
INSERT INTO scenarios VALUES(10,'tdm','TDM (командный бой)','Классический командный бой на лимит жизней. У каждой команды общий пул. Побеждает та, у которой остались жизни.','','[{"name":"ФАЗА N","time":"00:00 – 00:30","description":"Обе команды стартуют с противоположных концов полигона. Каждое попадание списывает 1 жизнь из общего пула команды. Респаун свободный, пока пул не исчерпан. Пул отображается на ESP32-таймере. Побеждает команда, у которой остались жизни к концу времени или которая первой обнулила пул противника.","map_image":"scenarios\/tdm\/1.webp"}]','["Секундомер","Рации","Программируемый игровой таймер (ESP32 + OLED) \/ ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND","Аптечка"]','[{"name":"Полный текст сценария (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1XSG_-wsQnUbQ6ASJGo0n66H9tDlDpoSC\/view?usp=drive_link"}]',6,1791097835,1791807167);
CREATE TABLE devices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    photo           TEXT DEFAULT NULL,
    video_link      TEXT DEFAULT '',
    schematic_link  TEXT DEFAULT '',
    docs_link       TEXT DEFAULT '',
    files_json      TEXT DEFAULT '[]',
    sort_order      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
INSERT INTO devices VALUES(1,'respawn_app','ТОЧКА ВОЗРОЖДЕНИЯ — компонент цифрового арсенала FOXHOUND','Компонент цифрового арсенала FOXHOUND. Приложение для учёта общего запаса жизней команды. Убили бойца — он уходит на мертвяк и жмёт кнопку ВОЗРОЖДЕНИЕ, из запаса уходит одна жизнь. Когда жизни заканчиваются — матч окончен. Настройки: количество жизней, длительность матча , интервал волн.','devices/respawn.webp','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239032','','','[{"name":"Скачать APK","link":"https:\/\/drive.google.com\/file\/d\/1OsuXNdp1gjys05YI5B-DeoMBdEud8tfy\/view?usp=drive_link"}]',0,1790329922,1795005632);
INSERT INTO devices VALUES(2,'domination_app','ТОЧКА ИНТЕРЕСА — компонент цифрового арсенала FOXHOUND','Компонент цифрового арсенала FOXHOUND. Игра для двух команд по захвату и удержанию точки. На экране одна точка интереса, за которую борются два игрока. Захват производится удержанием своей кнопки. Точка под контролем — очки начисляются владельцу. Соперник перехватил — начисляются ему. Победитель определяется наибольшим количеством очков к концу матча.','devices/domination.webp','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239035','','','[{"name":"Скачать APK","link":"https:\/\/drive.google.com\/file\/d\/1qdHQDSJo_KGvVwZCLDos-ttyVjKkPJLV\/view?usp=drive_link"}]',1,1790329922,1795005723);
INSERT INTO devices VALUES(3,'bomb_app','БОМБА — компонент цифрового арсенала FOXHOUND','Компонент цифрового арсенала FOXHOUND. Бомба с кодовым замком. Для взвода устройства игрок вводит пароль на экранной клавиатуре 4×3. Успешный ввод кода разминирования до истечения таймера означает победу, иначе — взрыв. Настройка параметров доступна через админ-код.','devices/bomb.webp','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239034','','','[{"name":"Скачать APK","link":"https:\/\/drive.google.com\/file\/d\/1sl62F43Ikwv_92Pw_lhnZTdtagGZUuaR\/view?usp=drive_link"}]',2,1790329922,1795005771);
INSERT INTO devices VALUES(4,'valhalla_app','VALHALLA UNIX — компонент цифрового арсенала FOXHOUND','Компонент цифрового арсенала FOXHOUND. Терминальный триллер о взломе защищенной системы. Игрок вводит пароль, подключается к серверу VALHALLA и начинает копирование данных на USB-носитель. В процессе передачи срабатывает защита: для завершения загрузки необходимо трижды подряд победить в мини-игре «Захват сигнала», удержав маркер в целевой зоне. Три промаха приводят к перезагрузке терминала и сбросу прогресса.','devices/valhalla.webp','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239033','','','[{"name":"Скачать APK","link":"https:\/\/drive.google.com\/file\/d\/1S3Ug0ywR_ga-QZNGZAA0gkpXZvpl6VTb\/view?usp=drive_link"}]',3,1790329922,1795005823);
INSERT INTO devices VALUES(5,'esp32_timer','Программируемый игровой таймер (ESP32 + OLED)','Автономное устройство для судейства страйкбольных игр. Позволяет настроить количество жизней, общее время матча и интервал между волнами. Отображает обратный отсчёт, оставшиеся жизни и прогресс волны на OLED-экране. Управляется четырьмя кнопками, имеет звуковое сопровождение (клики, старт, окончание, волна). Работает на базе микроконтроллера ESP32, прошивается на MicroPython.','devices/timer.webp','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239030','','','[{"name":"Инструкция пользователя (PDF)","link":"https:\/\/drive.google.com\/file\/d\/1I2YWmzqmSlQfUAVhmYx24bw_hI_h9QhK\/view?usp=drive_link"},{"name":"Исходный код (main.py)","link":"https:\/\/github.com\/nvinogradov778-art\/foxhound-dev\/blob\/main\/%D0%9C%D0%B5%D1%80%D1%82%D0%B2%D1%8F%D0%BA\/main.py"},{"name":"Драйвер OLED (ssd1306.py)","link":"https:\/\/github.com\/nvinogradov778-art\/foxhound-dev\/blob\/main\/%D0%9C%D0%B5%D1%80%D1%82%D0%B2%D1%8F%D0%BA\/ssd1306.py"}]',4,1790329922,1790329922);
INSERT INTO devices VALUES(6,'edik','Маникен Эдик','Легендарный «пилот» без единого выстрела, но с самым суровым взглядом из всех, кого выносили с поля боя. Он уже побывал в огне, в воде и в руках десятков бойцов, которые пытались его эвакуировать. Эдик не жалуется, не дышит и не просит перерыва – идеальный напарник для отработки тактической медицины и выносливости ваших рук. Весит ровно столько, чтобы вы почувствовали каждый килограмм ответственности. Бонус: не спорит, не храпит и не просит перекурить','devices/edik.webp','','','','[]',5,1790329922,1790329922);
INSERT INTO devices VALUES(8,'esp32_bomb','Игровой симулятор бомбы','Автономный игровой симулятор бомбы. Позволяет активировать устройство вводом пароля, запускать обратный отсчёт и обезвреживать «бомбу» в режиме CODE — вводом секретного кода с клавиатуры, в режиме WIRE — перерезанием правильного провода из четырёх, со штрафами за ошибки. Позволяет настроить таймер, пароли и режим CODE/WIRE. Отображает обратный отсчёт и подсказки на ЖК-дисплее 20×4 (I2C). Управляется матричной клавиатурой 4×3 и кнопками A, B, C, D, имеет звуковое сопровождение (клики, таймер, ошибки, взрыв). Работает на базе ESP32.','devices/device_1793363091_0254c07a.jpg','https://vkvideo.ru/video_ext.php?oid=-239972469&id=456239046','https://drive.google.com/file/d/13Kr6Wp_nWDF9c60IXzU2wbp-kEccpLD3/view?usp=drive_link','https://drive.google.com/file/d/17TAwQUFom8FQOHlHv7i1PKo2OAI3j-XQ/view?usp=drive_link','[{"name":"Исходный код (main.py)","link":"https:\/\/drive.google.com\/file\/d\/1NqtJmKcu2kPbLE4pBZ_dUkh8E7pA-fOY\/view?usp=drive_link"},{"name":"Драйвер дисплея (lcd.py)","link":"https:\/\/drive.google.com\/file\/d\/10G6QbCWuusJ96zhbOcXAycoX2vJ-_INN\/view?usp=drive_link"}]',6,1793363044,1793363214);
CREATE TABLE atak_sections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sections_json TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
);
INSERT INTO atak_sections VALUES(6,'[{"title":"Введение: Зачем нам это нужно?","content":"<p><strong>ATAK<\/strong> — это не просто навигатор вроде Яндекс.Карт. Это инструмент, который позволяет всей команде в реальном времени видеть друг друга на полигоне.<\/p><ul><li>Вы всегда знаете, где ваши бойцы.<\/li><li>Вы можете «на ходу» передавать координаты противника без долгих объяснений по радиосвязи в духе: «Ну, он там, за третьим деревом справа от разрушенного кирпичного здания».<\/li><\/ul>"},{"title":"Часть 1. Первое включение и настройка связи","children":[{"title":"Важное правило","content":"<p><strong>!!!! ВАЖНОЕ ПРАВИЛО !!!!<\/strong><\/p><p>Наш сервер FTS будет запущен ровно за сутки до начала игры. Каждый боец обязан настроить подключение и проверить связь заранее из дома, чтобы на самом полигоне мы не тратили игровое время на технические проблемы.<\/p>"},{"title":"1. Имя и цвет (Позывной)","content":"<ol><li>Открываем главное меню (кнопка ☰ в правом верхнем углу).<\/li><li>Переходим: <strong>Settings<\/strong> → <strong>Callsign and Device Preference<\/strong> → <strong>Callsign Preference<\/strong>.<\/li><li>В графе <strong>My Callsign<\/strong> пишем свой страйкбольный позывной.<\/li><li>В графе <strong>My Team<\/strong> выбираем единый цвет нашей команды (например, Blue или Green).<\/li><li>В графе <strong>My Role<\/strong> в подразделе <strong>Default<\/strong> выбираем соответствующие роли.<\/li><\/ol>"},{"title":"2. Подключение к серверу FTS","content":"<p><strong>Делаем строго за день до игры<\/strong><\/p><ol><li>В главном меню ☰ выбираем <strong>Settings<\/strong> → <strong>Network Preferences<\/strong> → <strong>Manage Server Connection<\/strong>.<\/li><li>Нажимаем на <strong>точки<\/strong> (+) → <strong>Add<\/strong>.<\/li><li>Заполняем:<ul><li><strong>Name:<\/strong> Название (пишем, например, <em>FTS_Team<\/em>)<\/li><li><strong>Address:<\/strong> IP-адрес сервера<\/li><\/ul><\/li><li>Ставим галочку <strong>Advanced Options<\/strong> и в <strong>Streaming Protocol<\/strong> ставим <strong>TCP<\/strong>.<\/li><li>Указываем <strong>Port:<\/strong> номер порта.<\/li><li><strong>Проверка связи:<\/strong> Возвращаемся в список серверов. Кружок напротив нашего сервера должен загореться зелёным. Если загорелся — вы в сети, подготовка завершена.<\/li><\/ol>"},{"title":"3. Загрузка и установка офлайн-карт","content":"<p><strong>⚠️ ЖЕСТКОЕ ПРАВИЛО ДЛЯ ВСЕЙ КОМАНДЫ:<\/strong> Гражданский ATAK-CIV изначально «заточен» под американские и международные серверы. Российские карты он вообще не загружает по умолчанию. Если вы просто установите программу и приедете на полигон — у вас на экране будет пустая серая сетка. Каждый боец обязан залить в телефон ту конкретную карту полигона, которую подготовил и скинул командир. ATAK на игре будет работать строго и только с нашим файлом карты.<\/p><ol><li>Скачиваем файл карты в формате <strong>.mbtiles<\/strong> в память смартфона.<\/li><li>На верхней панели нажимаем кнопку ☰.<\/li><li>Нажимаем кнопку <strong>Import<\/strong>.<\/li><li>Выбираем источник <strong>Local SD<\/strong>.<\/li><li>В открывшемся проводнике файлов переходим в папку с файлом карты и выбираем его.<\/li><li>ATAK выдаст запрос о способе обработки выбранного файла — выбираем <strong>Copy<\/strong>.<\/li><li>В окне с выбором способа отображения карты выбираем <strong>Imagery<\/strong>.<\/li><li><strong>Итог:<\/strong> в <strong>Overlay Manager<\/strong> в разделе <strong>Image Overlay<\/strong> отобразится импортированная карта.<\/li><\/ol>"}]},{"title":"Часть 2. Главный экран и управление (в ландшафтном режиме)","children":[{"title":"Левый верхний угол (Навигация)","content":"<ul><li><strong>Компас:<\/strong> Показывает на север. Нажатие выравнивает карту строго на север или по направлению игрока.<\/li><li><strong>Прицел («Где я»):<\/strong> Одно нажатие возвращает карту на ваше текущее местоположение.<\/li><li><strong>Масштаб:<\/strong> Кнопки изменения масштаба (быстрее делать привычным жестом двух пальцев).<\/li><\/ul>"},{"title":"Верхний ряд (Рабочие инструменты)","content":"<ul><li><strong>Контакты:<\/strong> Список всей команды в сети.<\/li><li><strong>Overlay Manager:<\/strong> Позволяет переключить отображение тегов, маркеров, элементов оверлея, а также настройку способа геопозиционирования.<\/li><li><strong>Менеджер данных:<\/strong> Позволяет работать с импортированными данными.<\/li><li><strong>МАРКЕР:<\/strong> Самая важная кнопка! Нажатие на неё позволяет мгновенно поставить метку на карту.<\/li><li><strong>Главное меню:<\/strong> Вызов шторки глубоких настроек и параметров сети.<\/li><\/ul>"}]},{"title":"Часть 3. Нанесение меток на карту","children":[{"title":"1. Библиотека страйкбольных меток","content":"<p>Обычная точка несет мало информации. При установке маркера (или нажатии на уже созданный) всегда меняйте его <strong>Тип (Type)<\/strong> и <strong>Значок (Icon)<\/strong> в свойствах, или используйте кастомные иконки.<\/p><p>В ATAK-CIV по умолчанию используются стандартные библиотеки <strong>Markers<\/strong>, Mission, Spot Map, Vehicle Models, Reference Point, а также предустановленные от Google, OSM и т.д.<\/p><p>Пролистывание между библиотеками маркеров осуществляется <strong>свайпом<\/strong> влево\/вправо.<\/p><p><strong>Нанесение маркеров:<\/strong><\/p><ol><li>Нажимаем кнопку маркера.<\/li><li>Выбираем маркер.<\/li><li>Нажимаем на карту.<\/li><\/ol>"},{"title":"2. Изменение, перенос и удаление меток","content":"<ul><li><strong>Чтобы подписать:<\/strong> Выбрать маркер → нажать на него → ввести название в поле рядом с иконкой (например: «Дот», «Пулемет»).<\/li><li><strong>Чтобы перенести:<\/strong><ul><li>Точечный перенос – нажать на маркер, выбрать инструмент и с помощью указателя поправить маркер.<\/li><li>По координатам – нажать на маркер, удерживать, нажать на появившееся окно, ввести географические координаты.<\/li><li>На живую – удерживаем маркер, переносим в нужное место на карте.<\/li><\/ul><\/li><li><strong>Чтобы удалить:<\/strong> Если противник уничтожен или задача выполнена, нажмите на метку → выберите значок Корзины.<\/li><\/ul>"},{"title":"3. Отображение метки для всех пользователей внутри одной сети","content":"<p><strong>Способ А:<\/strong> После добавления метки, внизу в панели меток будет отмечена последняя нанесенная метка. Жмем кнопку <strong>Send<\/strong> и выбираем всех.<\/p><p><strong>Способ Б:<\/strong> Выбираем маркер, жмем кнопку <strong>Send<\/strong> (или удержание), в панели жмем <strong>Send<\/strong>.<\/p><p><strong>Способ В:<\/strong> Выбираем маркер, жмем кнопку <strong>Send<\/strong> (удержанием), жмем <strong>Send to All<\/strong>.<\/p>"},{"title":"4. Адресное управление: Распределение бойцов по точкам","content":"<p>Чтобы не создавать кашу на экранах, командир может выдавать персональные задачи конкретным людям:<\/p><ol><li>Выбираем метку.<\/li><li>Выполняем действия как в п.3, однако вместо кнопки «всем» выбираем конкретных пользователей и жмем <strong>Send<\/strong>.<\/li><\/ol>"},{"title":"5. Как показать направление движения для всей команды сразу и отдельным игрокам","content":"<p>Если нужно быстро задать вектор атаки, маневра или отхода, используем инструмент <strong>Range Tool<\/strong>:<\/p><ol><li>Открываем главное меню (кнопка ☰).<\/li><li>Выбираем инструмент <strong>Range Tool<\/strong>.<\/li><li>В правом меню выбираем <strong>R&B line<\/strong> или <strong>Dynamic R&B line<\/strong>.<\/li><li>Выбираем начало и конец линии.<\/li><li>Выбираем созданную линию, жмем кнопку <strong>Edit<\/strong>, в параметрах задаем цвет и вид линии, правим название и жмем <strong>Save<\/strong>.<\/li><li>Как и с простыми метками, жмем <strong>Send<\/strong> (всем) или выбираем отдельных игроков и жмем <strong>Send<\/strong>.<\/li><\/ol>"},{"title":"6. Сложный маркерный маршрут для всей команды сразу или отдельным игрокам","content":"<p>Если необходимо показать извилистый, скрытный маршрут в обход построек:<\/p><ol><li>Открываем главное меню (кнопка ☰).<\/li><li>Выбираем инструмент <strong>Routes<\/strong>.<\/li><li>Нажимаем <strong>Add<\/strong>.<\/li><li>Выбираем тип маршрута (<strong>walking<\/strong>) и нажимаем кнопку <strong>Manual Entry<\/strong>.<\/li><li>Рисуем маршрут путем добавления точек поворота или при помощи инструмента <strong>Draw<\/strong> ведем пальцем по маршруту.<\/li><li>После жмем <strong>END<\/strong>.<\/li><li>Способ отправки маршрута ничем не отличается от отправки маркеров и направлений (<strong>Send<\/strong>).<\/li><\/ol>"},{"title":"7. Расчет расстояний и инструмент «Круг угрозы»","content":"<p><strong>Расчет расстояний:<\/strong><\/p><ol><li>Выбираем себя или иную метку.<\/li><li>В круговом меню жмем инструмент измерения.<\/li><li>Указываем конечную точку.<\/li><\/ol><p><strong>Круг угрозы:<\/strong><\/p><ol><li>В инструменте <strong>Range Tools<\/strong> выбираем <strong>R&B Circle<\/strong>.<\/li><li>Ставим на карте сначала центр окружности, вторым нажатием определяем радиус.<\/li><li>При необходимости диаметр можно поправить через редактирование.<\/li><\/ol>"},{"title":"8. Создание тактических зон (Инструмент Drawing Tools)","content":"<p>Для создания тактических зон используется инструмент <strong>Drawing Tools<\/strong>:<\/p><ol><li>Открываем главное меню (кнопка ☰).<\/li><li>Выбираем инструмент <strong>Drawing Tools<\/strong>.<\/li><li>Выбираем форму и рисуем зону.<\/li><li>В разделе настроек можно выбрать цвет, заполнение, прозрачность зоны.<\/li><li>Публикация – через кнопку <strong>Send<\/strong>.<\/li><\/ol>"}]},{"title":"Часть 3.1. Пакетная работа с маркерами и иными знаками","content":"<p>Для пакетной работы с маркерами, маршрутами и картами (скрытие, удаление и т.д.) используется инструмент <strong>Overlay Manager<\/strong>.<\/p><p><strong>Вариант А «Скрытие меток»:<\/strong><\/p><ul><li>С помощью кнопки <strong>Visibility<\/strong> скрываем либо категорию, либо отдельные метки.<\/li><\/ul><p><strong>Вариант Б «Удаление меток»:<\/strong><\/p><ul><li>Жмем <strong>Select<\/strong>, жмем <strong>Delete<\/strong>, выбираем все метки или те, что не нужны. Жмем <strong>Delete<\/strong>.<\/li><\/ul>"}]',1793255840);
CREATE TABLE regulations_sections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sections_json TEXT NOT NULL,
    updated_at   INTEGER NOT NULL
);
INSERT INTO regulations_sections VALUES(6,'[{"title":"1. Общие положения","content":"<p><strong>1.1.<\/strong> Настоящий Устав является основным внутренним документом команды «FOXHOUND».<\/p><p><strong>1.2.<\/strong> Команда признает и обязуется неукоснительно соблюдать Правила Уральской Ассоциации Страйкбола (УАС).<\/p><p><strong>1.3.<\/strong> Знание Правил УАС и положений настоящего Устава является обязательным условием для зачисления в личный состав.<\/p>"},{"title":"2. Этические нормы и требования к личному составу","content":"<p><strong>2.1.<\/strong> Адекватность поведения — базовый критерий членства в команде. Любые формы проявления агрессии, неспортивного поведения и «несознанки» (игнорирования попаданий) недопустимы.<\/p><p><strong>2.2.<\/strong> Участник команды обязан уважительно относиться к партнерам по команде, игрокам других подразделений, организаторам и судьям.<\/p><p><strong>2.3.<\/strong> Внутрикомандная дисциплина строится на принципах взаимного доверия и ответственности.<\/p>"},{"title":"3. Технический регламент и контроль вооружения","content":"<p><strong>3.1.<\/strong> Команда выступает против использования игрового оружия, не соответствующего нормам безопасности.<\/p><p><strong>3.2.<\/strong> Овертюн: Превышение установленных Правилами УАС норм дульной энергии («выхлопа») карается общекомандным порицанием и отстранением от игр до устранения технического несоответствия.<\/p><p><strong>3.3.<\/strong> Процедура хронографирования (замера скорости) является обязательной перед каждым официальным мероприятием. Порядок проведения контроля установлен отдельным регламентом, утверждённым командованием.<\/p>"},{"title":"4. Иерархия и порядок принятия решений","content":"<p><strong>4.1.<\/strong> В условиях игрового процесса (на полигоне): Действует принцип единоначалия. Приказы командира (или старшего группы) подлежат немедленному исполнению для сохранения эффективности отряда.<\/p><p><strong>4.2.<\/strong> Право на критику: Команда признает, что командир может совершить ошибку. Конструктивная критика и разбор решений приветствуются, но строго после окончания игрового эпизода или фазы боя.<\/p><p><strong>4.3.<\/strong> Субординация: Любые формы проявления деструктивного поведения, «борзоты» и публичного оспаривания приказов в ходе выполнения боевой задачи пресекаются немедленно. Подобное поведение является основанием для дисциплинарных мер.<\/p><p><strong>4.4.<\/strong> Администрирование: Вне игрового процесса решения по развитию команды принимаются путем обсуждения, где голос каждого специалиста имеет вес.<\/p>"},{"title":"5. Порядок разрешения конфликтных ситуаций","content":"<p><strong>5.1.<\/strong> Внутрикомандные споры разрешаются путем закрытого обсуждения под руководством Командира. Публичное обсуждение внутренних разногласий в сторонних ресурсах запрещено.<\/p><p><strong>5.2.<\/strong> При возникновении спорных ситуаций с третьими лицами на полигоне, боец обязан избегать эскалации конфликта и передать информацию Командиру для дальнейшего урегулирования в рамках Совета Командиров.<\/p>"},{"title":"6. Запреты и санкции","content":"<p><strong>6.1.<\/strong> Категорически запрещено нахождение на мероприятиях в состоянии алкогольного или наркотического опьянения.<\/p><p><strong>6.2.<\/strong> Нарушение правил техники безопасности (ТБ) при обращении с игровым оружием и пиротехникой влечет за собой дисциплинарные взыскания вплоть до исключения.<\/p><p><strong>6.3.<\/strong> Командир имеет право исключить участника за систематическое нарушение Устава или действия, дискредитирующие имя команды.<\/p><p><strong>6.4.<\/strong> Командир имеет право исключить участника за невыполнение обязательств перед командой: неучастие в мероприятиях, отсутствие вклада в проект, отказ от соблюдения стандартов, установленных командованием.<\/p><p><strong>6.5.<\/strong> Порядок применения санкций: факт нарушения фиксируется командованием (скриншот, свидетельство, дата). Участник уведомляется лично с указанием пункта Устава. Участнику даётся 48 часов на объяснение. Решение об исключении принимается командиром единолично и обжалованию не подлежит.<\/p>"},{"title":"7. Регламент фото- и видеосъемки, публикации медиа-материалов","content":"<p><strong>7.1. Внутреннее использование:<\/strong> Съемка фото- и видеоматериалов с участием личного состава команды на тренировках, сборах и закрытых мероприятиях разрешена. Данные материалы предназначены строго для публикации внутри официальной группы команды и в согласованном городском сообществе.<\/p><p><strong>7.2. Публикация на открытых площадках:<\/strong> Размещение видеоматериалов, прямо ассоциирующихся с командой «FOXHOUND», на сторонних открытых ресурсах (YouTube, Rutube, VK-видео, TikTok и др.) допускается только с личного одобрения Командира.<\/p><p><strong>7.3. Контроль контента:<\/strong> Решение о допуске видеоматериалов к публикации принимается Командиром единолично. Командир оценивает контент на предмет цензуры, адекватности поведения бойцов в кадре и соблюдения конфиденциальности.<\/p><p><strong>7.4. Участие в общих (межклубных) играх:<\/strong> Бойцам разрешено публиковать фото- и видеоматериалы с крупных открытых игр от своего личного имени. Главное условие — публикации не должны позиционироваться как официальный медиа-контент команды «FOXHOUND» (без прямой привязки к названию команды в заголовках, если контент не прошёл проверку Командиром).<\/p>"},{"title":"8. Форматы участия","content":"<p><strong>8.1.<\/strong> Основной формат: участник выходит на игры и тренировки в утверждённой форме FOXHOUND, принимает участие в мероприятиях команды.<\/p><p><strong>8.2.<\/strong> Альтернативный формат: участник не выходит на поле, но вкладывается в развитие команды иным способом — организация, медиа, снабжение, разработка, судейство. Альтернативный формат допускается для лиц, заинтересованных в страйкболе со стороны организаторов или не имеющих возможности выходить в форме.<\/p><p><strong>8.3.<\/strong> Смена формата участия осуществляется по личному заявлению командиру. Командир вправе отказать в смене формата без объяснения причин.<\/p><p><strong>8.4.<\/strong> Альтернативный формат участия не освобождает от соблюдения настоящего Устава.<\/p><p><strong>8.5.<\/strong> Требования к экипировке, стандарты формы и допустимые исключения (маскировочные элементы) устанавливаются командованием и публикуются отдельно.<\/p>"}]',1793255840);
CREATE TABLE radio_stations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    frequency       TEXT DEFAULT '',
    purpose         TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    tracks_json     TEXT DEFAULT '[]',
    sort_order      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
, folder TEXT DEFAULT '');
INSERT INTO radio_stations VALUES(1,'main_hq','CH 1: Главный Штаб','MAIN','ЧЕЛОВЕК, ПРОДАВШИЙ МИР','Главная тема команды FOXHOUND.','[{"title":"The Man Who Sold The World","src":"radio\/playlist_mgs\/man_who_sold_the_world.mp3"}]',0,1790334178,1793792081,'playlist_mgs');
CREATE TABLE map_polygons (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    center_lat   REAL NOT NULL,
    center_lng   REAL NOT NULL,
    zoom         INTEGER DEFAULT 14,
    layers_json  TEXT DEFAULT '[]',
    sort_order   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
INSERT INTO map_polygons VALUES(1,'lyaminskaya','Ляминская (Ханты-Мансийск)',60.988196203785002,69.069136161587,17,'[{"id":"red_zona","name":"Красная зона","url":"geojson\/lyaminskaya\/layer_1790853912.geojson","visible":true,"style":{"color":"#ff0000","weight":3,"fillColor":"#ff0000","fillOpacity":0.6}},{"id":"zndanya","name":"Здания","url":"geojson\/lyaminskaya\/layer_1790854007.geojson","visible":true,"style":{"color":"#000000","weight":2,"fillColor":"#ff6600","fillOpacity":1}},{"id":"les","name":"Лес","url":"geojson\/lyaminskaya\/layer_1790854058.geojson","visible":true,"style":{"color":"#327c35","weight":1,"fillColor":"#2e7d32","fillOpacity":0.2}},{"id":"line","name":"Горизонтали","url":"geojson\/lyaminskaya\/layer_1790854131.geojson","visible":true,"style":{"color":"#ff6600","weight":2,"fillColor":"#ff6600","fillOpacity":1}},{"id":"magistral","name":"Магистраль","url":"geojson\/lyaminskaya\/layer_1790854155.geojson","visible":true,"style":{"color":"#888888","weight":12,"fillColor":"#878787","fillOpacity":1}},{"id":"tropy","name":"Тропы","url":"geojson\/lyaminskaya\/layer_1790854199.geojson","visible":true,"style":{"color":"#33cc33","weight":2,"fillColor":"#36cb36","fillOpacity":1}},{"id":"roads","name":"Дороги","url":"geojson\/lyaminskaya\/layer_1790854257.geojson","visible":true,"style":{"color":"#888888","weight":8,"fillColor":"#878787","fillOpacity":1}}]',0,1790340761,1790855814);
CREATE TABLE logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    text        TEXT NOT NULL,
    style       TEXT DEFAULT '',
    sort_order  INTEGER DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);
INSERT INTO logs VALUES(22,'11.05','Создание команды','',17,1793372126,1793372126);
INSERT INTO logs VALUES(23,'11.05','Выполнение работ по разработке и размещению в информационно-телекоммуникационной сети "Интернет" официального сайта','',18,1793372179,1793372179);
INSERT INTO logs VALUES(24,'19.05','Разработка и публикация Экспресс-курс по медицине','',19,1793372200,1793372200);
INSERT INTO logs VALUES(25,'19.05','Проведение правового информирования по страйкболу','',20,1793372212,1793372212);
INSERT INTO logs VALUES(26,'24.05','Разработка и публикация инструкции по эксплуатации Baofeng UV-5R для подразделения FOXHOUND.','',21,1793372232,1793372232);
INSERT INTO logs VALUES(27,'24.05','Разработка и публикация инструкции по гирбоксам','',22,1793372243,1793372243);
INSERT INTO logs VALUES(28,'30.05','Оцифровка полигона «Ляминская»','',23,1793372251,1793372251);
INSERT INTO logs VALUES(29,'23.06','Разработка и тестирования прототипа программируемого таймера на базе ESP32','',24,1793372278,1793372278);
INSERT INTO logs VALUES(30,'28.06','Выполнение работ по развертыванию, проведению тестовых испытаний серверного программного обеспечения FreeTAKServer и клиентских приложений ATAK-CIV, а также разработке и публикации эксплуатационной документации','',25,1793372327,1793372327);
INSERT INTO logs VALUES(31,'30.06','Разработка и публикация сценария "Падение Черного Ястреба"','',26,1793372391,1793372391);
INSERT INTO logs VALUES(32,'04.07','Изготовление массогабаритного макета (антропоморфного манекена) «ЭДИК»','',27,1793372472,1793372472);
INSERT INTO logs VALUES(33,'10.07','Картографическое обеспечение и материально-техническое снабжение (закупка расходных материалов) для сценарной игры «Падение Черного Ястреба»','',28,1793372496,1793372496);
INSERT INTO logs VALUES(34,'19.07','Организация и проведение военно-тактического мероприятия (сценарной игры) «Падение Черного Ястреба»','',29,1793372519,1793372519);
INSERT INTO logs VALUES(35,'25.07','Корректировка и модернизация тактических условий (внесение изменений в текст) военно-тактического сценария «Падение Черного Ястреба»','',30,1793372539,1793372539);
INSERT INTO logs VALUES(36,'04.09','Публикация и размещение статьи «Полевой набор для ремонта приводов» на информационных ресурсах','',31,1793372581,1793372581);
INSERT INTO logs VALUES(37,'10.09','Проведение правового информирования по страйкболу','',32,1793372600,1793372600);
INSERT INTO logs VALUES(38,'14.09','Реализация и публикация программно-аппаратного проекта «Цифровой арсенал»','',33,1793372625,1793372625);
INSERT INTO logs VALUES(39,'20.09','Материально-техническое снабжение (закупка) знаков различия (вышитых шевронов и патчей на текстильной застежке «велкро»)','',34,1793372646,1793372646);
INSERT INTO logs VALUES(40,'22.09','Производство и публикация цикла мультимедийных материалов (серии коротких вертикальных видеоформатов Shorts) в рамках медиапроекта «Дневник Эдика»','',35,1793372670,1793372670);
INSERT INTO logs VALUES(41,'29.09','Модернизация и расширение функциональных возможностей (интерфейса и сервисов) официального сайта','',36,1793372697,1793372697);
INSERT INTO logs VALUES(42,'29.09','Размещение учебно-методических (обучающих) материалов по тактико-специальной подготовке (ТСП) на информационных ресурсах','',37,1793372720,1793372720);
INSERT INTO logs VALUES(43,'29.09','Разработка и нормативное утверждение Регламента проведения контроля дульной энергии и скорости (хронометрирования) страйкбольного оружия страйкбольной команды (СК) «FOXHOUND»','',38,1793372748,1793372748);
INSERT INTO logs VALUES(44,'30.09','Проектирование и методическая разработка типовых сценариев (классических режимов игры) для личного состава тактической команды','',39,1793372767,1793372767);
INSERT INTO logs VALUES(45,'05.10','Проектирование и формирование комплектов аутентичного игрового снаряжения и экипировки (китов) для участия в военно-тактических играх по тематике «Сталкерстрайк»','',40,1793372794,1793372794);
INSERT INTO logs VALUES(46,'10.10','Проектирование и разработка концепции программно-аппаратного комплекса «Единая платформа контроля игровых устройств на базе микроконтроллеров ESP32», включая создание и верификацию программного прототипа методами имитационного моделирования (эмуляции)','',41,1793372846,1793372846);
INSERT INTO logs VALUES(47,'20.10','Проектирование и изготовление аппаратно-программного комплекса (игрового симулятора взрывного устройства) на базе микроконтроллера ESP3','',42,1793372857,1793373089);
INSERT INTO logs VALUES(48,'23.10','Проектирование, программная разработка и публикация интегрированной цифровой системы управления тактической командой и учетом личного состава в рамках веб-ресурса','',43,1793372954,1793372959);
INSERT INTO logs VALUES(49,'30.10','Технологическая модернизация веб-ресурса: переход от классической архитектуры сайта к кроссплатформенному приложению реального времени (Real-time PWA)','',44,1793372995,1793373048);
CREATE TABLE event_rsvp (
    event_id     INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    status       TEXT NOT NULL CHECK(status IN ('going','not_going','maybe')),
    comment      TEXT DEFAULT '',
    updated_at   INTEGER NOT NULL,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);
CREATE TABLE event_logistics (
    event_id      INTEGER NOT NULL,
    user_id       INTEGER NOT NULL,
    is_driver     INTEGER DEFAULT 0,
    seats         INTEGER DEFAULT 0,
    pickup_point  TEXT DEFAULT '',
    needs_ride    INTEGER DEFAULT 0,
    ride_area     TEXT DEFAULT '',
    updated_at    INTEGER NOT NULL,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);
CREATE TABLE albums (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_photo TEXT DEFAULT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);
INSERT INTO albums VALUES(9,'black_hawk_2026','Операция «Черный Ястреб» 19.07.2026','⚡️ Операция «Черный Ястреб»: Как это было! ⚡','photos/black_hawk_2026/_cover_1790858033_dd774408.jpg',0,1790857357,1790858033);
CREATE TABLE channels (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL DEFAULT 'Разное',
    description  TEXT DEFAULT '',
    sort_order   INTEGER DEFAULT 0,
    is_private   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL
);
INSERT INTO channels VALUES(1,'general','общий','Основные','Общий канал для всех',0,0,1790440919);
INSERT INTO channels VALUES(2,'command','командование','Основные','Только для командования',1,1,1790440919);
INSERT INTO channels VALUES(3,'games','игры','Игровые','Обсуждение игр, сценариев, полигонов',2,0,1790440919);
INSERT INTO channels VALUES(4,'flood','флудилка','Разное','Флуд, мемы, оффтоп',3,0,1790440919);
CREATE TABLE channel_roles (
    channel_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    role        TEXT NOT NULL CHECK(role IN ('admin','moderator','member')),
    PRIMARY KEY (channel_id, user_id)
);
CREATE TABLE channel_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id   INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    text         TEXT NOT NULL,
    reply_to_id  INTEGER DEFAULT 0,
    is_deleted   INTEGER DEFAULT 0,
    edited_at    INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL
, attachment TEXT DEFAULT NULL);
INSERT INTO channel_messages VALUES(1,1,1,'Система для оперативного взаимодействия личного состава',0,0,1790686743,1790686690,NULL);
INSERT INTO channel_messages VALUES(2,1,4,'Йоу-йоу, проверка связи',0,0,0,1790867922,NULL);
INSERT INTO channel_messages VALUES(3,1,4,'Сайт прям реальная тема',0,0,0,1790868134,NULL);
INSERT INTO channel_messages VALUES(4,1,4,unistr('Безумно просто\u000aЭтим можно брать и обмазываться'),0,0,0,1790868145,NULL);
INSERT INTO channel_messages VALUES(5,1,1,'Есть такое',0,0,0,1790868966,NULL);
INSERT INTO channel_messages VALUES(6,1,1,unistr('Посмотри админ панель\u000aтам свой прикол'),0,0,0,1790870170,NULL);
INSERT INTO channel_messages VALUES(7,1,1,'а еще система оповещения',0,0,0,1790870180,NULL);
INSERT INTO channel_messages VALUES(8,1,6,'А еще меня быстро добавили в члены команды! Командир, а Черный Ястреб точно будет? Я все еще жду',0,0,0,1790914162,NULL);
INSERT INTO channel_messages VALUES(9,1,1,'Обязательно будет. Но потом',8,0,0,1790914665,NULL);
INSERT INTO channel_messages VALUES(10,1,6,'Понял, командир! Я жду.',9,0,0,1790918188,NULL);
INSERT INTO channel_messages VALUES(11,1,1,unistr('ВНИМАНИЕ\u000aВ настоящее время проводится тестирование функций. В случае обнаружения ошибок - баг-репорт мне'),0,0,0,1790918288,NULL);
INSERT INTO channel_messages VALUES(12,1,6,'Проверка входящего звука сообщения и уведомления',0,0,0,1790933784,NULL);
INSERT INTO channel_messages VALUES(13,1,1,'',0,1,0,1791043864,NULL);
INSERT INTO channel_messages VALUES(14,1,1,unistr('@all Друзья.\u000a\u000aНапоминаю: с началом сезона 2027 вводится единый стандарт экипировки. Все, кто выходит на игры и тренировки, должны быть в форме FOXHOUND в утверждённой палитре.\u000a\u000aИсключение — маскировочные элементы (маскхалаты и т.д.).\u000a\u000aАльтернатива для тех, кто не может или не хочет бегать в форме: помощь в развитии команды иным способом — организация, медиа, снабжение, разработка, судейство. Если интересен страйкбол со стороны оргов — это тоже вариант.\u000a\u000aУточнение: тюнинг AAP-01 альтернативным форматом участия не является. Это хобби. Помощь команде — это когда ты делаешь что-то для команды, а не для своего пистолета.\u000a\u000aТе, кто до начала сезона не определится — исключаются по п. 6.4 Устава.\u000a\u000aЕсли увижу мультикам — исключу по п. 6.4.\u000aЕсли увижу мох — исключу по п. 6.4, но с особым цинизмом.\u000aМох — это не камуфляж. Это признание, что ты сдался.\u000a\u000aФакт нарушения фиксируется командованием. Участник уведомляется лично. Решение об исключении принимается командиром единолично и обжалованию не подлежит.\u000a\u000aПодробности — в Уставе, п. 6.4, 6.5, раздел 8.'),0,0,1791861627,1791860589,NULL);
INSERT INTO channel_messages VALUES(15,1,1,'',0,1,0,1791860762,NULL);
INSERT INTO channel_messages VALUES(16,1,13,'',0,1,0,1793255796,NULL);
INSERT INTO channel_messages VALUES(17,1,13,'',0,1,1793255797,1793255796,NULL);
INSERT INTO channel_messages VALUES(18,1,13,'',17,1,0,1793255797,NULL);
INSERT INTO channel_messages VALUES(19,1,13,'',0,1,0,1793255799,NULL);
INSERT INTO channel_messages VALUES(20,1,13,'',0,1,0,1793255799,NULL);
INSERT INTO channel_messages VALUES(21,1,13,'',0,1,0,1793255799,NULL);
INSERT INTO channel_messages VALUES(22,1,13,'',0,1,0,1793255835,NULL);
INSERT INTO channel_messages VALUES(94,1,8,'Уведомления от Эдика как отдельный вид искусства #эдикжив',0,0,0,1794564249,NULL);
INSERT INTO channel_messages VALUES(95,1,6,'Ты не тащил меня на полигоне, вот и читай теперь',0,0,1794564520,1794564395,NULL);
INSERT INTO channel_messages VALUES(107,1,1,'Вепс обнови аватарку',0,0,0,1794589854,'uploads/chat/chat_1794589854_1fd10757.webp');
INSERT INTO channel_messages VALUES(108,1,1,'Медик и Вепс. Ваши роли обновлены. Предоставлен полный доступ к системе управления личным составом.',0,0,0,1794815368,NULL);
INSERT INTO channel_messages VALUES(109,1,1,'Остальные участники - вам предоставлены роли "Администратор"',0,0,0,1794828722,NULL);
CREATE TABLE channel_reactions (
    message_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    emoji       TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
);
CREATE TABLE user_status (
    user_id      INTEGER PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'online',
    custom_text  TEXT DEFAULT '',
    updated_at   INTEGER NOT NULL
);
INSERT INTO user_status VALUES(1,'online','',1795430004);
INSERT INTO user_status VALUES(4,'away','',1791305872);
INSERT INTO user_status VALUES(6,'online','',1794767363);
INSERT INTO user_status VALUES(7,'offline','',1793373887);
INSERT INTO user_status VALUES(8,'online','',1794848749);
INSERT INTO user_status VALUES(11,'away','',1792608119);
INSERT INTO user_status VALUES(12,'offline','',1793255430);
INSERT INTO user_status VALUES(13,'offline','',1793255444);
INSERT INTO user_status VALUES(14,'online','',1794589431);
INSERT INTO user_status VALUES(15,'offline','',1794828552);
INSERT INTO user_status VALUES(16,'offline','',1794828596);
CREATE TABLE channel_reads (
    channel_id            INTEGER NOT NULL,
    user_id               INTEGER NOT NULL,
    last_read_message_id  INTEGER DEFAULT 0,
    updated_at            INTEGER NOT NULL,
    PRIMARY KEY (channel_id, user_id)
);
INSERT INTO channel_reads VALUES(2,1,15,1793266871);
INSERT INTO channel_reads VALUES(4,1,11,1790933748);
INSERT INTO channel_reads VALUES(3,1,0,1790669275);
INSERT INTO channel_reads VALUES(1,1,109,1795426113);
INSERT INTO channel_reads VALUES(2,4,0,1790867875);
INSERT INTO channel_reads VALUES(4,4,0,1790867875);
INSERT INTO channel_reads VALUES(3,4,0,1790867875);
INSERT INTO channel_reads VALUES(1,4,13,1791092922);
INSERT INTO channel_reads VALUES(2,6,0,1790911368);
INSERT INTO channel_reads VALUES(4,6,7,1790914094);
INSERT INTO channel_reads VALUES(3,6,0,1790911368);
INSERT INTO channel_reads VALUES(1,6,107,1794767336);
INSERT INTO channel_reads VALUES(2,7,0,1791015404);
INSERT INTO channel_reads VALUES(4,7,0,1791015404);
INSERT INTO channel_reads VALUES(3,7,0,1791015404);
INSERT INTO channel_reads VALUES(1,7,15,1793373843);
INSERT INTO channel_reads VALUES(2,8,0,1791017079);
INSERT INTO channel_reads VALUES(4,8,0,1791017079);
INSERT INTO channel_reads VALUES(3,8,0,1791017079);
INSERT INTO channel_reads VALUES(1,8,109,1794848347);
INSERT INTO channel_reads VALUES(2,11,0,1792429081);
INSERT INTO channel_reads VALUES(4,11,0,1792429081);
INSERT INTO channel_reads VALUES(3,11,0,1792429081);
INSERT INTO channel_reads VALUES(1,11,15,1792429081);
INSERT INTO channel_reads VALUES(2,12,0,1793255422);
INSERT INTO channel_reads VALUES(4,12,0,1793255422);
INSERT INTO channel_reads VALUES(3,12,0,1793255422);
INSERT INTO channel_reads VALUES(1,12,15,1793255422);
INSERT INTO channel_reads VALUES(2,13,0,1793255440);
INSERT INTO channel_reads VALUES(4,13,0,1793255440);
INSERT INTO channel_reads VALUES(3,13,0,1793255440);
INSERT INTO channel_reads VALUES(1,13,27,1793255838);
INSERT INTO channel_reads VALUES(2,14,0,1794588499);
INSERT INTO channel_reads VALUES(4,14,0,1794588499);
INSERT INTO channel_reads VALUES(3,14,0,1794588499);
INSERT INTO channel_reads VALUES(1,14,95,1794589503);
INSERT INTO channel_reads VALUES(2,15,0,1794828521);
INSERT INTO channel_reads VALUES(4,15,0,1794828521);
INSERT INTO channel_reads VALUES(3,15,0,1794828521);
INSERT INTO channel_reads VALUES(1,15,108,1794828521);
INSERT INTO channel_reads VALUES(2,16,0,1794828574);
INSERT INTO channel_reads VALUES(4,16,0,1794828574);
INSERT INTO channel_reads VALUES(3,16,0,1794828574);
INSERT INTO channel_reads VALUES(1,16,108,1794828574);
CREATE TABLE event_ride_bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id    INTEGER NOT NULL,
    driver_id   INTEGER NOT NULL,
    rider_id    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    UNIQUE (event_id, rider_id)
);
CREATE TABLE docs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    link         TEXT NOT NULL,
    doc_date     TEXT DEFAULT '',
    doc_number   TEXT DEFAULT '',
    sort_order   INTEGER DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
INSERT INTO docs VALUES(3,'Базовый комплект снаряжения бойца FOXHOUND.','Стандарт, обеспечивающий единый визуальный стиль команды.','https://drive.google.com/file/d/1r7yespOtp_Hzl7A3adlxJbPfdnFHxVH-/view?usp=drive_link','от 16.05.2026','5',0,1791004139,1791005905);
INSERT INTO docs VALUES(4,'Альтернативный (бюджетный) комплект обмундирования бойца FOXHOUND.','Стандарт, обеспечивающий единый визуальный стиль команды.','https://drive.google.com/file/d/1_b03Yor_m6FYMw6fVCPAHwtGOVQnRYTb/view?usp=drive_link','от 18.05.2026','6',1,1791004615,1791005915);
INSERT INTO docs VALUES(5,'Регламент проведения контроля дульной энергии и скорости (хронометрирования) страйкбольного оружия СК “FOXHOUND”','Регламент порядка проведения контроля дульной энергии и скорости вылета шара (хронометрирования) страйкбольного оружия, используемого бойцами СК «FOXHOUND», а также порядка допуска оружия к командным тренировкам и официальным играм.','https://drive.google.com/file/d/1uaZ0L-MlogLL5aSd4_TX37diDGJbXcmM/view?usp=drive_link','от 14.09.2026','10',2,1791005520,1791005926);
ANALYZE sqlite_schema;
INSERT INTO sqlite_stat1 VALUES('channel_reads','sqlite_autoindex_channel_reads_1','32 8 1');
INSERT INTO sqlite_stat1 VALUES('user_status',NULL,'10');
INSERT INTO sqlite_stat1 VALUES('logs','idx_logs_sort','11 1 1');
INSERT INTO sqlite_stat1 VALUES('event_ride_bookings','idx_bookings_driver','1 1');
INSERT INTO sqlite_stat1 VALUES('event_ride_bookings','idx_bookings_event','1 1');
INSERT INTO sqlite_stat1 VALUES('event_ride_bookings','sqlite_autoindex_event_ride_bookings_1','1 1 1');
INSERT INTO sqlite_stat1 VALUES('channel_messages','idx_channel_messages_channel','15 15');
INSERT INTO sqlite_stat1 VALUES('channel_messages','idx_channel_messages_user','15 5');
INSERT INTO sqlite_stat1 VALUES('map_polygons','idx_maps_sort','1 1 1');
INSERT INTO sqlite_stat1 VALUES('map_polygons','sqlite_autoindex_map_polygons_1','1 1');
INSERT INTO sqlite_stat1 VALUES('radio_stations','idx_radio_sort','11 1 1');
INSERT INTO sqlite_stat1 VALUES('radio_stations','sqlite_autoindex_radio_stations_1','11 1');
INSERT INTO sqlite_stat1 VALUES('albums','idx_albums_sort','1 1 1');
INSERT INTO sqlite_stat1 VALUES('albums','sqlite_autoindex_albums_1','1 1');
INSERT INTO sqlite_stat1 VALUES('regulations_sections',NULL,'1');
INSERT INTO sqlite_stat1 VALUES('channels','sqlite_autoindex_channels_1','4 1');
INSERT INTO sqlite_stat1 VALUES('event_rsvp','idx_rsvp_event','12 2');
INSERT INTO sqlite_stat1 VALUES('event_rsvp','sqlite_autoindex_event_rsvp_1','12 2 1');
INSERT INTO sqlite_stat1 VALUES('atak_sections',NULL,'1');
INSERT INTO sqlite_stat1 VALUES('devices','idx_devices_sort','6 1 1');
INSERT INTO sqlite_stat1 VALUES('devices','sqlite_autoindex_devices_1','6 1');
INSERT INTO sqlite_stat1 VALUES('event_logistics','idx_logistics_event','5 2');
INSERT INTO sqlite_stat1 VALUES('event_logistics','sqlite_autoindex_event_logistics_1','5 2 1');
INSERT INTO sqlite_stat1 VALUES('users','sqlite_autoindex_users_1','6 1');
INSERT INTO sqlite_stat1 VALUES('docs','idx_docs_sort','3 1 1');
INSERT INTO sqlite_stat1 VALUES('scenarios','idx_scenarios_sort','7 1 1');
INSERT INTO sqlite_stat1 VALUES('scenarios','sqlite_autoindex_scenarios_1','7 1');
INSERT INTO sqlite_stat1 VALUES('operators','idx_operators_sort','7 1 1');
INSERT INTO sqlite_stat1 VALUES('photos','idx_photos_album','6 6');
INSERT INTO sqlite_stat1 VALUES('photos','idx_photos_created_at','6 2');
INSERT INTO sqlite_stat1 VALUES('instructions','idx_instructions_sort','12 1 1');
CREATE TABLE command_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT DEFAULT '',
    signed_by TEXT DEFAULT 'Командир',
    is_reward INTEGER DEFAULT 1,
    FOREIGN KEY (operator_id) REFERENCES operators(id) ON DELETE CASCADE
);
INSERT INTO command_actions VALUES(1,2,'2026-05-19','Благодарность','Разработка Экспресс-курса по медицине','Командир',1);
INSERT INTO command_actions VALUES(2,3,'2026-05-19','Благодарность','Проведение правового информирования по страйкболу','Командир',1);
INSERT INTO command_actions VALUES(3,3,'2026-09-10','Благодарность','Проведение правового информирования по страйкболу','Командир',1);
INSERT INTO command_actions VALUES(4,2,'2026-07-19','Благодарность','Успешное проведение сценарной игры «Чёрный ястреб»','Командир',1);
INSERT INTO command_actions VALUES(5,3,'2026-07-19','Благодарность','Успешное проведение сценарной игры «Чёрный ястреб»','Командир',1);
INSERT INTO command_actions VALUES(6,6,'2026-07-19','Благодарность','Успешное проведение сценарной игры «Чёрный ястреб»','Командир',1);
INSERT INTO command_actions VALUES(7,6,'2026-10-10','Благодарность','Разработка минимального набора для Сталкерстрайка','Командир',1);
CREATE TABLE command_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, direction TEXT NOT NULL, task TEXT NOT NULL, assignee TEXT DEFAULT '', priority TEXT DEFAULT 'Средний', status TEXT DEFAULT 'План', start_date TEXT DEFAULT '', end_date TEXT DEFAULT '', budget REAL DEFAULT 0, comment TEXT DEFAULT '', sort_order INTEGER DEFAULT 0);
INSERT INTO command_plan VALUES(4,'🇺🇳 Организация','Создание команды','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-05-11',0.0,'Выполнено 11.05.2026',0);
INSERT INTO command_plan VALUES(5,'♾️ Постоянная деятельность','Набор в команду (Вербовка)','ВСЕ','🔴 Высокий','♾️ Постоянная деятельность','2026-05-11','2026-12-31',0.0,'Постоянно',1);
INSERT INTO command_plan VALUES(6,'👨‍💻 Разработка','Выполнение работ по разработке и размещению в информационно-телекоммуникационной сети "Интернет" официального сайта','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-05-30',0.0,'',2);
INSERT INTO command_plan VALUES(7,'📚 Обучение','Разработка и публикация Экспресс-курс по медицине','Медик','🟡 Средний','✔️ Готово','2026-05-11','2026-05-30',0.0,'',3);
INSERT INTO command_plan VALUES(8,'📚 Обучение','Выполнение работ по разработке и размещению в информационно-телекоммуникационной сети "Интернет" официального сайта','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-05-11','2026-05-30',0.0,'',4);
INSERT INTO command_plan VALUES(9,'📚 Обучение','Разработка и публикация инструкции по гирбоксам','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-05-11','2026-05-30',0.0,'',5);
INSERT INTO command_plan VALUES(10,'📚 Обучение','Проведение правового информирования по страйкболу','ВЕПС','🟡 Средний','✔️ Готово','2026-05-11','2026-05-30',0.0,'Выполнено 19.05.2026',6);
INSERT INTO command_plan VALUES(11,'👨‍💻 Разработка','Оцифровка полигона «Ляминская»','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-05-30',0.0,'Выполнено 30.05.2026',7);
INSERT INTO command_plan VALUES(12,'♾️ Постоянная деятельность','Создание Группы в ВК и публикация постов','ЕРЕТИК','🟡 Средний','♾️ Постоянная деятельность','2026-05-11','2026-12-31',0.0,'Постоянно',8);
INSERT INTO command_plan VALUES(13,'🎬 Сценарии/игры','Разработка и публикация сценария "Падение Черного Ястреба"','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-06-30',0.0,'',9);
INSERT INTO command_plan VALUES(14,'👨‍💻 Разработка','Разворачивание и проведение тестового запуска FTS для ATAK-CIV с публикацией инструкции по работе','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-06-30',20.0,'Выполнено 28.06.2026',10);
INSERT INTO command_plan VALUES(15,'👔 Экипировка','Утверждение единой формы оперативника, приведение формы к единому стандарту','ВСЕ','🔴 Высокий','✏️ В работе','2026-05-11','2026-12-31',0.0,'с переносом на 2027 год',11);
INSERT INTO command_plan VALUES(16,'♾️ Постоянная деятельность','Пиар команды','ВСЕ','🟡 Средний','♾️ Постоянная деятельность','2026-05-11','2026-12-31',0.0,'Постоянно',12);
INSERT INTO command_plan VALUES(17,'🇺🇳 Организация','Закупка шевронов','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-05-11','2026-12-31',2000.0,'Выполнено 20.09.2026',13);
INSERT INTO command_plan VALUES(18,'👨‍💻 Разработка','Создание манекена "ЭДИК"','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-06-01','2026-07-19',1000.0,'Выполнено 04.07.2026',14);
INSERT INTO command_plan VALUES(19,'👨‍💻 Разработка','Прототип программируемого таймера на базе ESP32','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-06-01','2026-07-19',2600.0,'Выполнено 23.06.2026',15);
INSERT INTO command_plan VALUES(20,'🇺🇳 Организация','Формирование карт и закупка иных расходников для сценария «Падение Черного Ястреба»','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-06-01','2026-07-19',0.0,'',16);
INSERT INTO command_plan VALUES(21,'👨‍💻 Разработка','Разработка Бомбы (ESP32)','ЕРЕТИК','🟢 Низкий','✔️ Готово','2026-06-01','2026-11-30',1500.0,'Выполнено 20.10.2026',17);
INSERT INTO command_plan VALUES(22,'🎬 Сценарии/игры','Проведение сценария "Падение Черного Ястреба"','ВСЕ','🔴 Высокий','✔️ Готово','2026-06-30','2026-07-19',0.0,'Выполнено 19.07.2026',18);
INSERT INTO command_plan VALUES(23,'🎬 Сценарии/игры','Доработка сценария "Падение Черного Ястреба"','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-07-19','2026-07-25',0.0,'',19);
INSERT INTO command_plan VALUES(24,'🎬 Сценарии/игры','Разработка сценария по мотивам SCP','НЕКСОР','🟢 Низкий','❌ Отменено','2026-08-01','2026-12-31',0.0,'-',20);
INSERT INTO command_plan VALUES(25,'👔 Экипировка','Разработка китов для сталкерстрайка','НЕКСОР','🟡 Средний','✔️ Готово','2026-08-01','2026-12-31',0.0,'На доработку',21);
INSERT INTO command_plan VALUES(26,'📚 Обучение','Статья «Полевой набор для ремонта приводов»','ЕРЕТИК','🟢 Низкий','✔️ Готово','2026-09-01','2026-09-30',0.0,'Выполнено 04.09.2026',22);
INSERT INTO command_plan VALUES(27,'👨‍💻 Разработка','Расширение функционала сайта','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-09-01','2026-12-31',0.0,'Выполнено 29.09.2026',23);
INSERT INTO command_plan VALUES(28,'📚 Обучение','Проведение правового информирования по страйкболу','ВЕПС','🟡 Средний','✔️ Готово','2026-09-01','2026-09-30',0.0,'Выполнено 10.09.2026',24);
INSERT INTO command_plan VALUES(29,'👨‍💻 Разработка','Вторая версия программируемого таймера на базе ESP32','ЕРЕТИК','🟡 Средний','✏️ В работе','2026-09-01','2026-11-30',1000.0,'Осталось спаять',25);
INSERT INTO command_plan VALUES(30,'👨‍💻 Разработка','Разработка Точек захвата на базе ESP32','ЕРЕТИК','🟡 Средний','✏️ В работе','2026-09-01','2026-11-30',2000.0,'Разработан код',26);
INSERT INTO command_plan VALUES(31,'👨‍💻 Разработка','Разработка игрового терминала Вальгалла','ЕРЕТИК','🟡 Средний','❌ Отменено','2026-09-01','2026-11-30',15000.0,'Нецелесообразно. Наработки переданы в проект «Цифровой арсенал»',27);
INSERT INTO command_plan VALUES(32,'👨‍💻 Разработка','Проект «Цифровой арсенал». Разработка игрового ПО для мобильный устройств на базе Android','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-09-01','2026-09-30',0.0,'',28);
INSERT INTO command_plan VALUES(33,'📚 Обучение','Изучение литературы по ТСП и MARCH','ЕРЕТИК','🔴 Высокий','✏️ В работе','2026-09-01','2026-12-31',0.0,'Подготовка материалов',29);
INSERT INTO command_plan VALUES(34,'👩‍🎨 Контент','Медиа-контент «Дневник Эдика». Публикация контента','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-09-01','2026-12-31',0.0,'',30);
INSERT INTO command_plan VALUES(35,'♾️ Постоянная деятельность','Создание каналов на YouTube, Instagram и публикация контента','ЕРЕТИК','🟡 Средний','♾️ Постоянная деятельность','2026-09-01','2026-12-31',0.0,'Постоянно',31);
INSERT INTO command_plan VALUES(36,'👨‍💻 Разработка','Разработка прототипа системы «Единая платформа для контроля игровых устройств на базе ESP32»','ЕРЕТИК','🟢 Низкий','✔️ Готово','2026-09-01','2026-12-31',0.0,'Разработка концепции и программного прототипа через эмуляцию. Выполнено 10.10.2026.',32);
INSERT INTO command_plan VALUES(37,'📚 Обучение','Размещение обучающих материалов по ТСП','ЕРЕТИК','🟡 Средний','✔️ Готово','2026-09-01','2026-09-30',0.0,'Выполнено 29.09.2026',33);
INSERT INTO command_plan VALUES(38,'🎬 Сценарии/игры','Разработка классических режимов игры (сценариев) для команды','ЕРЕТИК','🟢 Низкий','✔️ Готово','2026-09-01','2026-12-31',0.0,'Выполнено 30.09.2026',34);
INSERT INTO command_plan VALUES(39,'🇺🇳 Организация','Разработка и утверждение Регламента проведения контроля дульной энергии и скорости (хронометрирования) страйкбольного оружия СК "FOXHOUND"','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-09-14','2026-09-30',0.0,'Выполнено 29.09.2026',35);
INSERT INTO command_plan VALUES(40,'🎬 Сценарии/игры','Подготовка материалов и рассмотрение целесообразности проведения игры по мотивам EFT от оператора СОЛО','','🟡 Средний','❌ Отменено','2026-10-01','2026-10-31',0.0,'',36);
INSERT INTO command_plan VALUES(41,'🇺🇳 Организация','Подведение итогов года, объявление благодарностей','ЕРЕТИК','🔴 Высокий','✏️ В работе','2026-12-01','2026-12-15',5000.0,'',37);
INSERT INTO command_plan VALUES(42,'👨‍💻 Разработка','Разработка цифровой системы управления командой и личным составом','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-08-01','2026-10-30',0.0,'',38);
INSERT INTO command_plan VALUES(43,'👨‍💻 Разработка','Оптимизация архитектуры, унификация стилей и аудит серверного окружения.','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-08-10','2026-10-30',0.0,'',39);
INSERT INTO command_plan VALUES(44,'👨‍💻 Разработка','Переход от классического сайта к полноценному Real-time PWA','ЕРЕТИК','🔴 Высокий','✔️ Готово','2026-08-01','2026-10-31',0.0,'',40);
CREATE TABLE recruitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    callsign TEXT NOT NULL,
    full_name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    phone TEXT NOT NULL,
    telegram TEXT DEFAULT '',
    vk TEXT DEFAULT '',
    motivation TEXT NOT NULL,
    status TEXT DEFAULT 'Новая',
    admin_comment TEXT DEFAULT '',
    created_at INTEGER NOT NULL
);
CREATE TABLE user_typing (
    user_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, channel_id)
);
INSERT INTO user_typing VALUES(1,6,1793349884);
INSERT INTO user_typing VALUES(6,1,1794564392);
INSERT INTO user_typing VALUES(6,6,1793347580);
INSERT INTO user_typing VALUES(1,1,1794830238);
INSERT INTO user_typing VALUES(1,7,1793369728);
INSERT INTO user_typing VALUES(6,7,1793351881);
INSERT INTO user_typing VALUES(1,8,1793441489);
INSERT INTO user_typing VALUES(1,9,1794562972);
INSERT INTO user_typing VALUES(6,9,1794563958);
INSERT INTO user_typing VALUES(8,1,1794564247);
INSERT INTO user_typing VALUES(6,10,1794587885);
INSERT INTO user_typing VALUES(1,10,1794588561);
INSERT INTO user_typing VALUES(14,10,1794588526);
CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
INSERT INTO push_subscriptions VALUES(51,8,'https://web.push.apple.com/QH1NRQxkaRVnG5EKLPanXVNGTjc6oYMlJXHgYlzfMUNMXuzhmElrZD-hWHw02LXnWuLeF0XpOTzoe4h2NpfbypQKNZi-cJyej_bgeeYQTC1hfFyGw6u4lagi5KYbm0E56IgENbFCbyGk7MM1SqP2T5GX0Z3up42Tk4mzwRzkuRs','BAJe5eqaqHcsmCzu2WdMvLIUaPnJklwdUlwgjqhC4OU3bBMyLBA7sC4K05cb0D9hoIMBsH7qokUbZGF6UMbVcBY','zLCiXw2Awhm4086Iy8TNRg',1793369371);
INSERT INTO push_subscriptions VALUES(159,1,'https://fcm.googleapis.com/fcm/send/f-C0hqfbo4w:APA91bF4Z-Amy6-HvsKXMZBun3w4z7dP4IJ79eJY0raetL7rdYszdyM0Et4-1VbH12Att1iBKgNaNsR5daM45c-WrcmDkDr9A3aeu-1YXsy0524wp63ryE8N2eTaxq7axkdcgyXTkaYM','BCRlDbG6rZohtKhnInYdK6Xz5Q_DJd7FvyS0IUWJ0iiNo-x5ixBeRk61bS5UQ1xt5pEPo25yjv3YShuGQ5W09NI','0v0_thUNEWlo0H9uMIMThQ',1794589824);
INSERT INTO push_subscriptions VALUES(160,1,'https://fcm.googleapis.com/fcm/send/cpMRsRPg2_o:APA91bG7jo9bGqqLvFDIpiyWAV2AeFdZwa_ekAW1-t2Z7Ec4bh3Vm_uXiUJxUHOQWwmQq7UseqFAtcGLvi4GfvDqJtEHYGRQDyZK-Niu9jrwDREnTDSRlAZA9N5-_u5IVPux14dgOaEc','BI_bfsKIb63RxaFM48bFKG5gixn4JmAH3GJR4HC_5D5eXJVp7JQkZQt0B49Vgwb6O_g205786bTGDzLy_0o15AU','csN2sazkWY3RUpdiW5QlYA',1794590627);
INSERT INTO push_subscriptions VALUES(163,1,'https://fcm.googleapis.com/fcm/send/cDwr40NsJXg:APA91bHqwvOkxGaQ0S4OOG4qfNsol-aF5yZpV3LtgUCTCLCtAmOkp64V2O9oGNInE0F_SGlWzY5FAMWOdDB9SK5Tk7f0MWhYWXwZMqNNJ4-vmO29wf_lsgw-SoPQq_g_Bbg1RtbvYQmZ','BCeHXpjOvmdbDAvjtQoi0rgtrnm1N2t7I7pza5VOEHs_K_ZNds5RLbyvmgTyxbaBxTvtPJ0a8WWKTbmi1zuUXmY','ur-ncluRl43ESuyvRoKLPg',1794591120);
INSERT INTO push_subscriptions VALUES(167,1,'https://fcm.googleapis.com/fcm/send/clWBaDDMO7U:APA91bGOcwYL4TnTmRu4VvRtDKMoVhYIRSlozKbBKX-GfcogNTjPgy_96jv6ZKnPWFxW508MszGrBhO0DJWyMPtcwwuxsPxMKodLrxVcZ9b2zr1A_mkXlWHZiaRBXx9VwAH7uVzfYLfC','BJHiMQQzkB4tYPkNnmiZiVP9EVdsM-0fcsTwB-eryormPU5vzpIhasORv4SS5O2mDTRF3aTW9v77UpL8bC4MiMQ','se9NhNEg9JmOQ8p3go6mYA',1794719565);
CREATE TABLE rate_limits (
    ip TEXT,
    action TEXT,
    attempts INTEGER DEFAULT 0,
    last_attempt INTEGER,
    PRIMARY KEY (ip, action)
);
INSERT INTO rate_limits VALUES('31.173.103.121','login',1,1794599984);
INSERT INTO rate_limits VALUES('5.141.115.94','login',1,1795079311);
INSERT INTO rate_limits VALUES('5.141.115.94','register',1,1794588499);
INSERT INTO rate_limits VALUES('5.141.115.201','login',1,1794681586);
INSERT INTO rate_limits VALUES('178.178.242.213','login',1,1794747487);
INSERT INTO rate_limits VALUES('178.178.242.200','login',1,1794767333);
INSERT INTO rate_limits VALUES('178.176.112.14','register',2,1794828573);
INSERT INTO rate_limits VALUES('178.176.112.14','login',2,1794828603);
INSERT INTO rate_limits VALUES('89.253.40.161','login',1,1794848345);
INSERT INTO rate_limits VALUES('178.178.93.220','login',1,1794925523);
INSERT INTO rate_limits VALUES('83.149.37.92','login',1,1795016677);
INSERT INTO rate_limits VALUES('5.141.115.10','login',1,1795030576);
INSERT INTO rate_limits VALUES('5.141.115.105','login',1,1795117201);
INSERT INTO rate_limits VALUES('178.178.89.61','login',1,1795232023);
INSERT INTO rate_limits VALUES('31.173.120.120','login',1,1795324857);
INSERT INTO rate_limits VALUES('178.178.240.114','login',1,1795426071);
PRAGMA writable_schema=ON;
CREATE TABLE IF NOT EXISTS sqlite_sequence(name,seq);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',16);
INSERT INTO sqlite_sequence VALUES('polls',21);
INSERT INTO sqlite_sequence VALUES('events',39);
INSERT INTO sqlite_sequence VALUES('photos',24);
INSERT INTO sqlite_sequence VALUES('operators',15);
INSERT INTO sqlite_sequence VALUES('instructions',16);
INSERT INTO sqlite_sequence VALUES('scenarios',11);
INSERT INTO sqlite_sequence VALUES('devices',8);
INSERT INTO sqlite_sequence VALUES('atak_sections',6);
INSERT INTO sqlite_sequence VALUES('regulations_sections',6);
INSERT INTO sqlite_sequence VALUES('radio_stations',15);
INSERT INTO sqlite_sequence VALUES('map_polygons',4);
INSERT INTO sqlite_sequence VALUES('logs',49);
INSERT INTO sqlite_sequence VALUES('albums',11);
INSERT INTO sqlite_sequence VALUES('channels',10);
INSERT INTO sqlite_sequence VALUES('event_ride_bookings',4);
INSERT INTO sqlite_sequence VALUES('channel_messages',109);
INSERT INTO sqlite_sequence VALUES('docs',7);
INSERT INTO sqlite_sequence VALUES('command_plan',46);
INSERT INTO sqlite_sequence VALUES('command_actions',7);
INSERT INTO sqlite_sequence VALUES('recruitments',7);
INSERT INTO sqlite_sequence VALUES('push_subscriptions',168);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_polls_expires_at ON polls(expires_at);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_operators_sort ON operators(sort_order ASC, id ASC);
CREATE INDEX idx_instructions_sort ON instructions(sort_order ASC, id ASC);
CREATE INDEX idx_scenarios_sort ON scenarios(sort_order ASC, id ASC);
CREATE INDEX idx_devices_sort ON devices(sort_order ASC, id ASC);
CREATE INDEX idx_radio_sort ON radio_stations(sort_order ASC, id ASC);
CREATE INDEX idx_maps_sort ON map_polygons(sort_order ASC, id ASC);
CREATE INDEX idx_logs_sort ON logs(sort_order ASC, id ASC);
CREATE INDEX idx_rsvp_event ON event_rsvp(event_id);
CREATE INDEX idx_logistics_event ON event_logistics(event_id);
CREATE INDEX idx_albums_sort ON albums(sort_order ASC, id ASC);
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_channel_messages_user    ON channel_messages(user_id);
CREATE INDEX idx_channel_reactions_msg ON channel_reactions(message_id);
CREATE INDEX idx_bookings_event  ON event_ride_bookings(event_id);
CREATE INDEX idx_bookings_driver ON event_ride_bookings(driver_id);
CREATE INDEX idx_docs_sort ON docs(sort_order ASC, id ASC);
CREATE INDEX idx_channel_messages_channel ON channel_messages(channel_id);
PRAGMA writable_schema=OFF;
COMMIT;
