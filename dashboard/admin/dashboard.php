<?php
require __DIR__ . '/../../includes/start.php';
if (!$currentUser) {
  header('Location: ../../auth/login.php');
  exit;
}
if ($currentUser['role'] === 'superadmin') {
  header('Location: ../superadmin/dashboard.php');
  exit;
}
if ($currentUser['role'] !== 'staff') {
  header('Location: ../patient/dashboard.php');
  exit;
}
$pageTitle = 'SmartCare - Staff Dashboard';
$assetRoot = '../..';
require __DIR__ . '/../../includes/header.php';
?>
<main class="dashboard-shell">
  <header class="dashboard-header">
    <div>
      <p class="eyebrow">Clinic staff portal</p>
      <h1>Good morning, <?php echo htmlspecialchars($currentUser['name']); ?>.</h1>
      <p class="dashboard-subtitle">Your clinic overview for today.</p>
    </div><a class="dashboard-logout" href="../../index.php?logout=1" data-logout-confirmation>Log out</a>
  </header>
  <section class="dashboard-grid" aria-label="Staff overview">
    <article class="dashboard-card dashboard-card-featured">
      <div class="card-icon">&#10003;</div>
      <p class="card-label">Today's appointments</p>
      <h2>24</h2>
      <p>Six appointments are waiting for confirmation.</p><strong>Clinic schedule is active</strong>
    </article>
    <article class="dashboard-card">
      <div class="card-icon teal">&#9719;</div>
      <p class="card-label">Waiting queue</p>
      <h2>8 patients</h2>
      <p>Two patients are currently in consultation.</p><strong>Next ticket: #048</strong>
    </article>
    <article class="dashboard-card">
      <div class="card-icon amber">&#9733;</div>
      <p class="card-label">Open tasks</p>
      <h2>5 items</h2>
      <p>Review records, messages, and appointment requests.</p><strong>Needs attention today</strong>
    </article>
  </section>
  <section class="dashboard-section">
    <div>
      <p class="eyebrow">Quick actions</p>
      <h2>Clinic management</h2>
    </div>
    <div class="quick-actions"><button class="quick-action" data-dashboard-action="Appointment schedule">Manage appointment schedule <span>&rarr;</span></button><button class="quick-action" data-dashboard-action="Patient queue">Manage patient queue <span>&rarr;</span></button><button class="quick-action" data-dashboard-action="Patient records">Review patient records <span>&rarr;</span></button></div>
  </section>
</main>
<?php require __DIR__ . '/../../includes/footer.php'; ?>
