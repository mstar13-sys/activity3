# SmartCare database structure

The canonical schema is `database/smartcare.sql`; `database.sql` is an identical root-level copy for convenient importing. Both create `smartcare_db`, matching `php/config.php`.

## Functional map

| System function | Tables |
|---|---|
| Login, signup, roles, account state | `users` |
| Forgot-password completion | `password_reset_tokens` |
| Patient health identity | `patient_profiles`, `patient_allergies` |
| Staff management | `staff_profiles`, `departments`, `staff_services` |
| Services and availability | `services`, `staff_schedules`, `schedule_exceptions` |
| Appointment requests and status changes | `appointments`, `appointment_status_history` |
| Daily clinic queue | `queue_entries` |
| Health records and vital signs | `encounters` |
| Medication schedules | `prescriptions`, `prescription_items`, `care_reminders` |
| Care messages | `conversations`, `conversation_participants`, `messages` |
| User alerts | `notifications` |
| Staff work queue | `staff_tasks` |
| Superadmin traceability and configuration | `audit_logs`, `system_settings` |

## Main relationships

- Every account lives in `users`; `role` controls the existing dashboard redirect.
- A patient account has at most one `patient_profiles` row.
- A staff account has at most one `staff_profiles` row and can provide many services.
- An appointment belongs to one patient and may be assigned to a staff member and service.
- A checked-in appointment may have one queue entry and one clinical encounter.
- Encounters hold clinical notes and can own prescriptions with multiple medication items.
- Foreign keys retain medical and audit history by restricting destructive parent deletes, while user-owned transient data such as notifications is removed with the user.

## Import notes

Use this schema for a fresh database:

```powershell
mysql -u root -p -P 3307 < database.sql
```

The script is safe to run repeatedly for tables and starter rows. For the
original SmartCare database containing `doctors`, the legacy `appointments`
shape, and `queue_tickets`, run `database/migrate_legacy.sql` once before
importing the expanded schema. The migration archives incompatible tables as
`legacy_appointments` and `legacy_queue_tickets`; it does not delete their data.

The demo login remains `demo@smartcare.com` / `Demo1234!`. Passwords are
stored only as PHP-compatible hashes. Fresh databases enforce normalized phone
uniqueness at the database level. A migrated database keeps a non-unique index
until historical duplicate phone values are corrected; `php/signup.php` still
rejects new normalized duplicates.
