<?php
/* =========================================================================
   Sign Up Endpoint
   -------------------------------------------------------------------------
   POST /php/signup.php — called by js/signup-form.js. Mirrors the same
   five checks the JS already ran (name, email, phone, password rules,
   confirm-password match, terms), because a request can always skip the
   browser entirely — then checks the email isn't already taken and
   inserts the new account with a hashed password.
   ========================================================================= */
require __DIR__ . '/request.php';
require __DIR__ . '/validators.php';
require __DIR__ . '/config.php'; // gives us $pdo

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, 'Invalid request method.');
}

check_csrf();

// Public registration creates patients only. Staff accounts are provisioned
// by a superadmin through the protected management dashboard.
$role     = 'patient';
$fullName = trim($_POST['fullName'] ?? '');
$email    = strtolower(trim($_POST['signupEmail'] ?? ''));
$phone    = trim($_POST['phone'] ?? '');
$password = $_POST['signupPassword'] ?? '';
$confirm  = $_POST['confirmPassword'] ?? '';
$terms    = isset($_POST['terms']);

$errors = [];

if (strlen($fullName) < 2) {
    $errors['fullName'] = 'Enter your full name.';
}
if (!is_valid_email($email)) {
    $errors['signupEmail'] = 'Enter a valid email address.';
}
if (!is_valid_phone($phone)) {
    $errors['phone'] = 'Enter a valid phone number.';
}
if (!password_rules_passed(check_password_rules($password))) {
    $errors['signupPassword'] = "Password doesn't meet requirements.";
}
if ($password === '' || $password !== $confirm) {
    $errors['confirmPassword'] = "Passwords don't match.";
}
if (!$terms) {
    $errors['terms'] = 'Please accept the terms to continue.';
}

if ($errors) {
    json_response(false, 'Please fix the highlighted fields.', ['errors' => $errors]);
}

$normalizedPhone    = normalize_phone($phone);
$normalizedPhoneSql = normalize_phone_sql('phone');

$check = $pdo->prepare(
    "SELECT email, $normalizedPhoneSql AS phone_normalized
     FROM users
     WHERE email = :email OR $normalizedPhoneSql = :phone_normalized"
);
$check->execute([
    'email'             => $email,
    'phone_normalized'  => $normalizedPhone,
]);

$emailTaken = false;
$phoneTaken = false;
foreach ($check->fetchAll() as $row) {
    if ($row['email'] === $email) $emailTaken = true;
    if ($normalizedPhone !== '' && $row['phone_normalized'] === $normalizedPhone) $phoneTaken = true;
}

$dupErrors = [];
if ($emailTaken) {
    $dupErrors['signupEmail'] = 'An account with this email already exists. Try logging in instead.';
}
if ($phoneTaken) {
    $dupErrors['phone'] = 'This phone number is already registered to another account.';
}

if ($dupErrors) {
    $dupMessage = count($dupErrors) > 1
        ? 'That email and phone number are both already registered.'
        : reset($dupErrors);
    json_response(false, $dupMessage, ['errors' => $dupErrors]);
}

// ---- Insert the new account ----
$insert = $pdo->prepare(
    'INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES (:full_name, :email, :phone, :password_hash, :role)'
);

try {
    $pdo->beginTransaction();
    $insert->execute([
        'full_name'     => $fullName,
        'email'         => $email,
        'phone'         => $phone,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role'          => $role,
    ]);
    $userId = (int) $pdo->lastInsertId();
    if ($role === 'patient') {
        $profile = $pdo->prepare(
            'INSERT INTO patient_profiles (user_id, medical_record_no)
             VALUES (:user_id, :medical_record_no)'
        );
        $profile->execute([
            'user_id' => $userId,
            'medical_record_no' => 'SC-' . str_pad((string) $userId, 8, '0', STR_PAD_LEFT),
        ]);
    }
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // Belt-and-suspenders: if two signups for the same email/phone land at
    // almost the same instant, both can pass the SELECT check above before
    // either INSERT commits. The database's own UNIQUE constraints are the
    // real guard against that race — this just turns the resulting
    // duplicate-key error into the same friendly message instead of a
    // raw 500/crashed JSON response.
    if ($e->getCode() === '23000') {
        json_response(false, 'That email or phone number is already registered.', [
            'errors' => [
                'signupEmail' => 'An account with this email already exists. Try logging in instead.',
            ],
        ]);
    }
    json_response(false, 'Something went wrong while creating your account. Please try again.');
}

json_response(true, 'Welcome to SmartCare — you can now log in.');
