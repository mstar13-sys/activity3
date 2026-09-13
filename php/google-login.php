<?php
require __DIR__ . '/request.php';
require __DIR__ . '/config.php';
require __DIR__ . '/google-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_response(false, 'Invalid request method.');
}

if (!google_oauth_is_configured()) {
    http_response_code(503);
    json_response(false, 'Google Sign-In has not been configured yet.');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    json_response(false, 'Invalid request body.');
}

$csrf = (string) ($input['csrf_token'] ?? '');
if ($csrf === '' || !hash_equals($_SESSION['csrf_token'], $csrf)) {
    http_response_code(419);
    json_response(false, 'Your session expired. Please refresh the page and try again.');
}

$credential = trim((string) ($input['credential'] ?? ''));
if ($credential === '') {
    http_response_code(400);
    json_response(false, 'Google did not return a sign-in credential. Please try again.');
}

/**
 * Verify the Google ID token using Google's tokeninfo endpoint.
 * This keeps the project Composer-free and works on standard PHP hosting.
 */
function verify_google_id_token(string $idToken): ?array
{
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
    $body = false;
    $status = 0;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        $context = stream_context_create([
            'http' => [
                'timeout' => 12,
                'ignore_errors' => true,
                'header' => "Accept: application/json\r\n",
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
            $status = (int) $m[1];
        }
    }

    if ($body === false || $status !== 200) {
        return null;
    }

    $payload = json_decode($body, true);
    return is_array($payload) ? $payload : null;
}

try {
    $payload = verify_google_id_token($credential);

    if (!$payload) {
        http_response_code(401);
        json_response(false, 'Google could not verify this sign-in. Please try again.');
    }

    $issuer = (string) ($payload['iss'] ?? '');
    $audience = (string) ($payload['aud'] ?? '');
    $expiresAt = (int) ($payload['exp'] ?? 0);
    $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

    if (!in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
        || !hash_equals(GOOGLE_CLIENT_ID, $audience)
        || $expiresAt <= time()
        || !$emailVerified) {
        http_response_code(401);
        json_response(false, 'The Google account could not be verified for SmartCare.');
    }

    $googleId = trim((string) ($payload['sub'] ?? ''));
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    $fullName = trim((string) ($payload['name'] ?? 'Google User'));
    $picture = trim((string) ($payload['picture'] ?? ''));

    if ($googleId === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        json_response(false, 'Google returned incomplete account information.');
    }

    $pdo->beginTransaction();

    // Prefer the stable Google account ID. Fall back to the verified email so
    // an existing password account can be safely linked instead of duplicated.
    $stmt = $pdo->prepare('SELECT * FROM users WHERE google_id = :google_id LIMIT 1 FOR UPDATE');
    $stmt->execute(['google_id' => $googleId]);
    $account = $stmt->fetch();

    if (!$account) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1 FOR UPDATE');
        $stmt->execute(['email' => $email]);
        $account = $stmt->fetch();

        if ($account) {
            if (!empty($account['google_id']) && !hash_equals((string) $account['google_id'], $googleId)) {
                $pdo->rollBack();
                http_response_code(409);
                json_response(false, 'This email is already connected to another Google account.');
            }

            $provider = empty($account['password_hash']) ? 'google' : 'local_google';
            $link = $pdo->prepare(
                'UPDATE users
                 SET google_id = :google_id,
                     auth_provider = :auth_provider,
                     profile_picture = :profile_picture,
                     email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
                 WHERE id = :id'
            );
            $link->execute([
                'google_id' => $googleId,
                'auth_provider' => $provider,
                'profile_picture' => $picture !== '' ? $picture : null,
                'id' => $account['id'],
            ]);
        }
    }

    if (!$account) {
        $insert = $pdo->prepare(
            'INSERT INTO users
             (full_name, email, phone, password_hash, google_id, auth_provider, profile_picture, role, status, email_verified_at)
             VALUES (:full_name, :email, NULL, NULL, :google_id, :auth_provider, :profile_picture, :role, :status, CURRENT_TIMESTAMP)'
        );
        $insert->execute([
            'full_name' => $fullName !== '' ? $fullName : 'Google User',
            'email' => $email,
            'google_id' => $googleId,
            'auth_provider' => 'google',
            'profile_picture' => $picture !== '' ? $picture : null,
            'role' => 'patient',
            'status' => 'active',
        ]);

        $userId = (int) $pdo->lastInsertId();
        $profile = $pdo->prepare(
            'INSERT INTO patient_profiles (user_id, medical_record_no)
             VALUES (:user_id, :medical_record_no)'
        );
        $profile->execute([
            'user_id' => $userId,
            'medical_record_no' => 'SC-' . str_pad((string) $userId, 8, '0', STR_PAD_LEFT),
        ]);
    } else {
        $userId = (int) $account['id'];
    }

    $stmt = $pdo->prepare('SELECT id, full_name, email, role, status FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $account = $stmt->fetch();

    if (!$account) {
        throw new RuntimeException('User could not be loaded after Google authentication.');
    }

    if (($account['status'] ?? 'active') !== 'active') {
        $pdo->rollBack();
        http_response_code(403);
        json_response(false, 'This account is not currently active. Contact a SmartCare administrator.');
    }

    $pdo->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id')
        ->execute(['id' => $userId]);

    $pdo->commit();

    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id' => $account['id'],
        'name' => $account['full_name'],
        'email' => $account['email'],
        'role' => $account['role'],
    ];

    $dashboardByRole = [
        'staff' => '../dashboard/admin/dashboard.php',
        'superadmin' => '../dashboard/superadmin/dashboard.php',
        'patient' => '../dashboard/patient/dashboard.php',
    ];
    $redirect = $dashboardByRole[$account['role']] ?? $dashboardByRole['patient'];

    json_response(true, "Signed in with Google. Welcome, {$account['full_name']}!", [
        'redirect' => $redirect,
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('SmartCare Google login database error: ' . $e->getMessage());
    http_response_code(500);
    json_response(false, 'SmartCare could not finish the Google sign-in. Please try again.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('SmartCare Google login error: ' . $e->getMessage());
    http_response_code(500);
    json_response(false, 'Something went wrong while signing in with Google.');
}
