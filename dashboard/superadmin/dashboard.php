<?php
require __DIR__ . '/../../includes/start.php';

if (!$currentUser) {
    header('Location: ../../auth/login.php');
    exit;
}
if (($currentUser['role'] ?? '') !== 'superadmin') {
    header('Location: ../' . (($currentUser['role'] ?? '') === 'staff' ? 'admin' : 'patient') . '/dashboard.php');
    exit;
}

$displayName = $currentUser['name'] ?? 'System Admin';
$initials = '';
foreach (array_slice(preg_split('/\s+/', trim($displayName)), 0, 2) as $part) {
    $initials .= strtoupper(substr($part, 0, 1));
}
if ($initials === '') $initials = 'SA';

$pageTitle = 'SmartCare - Superadmin Console';
$assetRoot = '../..';
$extraStyles = [$assetRoot . '/css/dashboard-admin.css'];
$extraScripts = [
    'https://unpkg.com/lucide@1.41.0/dist/umd/lucide.min.js',
    $assetRoot . '/js/validators.js',
    $assetRoot . '/js/password-strength.js',
    $assetRoot . '/js/superadmin-dashboard.js',
];
require __DIR__ . '/../../includes/header.php';
?>
<div class="admin-app" id="adminApp"
     data-api="../../php/superadmin.php"
     data-csrf="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
  <div class="admin-sidebar-backdrop" data-sidebar-close></div>

  <aside class="admin-sidebar" id="adminSidebar" aria-label="Superadmin navigation">
    <div class="admin-brand">
      <span class="admin-brand-mark"><i data-lucide="heart-pulse"></i></span>
      <span><strong>SmartCare</strong><small>Clinic operations</small></span>
      <button class="admin-icon-button admin-sidebar-close" type="button" data-sidebar-close aria-label="Close navigation">
        <i data-lucide="x"></i>
      </button>
    </div>

    <nav class="admin-nav">
      <p class="admin-nav-label">Workspace</p>
      <button class="admin-nav-item is-active" type="button" data-view="overview">
        <i data-lucide="layout-dashboard"></i><span>Overview</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="staff">
        <i data-lucide="briefcase-medical"></i><span>Staff management</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="patients">
        <i data-lucide="users-round"></i><span>Patients</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="appointments">
        <i data-lucide="calendar-days"></i><span>Appointments</span>
        <span class="admin-nav-count" id="pendingNavCount">0</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="services">
        <i data-lucide="stethoscope"></i><span>Services</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="schedules">
        <i data-lucide="calendar-clock"></i><span>Schedules</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="notifications">
        <i data-lucide="bell-ring"></i><span>Notifications</span>
      </button>

      <p class="admin-nav-label">Governance</p>
      <button class="admin-nav-item" type="button" data-view="reports">
        <i data-lucide="chart-no-axes-combined"></i><span>Reports</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="audit">
        <i data-lucide="scroll-text"></i><span>Audit log</span>
      </button>
      <button class="admin-nav-item" type="button" data-view="settings">
        <i data-lucide="settings-2"></i><span>Settings</span>
      </button>
    </nav>

    <div class="admin-sidebar-footer">
      <div class="admin-profile-mini">
        <span class="admin-avatar"><?php echo htmlspecialchars($initials); ?></span>
        <span><strong><?php echo htmlspecialchars($displayName); ?></strong><small>Superadministrator</small></span>
      </div>
      <a href="../../index.php?logout=1" class="admin-logout" data-logout-confirmation>
        <i data-lucide="log-out"></i><span>Log out</span>
      </a>
    </div>
  </aside>

  <div class="admin-main">
    <header class="admin-topbar">
      <div class="admin-topbar-start">
        <button class="admin-icon-button admin-menu-button" type="button" data-sidebar-open aria-label="Open navigation">
          <i data-lucide="menu"></i>
        </button>
        <div>
          <p class="admin-breadcrumb">SmartCare / <span id="currentBreadcrumb">Overview</span></p>
          <h1 id="currentViewTitle">Operations overview</h1>
        </div>
      </div>
      <div class="admin-topbar-actions">
        <label class="admin-search">
          <i data-lucide="search"></i>
          <span class="sr-only">Search current view</span>
          <input id="adminSearch" type="search" placeholder="Search this view" autocomplete="off">
          <kbd>Ctrl K</kbd>
        </label>
        <button class="admin-icon-button" type="button" id="refreshView" aria-label="Refresh dashboard" title="Refresh">
          <i data-lucide="refresh-cw"></i>
        </button>
        <button class="admin-icon-button has-dot" type="button" data-view-trigger="audit" aria-label="View recent activity" title="Recent activity">
          <i data-lucide="bell"></i><span class="status-dot"></span>
        </button>
        <span class="admin-avatar admin-avatar-top"><?php echo htmlspecialchars($initials); ?></span>
      </div>
    </header>

    <main class="admin-content">
      <div class="admin-alert" id="dashboardAlert" role="alert" hidden></div>

      <section class="admin-view is-active" data-view-panel="overview" aria-labelledby="overviewHeading">
        <div class="admin-welcome">
          <div>
            <span class="admin-kicker"><i data-lucide="sparkles"></i> Live clinic command center</span>
            <h2 id="overviewHeading">Good day, <?php echo htmlspecialchars(explode(' ', trim($displayName))[0]); ?>.</h2>
            <p>Monitor care delivery, staff capacity, and system activity from one workspace.</p>
          </div>
          <div class="admin-date-chip"><i data-lucide="calendar"></i><span id="todayLabel"></span></div>
        </div>

        <div class="admin-metrics" id="metricGrid" aria-label="Clinic-wide totals">
          <?php
          $metricCards = [
              ['active_staff', 'Active staff', 'badge-user-round', 'blue'],
              ['total_patients', 'Total patients', 'users-round', 'teal'],
              ['appointments_today', 'Appointments today', 'calendar-check-2', 'violet'],
              ['pending_approvals', 'Pending approvals', 'clock-3', 'amber'],
          ];
          foreach ($metricCards as [$key, $label, $icon, $tone]): ?>
          <article class="admin-metric admin-skeleton" data-metric="<?php echo $key; ?>">
            <span class="admin-metric-icon is-<?php echo $tone; ?>"><i data-lucide="<?php echo $icon; ?>"></i></span>
            <div><p><?php echo $label; ?></p><strong>—</strong><small data-metric-note>Loading live data</small></div>
          </article>
          <?php endforeach; ?>
        </div>

        <div class="admin-dashboard-grid">
          <section class="admin-card admin-card-wide">
            <div class="admin-card-head">
              <div><p class="admin-eyebrow">Today</p><h3>Appointment flow</h3></div>
              <button class="admin-text-button" type="button" data-view-trigger="appointments">View schedule <i data-lucide="arrow-up-right"></i></button>
            </div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead><tr><th>Time</th><th>Patient</th><th>Service</th><th>Care provider</th><th>Status</th></tr></thead>
                <tbody id="todayAppointments"><tr><td colspan="5"><div class="admin-loading-row">Loading appointments…</div></td></tr></tbody>
              </table>
            </div>
          </section>

          <section class="admin-card">
            <div class="admin-card-head"><div><p class="admin-eyebrow">Last 30 days</p><h3>Appointment health</h3></div></div>
            <div class="admin-chart" id="statusChart"><div class="admin-loading-row">Loading chart…</div></div>
            <div class="admin-mini-summary">
              <span><i class="summary-dot is-teal"></i><strong id="completedToday">0</strong> completed today</span>
              <span><i class="summary-dot is-blue"></i><strong id="queueToday">0</strong> in queue</span>
            </div>
          </section>

          <section class="admin-card admin-card-wide">
            <div class="admin-card-head">
              <div><p class="admin-eyebrow">Team</p><h3>Recently added staff</h3></div>
              <button class="admin-primary-button" type="button" data-open-modal="staffModal"><i data-lucide="user-plus"></i>Add staff</button>
            </div>
            <div class="admin-list" id="recentStaff"><div class="admin-loading-row">Loading team…</div></div>
          </section>

          <section class="admin-card">
            <div class="admin-card-head">
              <div><p class="admin-eyebrow">Governance</p><h3>Recent activity</h3></div>
              <button class="admin-text-button" type="button" data-view-trigger="audit">Full log</button>
            </div>
            <div class="admin-timeline" id="recentActivity"><div class="admin-loading-row">Loading activity…</div></div>
          </section>
        </div>
      </section>

      <?php
      $views = [
          'staff' => ['Staff management', 'Create and manage clinic staff accounts.', 'user-plus', 'Add staff', 'staffModal'],
          'patients' => ['Patient directory', 'Review patient identities and account access.', null, null, null],
          'appointments' => ['Appointment management', 'Review the clinic schedule and update appointment progress.', null, null, null],
          'services' => ['Clinic services', 'Edit the catalog, control availability, and safely remove unused services.', 'plus', 'Add service', 'serviceModal'],
          'schedules' => ['Staff schedules', 'Review recurring availability, activate or deactivate shifts, and remove obsolete schedules.', null, null, null],
          'notifications' => ['Notification center', 'Review system messages delivered to users.', null, null, null],
          'reports' => ['Clinic reports', 'Track appointment outcomes across the last twelve months.', null, null, null],
          'audit' => ['Audit log', 'Trace administrative changes across SmartCare.', null, null, null],
      ];
      foreach ($views as $view => [$title, $description, $buttonIcon, $buttonText, $modal]): ?>
      <section class="admin-view" data-view-panel="<?php echo $view; ?>" aria-labelledby="<?php echo $view; ?>Heading">
        <div class="admin-page-head">
          <div class="admin-page-title">
            <?php if ($view === 'staff'): ?><span class="admin-page-logo" aria-hidden="true"><i data-lucide="briefcase-medical"></i></span><?php endif; ?>
            <div><p class="admin-eyebrow">Administration</p><h2 id="<?php echo $view; ?>Heading"><?php echo $title; ?></h2><p><?php echo $description; ?></p></div>
          </div>
          <?php if ($modal): ?><button class="admin-primary-button" type="button" data-open-modal="<?php echo $modal; ?>"><i data-lucide="<?php echo $buttonIcon; ?>"></i><?php echo $buttonText; ?></button><?php endif; ?>
        </div>
        <section class="admin-card admin-data-card">
          <div class="admin-card-toolbar">
            <span class="admin-record-count" id="<?php echo $view; ?>Count">Loading records…</span>
            <button class="admin-secondary-button" type="button" data-export="<?php echo $view; ?>"><i data-lucide="download"></i>Export CSV</button>
          </div>
          <div class="admin-table-wrap"><table class="admin-table admin-data-table" id="<?php echo $view; ?>Table"></table></div>
        </section>
      </section>
      <?php endforeach; ?>

      <section class="admin-view" data-view-panel="settings" aria-labelledby="settingsHeading">
        <div class="admin-page-head"><div><p class="admin-eyebrow">Configuration</p><h2 id="settingsHeading">System settings</h2><p>Review operational configuration and environment readiness.</p></div></div>
        <div class="admin-settings-grid">
          <section class="admin-card">
            <div class="admin-card-head"><div><h3>Database readiness</h3><p>Tables used by this console</p></div><span class="admin-status-badge is-active"><i data-lucide="circle-check"></i>Connected</span></div>
            <ul class="admin-check-list">
              <li><i data-lucide="shield-check"></i><span><strong>Role protection</strong><small>Superadmin session required for every API request</small></span></li>
              <li><i data-lucide="key-round"></i><span><strong>CSRF validation</strong><small>Applied to every state-changing request</small></span></li>
              <li><i data-lucide="database"></i><span><strong>Relational integrity</strong><small>Foreign keys connect all operational records</small></span></li>
            </ul>
          </section>
          <section class="admin-card">
            <div class="admin-card-head"><div><h3>Administration guide</h3><p>Safe operating practices</p></div></div>
            <div class="admin-guidance">
              <p><i data-lucide="info"></i>Suspending or deactivating an account blocks future login attempts.</p>
              <p><i data-lucide="history"></i>Staff, service, appointment, and status changes are written to the audit log.</p>
              <p><i data-lucide="lock-keyhole"></i>Temporary staff passwords should be delivered through a secure channel.</p>
            </div>
          </section>
          <form class="admin-card admin-password-card" id="changePasswordForm" method="post" action="../../php/superadmin.php" novalidate>
            <div class="admin-card-head"><div><h3>Change password</h3><p>Update your superadmin sign-in credentials</p></div><span class="admin-settings-icon"><i data-lucide="key-round"></i></span></div>
            <div class="admin-password-fields">
              <label class="admin-field"><span>Current password</span><input name="current_password" type="password" required autocomplete="current-password"><small data-error-for="current_password"></small></label>
              <label class="admin-field"><span>New password</span><input name="new_password" type="password" required autocomplete="new-password"><small>Use 8+ characters with uppercase, lowercase, number, and special character.</small><small data-error-for="new_password"></small></label>
              <label class="admin-field"><span>Confirm new password</span><input name="confirm_password" type="password" required autocomplete="new-password"><small data-error-for="confirm_password"></small></label>
            </div>
            <input type="hidden" name="action" value="change_admin_password"><input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
            <div class="admin-modal-actions"><button class="admin-primary-button" type="submit"><i data-lucide="shield-check"></i>Change password</button></div>
          </form>
        </div>
      </section>
    </main>
  </div>

  <dialog class="admin-modal" id="staffModal">
    <form class="admin-modal-card" id="createStaffForm" method="post" action="../../php/superadmin.php" novalidate>
      <div class="admin-modal-head"><div><p class="admin-eyebrow">Staff management</p><h2>Create staff account</h2></div><button class="admin-icon-button" type="button" data-close-modal aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="admin-form-grid">
        <label class="admin-field admin-field-wide"><span>Full name</span><input name="full_name" required autocomplete="name"><small data-error-for="full_name"></small></label>
        <label class="admin-field"><span>Email address</span><input name="email" type="email" required autocomplete="email"><small data-error-for="email"></small></label>
        <label class="admin-field"><span>Phone number</span><input name="phone" type="tel" required autocomplete="tel"><small data-error-for="phone"></small></label>
        <label class="admin-field"><span>Job title</span><input name="job_title" required placeholder="Physician"><small>The staff ID is generated from this title, for example SC-PHYS-000012.</small><small data-error-for="job_title"></small></label>
        <label class="admin-field"><span>Department</span><select name="department_id" id="staffDepartment"><option value="">No department</option></select></label>
        <label class="admin-field"><span>Specialization</span><input name="specialization" placeholder="Primary care"></label>
        <label class="admin-field"><span>License number</span><input name="license_no"></label>
        <label class="admin-field"><span>Hired date</span><input name="hired_on" type="date"></label>
        <label class="admin-field"><span>Initial status</span><select name="status"><option value="active">Active</option><option value="pending">Pending</option></select></label>
        <label class="admin-field admin-field-wide"><span>Temporary password</span><input id="staffTemporaryPassword" name="password" type="password" required autocomplete="new-password"><small data-error-for="password"></small></label>
        <div class="strength admin-field-wide" data-password-strength-for="staffTemporaryPassword">
          <div class="bars"><i></i><i></i><i></i><i></i><i></i></div>
          <p class="label">Password strength</p>
          <ul class="req-list">
            <li data-rule="len"><span class="dot"></span>8+ characters</li>
            <li data-rule="upper"><span class="dot"></span>One uppercase letter</li>
            <li data-rule="lower"><span class="dot"></span>One lowercase letter</li>
            <li data-rule="num"><span class="dot"></span>One number</li>
            <li data-rule="special"><span class="dot"></span>One special character</li>
          </ul>
        </div>
      </div>
      <input type="hidden" name="action" value="create_staff"><input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
      <div class="admin-modal-actions"><button class="admin-secondary-button" type="button" data-close-modal>Cancel</button><button class="admin-primary-button" type="submit"><i data-lucide="user-plus"></i>Create staff</button></div>
    </form>
  </dialog>

  <dialog class="admin-modal" id="serviceModal">
    <form class="admin-modal-card" id="createServiceForm" method="post" action="../../php/superadmin.php" novalidate>
      <div class="admin-modal-head"><div><p class="admin-eyebrow">Service catalog</p><h2 id="serviceModalTitle">Add clinic service</h2></div><button class="admin-icon-button" type="button" data-close-modal aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="admin-form-grid">
        <label class="admin-field admin-field-wide"><span>Service name</span><input name="name" required><small data-error-for="name"></small></label>
        <label class="admin-field"><span>Department</span><select name="department_id" id="serviceDepartment"><option value="">No department</option></select></label>
        <label class="admin-field"><span>Duration (minutes)</span><input name="duration_minutes" type="number" min="5" max="480" value="30" required></label>
        <label class="admin-field"><span>Fee</span><input name="fee" type="number" min="0" step="0.01" value="0.00" required></label>
        <label class="admin-field"><span>Availability</span><select name="is_active"><option value="1">Available</option><option value="0">Unavailable</option></select><small>Unavailable services remain in appointment history.</small></label>
        <label class="admin-field admin-field-wide"><span>Description</span><textarea name="description" rows="3"></textarea></label>
      </div>
      <input type="hidden" name="service_id" value=""><input type="hidden" name="action" value="create_service"><input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
      <div class="admin-modal-actions"><button class="admin-secondary-button" type="button" data-close-modal>Cancel</button><button class="admin-primary-button" type="submit" id="serviceSubmitButton"><i data-lucide="plus"></i><span>Add service</span></button></div>
    </form>
  </dialog>
</div>
<?php require __DIR__ . '/../../includes/footer.php'; ?>
