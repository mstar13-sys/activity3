<?php
// Real POST submission: js/forgot-password-form.js sends this form to
// php/forgot-password.php with fetch(), the same CSRF-protected pattern
// used by the login and sign-up forms.
require __DIR__ . '/../includes/start.php';
if ($currentUser) {
  header('Location: ../' . role_dashboard_path($currentUser['role']));
  exit;
}
$pageTitle = 'SmartCare - Forgot Password';
$assetRoot = '..';
require __DIR__ . '/../includes/header.php';
?>
<div class="shell">
  <?php require __DIR__ . '/../includes/brand-panel.php'; ?>
  <main class="form-panel">
    <section class="form-card">
      <div class="mobile-mark"><span class="logo-badge">+</span><span>SmartCare</span></div>

      <div class="head-block">
        <h2>Reset your password</h2>
        <p>We'll email you a one-time link to create a new password.</p>
      </div>

      <form id="forgotForm" method="POST" action="../php/forgot-password.php" novalidate>
        <div class="message-area" id="forgotMessage" role="status" aria-live="polite"></div>

        <div class="field"><label class="flabel" for="forgotEmail">Email address</label>
          <div class="input-wrap"><span class="ic-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg></span><input id="forgotEmail" name="forgotEmail" type="email" placeholder="you@example.com" autocomplete="email" required /></div>
        </div>

        <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken); ?>" />
        <button class="submit-btn" type="submit"><span class="spinner"></span><span class="btn-label">Send Reset Link</span></button>
      </form>

      <p class="switch-foot">Remembered it?<a href="login.php"> Back to Log In</a></p>
      <div class="secure-note">Secure portal</div>
    </section>
  </main>
  <?php require __DIR__ . '/../includes/footer.php'; ?>
  <script src="../js/validators.js" defer></script>
  <script src="../js/form-helpers.js" defer></script>
  <script src="../js/forgot-password-form.js" defer></script>
