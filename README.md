# SmartCare Auth Portal — README

This is the Log In / Sign Up screen for SmartCare. It's plain HTML, CSS,
JavaScript, and now a small PHP backend — no frameworks, no build step.
Since PHP needs to run server-side, start a PHP server from this folder
and open the page through it, not by double-clicking the file:

```
php -S localhost:8000
```

...then visit `http://localhost:8000`.

This README explains **how the JavaScript and PHP are wired together**
so it's easy to follow even if you're still learning both.

---

## Events and multicast handlers

The browser uses a small JavaScript multicast pattern: one published event invokes
several registered functions. JavaScript does not have C# delegate types; this is
a beginner-friendly implementation using an object, arrays, functions, and a loop.

`js/event-center.js` defines `SmartCareEventCenter.create()` and the shared
`NotificationCenter`. It loads through `includes/footer.php` before feature scripts.
Each password indicator creates its own event center so indicators remain independent.

```js
function updateMessage(data) {
  // Update the appropriate element using data.message.
}
NotificationCenter.subscribe('example:finished', updateMessage, 'Update message');
NotificationCenter.subscribe('example:finished', (data) => {
  console.log(data.message, data.redirect);
}, 'Report result');
NotificationCenter.publish('example:finished', {
  message: 'Finished',
  redirect: 'login.php'
});
```

Handlers run in registration order. The hub logs the event name and handler count,
shows simple event-data labels, then logs each handler's label and the data
labels after it returns. Examples: `password`, `email`, `message: Welcome`,
`error message: Invalid email`, and `redirect: login.php`. Forms and dashboard
records are identified by name without printing their contents. Every additional
event field is labeled automatically, including `token` and `credential`. Form
events also list form field names, such as `password`, `token`, and `job title`,
without their values. A throwing handler is reported as
failed and other subscribers still run. These are independent responses, not a
transaction: one subscriber cannot cancel or roll back another.

Use synchronous subscribers. If a subscriber schedules a toast, navigation, or data
request, its completion log means the request was scheduled, not that the later
operation finished. Database requests and validation stay in their existing ordered
functions; result events are published after the server responds. Passwords, CSRF
values, Google credentials, and full database records are not logged as event data.

| Event | Handlers / responses | Event data | Implementation |
|---|---|---|---|
| `login:success` | Inline message; success toast with redirect on close; result log | `message`, `redirect` | `js/login-notification-events.js` |
| `login:failed` | Inline error with existing timeout; error toast | `message` | `js/login-notification-events.js` |
| `signup:success` | Reset form and strength; success toast with redirect on close; result log | `message`, `redirect` | `js/signup-form.js` |
| `signup:failed` | Restore button; apply field errors; error toast | `message`, `errors` or `title` | `js/signup-form.js` |
| `password:evaluated` | Requirements checklist; strength bars; strength label | `checks`, `metCount`, `empty` | `js/password-strength.js` |
| `password-reset:result` | Restore form and field feedback; inline message; toast | `success`, `message`, optional `errors` | `js/forgot-password-form.js` |
| `logout:confirmed` | Guard repeat clicks; show loader; schedule navigation | `logoutUrl`, `loadingStartedAt` | `js/logout-confirmation.js` |
| `google:success` | Success toast; schedule redirect | `message`, `redirect` | `js/google-auth.js` |
| `admin:data-ready` | Cache data; render applicable view | `view`, `data` | `js/superadmin-dashboard.js` |
| `admin:mutation-succeeded` | Reset form/close dialog when applicable; invalidate cache; toast; request refreshed records and overview | `view`, `message`, optional `form` | `js/superadmin-dashboard.js` |

There is no fixed subscriber limit. Add a subscriber only when it performs useful
work. Single-purpose actions such as switching a password's visibility keep their
ordinary event listeners. Dashboard DOM request events still handle asynchronous
API calls and pass completed results to the shared center.

### Classroom demonstration

1. Open F12, select Console, and enable Preserve log.
2. Complete a successful login or signup to see one event invoke three handlers.
3. Type in a signup password to see one evaluation update the checklist, bars, and
   label. The same reusable indicator also supports staff temporary passwords.
4. Confirm logout or save a dashboard change to see their named responses.

Example console sequence:

```text
[login:success] Event published - 3 handlers
[login:success] Completed: Update inline success message
[login:success] Completed: Request success toast
Login result {message: '...', redirect: '...'}
[login:success] Completed: Report login result
```

Login success demonstrates a meaningful action, three subscribers, two pieces of
event data, an anonymous arrow-function subscriber, and observable event flow.
The old capturing/bubbling demonstration is no longer used.

The forgot-password endpoint currently validates requests but does not generate
reset tokens or send email. Its event handlers display the existing server response.

Run the isolated JavaScript checks with `node tests/event-flows.cjs`. They use mocked
DOM/network objects and do not replace live PHP/MySQL or browser verification.

## 8. Asynchronous processing and loading feedback

Login and sign-up both submit with asynchronous `fetch()` requests so the
browser remains responsive and the loading animation stays smooth. Login
shows "Checking credentials..." while PHP verifies the account; sign-up
shows "Creating your account..." while PHP validates and saves it. The
shared loader remains visible for at least 1.2 seconds before the result
toast appears. Confirmed logout uses the same minimum delay before ending
the session.

Result messages use SweetAlert2 toast notifications when the CDN is
available, with the built-in toast implementation as a fallback.

## 9. Authenticated dashboard

After a successful login, PHP stores the user in the session and the page
reloads into a simple dashboard. It displays the user's name, next
appointment, queue status, care reminders, quick-action buttons, and a logout
link. The dashboard is rendered by `index.php` only when a valid PHP session
exists.

