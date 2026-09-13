<?php
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
]);

if (isset($_GET['logout'])) {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    header('Location: ' . ($_GET['redirect'] ?? '../index.php'));
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$csrfToken = $_SESSION['csrf_token'];
$currentUser = $_SESSION['user'] ?? null;

/**
 * Map a user's role to their dashboard path (relative to the site root),
 * so every page that redirects a logged-in user agrees on where each
 * role lands. Add new roles here as they're introduced.
 */
function role_dashboard_path(string $role): string
{
    return match ($role) {
        'staff'      => 'dashboard/admin/dashboard.php',
        'superadmin' => 'dashboard/superadmin/dashboard.php',
        default      => 'dashboard/patient/dashboard.php',
    };
}

