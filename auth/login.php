<?php
require __DIR__ . '/../includes/start.php';
require __DIR__ . '/../php/google-config.php';
if ($currentUser) {
  header('Location: ../' . role_dashboard_path($currentUser['role']));
  exit;
}
$mode = (($_GET['mode'] ?? '') === 'signup') ? 'signup' : 'login';
$pageTitle = $mode === 'signup' ? 'SmartCare - Sign Up' : 'SmartCare - Log In';
$assetRoot = '..';
$googleConfigured = google_oauth_is_configured();
require __DIR__ . '/../includes/header.php';
?>
<div class="shell">
  <?php require __DIR__ . '/../includes/brand-panel.php'; ?>
  <main class="form-panel">
    <section class="form-card">
      <div class="mobile-mark"><span class="logo-badge">+</span><span>SmartCare</span></div>
      <div class="switcher" data-active="<?php echo $mode; ?>">
        <div class="thumb"></div>
        <a href="login.php" data-switch-target="login" aria-selected="<?php echo $mode === 'login' ? 'true' : 'false'; ?>">Log In</a>
        <a href="login.php?mode=signup" data-switch-target="signup" aria-selected="<?php echo $mode === 'signup' ? 'true' : 'false'; ?>">Sign Up</a>
      </div>

      <div class="panes" id="authPanes">

        <div class="pane<?php echo $mode === 'login' ? ' active' : ''; ?>" id="loginPanel" data-pane="login">
          <div class="head-block">
            <h2>Welcome back to SmartCare</h2>
            <p>Securely access your patient dashboard.</p>
          </div>
          <form id="loginForm" method="POST" action="../php/login.php" novalidate>
            <div class="message-area" id="loginMessage" role="status" aria-live="polite"></div>
            <div class="field"><label class="flabel" for="loginEmail">Email address</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg></span><input id="loginEmail" name="loginEmail" type="email" placeholder="you@example.com" autocomplete="email" required /></div>
            </div>
            <div class="field">
              <div class="row-between"><label class="flabel" for="loginPassword">Password</label><a href="forgot-password.php" id="forgotLink">Forgot password?</a></div>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg></span><input id="loginPassword" name="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" required /><button type="button" class="toggle-eye" data-target="loginPassword" aria-label="Show password"><svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" />
                  </svg></button></div>
              <p class="hint" id="passwordHint" style="display:none;">Password must be at least 6 characters</p>
            </div>
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken); ?>" />
            <button class="submit-btn" type="submit"><span class="spinner"></span><span class="btn-label">Log In</span></button>
          </form>
          <div class="oauth-divider" role="separator"><span>or continue with</span></div>
          <div class="google-auth-block">
            <div class="google-button-host" data-google-button data-google-text="continue_with" data-google-label="Continue with Google" aria-label="Continue with Google"></div>
            <p class="google-auth-note">Use your Google account for a faster, secure sign-in.</p>
          </div>
          <p class="switch-foot">Don't have an account?<a href="login.php?mode=signup" data-switch-target="signup"> Sign up</a></p>
        </div>

        <div class="pane<?php echo $mode === 'signup' ? ' active' : ''; ?>" id="signupPanel" data-pane="signup">
          <div class="head-block">
            <h2>Create your SmartCare account</h2>
            <p>Set up secure access in under a minute.</p>
          </div>
          <form id="signupForm" method="POST" action="../php/signup.php" novalidate>
            <!-- <div class="field"><label class="flabel">I am a</label>
              <div class="role-group" role="radiogroup" aria-label="Account type">
                <label class="role-card">
                  <input type="radio" name="role" value="patient" checked />
                  <span class="box"><svg class="role-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg><span>Patient</span></span></label>
                  
                     <label class="role-card">
                  <input type="radio" name="role" value="staff" /><span class="box"><svg class="role-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg><span>Clinic staff</span></span></label> 
              </div>
            </div> -->
            <div class="field"><label class="flabel" for="fullName">Full name</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg></span><input id="fullName" name="fullName" type="text" placeholder="Juan Dela Cruz" autocomplete="name" /></div>
            </div>
            <div class="field"><label class="flabel" for="signupEmail">Email address</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg></span><input id="signupEmail" name="signupEmail" type="email" placeholder="you@example.com" autocomplete="email" /></div>
            </div>
            <div class="field"><label class="flabel" for="phone">Phone number</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                  </svg></span><input id="phone" name="phone" type="tel" placeholder="0917 123 4567" autocomplete="tel" /></div>
            </div>
            <div class="field"><label class="flabel" for="signupPassword">Password</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg></span><input id="signupPassword" name="signupPassword" type="password" placeholder="Create a password" autocomplete="new-password" /><button type="button" class="toggle-eye" data-target="signupPassword" aria-label="Show password"><svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" />
                  </svg></button></div>
            </div>
            <div class="strength" id="strengthBlock">
              <div class="bars"><i></i><i></i><i></i><i></i><i></i></div>
              <p class="label" id="strengthLabel">Password strength</p>
              <ul class="req-list">
                <li data-rule="len"><span class="dot"></span>8+ characters</li>
                <li data-rule="upper"><span class="dot"></span>One uppercase letter</li>
                <li data-rule="lower"><span class="dot"></span>One lower character</li>
                <li data-rule="num"><span class="dot"></span>One number</li>
                <li data-rule="special"><span class="dot"></span>One special character</li>
              </ul>
            </div>
            <div class="field"><label class="flabel" for="confirmPassword">Confirm password</label>
              <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg></span><input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter password" autocomplete="new-password" /><button type="button" class="toggle-eye" data-target="confirmPassword" aria-label="Show password"><svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6" />
                  </svg></button></div>
            </div>
            <div><label class="check-row"><input type="checkbox" id="terms" name="terms" /> <span>I agree to the Terms and Privacy Policy.</span></label></div>
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken); ?>" />
            <button class="submit-btn" type="submit"><span class="spinner"></span><span class="btn-label">Create Account</span></button>
          </form>
          <div class="oauth-divider" role="separator"><span>or sign up with</span></div>
          <div class="google-auth-block">
            <div class="google-button-host" data-google-button data-google-text="signup_with" data-google-label="Sign up with Google" aria-label="Sign up with Google"></div>
            <p class="google-auth-note">Google accounts are created as patient accounts. You can add your phone number later.</p>
          </div>
          <p class="switch-foot">Already have an account?<a href="login.php" data-switch-target="login"> Log in</a></p>
        </div>

      </div>
      <div class="secure-note">Secure portal</div>
    </section>
  </main>
  <?php require __DIR__ . '/../includes/footer.php'; ?>
  <script src="../js/validators.js" defer></script>
  <script src="../js/form-helpers.js" defer></script>
  <script src="../js/login-notification-events.js" defer></script>
  <script src="../js/password-toggle.js" defer></script>
  <script src="../js/password-strength.js" defer></script>
  <script src="../js/login-form.js" defer></script>
  <script src="../js/signup-form.js" defer></script>
  <script src="../js/clear-auth-fields.js" defer></script>
  <script src="../js/auth-switch.js" defer></script>
  <script>
    window.SMARTCARE_GOOGLE_CLIENT_ID = <?php echo json_encode($googleConfigured ? GOOGLE_CLIENT_ID : ''); ?>;
    window.SMARTCARE_GOOGLE_CONFIGURED = <?php echo $googleConfigured ? 'true' : 'false'; ?>;
    window.SMARTCARE_CSRF_TOKEN = <?php echo json_encode($csrfToken); ?>;
  </script>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <script src="../js/google-auth.js" defer></script>
