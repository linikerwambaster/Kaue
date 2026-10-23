<?php
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$id = isset($_GET['id']) ? $_GET['id'] : '';
if (!preg_match('/^[A-Za-z0-9_-]{4,64}$/', $id)) {
    http_response_code(400);
    echo json_encode(['status' => 'INVALID']);
    exit;
}

list($http, $r) = gladepay_request('GET', '/deposito/status?txId=' . rawurlencode($id));
if ($http >= 200 && $http < 300 && isset($r['status'])) {
    echo json_encode(['status' => $r['status']]);
} else {
    http_response_code(502);
    echo json_encode(['status' => 'UNKNOWN']);
}
