# Admin Portal

A role-based login system built with React + Vite + React Router.

## Features
- Login form with client-side validation (empty field checks)
- Show/hide password toggle
- Calls `POST /api/auth/login` on your backend
- Stores JWT token + user in localStorage, attaches token to future requests
- Displays "Invalid username or password." on failed login
- Redirects to Admin or User dashboard based on role after login
- Protected routes: unauthenticated or wrong-role users are redirected
- Logout clears the session and returns to login

## Setup

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

## Backend contract

Point `API_BASE_URL` in `src/services/authService.js` to your backend.

**POST /api/auth/login**

Request:
```json
{ "username": "user@example.com", "password": "password123" }
```

Success response:
```json
{
  "token": "JWT_TOKEN_HERE",
  "user": { "id": 1, "name": "Jane Doe", "role": "USER" }
}
```

Failure response (any 4xx):
```json
{ "message": "Invalid username or password." }
```

Roles used for routing: `"ADMIN"` → `/admin-dashboard`, `"TEACHER"` → `/teacher-dashboard`, `"USER"` → `/dashboard`.
Any other role, or no match, goes to `/unauthorized`.

## Teacher module

As a Teacher, manage attendance, homework, timetable and marks for the classes
you're assigned to.

- Authorized teachers can view their assigned classes and students.
- Teachers can mark and update student attendance.
- Teachers can create and share homework or assignments.
- Teachers can view their assigned timetable.
- Authorized teachers can enter and update student marks.
- Teachers can access only the classes and students assigned to them
  (enforced centrally in `src/utils/permissions.js`).

**Demo logins** (mock mode, no backend needed):
- Admin: `admin@test.com` / `admin123`
- Teacher: one login per class-section, pattern `teacher<class><section>@test.com`
  / `teacher123` — e.g. `teacher5b@test.com` is the class teacher of 5-B.
  Covers 1-A through 8-B (16 accounts total). Each account's assigned class,
  subject, and name come from the seeded staff records, so they always match
  what's shown in View Records.

An Admin can reset the password for their own account or any Teacher's
account from **Manage Passwords** on the Admin Dashboard — useful if
someone forgets theirs. In mock mode the new password is stored in
`localStorage` (`src/services/userAccountService.js`) and checked on the
next login attempt; swap it for a real `PUT /api/users/:username/password`
call (ADMIN-only) once a backend is available.

**Class Key fallback login** — a teacher who forgot their password doesn't
have to wait on an Admin at all: on the login screen, "sign in with your
class key" lets them pick their Class (1-8) and Section (A/B) instead of
typing a password. Every class-section has its own fixed key (1-A -> `1a`,
5-B -> `5b`, ... 8-B -> `8b`) tied to that section's class teacher account.
This is a low-friction convenience for an internal demo/training tool —
since the key is just the class-section itself, it's predictable by
design, not a secret. A real deployment with real student data should
replace this with a proper reset flow (e.g. an emailed reset link) instead
of carrying the class-key shortcut forward as-is.

Class/subject assignments live in `src/data/teacherAssignments.js`. Attendance,
homework, and marks are persisted to `localStorage` via
`src/services/teacherDataService.js` (same mock-persistence pattern as the
Admin module's `schoolDataService.js`) — swap for real API calls once a
backend is available.

## Folder structure

```
src/
├── components/
│   └── Login.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── AdminDashboard.jsx
│   ├── DataUploadPage.jsx
│   ├── ViewRecordsPage.jsx
│   ├── RecordFormPage.jsx
│   ├── TeacherDashboard.jsx
│   ├── AttendancePage.jsx
│   ├── HomeworkPage.jsx
│   ├── TimetablePage.jsx
│   ├── MarksPage.jsx
│   └── Unauthorized.jsx
├── services/
│   ├── authService.js
│   ├── schoolDataService.js
│   └── teacherDataService.js
├── data/
│   ├── schoolDataSchemas.js
│   └── teacherAssignments.js
├── utils/
│   ├── csv.js
│   ├── validation.js
│   └── permissions.js
├── context/
│   └── AuthContext.jsx
├── App.jsx
├── main.jsx
└── index.css
```
