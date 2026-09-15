# Student Transport Management System

A Flask + SQLite web application for managing student transport records,
school movement logs, and parent notifications.

## Features
- Admin, driver, and parent role-based access with secure session login
- Manage students, vehicles, drivers, routes, and transport assignments
  entirely through the app / database (no data is hard-coded in source code)
- Transport status per student is tracked as exactly two states —
  **Boarded** and **Dropped Off** — each automatically timestamped when
  recorded, e.g. "Boarded — 7:10 AM"
- Vehicle is shown by its plate/number (e.g. `MH12AB2021`) and the route is
  shown together with the student's boarding location, e.g.
  `North Loop [Yeshwantpur]`
- School gate entry/exit logging is preserved as a separate, existing
  campus check-in feature
- Parent in-app notifications
- SQLite-backed persistence with replaceable demo data

## Setup (local development)
1. Install dependencies:
   `pip install -r requirements.txt`
2. Initialize the database (creates tables + demo/sample data):
   `python init_db.py`
3. Run the app:
   `python app.py`
4. Open in browser at http://127.0.0.1:5000

## Running tests
```
pip install -r requirements.txt
pytest tests/ -v
```

## Demo Accounts
- Admin: `admin` / `admin123`
- Driver: `driver1` / `driver123`
- Parent: `parent1` / `parent123`

These are seed/demo accounts and data only, for evaluation. An admin can
add, edit, and manage real students, vehicles, drivers, and routes through
the Admin Portal at any time — no code changes are required to use real
school data.

## Production deployment
This app ships with a `wsgi.py` entry point and a `Procfile` so it can run
under a real WSGI server (gunicorn) instead of the Flask development server.

1. Set required environment variables (see `.env.example`):
   - `SECRET_KEY` — a long random string used to sign session cookies
   - `FLASK_ENV=production` — enables secure session cookies (requires HTTPS)
   - `DATABASE_PATH` (optional) — absolute path to the SQLite file, useful
     if your host provides a persistent disk/volume mount
2. Install dependencies: `pip install -r requirements.txt`
3. Start with a production server:
   `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2`

### Important limitation: SQLite persistence
This app uses a single SQLite file for simplicity. On most modern PaaS
platforms (e.g. Render, Railway, Heroku-style dynos) the local filesystem is
**ephemeral** — it is reset on every deploy/restart, and multi-instance
deployments do not share a single file. To persist real data long-term in
production you should either:
- Attach a persistent disk/volume and point `DATABASE_PATH` at a file on it
  (supported by some platforms, e.g. Render's persistent disks or Railway
  volumes), or
- Migrate to a managed database (e.g. PostgreSQL) for multi-instance /
  durable deployments — the code isolates all DB access through a small
  number of helper functions, which keeps such a migration contained.

Without one of the above, data entered in a demo/free-tier deployment can be
lost on redeploy or restart.

## Product-ready enhancements
- Transport assignment edit/update with vehicle-capacity protection.
- Transport reports with date filtering and CSV export.
- Vehicle compliance dates for fitness and pollution certificates.
- Driver licence expiry tracking with dashboard/report alerts.
- Optional GPS tracking: schools can enable GPS per vehicle; non-GPS schools continue using Boarded/Dropped Off tracking.
- Driver phone browser can share live coordinates during an active trip when GPS is enabled.
