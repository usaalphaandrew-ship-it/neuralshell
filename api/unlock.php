<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'method not allowed'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);
$key   = $input['key'] ?? '';

if ($key !== ACCESS_KEY) {
    json_response(['error' => 'invalid key'], 401);
}

$userId     = 'ns_' . bin2hex(random_bytes(10));
$levelName  = SUMSUB_LEVEL_NAME;

// 1. Create applicant
$createPath = '/resources/applicants?levelName=' . rawurlencode($levelName);
$createBody = json_encode(['externalUserId' => $userId, 'type' => 'individual']);
$create     = sumsub_request('POST', $createPath, $createBody);

if ($create['code'] < 200 || $create['code'] >= 300) {
    json_response(['error' => 'sumsub error', 'detail' => $create['body']], 500);
}

$applicantId = $create['body']['id'];

// 2. Generate SDK access token
$tokenPath = '/resources/accessTokens/sdk';
$tokenBody = json_encode(['userId' => $userId, 'levelName' => $levelName, 'ttlInSecs' => 3600]);
$token     = sumsub_request('POST', $tokenPath, $tokenBody);

if ($token['code'] < 200 || $token['code'] >= 300) {
    json_response(['error' => 'token error', 'detail' => $token['body']], 500);
}

json_response([
    'token'       => $token['body']['token'],
    'applicantId' => $applicantId,
    'userId'      => $userId,
]);
