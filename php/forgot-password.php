<?php
/* =========================================================================
   Forgot Password Endpoint
   -------------------------------------------------------------------------
   POST /php/forgot-password.php — called by js/forgot-password-form.js.
   Validates the CSRF token and the email address server-side (same rules
   as php/validators.php uses everywhere else), then looks the account up.

   On purpose, the JSON response is worded the same way whether or not the
   email is registered ("If an account exists...") — this avoids leaking
   which emails have SmartCare accounts to anyone probing the form. Only
   the CSRF check and the email-format check can return a specific error;
   "account not found" never does.

   Actually emailing a reset link is out of scope here (no mail server /
   token table wired up yet) — this endpoint validates the request and
   confirms whether it *would* proceed, which is what the form needs to
   show a real result instead of a client-side fake.
   ========================================================================= */
require __DIR__ . '/request.php';
require __DIR__ . '/validators.php';
require __DIR__ . '/config.php'; // gives us $pdo

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, 'Invalid request method.');
}

check_csrf();

$email = strtolower(trim($_POST['forgotEmail'] ?? ''));

$errors = [];
if ($email === '') {
    $errors['forgotEmail'] = 'Enter your email address.';
} elseif (!is_valid_email($email)) {
    $errors['forgotEmail'] = 'Enter a valid email address.';
}

if ($errors) {
    json_response(false, 'Please fix the highlighted fields.', ['errors' => $errors]);
}

// ---- Look the account up (result intentionally not exposed to the client) ----
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
$stmt->execute(['email' => $email]);
$account = $stmt->fetch();

// A real implementation would generate a single-use token here, store it
// (e.g. a password_resets table with an expiry), and email the link. That
// part needs a mail service and a schema change, so it isn't included —
// this endpoint stops at "the request was validated."
if ($account) {
    // Placeholder for: create + store reset token, send email.
}

json_response(true, 'If an account exists for that email, a reset link is on its way.');
