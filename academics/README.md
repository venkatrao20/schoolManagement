# School Management App — Teachers & Academics Module

A complete, ready-to-run module covering:

- **Teachers & Academics** — Teacher/Staff Profiles, Teacher-Class Allocation, Class & Teacher Timetable, Homework & Assignments (Create/View), Syllabus/Lesson Plan, Academic Calendar, Academic Dashboard, Marks/Academic Information
- **Attendance** — Daily Student Attendance (Present/Absent/Late/Half-Day), Attendance Correction, Attendance Reports, Teacher/Staff Attendance, Leave Management
- **Examination & Results** — Exam Types & Schedule, Marks Entry, Grade/Result Summary, Rank & Performance, Merit List, Report Card Generation

Built as a self-contained full-stack app: **Node.js + Express + SQLite** backend, and a **React (no build step needed)** frontend. Comes pre-loaded with sample demo data so you can explore it immediately.

---

## 1. Requirements

- **Node.js 18+** installed on your computer (download free from https://nodejs.org — the LTS version).
  - Check if you already have it: open a terminal/command prompt and run `node -v`

That's the only requirement. No separate database server needed — it uses a local SQLite file.

---

## 2. How to Run (Easiest Way)

### On Mac / Linux
1. Unzip this folder.
2. Open Terminal, navigate into the folder:
   ```
   cd school-app
   ```
3. Run:
   ```
   ./start.sh
   ```
4. Open your browser to: **http://localhost:4000**

### On Windows
1. Unzip this folder.
2. Double-click **`start.bat`**
3. Open your browser to: **http://localhost:4000**

The first run will automatically install dependencies (takes ~30-60 seconds). Every run after that starts instantly.

---

## 3. Manual Setup (Alternative)

If you prefer to run it manually:

```bash
cd school-app/backend
npm install
npm start
```

Then visit **http://localhost:4000**

---

## 4. What You Get

### Pre-loaded demo data
- 3 classes, 4 subjects, 3 teachers, 4 students
- Sample timetable, homework, syllabus entries, academic calendar events
- Sample attendance records, staff attendance, a leave request
- Sample exams with marks entered, so Result Summary / Rank / Merit List / Report Card all have real data to show immediately

### All 19 screens from your requirement list
| Module | Screens |
|---|---|
| **Teachers & Academics** | Teacher/Staff Profiles · Teacher-Class Allocation · Class & Teacher Timetable · Homework & Assignments (Create/View) · Syllabus/Lesson Plan · Academic Calendar · Academic Dashboard · Marks/Academic Information |
| **Attendance** | Daily Student Attendance · Attendance Correction · Attendance Reports · Teacher/Staff Attendance · Leave Management |
| **Examination & Results** | Exam Types & Schedule · Marks Entry · Grade/Result Summary · Rank & Performance · Merit List · Report Card Generation |

Every screen is fully functional — add, view, edit, and delete real data through the UI; it's stored permanently in the local SQLite database file (`backend/db/school.db`).

---

## 5. Project Structure

```
school-app/
├── start.sh                 ← one-click start (Mac/Linux)
├── start.bat                ← one-click start (Windows)
├── backend/
│   ├── server.js            ← Express server entry point
│   ├── package.json
│   ├── db/
│   │   ├── schema.sql       ← full database schema
│   │   ├── init.js          ← DB init + demo data seeding
│   │   └── school.db        ← created automatically on first run
│   └── routes/
│       ├── academics.js     ← Teachers & Academics APIs
│       ├── attendance.js    ← Attendance APIs
│       └── exams.js         ← Examination & Results APIs
└── public/
    └── index.html           ← full React frontend (single file, no build step)
```

---

## 6. Resetting the Data

To wipe all data and start fresh with demo data again, delete these files and restart:
```
backend/db/school.db
backend/db/school.db-wal
backend/db/school.db-shm
```

---

## 7. Changing the Port

By default the app runs on port `4000`. To use a different port:

```bash
PORT=5000 npm start        # Mac/Linux
set PORT=5000 && npm start # Windows
```

---

## 8. API Reference (for future integration)

All endpoints are under `/api` and return `{ success: true, data: ... }`.

- `GET/POST /api/academics/teachers`, `/allocations`, `/timetable`, `/homework`, `/syllabus`, `/calendar`, `/dashboard`
- `GET/POST /api/attendance/student`, `/staff`, `/leave`; `PUT /api/attendance/student/:id/correct`
- `GET/POST /api/exams/exams`, `/marks`; `GET /api/exams/results/student/:id`, `/rank/:examId`, `/merit-list/:classId`, `/report-card/:studentId`

This module can later be merged into a larger school-management-app repo — it's structured as independent Express routers so it drops in cleanly alongside other modules (Admissions, Fees, Transport, etc.).
