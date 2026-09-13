-- SmartCare one-time legacy database migration
--
-- Run this before database/smartcare.sql when smartcare_db still contains
-- the original doctors/appointments/queue_tickets structure. It preserves
-- every legacy row by renaming incompatible tables instead of dropping them.

USE smartcare_db;

-- The old queue foreign-key names would collide with the replacement
-- queue_entries constraints. Keep their relationships under legacy names.
ALTER TABLE queue_tickets
  DROP FOREIGN KEY fk_queue_appointment,
  DROP FOREIGN KEY fk_queue_patient;

-- Renaming appointments automatically updates queue_tickets' referenced
-- table. Both legacy tables remain available for inspection or later import.
RENAME TABLE appointments TO legacy_appointments,
             queue_tickets TO legacy_queue_tickets;

ALTER TABLE legacy_queue_tickets
  ADD CONSTRAINT fk_legacy_queue_appointment
    FOREIGN KEY (appointment_id) REFERENCES legacy_appointments(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_legacy_queue_patient
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE;

-- Bring the existing account table up to the contract used by authentication
-- and the superadmin dashboard. Existing values and primary keys are retained.
ALTER TABLE users
  MODIFY phone VARCHAR(30) NULL,
  MODIFY password_hash VARCHAR(255) NULL,
  MODIFY status ENUM('pending','active','suspended','inactive') NOT NULL DEFAULT 'active',
  ADD COLUMN phone_normalized VARCHAR(30) GENERATED ALWAYS AS
    (REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')',''),'+','')) STORED AFTER phone,
  ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash,
  ADD COLUMN auth_provider ENUM('local','google','local_google') NOT NULL DEFAULT 'local' AFTER google_id,
  ADD COLUMN profile_picture VARCHAR(500) NULL AFTER auth_provider,
  ADD COLUMN last_login_at DATETIME NULL AFTER email_verified_at,
  ADD UNIQUE KEY uq_users_google_id (google_id),
  ADD KEY idx_users_phone_normalized (phone_normalized),
  ADD KEY idx_users_role_status (role,status);

-- A UNIQUE phone_normalized index is intentionally not added during this
-- migration because the legacy database contains historical duplicate phone
-- values. New signups still reject normalized duplicates in php/signup.php.
-- After correcting old duplicates, this can be strengthened with:
-- ALTER TABLE users DROP KEY idx_users_phone_normalized,
--   ADD UNIQUE KEY uq_users_phone_normalized (phone_normalized);
