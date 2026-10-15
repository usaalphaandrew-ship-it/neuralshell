<?php
require_once __DIR__ . '/config.php';

function sumsub_request(string $method, string $path, string $body = ''): array {
    $ts = time();
    $toSign = $ts . strtoupper($method) . $path . $body;
    $sig = hash_hmac('sha256', $toSign, SUMSUB_SECRET_KEY);

    $headers = [
        'X-App-Token: '      . SUMSUB_APP_TOKEN,
        'X-App-Access-Ts: '  . $ts,
        'X-App-Access-Sig: ' . $sig,
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    $ch = curl_init(SUMSUB_BASE_URL . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 20,
    ]);

    if (strtoupper($method) === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['code' => $code, 'body' => json_decode($raw, true)];
}

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($data);
    exit;
}

function cors_preflight(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
