<?php
require_once __DIR__ . '/sumsub.php';
cors_preflight();

$applicantId = $_GET['applicantId'] ?? '';

if (!$applicantId) {
    json_response(['error' => 'applicantId required'], 400);
}

$path   = '/resources/applicants/' . rawurlencode($applicantId) . '/one';
$result = sumsub_request('GET', $path);

if ($result['code'] < 200 || $result['code'] >= 300) {
    json_response(['error' => 'status check failed', 'detail' => $result['body']], 500);
}

$review = $result['body']['review']       ?? [];
$res    = $review['reviewResult']          ?? [];

json_response([
    'reviewStatus'     => $review['reviewStatus']     ?? 'init',
    'reviewAnswer'     => $res['reviewAnswer']         ?? null,
    'rejectLabels'     => $res['rejectLabels']         ?? [],
    'reviewRejectType' => $res['reviewRejectType']     ?? null,
    'moderationComment'=> $res['moderationComment']    ?? null,
]);
