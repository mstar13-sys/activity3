<?php

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

header('Content-Type: application/json');

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Send a JSON response and stop the current request.
 */
function json_response(bool $success, string $message, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

/**
 * Reject a form submission whose CSRF token does not match the session.
 */
function check_csrf(): void
{
    $sent = $_POST['csrf_token'] ?? '';
    if ($sent === '' || !hash_equals($_SESSION['csrf_token'], $sent)) {
        json_response(false, 'Your session expired. Please refresh the page and try again.');
    }
}
