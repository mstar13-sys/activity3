<?php

require __DIR__ . '/request.php';
require __DIR__ . '/validators.php';

if (empty($_SESSION['user']) || ($_SESSION['user']['role'] ?? '') !== 'superadmin') {
    http_response_code(403);
    json_response(false, 'Superadmin access is required.');
}

require __DIR__ . '/config.php';

$actorId = (int) $_SESSION['user']['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $method === 'GET'
    ? ($_GET['action'] ?? 'overview')
    : ($_POST['action'] ?? '');

function fetch_all(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    return $statement->fetchAll();
}

function audit_action(PDO $pdo, int $actorId, string $action, string $entityType, ?string $entityId, ?array $oldValues, ?array $newValues): void
{
    $statement = $pdo->prepare(
        'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
         VALUES (:actor_id, :action, :entity_type, :entity_id, :old_values, :new_values, :ip_address, :user_agent)'
    );
    $statement->execute([
        'actor_id' => $actorId,
        'action' => $action,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'old_values' => $oldValues === null ? null : json_encode($oldValues),
        'new_values' => $newValues === null ? null : json_encode($newValues),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
    ]);
}

function clean_optional(string $value): ?string
{
    $value = trim($value);
    return $value === '' ? null : $value;
}

function staff_job_code(string $jobTitle): string
{
    $normalized = strtoupper(trim((string) preg_replace('/[^A-Za-z0-9]+/', ' ', $jobTitle)));
    $words = array_values(array_filter(explode(' ', $normalized)));
    if (!$words) return 'STAFF';
    if (count($words) === 1) return substr($words[0], 0, 4);
    return substr(implode('', array_map(static fn(string $word): string => $word[0], $words)), 0, 4);
}

try {
    if ($method === 'GET') {
        switch ($action) {
            case 'overview':
                $counts = $pdo->query(
                    "SELECT
                       SUM(role = 'staff' AND status = 'active') AS active_staff,
                       SUM(role = 'patient') AS total_patients,
                       SUM(status = 'pending') AS pending_users
                     FROM users"
                )->fetch();
                $appointmentCounts = $pdo->query(
                    "SELECT
                       SUM(DATE(scheduled_at) = CURRENT_DATE) AS appointments_today,
                       SUM(status = 'requested') AS requested_appointments,
                       SUM(status = 'completed' AND DATE(scheduled_at) = CURRENT_DATE) AS completed_today
                     FROM appointments"
                )->fetch();
                $queue = $pdo->query(
                    "SELECT SUM(status = 'waiting') AS waiting,
                            SUM(status = 'in_service') AS in_service
                     FROM queue_entries WHERE queue_date = CURRENT_DATE"
                )->fetch();

                $recentStaff = fetch_all($pdo,
                    "SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
                            sp.employee_no, sp.job_title, sp.specialization, d.name AS department
                     FROM users u
                     LEFT JOIN staff_profiles sp ON sp.user_id = u.id
                     LEFT JOIN departments d ON d.id = sp.department_id
                     WHERE u.role = 'staff'
                     ORDER BY u.created_at DESC LIMIT 6"
                );
                $todayAppointments = fetch_all($pdo,
                    "SELECT a.id, a.reference_no, a.scheduled_at, a.status,
                            patient.full_name AS patient_name,
                            staff_user.full_name AS staff_name, s.name AS service_name
                     FROM appointments a
                     JOIN patient_profiles pp ON pp.id = a.patient_id
                     JOIN users patient ON patient.id = pp.user_id
                     LEFT JOIN staff_profiles sp ON sp.id = a.staff_id
                     LEFT JOIN users staff_user ON staff_user.id = sp.user_id
                     LEFT JOIN services s ON s.id = a.service_id
                     WHERE DATE(a.scheduled_at) = CURRENT_DATE
                     ORDER BY a.scheduled_at ASC LIMIT 8"
                );
                $statusBreakdown = fetch_all($pdo,
                    "SELECT status, COUNT(*) AS total
                     FROM appointments
                     WHERE scheduled_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
                     GROUP BY status ORDER BY total DESC"
                );
                $activity = fetch_all($pdo,
                    "SELECT al.id, al.action, al.entity_type, al.created_at,
                            COALESCE(u.full_name, 'System') AS actor_name
                     FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
                     ORDER BY al.created_at DESC LIMIT 7"
                );

                json_response(true, 'Dashboard overview loaded.', [
                    'data' => [
                        'metrics' => [
                            'active_staff' => (int) ($counts['active_staff'] ?? 0),
                            'total_patients' => (int) ($counts['total_patients'] ?? 0),
                            'appointments_today' => (int) ($appointmentCounts['appointments_today'] ?? 0),
                            'pending_approvals' => (int) ($counts['pending_users'] ?? 0) + (int) ($appointmentCounts['requested_appointments'] ?? 0),
                            'completed_today' => (int) ($appointmentCounts['completed_today'] ?? 0),
                            'queue_waiting' => (int) ($queue['waiting'] ?? 0),
                            'queue_in_service' => (int) ($queue['in_service'] ?? 0),
                        ],
                        'recent_staff' => $recentStaff,
                        'today_appointments' => $todayAppointments,
                        'appointment_statuses' => $statusBreakdown,
                        'activity' => $activity,
                    ],
                ]);

            case 'staff':
                json_response(true, 'Staff loaded.', ['data' => fetch_all($pdo,
                    "SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
                            sp.employee_no, sp.job_title, sp.license_no, sp.specialization,
                            sp.department_id, d.name AS department
                     FROM users u
                     LEFT JOIN staff_profiles sp ON sp.user_id = u.id
                     LEFT JOIN departments d ON d.id = sp.department_id
                     WHERE u.role = 'staff' ORDER BY u.full_name ASC LIMIT 250"
                )]);

            case 'patients':
                json_response(true, 'Patients loaded.', ['data' => fetch_all($pdo,
                    "SELECT u.id, u.full_name, u.email, u.phone, u.status, u.created_at,
                            pp.medical_record_no, pp.date_of_birth, pp.sex, pp.blood_type,
                            COUNT(DISTINCT a.id) AS appointment_count,
                            MAX(a.scheduled_at) AS last_appointment
                     FROM users u
                     LEFT JOIN patient_profiles pp ON pp.user_id = u.id
                     LEFT JOIN appointments a ON a.patient_id = pp.id
                     WHERE u.role = 'patient'
                     GROUP BY u.id, pp.id ORDER BY u.full_name ASC LIMIT 250"
                )]);

            case 'appointments':
                json_response(true, 'Appointments loaded.', ['data' => fetch_all($pdo,
                    "SELECT a.id, a.reference_no, a.scheduled_at, a.duration_minutes, a.status, a.reason,
                            patient.full_name AS patient_name, staff_user.full_name AS staff_name,
                            s.name AS service_name
                     FROM appointments a
                     JOIN patient_profiles pp ON pp.id = a.patient_id
                     JOIN users patient ON patient.id = pp.user_id
                     LEFT JOIN staff_profiles sp ON sp.id = a.staff_id
                     LEFT JOIN users staff_user ON staff_user.id = sp.user_id
                     LEFT JOIN services s ON s.id = a.service_id
                     ORDER BY a.scheduled_at DESC LIMIT 300"
                )]);

            case 'services':
                json_response(true, 'Services loaded.', ['data' => fetch_all($pdo,
                    "SELECT s.id, s.name, s.description, s.duration_minutes, s.fee, s.is_active,
                            s.department_id, d.name AS department,
                            COUNT(DISTINCT ss.staff_id) AS staff_count,
                            COUNT(DISTINCT a.id) AS appointment_count
                     FROM services s
                     LEFT JOIN departments d ON d.id = s.department_id
                     LEFT JOIN staff_services ss ON ss.service_id = s.id
                     LEFT JOIN appointments a ON a.service_id = s.id
                     GROUP BY s.id ORDER BY s.name ASC"
                )]);

            case 'schedules':
                json_response(true, 'Schedules loaded.', ['data' => fetch_all($pdo,
                    "SELECT ss.id, ss.weekday, ss.start_time, ss.end_time, ss.valid_from,
                            ss.valid_until, ss.is_active, u.full_name AS staff_name,
                            sp.job_title, d.name AS department
                     FROM staff_schedules ss
                     JOIN staff_profiles sp ON sp.id = ss.staff_id
                     JOIN users u ON u.id = sp.user_id
                     LEFT JOIN departments d ON d.id = sp.department_id
                     ORDER BY ss.weekday, ss.start_time, u.full_name"
                )]);

            case 'notifications':
                json_response(true, 'Notifications loaded.', ['data' => fetch_all($pdo,
                    "SELECT n.id, n.type, n.title, n.body, n.read_at, n.created_at,
                            u.full_name AS recipient_name, u.role AS recipient_role
                     FROM notifications n JOIN users u ON u.id = n.user_id
                     ORDER BY n.created_at DESC LIMIT 300"
                )]);

            case 'reports':
                json_response(true, 'Reports loaded.', ['data' => fetch_all($pdo,
                    "SELECT DATE_FORMAT(scheduled_at, '%Y-%m') AS report_month,
                            COUNT(*) AS total_appointments,
                            SUM(status = 'completed') AS completed,
                            SUM(status = 'cancelled') AS cancelled,
                            SUM(status = 'no_show') AS no_show,
                            SUM(status IN ('requested','confirmed','checked_in','in_progress')) AS open_items
                     FROM appointments
                     WHERE scheduled_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
                     GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m')
                     ORDER BY report_month DESC"
                )]);

            case 'audit':
                json_response(true, 'Audit activity loaded.', ['data' => fetch_all($pdo,
                    "SELECT al.id, al.action, al.entity_type,
                            al.created_at, COALESCE(u.full_name, 'System') AS actor_name
                     FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
                     ORDER BY al.created_at DESC LIMIT 300"
                )]);

            case 'lookups':
                json_response(true, 'Lookups loaded.', ['data' => [
                    'departments' => fetch_all($pdo, "SELECT id, name FROM departments WHERE is_active = 1 ORDER BY name"),
                ]]);

            default:
                http_response_code(404);
                json_response(false, 'Unknown dashboard request.');
        }
    }

    if ($method !== 'POST') {
        http_response_code(405);
        json_response(false, 'Invalid request method.');
    }

    check_csrf();

    switch ($action) {
        case 'create_staff':
            $fullName = trim($_POST['full_name'] ?? '');
            $email = strtolower(trim($_POST['email'] ?? ''));
            $phone = trim($_POST['phone'] ?? '');
            $password = $_POST['password'] ?? '';
            $jobTitle = trim($_POST['job_title'] ?? '');
            $departmentId = filter_var($_POST['department_id'] ?? null, FILTER_VALIDATE_INT) ?: null;

            $errors = [];
            if (strlen($fullName) < 2) $errors['full_name'] = 'Enter the staff member full name.';
            if (!is_valid_email($email)) $errors['email'] = 'Enter a valid email address.';
            if (!is_valid_phone($phone)) $errors['phone'] = 'Enter a valid phone number.';
            if (!password_rules_passed(check_password_rules($password))) $errors['password'] = 'Use 8+ characters with uppercase, lowercase, number, and special character.';
            if ($jobTitle === '') $errors['job_title'] = 'Enter a job title.';
            if ($errors) json_response(false, 'Please correct the highlighted fields.', ['errors' => $errors]);

            $pdo->beginTransaction();
            $statement = $pdo->prepare(
                "INSERT INTO users (full_name,email,phone,password_hash,role,status)
                 VALUES (:full_name,:email,:phone,:password_hash,'staff',:status)"
            );
            $status = ($_POST['status'] ?? '') === 'pending' ? 'pending' : 'active';
            $statement->execute([
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'status' => $status,
            ]);
            $userId = (int) $pdo->lastInsertId();
            $statement = $pdo->prepare(
                'INSERT INTO staff_profiles
                 (user_id,employee_no,department_id,job_title,license_no,specialization,hired_on,created_by)
                 VALUES (:user_id,NULL,:department_id,:job_title,:license_no,:specialization,:hired_on,:created_by)'
            );
            $statement->execute([
                'user_id' => $userId,
                'department_id' => $departmentId,
                'job_title' => $jobTitle,
                'license_no' => clean_optional($_POST['license_no'] ?? ''),
                'specialization' => clean_optional($_POST['specialization'] ?? ''),
                'hired_on' => clean_optional($_POST['hired_on'] ?? ''),
                'created_by' => $actorId,
            ]);
            $staffProfileId = (int) $pdo->lastInsertId();
            $employeeNo = sprintf('SC-%s-%06d', staff_job_code($jobTitle), $staffProfileId);
            $statement = $pdo->prepare('UPDATE staff_profiles SET employee_no=:employee_no WHERE id=:id');
            $statement->execute(['employee_no' => $employeeNo, 'id' => $staffProfileId]);
            audit_action($pdo, $actorId, 'create', 'staff', (string) $userId, null, ['name' => $fullName, 'email' => $email, 'employee_no' => $employeeNo, 'job_title' => $jobTitle, 'status' => $status]);
            $pdo->commit();
            json_response(true, "Staff account created successfully with ID {$employeeNo}.");

        case 'update_user_status':
            $userId = filter_var($_POST['user_id'] ?? null, FILTER_VALIDATE_INT);
            $status = $_POST['status'] ?? '';
            if (!$userId || !in_array($status, ['pending', 'active', 'suspended', 'inactive'], true)) {
                json_response(false, 'Invalid user or account status.');
            }
            if ((int) $userId === $actorId) json_response(false, 'You cannot change your own account status here.');
            $statement = $pdo->prepare("SELECT status FROM users WHERE id=:id AND role IN ('staff','patient')");
            $statement->execute(['id' => $userId]);
            $old = $statement->fetch();
            if (!$old) json_response(false, 'User was not found.');
            $pdo->beginTransaction();
            $statement = $pdo->prepare('UPDATE users SET status=:status WHERE id=:id');
            $statement->execute(['status' => $status, 'id' => $userId]);
            audit_action($pdo, $actorId, 'status_change', 'user', (string) $userId, ['status' => $old['status']], ['status' => $status]);
            $pdo->commit();
            json_response(true, 'Account status updated.');

        case 'create_service':
            $name = trim($_POST['name'] ?? '');
            $duration = filter_var($_POST['duration_minutes'] ?? null, FILTER_VALIDATE_INT);
            $fee = filter_var($_POST['fee'] ?? null, FILTER_VALIDATE_FLOAT);
            $isActive = ($_POST['is_active'] ?? '1') === '0' ? 0 : 1;
            if ($name === '' || !$duration || $duration < 5 || $duration > 480 || $fee === false || $fee < 0) {
                json_response(false, 'Enter a service name, a duration from 5 to 480 minutes, and a valid non-negative fee.');
            }
            $statement = $pdo->prepare(
                'INSERT INTO services (department_id,name,description,duration_minutes,fee,is_active)
                 VALUES (:department_id,:name,:description,:duration,:fee,:is_active)'
            );
            $statement->execute([
                'department_id' => filter_var($_POST['department_id'] ?? null, FILTER_VALIDATE_INT) ?: null,
                'name' => $name,
                'description' => clean_optional($_POST['description'] ?? ''),
                'duration' => $duration,
                'fee' => number_format((float) $fee, 2, '.', ''),
                'is_active' => $isActive,
            ]);
            $serviceId = (string) $pdo->lastInsertId();
            audit_action($pdo, $actorId, 'create', 'service', $serviceId, null, ['name' => $name, 'is_active' => $isActive]);
            json_response(true, 'Clinic service created.');

        case 'update_service':
            $serviceId = filter_var($_POST['service_id'] ?? null, FILTER_VALIDATE_INT);
            $name = trim($_POST['name'] ?? '');
            $duration = filter_var($_POST['duration_minutes'] ?? null, FILTER_VALIDATE_INT);
            $fee = filter_var($_POST['fee'] ?? null, FILTER_VALIDATE_FLOAT);
            $isActive = ($_POST['is_active'] ?? '1') === '0' ? 0 : 1;
            if (!$serviceId || $name === '' || !$duration || $duration < 5 || $duration > 480 || $fee === false || $fee < 0) {
                json_response(false, 'Enter a service name, a duration from 5 to 480 minutes, and a valid non-negative fee.');
            }
            $statement = $pdo->prepare('SELECT id, department_id, name, description, duration_minutes, fee, is_active FROM services WHERE id=:id');
            $statement->execute(['id' => $serviceId]);
            $old = $statement->fetch();
            if (!$old) json_response(false, 'Clinic service was not found.');
            $new = [
                'department_id' => filter_var($_POST['department_id'] ?? null, FILTER_VALIDATE_INT) ?: null,
                'name' => $name,
                'description' => clean_optional($_POST['description'] ?? ''),
                'duration_minutes' => (int) $duration,
                'fee' => number_format((float) $fee, 2, '.', ''),
                'is_active' => $isActive,
            ];
            $pdo->beginTransaction();
            $statement = $pdo->prepare(
                'UPDATE services SET department_id=:department_id, name=:name, description=:description,
                 duration_minutes=:duration_minutes, fee=:fee, is_active=:is_active WHERE id=:id'
            );
            $statement->execute($new + ['id' => $serviceId]);
            audit_action($pdo, $actorId, 'update', 'service', (string) $serviceId, $old, $new);
            $pdo->commit();
            json_response(true, 'Clinic service updated.');

        case 'set_service_status':
            $serviceId = filter_var($_POST['service_id'] ?? null, FILTER_VALIDATE_INT);
            $isActive = ($_POST['is_active'] ?? '') === '1' ? 1 : 0;
            if (!$serviceId) json_response(false, 'Invalid clinic service.');
            $statement = $pdo->prepare('SELECT name, is_active FROM services WHERE id=:id');
            $statement->execute(['id' => $serviceId]);
            $old = $statement->fetch();
            if (!$old) json_response(false, 'Clinic service was not found.');
            $pdo->beginTransaction();
            $statement = $pdo->prepare('UPDATE services SET is_active=:is_active WHERE id=:id');
            $statement->execute(['is_active' => $isActive, 'id' => $serviceId]);
            audit_action($pdo, $actorId, 'availability_change', 'service', (string) $serviceId, ['is_active' => (int) $old['is_active']], ['is_active' => $isActive]);
            $pdo->commit();
            json_response(true, $isActive ? 'Service is now available.' : 'Service marked unavailable. Existing appointment history was preserved.');

        case 'delete_service':
            $serviceId = filter_var($_POST['service_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$serviceId) json_response(false, 'Invalid clinic service.');
            $statement = $pdo->prepare(
                'SELECT s.id, s.name, s.is_active,
                        (SELECT COUNT(*) FROM appointments a WHERE a.service_id=s.id) AS appointment_count,
                        (SELECT COUNT(*) FROM staff_services ss WHERE ss.service_id=s.id) AS staff_count
                 FROM services s WHERE s.id=:id'
            );
            $statement->execute(['id' => $serviceId]);
            $service = $statement->fetch();
            if (!$service) json_response(false, 'Clinic service was not found.');
            if ((int) $service['appointment_count'] > 0 || (int) $service['staff_count'] > 0) {
                json_response(false, 'This service has staff assignments or appointment history. Mark it unavailable instead of deleting it.');
            }
            $pdo->beginTransaction();
            $statement = $pdo->prepare('DELETE FROM services WHERE id=:id');
            $statement->execute(['id' => $serviceId]);
            audit_action($pdo, $actorId, 'delete', 'service', (string) $serviceId, ['name' => $service['name'], 'is_active' => (int) $service['is_active']], null);
            $pdo->commit();
            json_response(true, 'Unused clinic service deleted.');

        case 'set_schedule_status':
            $scheduleId = filter_var($_POST['schedule_id'] ?? null, FILTER_VALIDATE_INT);
            $isActive = ($_POST['is_active'] ?? '') === '1' ? 1 : 0;
            if (!$scheduleId) json_response(false, 'Invalid staff schedule.');
            $statement = $pdo->prepare('SELECT id, staff_id, weekday, start_time, end_time, is_active FROM staff_schedules WHERE id=:id');
            $statement->execute(['id' => $scheduleId]);
            $old = $statement->fetch();
            if (!$old) json_response(false, 'Staff schedule was not found.');
            $pdo->beginTransaction();
            $statement = $pdo->prepare('UPDATE staff_schedules SET is_active=:is_active WHERE id=:id');
            $statement->execute(['is_active' => $isActive, 'id' => $scheduleId]);
            audit_action($pdo, $actorId, 'availability_change', 'staff_schedule', (string) $scheduleId, ['is_active' => (int) $old['is_active']], ['is_active' => $isActive]);
            $pdo->commit();
            json_response(true, $isActive ? 'Staff schedule activated.' : 'Staff schedule deactivated.');

        case 'delete_schedule':
            $scheduleId = filter_var($_POST['schedule_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$scheduleId) json_response(false, 'Invalid staff schedule.');
            $statement = $pdo->prepare('SELECT id, staff_id, weekday, start_time, end_time, is_active FROM staff_schedules WHERE id=:id');
            $statement->execute(['id' => $scheduleId]);
            $schedule = $statement->fetch();
            if (!$schedule) json_response(false, 'Staff schedule was not found.');
            $pdo->beginTransaction();
            $statement = $pdo->prepare('DELETE FROM staff_schedules WHERE id=:id');
            $statement->execute(['id' => $scheduleId]);
            audit_action($pdo, $actorId, 'delete', 'staff_schedule', (string) $scheduleId, $schedule, null);
            $pdo->commit();
            json_response(true, 'Staff schedule removed.');

        case 'change_admin_password':
            $currentPassword = $_POST['current_password'] ?? '';
            $newPassword = $_POST['new_password'] ?? '';
            $confirmPassword = $_POST['confirm_password'] ?? '';
            $errors = [];
            if ($currentPassword === '') $errors['current_password'] = 'Enter your current password.';
            if (!password_rules_passed(check_password_rules($newPassword))) {
                $errors['new_password'] = 'Use 8+ characters with uppercase, lowercase, number, and special character.';
            }
            if ($confirmPassword === '') $errors['confirm_password'] = 'Confirm your new password.';
            elseif ($newPassword !== $confirmPassword) $errors['confirm_password'] = 'The new passwords do not match.';
            if ($errors) json_response(false, 'Please correct the highlighted fields.', ['errors' => $errors]);

            $statement = $pdo->prepare("SELECT password_hash FROM users WHERE id=:id AND role='superadmin' LIMIT 1");
            $statement->execute(['id' => $actorId]);
            $admin = $statement->fetch();
            if (!$admin || !password_verify($currentPassword, $admin['password_hash'])) {
                json_response(false, 'The current password is incorrect.', ['errors' => ['current_password' => 'The current password is incorrect.']]);
            }
            if (password_verify($newPassword, $admin['password_hash'])) {
                json_response(false, 'Choose a password you have not already been using.', ['errors' => ['new_password' => 'The new password must be different from the current password.']]);
            }

            $pdo->beginTransaction();
            $statement = $pdo->prepare('UPDATE users SET password_hash=:password_hash WHERE id=:id');
            $statement->execute(['password_hash' => password_hash($newPassword, PASSWORD_DEFAULT), 'id' => $actorId]);
            $statement = $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id=:id');
            $statement->execute(['id' => $actorId]);
            audit_action($pdo, $actorId, 'password_change', 'user', (string) $actorId, null, ['password_changed' => true]);
            $pdo->commit();
            json_response(true, 'Your superadmin password was changed successfully.');

        case 'update_appointment_status':
            $appointmentId = filter_var($_POST['appointment_id'] ?? null, FILTER_VALIDATE_INT);
            $status = $_POST['status'] ?? '';
            $allowed = ['requested','confirmed','checked_in','in_progress','completed','cancelled','no_show'];
            if (!$appointmentId || !in_array($status, $allowed, true)) json_response(false, 'Invalid appointment update.');
            $statement = $pdo->prepare('SELECT status FROM appointments WHERE id=:id');
            $statement->execute(['id' => $appointmentId]);
            $old = $statement->fetch();
            if (!$old) json_response(false, 'Appointment was not found.');
            $pdo->beginTransaction();
            $statement = $pdo->prepare('UPDATE appointments SET status=:status WHERE id=:id');
            $statement->execute(['status' => $status, 'id' => $appointmentId]);
            $statement = $pdo->prepare('INSERT INTO appointment_status_history (appointment_id,old_status,new_status,changed_by) VALUES (:id,:old_status,:new_status,:actor)');
            $statement->execute(['id' => $appointmentId, 'old_status' => $old['status'], 'new_status' => $status, 'actor' => $actorId]);
            audit_action($pdo, $actorId, 'status_change', 'appointment', (string) $appointmentId, ['status' => $old['status']], ['status' => $status]);
            $pdo->commit();
            json_response(true, 'Appointment status updated.');

        default:
            http_response_code(404);
            json_response(false, 'Unknown dashboard action.');
    }
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($exception->getCode() === '23000') {
        json_response(false, 'That email, phone, employee number, or service already exists.');
    }
    error_log('SmartCare superadmin database error: ' . $exception->getMessage());
    http_response_code(500);
    json_response(false, 'The dashboard could not complete the database request. Confirm that the expanded schema is imported.');
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('SmartCare superadmin error: ' . $exception->getMessage());
    http_response_code(500);
    json_response(false, 'The dashboard request could not be completed.');
}
