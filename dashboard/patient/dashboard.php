<?php
require __DIR__ . '/../../includes/start.php';
if (!$currentUser) {
  header('Location: ../../auth/login.php');
  exit;
}
if ($currentUser['role'] === 'staff') {
  header('Location: ../admin/dashboard.php');
  exit;
}
if ($currentUser['role'] === 'superadmin') {
  header('Location: ../superadmin/dashboard.php');
  exit;
}
$pageTitle = 'SmartCare - Patient Dashboard';
$assetRoot = '../..';
require __DIR__ . '/../../includes/header.php';
?>
<main class="dashboard-shell">
  <header class="dashboard-header">
    <div>
      <p class="eyebrow">Patient portal</p>
      <h1>Good to see you, <?php echo htmlspecialchars($currentUser['name']); ?>.</h1>
      <p class="dashboard-subtitle">Your care overview for today.</p>
    </div><a class="dashboard-logout" href="../../index.php?logout=1" data-logout-confirmation>Log out</a>
  </header>
  <section class="dashboard-grid" aria-label="Patient overview">
    <article class="dashboard-card dashboard-card-featured">
      <div class="card-icon">&#10003;</div>
      <p class="card-label">Next appointment</p>
      <h2>Dr. Ramirez</h2>
      <p>General consultation</p><strong>Today, 2:30 PM</strong>
    </article>
    <article class="dashboard-card">
      <div class="card-icon teal">&#9719;</div>
      <p class="card-label">Queue status</p>
      <h2>#048</h2>
      <p>Now serving #046</p><strong>About 12 minutes</strong>
    </article>
    <article class="dashboard-card">
      <div class="card-icon amber">&#9733;</div>
      <p class="card-label">Care reminders</p>
      <h2>2 items</h2>
      <p>Review your latest care notes and medication schedule.</p><strong>Up to date this week</strong>
    </article>
  </section>
  <section class="dashboard-section">
    <div>
      <p class="eyebrow">Quick actions</p>
      <h2>Patient services</h2>
    </div>
    <div class="quick-actions"><button class="quick-action" data-dashboard-action="Appointment requests">Request an appointment <span>&rarr;</span></button><button class="quick-action" data-dashboard-action="Health records">View health records <span>&rarr;</span></button><button class="quick-action" data-dashboard-action="Messages">Open care messages <span>&rarr;</span></button></div>
  </section>
</main>
<?php require __DIR__ . '/../../includes/footer.php'; ?>
