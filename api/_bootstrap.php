<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';
require_once __DIR__ . '/_uploads.php';
require_once __DIR__ . '/_reorder.php';

csrf_check();