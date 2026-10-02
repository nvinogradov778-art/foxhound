<?php
declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

require_auth();

$lat  = (float)($_GET['lat']  ?? 56.8389);
$lng  = (float)($_GET['lng']  ?? 60.6057);
$date = preg_replace('/[^0-9\-]/', '', $_GET['date'] ?? '') ?? '';
if ($date === '') $date = date('Y-m-d');

$cacheDir = __DIR__ . '/../data/weather_cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);

$cacheKey  = md5($lat . '_' . $lng . '_' . $date);
$cacheFile = $cacheDir . '/' . $cacheKey . '.json';

// Свежий кэш — сразу отдаём
if (is_file($cacheFile) && (time() - filemtime($cacheFile) < 6 * 3600)) {
    readfile($cacheFile);
    exit;
}

$url = 'https://api.open-meteo.com/v1/forecast'
     . '?latitude=' . urlencode((string)$lat)
     . '&longitude=' . urlencode((string)$lng)
     . '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max'
     . '&timezone=auto'
     . '&start_date=' . urlencode($date)
     . '&end_date=' . urlencode($date);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_USERAGENT      => 'foxhound-team.ru'
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    // Отдаём старый кэш, если он есть
    if (is_file($cacheFile)) {
        readfile($cacheFile);
        exit;
    }

    fail(502, 'Не удалось получить прогноз');
}

if (!is_array(json_decode($response, true))) {
    fail(502, 'Некорректный ответ API');
}

file_put_contents($cacheFile, $response);
echo $response;