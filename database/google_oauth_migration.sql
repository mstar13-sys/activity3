-- SmartCare Google Sign-In migration
-- Run this ONCE on an existing SmartCare database before using Google login.
USE smartcare_db;

ALTER TABLE users
  MODIFY phone VARCHAR(30) NULL,
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash,
  ADD COLUMN auth_provider ENUM('local','google','local_google') NOT NULL DEFAULT 'local' AFTER google_id,
  ADD COLUMN profile_picture VARCHAR(500) NULL AFTER auth_provider,
  ADD UNIQUE KEY uq_users_google_id (google_id);
