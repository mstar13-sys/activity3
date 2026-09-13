<?php
// login.php now renders both the login and signup panes and switches
// between them client-side (see js/auth-switch.js). This file is kept
// only so old bookmarks/links to signup.php still land in the right
// place.
header('Location: login.php?mode=signup');
exit;