## 10. Where PHP lives, and what it actually does

`index.php` (not `index.html` — it needs to run through PHP now) starts
the session and creates a CSRF token at the very top, before any HTML is
sent, then embeds that token as a hidden `csrf_token` field in **both**
forms. Because it's a real form field, `new FormData(form)` on the JS
side picks it up automatically — no separate fetch just to get a token.

| File | What it does |
|---|---|
| `index.php` | Starts the session, creates/reuses the CSRF token, handles `?logout=1`, and shows a "Logged in as…" banner when `$_SESSION['user']` is set. |
| `php/request.php` | Starts the endpoint session and defines the shared `json_response()` / `check_csrf()` request helpers. |
| `php/config.php` | Contains the database settings and opens the shared PDO connection. |
| `php/validators.php` | Server-side twin of `js/validators.js` — same email/phone/password rules, same names, just in PHP. |
| `php/login.php` | Checks the CSRF token, validates the fields, looks the account up by email, verifies the password with `password_verify()`, and stores `$_SESSION['user']` on success. |
| `php/signup.php` | Checks the CSRF token, validates every field server-side, rejects the email if it's already taken, and inserts the new account with `password_hash()`. |

**How a submission is checked, step by step:**

1. `index.php` embeds the session's CSRF token as a hidden field in
   each form when the page is rendered.
2. When either form submits, `new FormData(form)` already includes that
   token — no extra JS needed — and the handler sends it to
   `php/login.php` or `php/signup.php`.
3. The PHP endpoint calls `check_csrf()` first. If the token doesn't
   match `$_SESSION['csrf_token']`, it rejects the request immediately
   with "Your session expired."
4. It then re-validates every field (using `php/validators.php` for
   signup) and talks to the database through `$pdo` (from `php/config.php`) —
   a `SELECT` + `password_verify()` for login, or a duplicate-email
   check + `INSERT` with `password_hash()` for signup.
5. It replies with JSON: `{ success, message, errors? }`.
6. On a successful login, PHP calls `session_regenerate_id(true)` and
   sets `$_SESSION['user']` — reload `index.php` afterward and you'll
   see the "Logged in as…" banner, with a **Log out** link that clears
   the session via `?logout=1`.

---

## 11. Database setup

The app uses the `smartcare_db` MySQL database. Its schema preserves the
existing `users` contract used by login/sign-up and also provides the tables
needed by the patient, staff, and superadmin dashboard functions. To create a
fresh database:

```
mysql -u root -p < database.sql
```

For an existing installation that still has the original `doctors`,
`appointments`, and `queue_tickets` design, run the one-time migration first:

```powershell
mysql -u root -p -P 3307 < database/migrate_legacy.sql
mysql -u root -p -P 3307 < database/smartcare.sql
```

The migration preserves incompatible tables as `legacy_appointments` and
`legacy_queue_tickets` instead of deleting their data.

`database.sql` creates identity/profile tables, clinic services and staff
schedules, appointments and queues, clinical records and prescriptions,
reminders, messaging, notifications, staff tasks, password-reset tokens,
audit logs, and system settings. It also seeds a demo patient account so the
credentials below still work out of the box. See `database/SCHEMA.md` for the
table-to-function map and relationship notes.

```
email:    demo@smartcare.com
password: Demo1234!
```

`php/config.php` is where the connection details live:

```php
$host = "127.0.0.1";
$port = 3307;
$db   = "smartcare_db";
$user = "root";
$pass = "password";
```

These values are the current project defaults. If your MySQL setup is
different, edit that file before running the app. Every endpoint that touches
the database does
`require __DIR__ . '/config.php';` and then just uses `$pdo` — prepared
statements throughout, so user input never gets concatenated into SQL.

If the connection fails (wrong credentials, or the database/table don't
exist yet), `php/config.php` replies with the same `{ success: false,
message }` JSON shape as every other endpoint, so the form shows a
clear error toast instead of a blank PHP error page.

## 12. Superadmin operations console

Accounts with the `superadmin` role are redirected to
`dashboard/superadmin/dashboard.php`. The console provides database-backed
overview metrics and searchable/exportable views for staff, patients,
appointments, services, schedules, notifications, reports, and audit history.

State-changing operations are handled by `php/superadmin.php`. That endpoint
requires a superadmin session, validates CSRF tokens, uses prepared statements,
and records staff, service, user-status, and appointment-status changes in
`audit_logs`. Public signup creates patient accounts only; staff accounts are
created from the protected superadmin console.

The console uses Lucide SVG icons from a pinned CDN version. Data loading and
mutations use `admin:*` custom browser events so fetching, rendering, refreshes,
and notifications remain decoupled. Direct controls such as opening or closing
the mobile menu remain simple click handlers.


## Google Sign-In setup

This build includes Google Identity Services sign-in for login and signup.

1. Open `php/google-config.php` and replace `PASTE_YOUR_GOOGLE_CLIENT_ID_HERE` with your OAuth 2.0 **Web Client ID** from Google Cloud. Do not place a Client Secret in browser code.
2. For an existing database, run `database/google_oauth_migration.sql` once. New installs can import `database/smartcare.sql`, which already includes the Google fields.
3. In Google Cloud, add every site origin you use under the Web OAuth client's **Authorized JavaScript origins**, for example `http://localhost:8000` and your InfinityFree HTTPS domain.
4. While the OAuth app is in Testing, add the Gmail accounts of your instructor/classmates under **Audience > Test users**.
5. Google-created accounts default to the `patient` role. If a verified Google email already exists as a password account, SmartCare links Google to that account instead of creating a duplicate.

The server verifies Google ID tokens before creating a SmartCare session. A Google-only account has no local password and can add its phone number later.
