<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'method not allowed'], 405);
}

$input  = json_decode(file_get_contents('php://input'), true);
$userId = $input['userId'] ?? '';

if (!$userId) {
    json_response(['error' => 'userId required'], 400);
}

$tokenPath = '/resources/accessTokens/sdk';
$tokenBody = json_encode(['userId' => $userId, 'levelName' => SUMSUB_LEVEL_NAME, 'ttlInSecs' => 3600]);
$result    = sumsub_request('POST', $tokenPath, $tokenBody);

if ($result['code'] < 200 || $result['code'] >= 300) {
    json_response(['error' => 'refresh failed', 'detail' => $result['body']], 500);
}

json_response(['token' => $result['body']['token']]);
