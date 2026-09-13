-- SmartCare database schema
-- Supports the current auth endpoints plus the patient, staff, and
-- superadmin workflows represented by the dashboards.
-- Import: mysql -u root -p < database/smartcare.sql
-- Existing legacy install: run database/migrate_legacy.sql first.

CREATE DATABASE IF NOT EXISTS smartcare_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartcare_db;
<<<<<<< HEAD
=======
=======
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartcare_db;
>>>>>>> c1874b7688a3fb35217394f3506f42c58bbd82bb
>>>>>>> 327fb05f16b480ff1a84ddf973549faabae266d6

-- Identity and access ------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  phone_normalized VARCHAR(30) GENERATED ALWAYS AS
    (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'+','')) STORED,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(255) NULL,
  auth_provider ENUM('local','google','local_google') NOT NULL DEFAULT 'local',
  profile_picture VARCHAR(500) NULL,
  role ENUM('patient','staff','superadmin') NOT NULL DEFAULT 'patient',
  status ENUM('pending','active','suspended','inactive') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone_normalized (phone_normalized),
  UNIQUE KEY uq_users_google_id (google_id),
  KEY idx_users_role_status (role,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_token (token_hash),
  KEY idx_reset_user_expiry (user_id,expires_at),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- People and clinic organization -----------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_departments_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  medical_record_no VARCHAR(30) NULL,
  date_of_birth DATE NULL,
  sex ENUM('female','male','intersex','prefer_not_to_say') NULL,
  blood_type ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') NOT NULL DEFAULT 'unknown',
  address_line VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  emergency_name VARCHAR(100) NULL,
  emergency_phone VARCHAR(30) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_user (user_id),
  UNIQUE KEY uq_patient_record_no (medical_record_no),
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  employee_no VARCHAR(30) NULL,
  department_id SMALLINT UNSIGNED NULL,
  job_title VARCHAR(100) NOT NULL,
  license_no VARCHAR(80) NULL,
  specialization VARCHAR(120) NULL,
  hired_on DATE NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_user (user_id),
  UNIQUE KEY uq_staff_employee_no (employee_no),
  KEY idx_staff_department (department_id),
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scheduling, appointments, and queue ------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id SMALLINT UNSIGNED NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_services_name (name),
  KEY idx_services_department_active (department_id,is_active),
  CONSTRAINT fk_service_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_services (
  staff_id INT UNSIGNED NOT NULL,
  service_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (staff_id,service_id),
  CONSTRAINT fk_staff_service_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_service_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_id INT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL COMMENT '1=Monday through 7=Sunday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  valid_from DATE NULL,
  valid_until DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_staff_schedule (staff_id,weekday,start_time,valid_from),
  KEY idx_schedule_day (weekday,is_active),
  CONSTRAINT fk_schedule_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_id INT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  type ENUM('available','unavailable') NOT NULL DEFAULT 'unavailable',
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_exception_staff_time (staff_id,starts_at,ends_at),
  CONSTRAINT fk_exception_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(30) NOT NULL,
  patient_id INT UNSIGNED NOT NULL,
  staff_id INT UNSIGNED NULL,
  service_id SMALLINT UNSIGNED NULL,
  scheduled_at DATETIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  status ENUM('requested','confirmed','checked_in','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'requested',
  reason VARCHAR(500) NULL,
  patient_notes TEXT NULL,
  staff_notes TEXT NULL,
  cancelled_by INT UNSIGNED NULL,
  cancellation_reason VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appointment_reference (reference_no),
  KEY idx_appointment_patient_time (patient_id,scheduled_at),
  KEY idx_appointment_staff_time (staff_id,scheduled_at),
  KEY idx_appointment_status_time (status,scheduled_at),
  CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointment_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointment_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointment_canceller FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointment_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  old_status ENUM('requested','confirmed','checked_in','in_progress','completed','cancelled','no_show') NULL,
  new_status ENUM('requested','confirmed','checked_in','in_progress','completed','cancelled','no_show') NOT NULL,
  changed_by INT UNSIGNED NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_appointment_history (appointment_id,created_at),
  CONSTRAINT fk_history_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS queue_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  queue_date DATE NOT NULL,
  ticket_number INT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  patient_id INT UNSIGNED NOT NULL,
  assigned_staff_id INT UNSIGNED NULL,
  status ENUM('waiting','called','in_service','completed','skipped','cancelled') NOT NULL DEFAULT 'waiting',
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  called_at DATETIME NULL,
  service_started_at DATETIME NULL,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_queue_ticket (queue_date,ticket_number),
  UNIQUE KEY uq_queue_appointment (appointment_id),
  KEY idx_queue_live (queue_date,status,ticket_number),
  CONSTRAINT fk_queue_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_queue_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_queue_staff FOREIGN KEY (assigned_staff_id) REFERENCES staff_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clinical records --------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounters (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  staff_id INT UNSIGNED NOT NULL,
  encounter_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chief_complaint VARCHAR(500) NULL,
  diagnosis TEXT NULL,
  clinical_notes TEXT NULL,
  temperature_c DECIMAL(4,1) NULL,
  systolic_bp SMALLINT UNSIGNED NULL,
  diastolic_bp SMALLINT UNSIGNED NULL,
  pulse_bpm SMALLINT UNSIGNED NULL,
  weight_kg DECIMAL(5,2) NULL,
  height_cm DECIMAL(5,2) NULL,
  follow_up_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_encounter_appointment (appointment_id),
  KEY idx_encounter_patient_time (patient_id,encounter_at),
  CONSTRAINT fk_encounter_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_encounter_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_encounter_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_allergies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  allergen VARCHAR(150) NOT NULL,
  reaction VARCHAR(255) NULL,
  severity ENUM('mild','moderate','severe','unknown') NOT NULL DEFAULT 'unknown',
  recorded_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_allergen (patient_id,allergen),
  CONSTRAINT fk_allergy_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_allergy_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prescriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  encounter_id BIGINT UNSIGNED NOT NULL,
  patient_id INT UNSIGNED NOT NULL,
  prescribed_by INT UNSIGNED NOT NULL,
  status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  notes VARCHAR(1000) NULL,
  prescribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_prescription_patient_status (patient_id,status),
  CONSTRAINT fk_prescription_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prescription_staff FOREIGN KEY (prescribed_by) REFERENCES staff_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prescription_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prescription_id BIGINT UNSIGNED NOT NULL,
  medication_name VARCHAR(150) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  route VARCHAR(80) NULL,
  duration_days SMALLINT UNSIGNED NULL,
  instructions VARCHAR(500) NULL,
  KEY idx_prescription_items (prescription_id),
  CONSTRAINT fk_item_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_reminders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  details VARCHAR(1000) NULL,
  remind_at DATETIME NOT NULL,
  recurrence ENUM('none','daily','weekly','monthly') NOT NULL DEFAULT 'none',
  status ENUM('pending','completed','dismissed') NOT NULL DEFAULT 'pending',
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reminder_patient_due (patient_id,status,remind_at),
  CONSTRAINT fk_reminder_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_reminder_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages, notifications, tasks, and administration ---------------------
CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(180) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conversation_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME NULL,
  PRIMARY KEY (conversation_id,user_id),
  KEY idx_participant_user (user_id),
  CONSTRAINT fk_participant_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_participant_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at DATETIME NULL,
  deleted_at DATETIME NULL,
  KEY idx_message_conversation_time (conversation_id,sent_at),
  CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(150) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  action_url VARCHAR(500) NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notification_unread (user_id,read_at,created_at),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assigned_to INT UNSIGNED NULL,
  assigned_by INT UNSIGNED NULL,
  patient_id INT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  details VARCHAR(1000) NULL,
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  status ENUM('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
  due_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_task_assignee_status_due (assigned_to,status,due_at),
  CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to) REFERENCES staff_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_assigner FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  old_values LONGTEXT NULL,
  new_values LONGTEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor_time (actor_id,created_at),
  KEY idx_audit_entity (entity_type,entity_id,created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NULL,
  description VARCHAR(500) NULL,
  updated_by INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_setting_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Idempotent starter data -------------------------------------------------
INSERT INTO departments (name,description) VALUES
  ('General Medicine','General consultations and primary care'),
  ('Nursing','Nursing and patient support services'),
  ('Front Desk','Registration, scheduling, and queue coordination')
ON DUPLICATE KEY UPDATE description=VALUES(description);

INSERT INTO services (department_id,name,description,duration_minutes,fee)
SELECT id,'General Consultation','Primary-care consultation and assessment',30,0.00
FROM departments WHERE name='General Medicine'
ON DUPLICATE KEY UPDATE description=VALUES(description),duration_minutes=VALUES(duration_minutes);

-- Demo login: demo@smartcare.com / Demo1234!
INSERT INTO users (full_name,email,phone,password_hash,role,status) VALUES
  ('Demo Patient','demo@smartcare.com','0917 123 4567',
   '$2y$10$iM4w4CwGpJipFuoI8IusceeRm.t5Hd3sgwsIsQQXJuOaqUObl21PC','patient','active')
ON DUPLICATE KEY UPDATE id=id;

-- Provision the profile rows required by the expanded relationships for all
-- existing accounts as well as the demo account. Existing profiles are kept.
INSERT INTO patient_profiles (user_id,medical_record_no)
SELECT id,CONCAT('SC-',LPAD(id,8,'0')) FROM users WHERE role='patient'
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

INSERT INTO staff_profiles (user_id,employee_no,job_title)
SELECT id,CONCAT('SC-EMP-',LPAD(id,6,'0')),'Clinic Staff'
FROM users WHERE role='staff'
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);
