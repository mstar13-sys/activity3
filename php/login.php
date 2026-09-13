<?php
require __DIR__ . '/request.php';
require __DIR__ . '/validators.php';
require __DIR__ . '/config.php'; // gives us $pdo

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, 'Invalid request method.');
}

check_csrf();

$email    = trim($_POST['loginEmail'] ?? '');
$password = $_POST['loginPassword'] ?? '';

$errors = [];
if ($email === '') {
    $errors['loginEmail'] = 'Enter your email address.';
} elseif (!is_valid_email($email)) {
    $errors['loginEmail'] = 'Enter a valid email address.';
}
if ($password === '') $errors['loginPassword'] = 'Enter your password.';

if ($errors) {
    json_response(false, 'Please fix the highlighted fields.', ['errors' => $errors]);
}

sleep(2);

// ---- Look the account up and verify the password ----
$stmt = $pdo->prepare('SELECT id, full_name, password_hash, role, status FROM users WHERE email = :email LIMIT 1');
$stmt->execute(['email' => strtolower($email)]);
$account = $stmt->fetch();

if ($account && empty($account['password_hash'])) {
    json_response(false, 'This account uses Google Sign-In. Choose Continue with Google instead.');
}

if ($account && password_verify($password, $account['password_hash'])) {
    if (($account['status'] ?? 'active') !== 'active') {
        json_response(false, 'This account is not currently active. Contact a SmartCare administrator.');
    }

    // Regenerate the session ID on privilege change (login) to prevent
    // session fixation — cheap to do, good habit to keep.
    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id'    => $account['id'],
        'name'  => $account['full_name'],
        'email' => strtolower($email),
        'role'  => $account['role'],
    ];

    $pdo->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute(['id' => $account['id']]);

    $dashboardByRole = [
        'staff' => '../dashboard/admin/dashboard.php',
        'superadmin' => '../dashboard/superadmin/dashboard.php',
        'patient' => '../dashboard/patient/dashboard.php',
    ];
    $redirect = $dashboardByRole[$account['role']] ?? $dashboardByRole['patient'];

    json_response(true, "You have been logged in securely. Welcome, {$account['full_name']}.", [
        'redirect' => $redirect,
    ]);
}

json_response(false, 'Incorrect email or password. Please try again.');
