<?php

const GOOGLE_CLIENT_ID =
    '799669428821-2j54ifp0ig2nqnii7jglbait7rc5jsm5.apps.googleusercontent.com';

function google_oauth_is_configured(): bool
{
    $clientId = trim(GOOGLE_CLIENT_ID);

    if ($clientId === '') {
        return false;
    }

    if ($clientId === '799669428821-2j54ifp0ig2nqnii7jglbait7rc5jsm5.apps.googleusercontent.com') {
        return true;
    }

    return str_ends_with(
        $clientId,
        '.apps.googleusercontent.com'
    );
}