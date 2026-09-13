<?php

require __DIR__ . '/php/google-config.php';

echo '<pre>';

echo "Client ID:\n";
var_dump(GOOGLE_CLIENT_ID);

echo "\nConfigured:\n";
var_dump(google_oauth_is_configured());

echo '</pre>';