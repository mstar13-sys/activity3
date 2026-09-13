<?php
require __DIR__ . '/includes/start.php';

if ($currentUser) {
    header('Location: ' . role_dashboard_path($currentUser['role']));
    exit;
}

header('Location: auth/login.php');
exit;