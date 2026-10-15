<?php
require_once __DIR__ . '/config.php';

$raw    = file_get_contents('php://input');
$digest = $_SERVER['HTTP_X_PAYLOAD_DIGEST']     ?? '';
$alg    = $_SERVER['HTTP_X_PAYLOAD_DIGEST_ALG'] ?? 'SHA1';

// Verify signature
$expected = hash_hmac(strtolower($alg) === 'sha256' ? 'sha256' : 'sha1', $raw, WEBHOOK_SECRET);
$valid    = hash_equals($expected, $digest);

$log = date('[Y-m-d H:i:s]') . "\n"
    . "signature_valid: " . ($valid ? 'YES' : 'NO') . "\n"
    . "x-payload-digest: $digest\n"
    . "x-payload-digest-alg: $alg\n"
    . "body: $raw\n"
    . str_repeat('-', 60) . "\n";

file_put_contents(__DIR__ . '/../webhook.log', $log, FILE_APPEND | LOCK_EX);

http_response_code(200);
echo 'ok';
