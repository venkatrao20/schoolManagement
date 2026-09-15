# Combined School Management System

This workspace combines five previously separate apps into one folder. Each
app keeps its own runtime, its own login system, and its own port — they are
**not** single-sign-on and don't share a database. Run each one in its own
terminal tab/window.

| Folder            | Stack                                        | Purpose                                         | Default port |
|-------------------|-----------------------------------------------|--------------------------------------------------|:---:|
| `admin_portal/`   | React + Vite frontend, Node/Express backend   | Classes, students, staff, marks, timetable        | 5173 (front) / 5000 (back) |
| `school_transport/` | Flask + SQLite                              | Bus/route/driver/vehicle tracking                 | 5000 |
| `admissions/`     | React (CRA) frontend, Node/Express backend, MySQL | Enquiries & admissions pipeline               | 3000 (front) / 5000 (back) |
| `academics/`      | Node/Express + SQLite, plain HTML/React (no build) | Teachers, timetable, homework, attendance, exams & results | 4000 |
| `notifications/`  | Flask + SQLite                                | Notifications, fees, events, reports, push alerts  | 5001 |

**Port collision warning:** `admin_portal` backend, `school_transport`, and
`admissions` backend all default to port **5000**. Only run one of those
three at a time, or change the port for the others (see each section below).
`academics` (4000) and `notifications` (5001) don't collide with anything.

---

## 1. Admin Portal (React + Node)

```bash
# Terminal 1 - backend
cd Combined-School-Management-System/admin_portal/backend
cp .env.example .env
npm install
npm run dev          # http://localhost:5000

# Terminal 2 - frontend
cd Combined-School-Management-System/admin_portal
npm install
npm run dev           # http://localhost:5173
```

Seeds demo data automatically on first run (creates `data.json`).

---

## 2. School Transport (Flask + SQLite)

```bash
cd Combined-School-Management-System/school_transport
python -m venv .venv
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python init_db.py     # creates + seeds school_transport.db
python app.py          # http://localhost:5000
```

If admin_portal's backend is already using port 5000, edit the last line of
`app.py` (`app.run(..., port=5000)`) to use a free port instead.

---

## 3. Admissions (React + Node + MySQL)

Requires a local MySQL 8+ server running.

```bash
cd Combined-School-Management-System/admissions

# 1. Create the database & tables
mysql -u root -p < backend/schema/schema.sql

# 2. Edit backend/.env - set DB_PASSWORD to your MySQL root password
#    DB_HOST=localhost / DB_USER=root / DB_NAME=school_admission
#    PORT=5000 / JWT_SECRET=replace-with-a-long-random-secret

# 3. Create the demo login user (schema.sql only creates tables, not the user)
cd backend
npm install
node hashPassword.js        # prints a bcrypt hash for the password "test1234"
```

Copy the printed hash, then insert the user in MySQL:

```sql
USE school_admission;
INSERT INTO users (name, username, password, role)
VALUES ('Admissions Staff', 'admissions01', '<PASTE_HASH_HERE>', 'Admissions');
```

```bash
# 4. Install frontend deps and run both
cd ..
npm run install:all
npm run dev:backend    # Terminal A - http://localhost:5000/api
npm run dev:frontend   # Terminal B - http://localhost:3000
```

---

## 4. Academics (Teachers, Attendance, Exams — Node + SQLite)

No separate database server needed; comes pre-loaded with demo data.

```bash
cd Combined-School-Management-System/academics
./start.sh          # Mac/Linux (auto-installs deps on first run)
# or on Windows: double-click start.bat
# or manually:
#   cd backend && npm install && npm start
```

Open **http://localhost:4000**. To use a different port:
```bash
PORT=4500 npm start        # from academics/backend
```

This module has **no login** — it's open access by design (add auth later if
you need to gate it).

---

## 5. Notifications (Fees, Events, Reports, Push — Flask + SQLite)

```bash
cd Combined-School-Management-System/notifications
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python seed_data.py              # (re)seeds demo data into school.db
python app.py                    # http://127.0.0.1:5001
```

A `.env` with demo values is already included. Set a unique `SECRET_KEY`
before sharing any deployed URL. Web push notifications need a VAPID key
pair — see `notifications/README.md` for `generate_vapid_keys.py` usage.

---

## Login details

| App | URL (dev) | Username | Password | Notes |
|---|---|---|---|---|
| Admin Portal | http://localhost:5173 | `admin@test.com` | `admin123` | Admin role |
| Admin Portal | http://localhost:5173 | `teacher5a@test.com` | `teacher123` | Teacher role, class 5-A |
| School Transport | http://localhost:5000 | `admin` | `admin123` | Admin role |
| School Transport | same | `driver1` … `driver5` | `driver123` | Driver role |
| School Transport | same | `parent1` … `parent10` | `parent123` | Parent role |
| Admissions | http://localhost:3000 | `admissions01` | `test1234` | Created manually in step 3 above |
| Academics | http://localhost:4000 | — | — | No login required |
| Notifications | http://127.0.0.1:5001 | `admin@example.com` | `admin123` | Admin role |
| Notifications | same | `rahul@example.com` | `teacher123` | Teacher role |
| Notifications | same | `priya@example.com` | `parent123` | Parent role |
| Notifications | same | `primary.coordinator@example.com` | `primary123` | Coordinator, classes 1–5 |
| Notifications | same | `secondary.coordinator@example.com` | `secondary123` | Coordinator, classes 6–10 |

**Security note:** all of the above are demo/seed credentials for local
development only. Change every password, every `JWT_SECRET`/`SECRET_KEY`, the
admissions DB password, and generate real VAPID keys before deploying
anywhere public.
