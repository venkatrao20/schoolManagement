import os
import sqlite3
from datetime import datetime
from functools import wraps

from flask import Flask, abort, flash, g, redirect, render_template, request, session, url_for, jsonify
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "school_transport.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "school-transport-demo-secret")
app.config["DATABASE"] = os.environ.get("DATABASE_PATH", DB_PATH)

# --- Secure session / cookie configuration ---------------------------------
# These can be tuned via environment variables so the same codebase works in
# both local development and a production deployment (e.g. behind HTTPS).
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == "production"
app.config["PERMANENT_SESSION_LIFETIME"] = 60 * 60 * 8  # 8 hours

# The set of movement types that may be recorded as a "boarding event" for a
# student's transport status. Per product requirements, transport status is
# limited to exactly two values: Boarded and Dropped Off. School gate
# entry/exit remain a separate (existing) campus check-in feature and are
# not part of the transport status.
TRANSPORT_STATUS_TYPES = ("boarding", "drop_off")
ALLOWED_MOVEMENT_TYPES = ("boarding", "drop_off", "school_entry", "school_exit")


def connect_db():
    db = sqlite3.connect(app.config["DATABASE"])
    db.row_factory = sqlite3.Row
    return db


def get_db():
    if "db" not in g:
        g.db = connect_db()
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


@app.context_processor
def inject_now():
    return {'now': datetime.now()}


def init_db():
    db = connect_db()
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin','driver','parent')),
            name TEXT NOT NULL,
            driver_id INTEGER,
            parent_student_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS parent_student_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            UNIQUE(user_id, student_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(student_id) REFERENCES students(id)
        );

        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            class_section TEXT NOT NULL,
            parent_name TEXT NOT NULL,
            parent_contact TEXT,
            pickup_point TEXT,
            dropoff_point TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            contact_number TEXT,
            license_info TEXT,
            license_expiry TEXT,
            assigned_vehicle_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id TEXT UNIQUE NOT NULL,
            route_name TEXT NOT NULL,
            stops TEXT NOT NULL,
            pickup_time TEXT NOT NULL,
            dropoff_time TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT UNIQUE NOT NULL,
            vehicle_number TEXT UNIQUE NOT NULL,
            vehicle_type TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            driver_id INTEGER,
            route_id INTEGER,
            status TEXT DEFAULT 'active',
            gps_enabled INTEGER DEFAULT 0,
            gps_tracking_status TEXT DEFAULT 'offline',
            gps_last_lat REAL,
            gps_last_lng REAL,
            gps_last_updated TEXT,
            insurance_expiry TEXT,
            fitness_expiry TEXT,
            permit_expiry TEXT,
            pollution_expiry TEXT,
            FOREIGN KEY(driver_id) REFERENCES drivers(id),
            FOREIGN KEY(route_id) REFERENCES routes(id)
        );

        CREATE TABLE IF NOT EXISTS transport_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL UNIQUE,
            vehicle_id INTEGER NOT NULL,
            route_id INTEGER NOT NULL,
            assigned_date TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
            FOREIGN KEY(route_id) REFERENCES routes(id)
        );

        CREATE TABLE IF NOT EXISTS student_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            movement_type TEXT NOT NULL,
            movement_date TEXT NOT NULL,
            movement_time TEXT NOT NULL,
            vehicle_id INTEGER,
            route_id INTEGER,
            recorded_by INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
            FOREIGN KEY(route_id) REFERENCES routes(id),
            FOREIGN KEY(recorded_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS not_travelling_today (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            parent_id INTEGER NOT NULL,
            reason TEXT,
            recorded_date TEXT NOT NULL,
            recorded_time TEXT NOT NULL,
            is_notified_driver INTEGER DEFAULT 0,
            is_notified_school INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(parent_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            movement_id INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(movement_id) REFERENCES student_movements(id)
        );

        CREATE TABLE IF NOT EXISTS activity_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_role TEXT NOT NULL,
            action TEXT NOT NULL,
            student_id INTEGER,
            vehicle_id INTEGER,
            route_id INTEGER,
            movement_type TEXT,
            action_date TEXT NOT NULL,
            action_time TEXT NOT NULL,
            details TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
            FOREIGN KEY(route_id) REFERENCES routes(id)
        );

        CREATE TABLE IF NOT EXISTS transport_fees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            fee_month TEXT NOT NULL,
            amount_due REAL NOT NULL CHECK(amount_due >= 0),
            amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
            due_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid')),
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, fee_month),
            FOREIGN KEY(student_id) REFERENCES students(id)
        );

        CREATE TABLE IF NOT EXISTS fee_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fee_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            paid_by INTEGER NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            payment_method TEXT NOT NULL,
            reference_number TEXT NOT NULL UNIQUE,
            paid_at TEXT NOT NULL,
            FOREIGN KEY(fee_id) REFERENCES transport_fees(id),
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(paid_by) REFERENCES users(id)
        );
        """
    )
    db.commit()
    db.close()


def migrate_optional_columns(db):
    """Add newer optional product fields without changing existing data."""
    migrations = {
        "drivers": {"license_expiry": "TEXT"},
        "vehicles": {
            "gps_enabled": "INTEGER DEFAULT 0",
            "gps_tracking_status": "TEXT DEFAULT 'offline'",
            "gps_last_lat": "REAL",
            "gps_last_lng": "REAL",
            "gps_last_updated": "TEXT",
            "insurance_expiry": "TEXT",
            "fitness_expiry": "TEXT",
            "permit_expiry": "TEXT",
            "pollution_expiry": "TEXT",
        },
    }
    for table, columns in migrations.items():
        existing = {row[1] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}
        for column, definition in columns.items():
            if column not in existing:
                db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
    db.commit()


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def expiry_status(value, days=30):
    date_value = parse_date(value)
    if not date_value:
        return None
    delta = (date_value - datetime.today().date()).days
    if delta < 0:
        return {"label": "Expired", "days": delta, "level": "expired"}
    if delta <= days:
        return {"label": f"Expires in {delta} day{'s' if delta != 1 else ''}", "days": delta, "level": "warning"}
    return {"label": "Valid", "days": delta, "level": "valid"}


def get_vehicle_expiry_alerts():
    db = get_db()
    rows = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number").fetchall()
    alerts = []
    fields = [("fitness_expiry", "Fitness Certificate"), ("pollution_expiry", "Pollution Certificate")]
    for row in rows:
        for field, label in fields:
            status = expiry_status(row[field] if field in row.keys() else None)
            if status and status["level"] != "valid":
                alerts.append({"vehicle_number": row["vehicle_number"], "document": label, "expiry": row[field], **status})
    return alerts


def get_driver_expiry_alerts():
    db = get_db()
    rows = db.execute("SELECT * FROM drivers ORDER BY name").fetchall()
    alerts = []
    for row in rows:
        value = row["license_expiry"] if "license_expiry" in row.keys() else None
        status = expiry_status(value)
        if status and status["level"] != "valid":
            alerts.append({"driver_name": row["name"], "license": row["license_info"], "expiry": value, **status})
    return alerts


def movement_label(value):
    labels = {
        "boarding": "Boarded",
        "not_boarded": "Not Boarded",
        "not_travelling": "Not Travelling",
        "drop_off": "Dropped Off",
        "school_entry": "School Entry",
        "school_exit": "School Exit",
    }
    return labels.get(value, value.replace("_", " ").title())


def format_time_12h(value):
    """Convert a 'HH:MM:SS' or 'HH:MM' 24-hour time string into '7:10 AM' style."""
    if not value:
        return ""
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            parsed = datetime.strptime(value, fmt)
            hour = parsed.strftime("%I").lstrip("0") or "0"
            return f"{hour}:{parsed.strftime('%M %p')}"
        except ValueError:
            continue
    return value


def format_datetime_12h(value):
    if not value:
        return ""
    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S").strftime("%d %b %Y, %I:%M %p")
    except ValueError:
        return value


def format_time_24h(value):
    """Convert stored time to HH:MM for an HTML time input."""
    if not value:
        return ""
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p"):
        try:
            return datetime.strptime(value, fmt).strftime("%H:%M")
        except ValueError:
            continue
    return value


def route_with_boarding_location(route_name, boarding_location):
    """Combine a route name with a student's boarding location.

    Produces the required display format, e.g. "North Loop [Yeshwantpur]".
    """
    if not route_name:
        return ""
    if boarding_location:
        return f"{route_name} [{boarding_location}]"
    return route_name


def transport_status_label(movement_type, movement_time):
    """Render a transport status string such as 'Boarded — 7:10 AM'.

    Only the two supported transport statuses (Boarded / Dropped Off) are
    rendered; anything else returns None.
    """
    if movement_type not in TRANSPORT_STATUS_TYPES:
        return None
    label = "Boarded" if movement_type == "boarding" else "Dropped Off"
    return f"{label} — {format_time_12h(movement_time)}"


# Expose helpers to Jinja templates.
app.jinja_env.filters["time12"] = format_time_12h
app.jinja_env.filters["time24"] = format_time_24h
app.jinja_env.filters["datetime12"] = format_datetime_12h
app.jinja_env.filters["movement_label"] = movement_label
app.jinja_env.globals["route_with_boarding_location"] = route_with_boarding_location
app.jinja_env.globals["transport_status_label"] = transport_status_label


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_db().execute(
        "SELECT * FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()


def get_linked_student_ids_for_parent(user_id):
    db = get_db()
    rows = db.execute(
        "SELECT student_id FROM parent_student_links WHERE user_id = ? ORDER BY student_id ASC",
        (user_id,),
    ).fetchall()
    return [row["student_id"] for row in rows]


def can_parent_access_student(user, student_id):
    if user["role"] != "parent":
        return True
    linked_ids = get_linked_student_ids_for_parent(user["id"])
    return student_id in linked_ids


def can_driver_access_student(user, student_id):
    if user["role"] != "driver":
        return True
    db = get_db()
    driver = db.execute("SELECT * FROM drivers WHERE id = ?", (user["driver_id"],)).fetchone()
    if not driver or not driver["assigned_vehicle_id"]:
        return False
    assignment = db.execute(
        "SELECT * FROM transport_assignments WHERE student_id = ? AND vehicle_id = ?",
        (student_id, driver["assigned_vehicle_id"]),
    ).fetchone()
    return assignment is not None


def get_latest_movement_for_student(student_id, movement_type):
    db = get_db()
    return db.execute(
        "SELECT sm.*, s.name AS student_name, u.name AS recorded_by_name FROM student_movements sm JOIN students s ON s.id = sm.student_id JOIN users u ON u.id = sm.recorded_by WHERE sm.student_id = ? AND sm.movement_type = ? ORDER BY sm.id DESC LIMIT 1",
        (student_id, movement_type),
    ).fetchone()


def get_parent_student_summary(student_id, user_id):
    db = get_db()
    student = db.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        return None

    assignment = db.execute(
        "SELECT ta.id, v.id as vehicle_id, v.vehicle_number, v.gps_enabled, v.gps_tracking_status, v.gps_last_lat, v.gps_last_lng, v.gps_last_updated, r.route_name, r.pickup_time, r.dropoff_time, v.vehicle_type, d.id as driver_id, d.name as driver_name, d.contact_number as driver_contact FROM transport_assignments ta JOIN vehicles v ON v.id = ta.vehicle_id JOIN routes r ON r.id = ta.route_id LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id WHERE ta.student_id = ?",
        (student_id,),
    ).fetchone()

    not_travelling_today = db.execute(
        "SELECT * FROM not_travelling_today WHERE student_id = ? AND recorded_date = ?",
        (student_id, datetime.today().strftime("%Y-%m-%d")),
    ).fetchone()

    movement_summary = {
        "boarding": get_latest_movement_for_student(student_id, "boarding"),
        "school_entry": get_latest_movement_for_student(student_id, "school_entry"),
        "school_exit": get_latest_movement_for_student(student_id, "school_exit"),
        "drop_off": get_latest_movement_for_student(student_id, "drop_off"),
    }

    # Determine the current transport status (Boarded / Dropped Off), i.e.
    # whichever of the two events happened most recently.
    boarding_mv = movement_summary["boarding"]
    dropoff_mv = movement_summary["drop_off"]
    if boarding_mv and dropoff_mv:
        latest_transport_mv = dropoff_mv if dropoff_mv["id"] > boarding_mv["id"] else boarding_mv
    else:
        latest_transport_mv = dropoff_mv or boarding_mv
    current_transport_status = (
        transport_status_label(latest_transport_mv["movement_type"], latest_transport_mv["movement_time"])
        if latest_transport_mv
        else None
    )

    notifications = db.execute(
        "SELECT * FROM notifications WHERE student_id = ? AND user_id = ? ORDER BY id DESC LIMIT 10",
        (student_id, user_id),
    ).fetchall()

    return {
        "student": student,
        "assignment": assignment,
        "movement_summary": movement_summary,
        "current_transport_status": current_transport_status,
        "notifications": notifications,
        "not_travelling_today": not_travelling_today,
    }


def log_activity(user_id, user_role, action, student_id=None, vehicle_id=None, route_id=None, movement_type=None, details=None):
    db = get_db()
    action_date = datetime.today().strftime("%Y-%m-%d")
    action_time = datetime.today().strftime("%H:%M:%S")
    db.execute(
        "INSERT INTO activity_audit_log (user_id, user_role, action, student_id, vehicle_id, route_id, movement_type, action_date, action_time, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (user_id, user_role, action, student_id, vehicle_id, route_id, movement_type, action_date, action_time, details),
    )
    db.commit()


def fee_months_from_today(month_count=1):
    """Return YYYY-MM values for the current month and following fee months."""
    today = datetime.today()
    return [
        f"{today.year + ((today.month - 1 + offset) // 12):04d}-{((today.month - 1 + offset) % 12) + 1:02d}"
        for offset in range(month_count)
    ]


def ensure_current_month_fees(month_count=1):
    """Create monthly transport-fee invoices for each student when needed."""
    db = get_db()
    for fee_month in fee_months_from_today(month_count):
        due_date = f"{fee_month}-10"
        db.execute(
            "INSERT OR IGNORE INTO transport_fees (student_id, fee_month, amount_due, due_date) SELECT id, ?, 2500.00, ? FROM students",
            (fee_month, due_date),
        )
    db.commit()


def ensure_parent_links():
    db = get_db()
    if not db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='parent_student_links'").fetchone():
        return

    ensure_parent_links.call_count = getattr(ensure_parent_links, 'call_count', 0) + 1
    if ensure_parent_links.call_count > 1:
        return

    demo_parent_links = {
        "parent1": [1, 2, 7],
        "parent2": [3],
    }

    for username, student_ids in demo_parent_links.items():
        parent = db.execute("SELECT id FROM users WHERE username = ? AND role = 'parent'", (username,)).fetchone()
        if not parent:
            continue
        for student_id in student_ids:
            db.execute(
                "INSERT OR IGNORE INTO parent_student_links (user_id, student_id) VALUES (?, ?)",
                (parent["id"], student_id),
            )

    legacy_links = db.execute(
        "SELECT id, parent_student_id FROM users WHERE role = 'parent' AND parent_student_id IS NOT NULL"
    ).fetchall()
    for row in legacy_links:
        db.execute(
            "INSERT OR IGNORE INTO parent_student_links (user_id, student_id) VALUES (?, ?)",
            (row["id"], row["parent_student_id"]),
        )

    db.commit()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to continue.", "error")
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)

    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user = get_current_user()
            if not user:
                flash("Please log in to continue.", "error")
                return redirect(url_for("login_page"))
            if user["role"] not in roles:
                abort(403)
            return f(*args, **kwargs)

        return wrapped

    return decorator


def compute_dashboard_metrics():
    db = get_db()
    today = datetime.today().strftime("%Y-%m-%d")
    
    total_students = db.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    total_vehicles = db.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
    total_drivers = db.execute("SELECT COUNT(*) FROM drivers").fetchone()[0]
    total_routes = db.execute("SELECT COUNT(*) FROM routes").fetchone()[0]
    boarded_today = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM student_movements WHERE movement_type = 'boarding' AND movement_date = ?",
        (today,),
    ).fetchone()[0]
    dropped_today = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM student_movements WHERE movement_type = 'drop_off' AND movement_date = ?",
        (today,),
    ).fetchone()[0]
    entered_today = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM student_movements WHERE movement_type = 'school_entry' AND movement_date = ?",
        (today,),
    ).fetchone()[0]
    exited_today = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM student_movements WHERE movement_type = 'school_exit' AND movement_date = ?",
        (today,),
    ).fetchone()[0]
    not_travelling_today_count = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM not_travelling_today WHERE recorded_date = ?",
        (today,),
    ).fetchone()[0]

    return {
        "total_students": total_students,
        "total_vehicles": total_vehicles,
        "total_drivers": total_drivers,
        "total_routes": total_routes,
        "boarded_today": boarded_today,
        "dropped_today": dropped_today,
        "entered_today": entered_today,
        "exited_today": exited_today,
        "not_travelling_today": not_travelling_today_count,
    }


def get_student_safety_summary():
    """Get the safety status summary for all students today"""
    db = get_db()
    today = datetime.today().strftime("%Y-%m-%d")
    
    total_students = db.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    
    # Completed journey: boarded + school_entry + school_exit + dropped_off
    completed = db.execute(
        "SELECT COUNT(DISTINCT s.id) FROM students s WHERE (SELECT COUNT(*) FROM student_movements WHERE student_id = s.id AND movement_date = ? AND movement_type IN ('boarding', 'school_entry', 'school_exit', 'drop_off')) = 4",
        (today,),
    ).fetchone()[0]
    
    # At school: entered but not exited
    at_school = db.execute(
        "SELECT COUNT(DISTINCT s.id) FROM students s WHERE s.id IN (SELECT student_id FROM student_movements WHERE movement_date = ? AND movement_type = 'school_entry') AND s.id NOT IN (SELECT student_id FROM student_movements WHERE movement_date = ? AND movement_type = 'school_exit')",
        (today, today),
    ).fetchone()[0]
    
    # Not travelling
    not_travelling = db.execute(
        "SELECT COUNT(DISTINCT student_id) FROM not_travelling_today WHERE recorded_date = ?",
        (today,),
    ).fetchone()[0]
    
    # Not boarded: assigned but no boarding record
    not_boarded = db.execute(
        "SELECT COUNT(DISTINCT s.id) FROM students s WHERE s.id IN (SELECT student_id FROM transport_assignments) AND s.id NOT IN (SELECT student_id FROM student_movements WHERE movement_date = ? AND movement_type = 'boarding') AND s.id NOT IN (SELECT student_id FROM not_travelling_today WHERE recorded_date = ?)",
        (today, today),
    ).fetchone()[0]
    
    # Pending: everything else
    pending = total_students - completed - at_school - not_travelling - not_boarded
    if pending < 0:
        pending = 0

    return {
        "total_students": total_students,
        "completed": completed,
        "at_school": at_school,
        "not_travelling": not_travelling,
        "not_boarded": not_boarded,
        "pending": pending,
    }


@app.route("/")
def home():
    if "user_id" in session:
        user = get_current_user()
        if user["role"] == "parent":
            return redirect(url_for("parent_dashboard"))
        elif user["role"] == "driver":
            return redirect(url_for("driver_dashboard"))
        return redirect(url_for("dashboard"))
    return redirect(url_for("login_page"))


@app.route("/login", methods=["GET", "POST"])
def login_page():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = get_db().execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["role"] = user["role"]
            flash("Login successful.", "success")
            log_activity(user["id"], user["role"], "login", details="User logged in")
            if user["role"] == "parent":
                return redirect(url_for("parent_dashboard"))
            elif user["role"] == "driver":
                return redirect(url_for("driver_dashboard"))
            return redirect(url_for("dashboard"))
        flash("Invalid username or password.", "error")
    return render_template("login.html")


@app.route("/logout")
def logout():
    user = get_current_user()
    if user:
        log_activity(user["id"], user["role"], "logout", details="User logged out")
    session.clear()
    flash("Logged out successfully.", "success")
    return redirect(url_for("login_page"))


@app.route("/dashboard")
@login_required
def dashboard():
    user = get_current_user()
    if user["role"] == "parent":
        return redirect(url_for("parent_dashboard"))
    if user["role"] == "driver":
        return redirect(url_for("driver_dashboard"))

    metrics = compute_dashboard_metrics()
    safety_summary = get_student_safety_summary()
    vehicle_expiry_alerts = get_vehicle_expiry_alerts()
    driver_expiry_alerts = get_driver_expiry_alerts()
    
    recent_records = get_db().execute(
        """
        SELECT sm.id, s.name AS student_name, sm.movement_type, sm.movement_date, sm.movement_time,
               u.name AS recorded_by
        FROM student_movements sm
        JOIN students s ON s.id = sm.student_id
        JOIN users u ON u.id = sm.recorded_by
        ORDER BY sm.id DESC
        LIMIT 8
        """
    ).fetchall()
    
    # Get attention required items
    today = datetime.today().strftime("%Y-%m-%d")
    not_travelling_records = get_db().execute(
        """
        SELECT ntt.*, s.name AS student_name, u.name AS parent_name
        FROM not_travelling_today ntt
        JOIN students s ON s.id = ntt.student_id
        JOIN users u ON u.id = ntt.parent_id
        WHERE ntt.recorded_date = ?
        ORDER BY ntt.created_at DESC
        """,
        (today,),
    ).fetchall()
    
    return render_template(
        "dashboard.html",
        user=user,
        metrics=metrics,
        safety_summary=safety_summary,
        recent_records=recent_records,
        not_travelling_records=not_travelling_records,
        vehicle_expiry_alerts=vehicle_expiry_alerts,
        driver_expiry_alerts=driver_expiry_alerts,
    )


@app.route("/driver-dashboard")
@login_required
def driver_dashboard():
    user = get_current_user()
    if user["role"] != "driver":
        abort(403)

    db = get_db()
    driver = db.execute("SELECT * FROM drivers WHERE id = ?", (user["driver_id"],)).fetchone()
    if not driver:
        flash("Driver profile not found.", "error")
        return redirect(url_for("logout"))

    vehicle = None
    route = None
    students_today = []
    
    if driver["assigned_vehicle_id"]:
        vehicle = db.execute("SELECT * FROM vehicles WHERE id = ?", (driver["assigned_vehicle_id"],)).fetchone()
        if vehicle and vehicle["route_id"]:
            route = db.execute("SELECT * FROM routes WHERE id = ?", (vehicle["route_id"],)).fetchone()
            
            # Get all students assigned to this vehicle
            students_today = db.execute(
                """
                SELECT s.*, ta.id as assignment_id,
                       (SELECT movement_type FROM student_movements WHERE student_id = s.id AND movement_date = ? ORDER BY id DESC LIMIT 1) as latest_movement
                FROM students s
                JOIN transport_assignments ta ON ta.student_id = s.id
                WHERE ta.vehicle_id = ?
                ORDER BY s.name
                """,
                (datetime.today().strftime("%Y-%m-%d"), driver["assigned_vehicle_id"]),
            ).fetchall()

    # Get today's movements for students on this driver's route
    today = datetime.today().strftime("%Y-%m-%d")
    recent_movements = db.execute(
        """
        SELECT sm.*, s.name AS student_name
        FROM student_movements sm
        JOIN students s ON s.id = sm.student_id
        WHERE sm.vehicle_id = ? AND sm.movement_date = ?
        ORDER BY sm.movement_time DESC
        LIMIT 10
        """,
        (vehicle["id"], today) if vehicle else (None, today),
    ).fetchall()
    
    # Get notifications for students on this route
    notifications = db.execute(
        """
        SELECT n.*, s.name AS student_name
        FROM notifications n
        JOIN students s ON s.id = n.student_id
        WHERE s.id IN (
            SELECT student_id FROM transport_assignments WHERE vehicle_id = ?
        )
        ORDER BY n.created_at DESC
        LIMIT 5
        """,
        (driver["assigned_vehicle_id"],) if driver["assigned_vehicle_id"] else (None,),
    ).fetchall() if driver["assigned_vehicle_id"] else []

    return render_template(
        "driver_dashboard.html",
        user=user,
        driver=driver,
        vehicle=vehicle,
        route=route,
        students_today=students_today,
        recent_movements=recent_movements,
        notifications=notifications,
    )


@app.route("/parent-dashboard")
@login_required
def parent_dashboard():
    user = get_current_user()
    if user["role"] != "parent":
        abort(403)

    linked_student_ids = get_linked_student_ids_for_parent(user["id"])
    children = []
    for student_id in linked_student_ids:
        summary = get_parent_student_summary(student_id, user["id"])
        if summary:
            children.append(summary)

    notifications = get_db().execute(
        "SELECT n.*, s.name AS student_name FROM notifications n JOIN students s ON s.id = n.student_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 20",
        (user["id"],),
    ).fetchall()

    return render_template(
        "parent_dashboard.html",
        user=user,
        children=children,
        notifications=notifications,
    )


@app.route("/parent/not-travelling-today", methods=["POST"])
@login_required
def parent_not_travelling_today():
    user = get_current_user()
    if user["role"] != "parent":
        abort(403)

    db = get_db()
    student_id = request.form.get("student_id")
    reason = request.form.get("reason", "")
    
    if not student_id:
        flash("Student selection is required.", "error")
        return redirect(url_for("parent_dashboard"))
    
    # Verify parent has access to this student
    if not can_parent_access_student(user, int(student_id)):
        flash("You don't have access to this student.", "error")
        return redirect(url_for("parent_dashboard"))
    
    student = db.execute("SELECT * FROM students WHERE id = ?", (int(student_id),)).fetchone()
    if not student:
        flash("Student not found.", "error")
        return redirect(url_for("parent_dashboard"))
    
    recorded_date = datetime.today().strftime("%Y-%m-%d")
    recorded_time = datetime.today().strftime("%H:%M:%S")
    
    db.execute(
        "INSERT INTO not_travelling_today (student_id, parent_id, reason, recorded_date, recorded_time) VALUES (?, ?, ?, ?, ?)",
        (int(student_id), user["id"], reason, recorded_date, recorded_time),
    )
    db.commit()
    
    # Create notification for parent
    message = f"{student['name']} marked as 'Not Travelling Today'. Reason: {reason if reason else 'Not specified'}."
    db.execute(
        "INSERT INTO notifications (student_id, user_id, message, is_read) VALUES (?, ?, ?, 0)",
        (int(student_id), user["id"], message),
    )
    
    # Create notification for driver
    assignment = db.execute(
        "SELECT * FROM transport_assignments WHERE student_id = ?",
        (int(student_id),),
    ).fetchone()
    
    if assignment:
        driver = db.execute(
            "SELECT * FROM drivers WHERE assigned_vehicle_id = ?",
            (assignment["vehicle_id"],),
        ).fetchone()
        
        if driver:
            driver_user = db.execute(
                "SELECT * FROM users WHERE driver_id = ? AND role = 'driver'",
                (driver["id"],),
            ).fetchone()
            
            if driver_user:
                driver_message = f"{student['name']} will not be travelling today. Reason: {reason if reason else 'Not specified'}."
                db.execute(
                    "INSERT INTO notifications (student_id, user_id, message, is_read) VALUES (?, ?, ?, 0)",
                    (int(student_id), driver_user["id"], driver_message),
                )
    
    db.commit()
    
    log_activity(user["id"], "parent", "mark_not_travelling_today", int(student_id), details=f"Reason: {reason}")
    
    flash(f"{student['name']} marked as not travelling today.", "success")
    return redirect(url_for("parent_dashboard"))


@app.route("/fees")
@login_required
def fees():
    user = get_current_user()
    db = get_db()
    ensure_current_month_fees()

    if user["role"] not in ("admin", "parent"):
        abort(403)

    try:
        plan_months = int(request.args.get("plan", "1"))
    except ValueError:
        plan_months = 1
    if plan_months not in (1, 3, 6):
        plan_months = 1
    ensure_current_month_fees(plan_months)
    fee_months = fee_months_from_today(plan_months)
    placeholders = ",".join("?" for _ in fee_months)
    params = fee_months
    query = """
        SELECT s.id AS student_db_id, s.name AS student_name, s.student_id AS admission_number,
               s.class_section, s.parent_name, SUM(tf.amount_due) AS amount_due,
               SUM(tf.amount_paid) AS amount_paid,
               SUM(tf.amount_due - tf.amount_paid) AS balance,
               CASE WHEN SUM(tf.amount_due - tf.amount_paid) <= 0 THEN 'paid'
                    WHEN SUM(tf.amount_paid) > 0 THEN 'partial' ELSE 'pending' END AS status
        FROM transport_fees tf
        JOIN students s ON s.id = tf.student_id
        WHERE tf.fee_month IN (""" + placeholders + ")"
    if user["role"] == "parent":
        linked_ids = get_linked_student_ids_for_parent(user["id"])
        if not linked_ids:
            fee_records = []
        else:
            student_placeholders = ",".join("?" for _ in linked_ids)
            fee_records = db.execute(
                query + f" AND tf.student_id IN ({student_placeholders}) GROUP BY s.id ORDER BY s.name", params + linked_ids
            ).fetchall()
    else:
        fee_records = db.execute(query + " GROUP BY s.id ORDER BY s.name", params).fetchall()

    payments = db.execute(
        """
        SELECT fp.*, s.name AS student_name, u.name AS paid_by_name
        FROM fee_payments fp
        JOIN students s ON s.id = fp.student_id
        JOIN users u ON u.id = fp.paid_by
        ORDER BY fp.id DESC LIMIT 20
        """
    ).fetchall() if user["role"] == "admin" else []

    summary = {
        "due": sum(record["amount_due"] for record in fee_records),
        "collected": sum(record["amount_paid"] for record in fee_records),
        "pending": sum(1 for record in fee_records if record["status"] != "paid"),
    }
    return render_template(
        "fees.html", user=user, fee_records=fee_records, payments=payments,
        fee_month=f"{fee_months[0]} to {fee_months[-1]}", plan_months=plan_months,
        summary=summary,
    )


@app.route("/fees/pay", methods=["POST"])
@login_required
@role_required("parent")
def pay_transport_fee():
    user = get_current_user()
    db = get_db()
    student_id_value = request.form.get("student_id")
    payment_method = request.form.get("payment_method", "").strip()
    if payment_method not in ("UPI", "Card", "Net Banking"):
        flash("Select a valid payment method.", "error")
        return redirect(url_for("fees"))

    # A payment plan settles all outstanding invoices in the selected period.
    if student_id_value:
        try:
            student_id = int(student_id_value)
            plan_months = int(request.form.get("plan_months", "1"))
        except ValueError:
            flash("Invalid payment plan.", "error")
            return redirect(url_for("fees"))
        if plan_months not in (1, 3, 6) or not can_parent_access_student(user, student_id):
            abort(403)

        ensure_current_month_fees(plan_months)
        months = fee_months_from_today(plan_months)
        placeholders = ",".join("?" for _ in months)
        invoices = db.execute(
            f"SELECT * FROM transport_fees WHERE student_id = ? AND fee_month IN ({placeholders}) ORDER BY fee_month",
            [student_id] + months,
        ).fetchall()
        outstanding_invoices = [invoice for invoice in invoices if invoice["amount_due"] > invoice["amount_paid"]]
        if not outstanding_invoices:
            flash("This fee plan has already been paid.", "error")
            return redirect(url_for("fees", plan=plan_months))

        paid_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        reference_prefix = f"TP{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        total_paid = 0
        for invoice in outstanding_invoices:
            amount = round(invoice["amount_due"] - invoice["amount_paid"], 2)
            db.execute(
                "INSERT INTO fee_payments (fee_id, student_id, paid_by, amount, payment_method, reference_number, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (invoice["id"], student_id, user["id"], amount, payment_method, f"{reference_prefix}-{invoice['id']}", paid_at),
            )
            db.execute(
                "UPDATE transport_fees SET amount_paid = amount_due, status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (invoice["id"],),
            )
            total_paid += amount
        db.commit()
        log_activity(user["id"], "parent", "pay_transport_fee", student_id, details=f"{plan_months}-month plan via {payment_method}: INR {total_paid:.2f}")
        flash(f"{plan_months}-month payment of INR {total_paid:,.2f} completed.", "success")
        return redirect(url_for("fees", plan=plan_months))

    try:
        fee_id = int(request.form.get("fee_id", ""))
        amount = round(float(request.form.get("amount", "0")), 2)
    except ValueError:
        flash("Enter a valid payment amount.", "error")
        return redirect(url_for("fees"))

    if amount <= 0:
        flash("Select a payment method and enter an amount greater than zero.", "error")
        return redirect(url_for("fees"))

    fee = db.execute("SELECT * FROM transport_fees WHERE id = ?", (fee_id,)).fetchone()
    if not fee or not can_parent_access_student(user, fee["student_id"]):
        abort(403)

    balance = round(fee["amount_due"] - fee["amount_paid"], 2)
    if fee["status"] == "paid" or amount > balance:
        flash("The payment amount cannot exceed the outstanding balance.", "error")
        return redirect(url_for("fees"))

    new_paid = round(fee["amount_paid"] + amount, 2)
    status = "paid" if new_paid >= fee["amount_due"] else "partial"
    paid_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    reference_number = f"TP{datetime.now().strftime('%Y%m%d%H%M%S%f')}{fee_id}"
    db.execute(
        "INSERT INTO fee_payments (fee_id, student_id, paid_by, amount, payment_method, reference_number, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (fee_id, fee["student_id"], user["id"], amount, payment_method, reference_number, paid_at),
    )
    db.execute(
        "UPDATE transport_fees SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_paid, status, fee_id),
    )
    db.commit()
    log_activity(user["id"], "parent", "pay_transport_fee", fee["student_id"], details=f"{payment_method}: INR {amount:.2f}, Ref {reference_number}")
    flash(f"Payment of INR {amount:,.2f} completed. Reference: {reference_number}", "success")
    return redirect(url_for("fees"))


@app.route("/students", methods=["GET", "POST"])
@login_required
@role_required("admin")
def students():
    db = get_db()
    if request.method == "POST":
        student_id = request.form.get("student_id", "").strip()
        name = request.form.get("name", "").strip()
        class_section = request.form.get("class_section", "").strip()
        parent_name = request.form.get("parent_name", "").strip()
        parent_contact = request.form.get("parent_contact", "").strip()
        pickup_point = request.form.get("pickup_point", "").strip()
        dropoff_point = request.form.get("dropoff_point", "").strip()

        if not all([student_id, name, class_section, parent_name]):
            flash("Please complete all required student fields.", "error")
            return redirect(url_for("students"))

        try:
            db.execute(
                "INSERT INTO students (student_id, name, class_section, parent_name, parent_contact, pickup_point, dropoff_point) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (student_id, name, class_section, parent_name, parent_contact, pickup_point, dropoff_point),
            )
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "add_student", None, details=f"Student: {name}")
            flash("Student added successfully.", "success")
        except sqlite3.IntegrityError:
            flash("A student with that ID already exists.", "error")
        return redirect(url_for("students"))

    search_query = request.args.get("search", "").strip()
    if search_query:
        students_list = db.execute(
            "SELECT * FROM students WHERE name LIKE ? OR student_id LIKE ? OR class_section LIKE ? ORDER BY name ASC",
            (f"%{search_query}%", f"%{search_query}%", f"%{search_query}%"),
        ).fetchall()
    else:
        students_list = db.execute("SELECT * FROM students ORDER BY name ASC").fetchall()
    
    return render_template("students.html", students=students_list, search_query=search_query)


@app.route("/students/<int:student_id>")
@login_required
def student_detail(student_id):
    user = get_current_user()
    db = get_db()
    
    if user["role"] == "parent" and not can_parent_access_student(user, student_id):
        abort(403)
    
    if user["role"] == "driver" and not can_driver_access_student(user, student_id):
        abort(403)
    
    student = db.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        abort(404)
    
    assignment = db.execute(
        "SELECT ta.id, ta.vehicle_id, ta.route_id, v.vehicle_number, r.route_name, r.pickup_time, r.dropoff_time, d.name as driver_name, d.contact_number as driver_contact FROM transport_assignments ta JOIN vehicles v ON v.id = ta.vehicle_id JOIN routes r ON r.id = ta.route_id LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id WHERE ta.student_id = ?",
        (student_id,),
    ).fetchone()
    
    movements = db.execute(
        "SELECT sm.*, u.name AS recorded_by_name FROM student_movements sm JOIN users u ON u.id = sm.recorded_by WHERE sm.student_id = ? ORDER BY sm.id DESC",
        (student_id,),
    ).fetchall()
    
    not_travelling_records = db.execute(
        "SELECT * FROM not_travelling_today WHERE student_id = ? ORDER BY id DESC LIMIT 5",
        (student_id,),
    ).fetchall()

    boarding_mv = get_latest_movement_for_student(student_id, "boarding")
    dropoff_mv = get_latest_movement_for_student(student_id, "drop_off")
    if boarding_mv and dropoff_mv:
        latest_transport_mv = dropoff_mv if dropoff_mv["id"] > boarding_mv["id"] else boarding_mv
    else:
        latest_transport_mv = dropoff_mv or boarding_mv
    current_transport_status = (
        transport_status_label(latest_transport_mv["movement_type"], latest_transport_mv["movement_time"])
        if latest_transport_mv
        else None
    )

    return render_template(
        "student_detail.html",
        student=student,
        assignment=assignment,
        movements=movements,
        not_travelling_records=not_travelling_records,
        current_transport_status=current_transport_status,
    )


@app.route("/vehicles/<int:vehicle_id>/edit", methods=["GET", "POST"])
@login_required
@role_required("admin")
def edit_vehicle(vehicle_id):
    db = get_db()
    vehicle = db.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id,)).fetchone()
    if not vehicle:
        flash("Vehicle not found.", "error")
        return redirect(url_for("vehicles"))
    if request.method == "POST":
        vehicle_id_text = request.form.get("vehicle_id", "").strip()
        vehicle_number = request.form.get("vehicle_number", "").strip()
        vehicle_type = request.form.get("vehicle_type", "").strip()
        capacity = request.form.get("capacity", "").strip()
        status = request.form.get("status", "active").strip()
        gps_enabled = 1 if request.form.get("gps_enabled") == "on" else 0
        insurance_expiry = request.form.get("insurance_expiry", "").strip() or None
        fitness_expiry = request.form.get("fitness_expiry", "").strip() or None
        permit_expiry = request.form.get("permit_expiry", "").strip() or None
        pollution_expiry = request.form.get("pollution_expiry", "").strip() or None
        route_id = request.form.get("route_id")
        driver_id = request.form.get("driver_id")
        if not all([vehicle_id_text, vehicle_number, vehicle_type, capacity]):
            flash("Please complete all vehicle fields.", "error")
            return redirect(url_for("edit_vehicle", vehicle_id=vehicle_id))
        try:
            if int(capacity) <= 0:
                raise ValueError
            db.execute("""UPDATE vehicles SET vehicle_id = ?, vehicle_number = ?, vehicle_type = ?, capacity = ?, driver_id = ?, route_id = ?, status = ?, gps_enabled = ?, insurance_expiry = ?, fitness_expiry = ?, permit_expiry = ?, pollution_expiry = ? WHERE id = ?""",
                       (vehicle_id_text, vehicle_number, vehicle_type, int(capacity), driver_id or None, route_id or None, status, gps_enabled, insurance_expiry, fitness_expiry, permit_expiry, pollution_expiry, vehicle_id))
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "update_vehicle", None, vehicle_id=vehicle_id, details=f"Vehicle: {vehicle_number}")
            flash("Vehicle updated successfully.", "success")
            return redirect(url_for("vehicles"))
        except (sqlite3.IntegrityError, ValueError):
            flash("Vehicle ID/number must be unique and capacity must be a valid number.", "error")
            return redirect(url_for("edit_vehicle", vehicle_id=vehicle_id))
    drivers = db.execute("SELECT * FROM drivers ORDER BY name ASC").fetchall()
    routes = db.execute("SELECT * FROM routes ORDER BY route_name ASC").fetchall()
    vehicles_list = db.execute("SELECT v.*, d.name AS driver_name, r.route_name FROM vehicles v LEFT JOIN drivers d ON d.id = v.driver_id LEFT JOIN routes r ON r.id = v.route_id ORDER BY v.vehicle_number ASC").fetchall()
    return render_template("vehicles.html", vehicles=vehicles_list, drivers=drivers, routes=routes, edit_vehicle=vehicle)

@app.route("/vehicles", methods=["GET", "POST"])
@login_required
@role_required("admin")
def vehicles():
    db = get_db()
    if request.method == "POST":
        vehicle_id = request.form.get("vehicle_id", "").strip()
        vehicle_number = request.form.get("vehicle_number", "").strip()
        vehicle_type = request.form.get("vehicle_type", "").strip()
        capacity = request.form.get("capacity", "").strip()
        status = request.form.get("status", "active").strip()
        gps_enabled = 1 if request.form.get("gps_enabled") == "on" else 0
        insurance_expiry = request.form.get("insurance_expiry", "").strip() or None
        fitness_expiry = request.form.get("fitness_expiry", "").strip() or None
        permit_expiry = request.form.get("permit_expiry", "").strip() or None
        pollution_expiry = request.form.get("pollution_expiry", "").strip() or None
        route_id = request.form.get("route_id")
        driver_id = request.form.get("driver_id")
        if not all([vehicle_id, vehicle_number, vehicle_type, capacity]):
            flash("Please complete all vehicle fields.", "error")
            return redirect(url_for("vehicles"))
        try:
            if int(capacity) <= 0:
                raise ValueError
            db.execute(
                "INSERT INTO vehicles (vehicle_id, vehicle_number, vehicle_type, capacity, driver_id, route_id, status, gps_enabled, insurance_expiry, fitness_expiry, permit_expiry, pollution_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (vehicle_id, vehicle_number, vehicle_type, int(capacity), driver_id or None, route_id or None, status, gps_enabled, insurance_expiry, fitness_expiry, permit_expiry, pollution_expiry),
            )
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "add_vehicle", None, vehicle_id=None, details=f"Vehicle: {vehicle_number}")
            flash("Vehicle added successfully.", "success")
        except sqlite3.IntegrityError:
            flash("A vehicle with that ID or number already exists.", "error")
        return redirect(url_for("vehicles"))

    vehicles_list = db.execute(
        "SELECT v.*, d.name AS driver_name, r.route_name FROM vehicles v LEFT JOIN drivers d ON d.id = v.driver_id LEFT JOIN routes r ON r.id = v.route_id ORDER BY v.vehicle_number ASC"
    ).fetchall()
    drivers = db.execute("SELECT * FROM drivers ORDER BY name ASC").fetchall()
    routes = db.execute("SELECT * FROM routes ORDER BY route_name ASC").fetchall()
    return render_template("vehicles.html", vehicles=vehicles_list, drivers=drivers, routes=routes)


@app.route("/drivers/<int:driver_id>/edit", methods=["GET", "POST"])
@login_required
@role_required("admin")
def edit_driver(driver_id):
    db = get_db()
    driver = db.execute("SELECT * FROM drivers WHERE id = ?", (driver_id,)).fetchone()
    if not driver:
        flash("Driver not found.", "error")
        return redirect(url_for("drivers"))
    if request.method == "POST":
        driver_id_text = request.form.get("driver_id", "").strip()
        name = request.form.get("name", "").strip()
        contact_number = request.form.get("contact_number", "").strip()
        license_info = request.form.get("license_info", "").strip()
        license_expiry = request.form.get("license_expiry", "").strip() or None
        assigned_vehicle_id = request.form.get("assigned_vehicle_id")
        if not all([driver_id_text, name, contact_number, license_info]):
            flash("Driver details are incomplete.", "error")
            return redirect(url_for("edit_driver", driver_id=driver_id))

        if db.execute("SELECT id FROM drivers WHERE driver_id = ? AND id != ?", (driver_id_text, driver_id)).fetchone():
            flash("Driver ID already exists.", "error")
            return redirect(url_for("edit_driver", driver_id=driver_id))

        if db.execute(
            "SELECT id FROM drivers WHERE LOWER(TRIM(license_info)) = LOWER(TRIM(?)) AND id != ?",
            (license_info, driver_id),
        ).fetchone():
            flash("License Number already exists. Please enter a unique license number.", "error")
            return redirect(url_for("edit_driver", driver_id=driver_id))

        if assigned_vehicle_id and db.execute(
            "SELECT id FROM drivers WHERE assigned_vehicle_id = ? AND id != ?",
            (assigned_vehicle_id, driver_id),
        ).fetchone():
            flash("This vehicle is already assigned to another driver. Please select a different vehicle.", "error")
            return redirect(url_for("edit_driver", driver_id=driver_id))

        try:
            db.execute("""UPDATE drivers SET driver_id = ?, name = ?, contact_number = ?, license_info = ?, license_expiry = ?, assigned_vehicle_id = ? WHERE id = ?""",
                       (driver_id_text, name, contact_number, license_info, license_expiry, assigned_vehicle_id or None, driver_id))
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "update_driver", None, details=f"Driver: {name}")
            flash("Driver updated successfully.", "success")
            return redirect(url_for("drivers"))
        except sqlite3.IntegrityError:
            flash("Driver ID already exists.", "error")
            return redirect(url_for("edit_driver", driver_id=driver_id))
    vehicles = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number ASC").fetchall()
    drivers_list = db.execute("SELECT d.*, v.vehicle_number AS assigned_vehicle FROM drivers d LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id ORDER BY d.name ASC").fetchall()
    return render_template("drivers.html", drivers=drivers_list, vehicles=vehicles, edit_driver=driver)

@app.route("/drivers", methods=["GET", "POST"])
@login_required
@role_required("admin")
def drivers():
    db = get_db()
    if request.method == "POST":
        driver_id = request.form.get("driver_id", "").strip()
        name = request.form.get("name", "").strip()
        contact_number = request.form.get("contact_number", "").strip()
        license_info = request.form.get("license_info", "").strip()
        license_expiry = request.form.get("license_expiry", "").strip() or None
        assigned_vehicle_id = request.form.get("assigned_vehicle_id")
        if not all([driver_id, name, contact_number, license_info]):
            flash("Driver details are incomplete.", "error")
            return redirect(url_for("drivers"))

        if db.execute("SELECT id FROM drivers WHERE driver_id = ?", (driver_id,)).fetchone():
            flash("Driver ID already exists.", "error")
            return redirect(url_for("drivers"))

        if db.execute(
            "SELECT id FROM drivers WHERE LOWER(TRIM(license_info)) = LOWER(TRIM(?))",
            (license_info,),
        ).fetchone():
            flash("License Number already exists. Please enter a unique license number.", "error")
            return redirect(url_for("drivers"))

        if assigned_vehicle_id and db.execute(
            "SELECT id FROM drivers WHERE assigned_vehicle_id = ?",
            (assigned_vehicle_id,),
        ).fetchone():
            flash("This vehicle is already assigned to another driver. Please select a different vehicle.", "error")
            return redirect(url_for("drivers"))

        try:
            db.execute(
                "INSERT INTO drivers (driver_id, name, contact_number, license_info, license_expiry, assigned_vehicle_id) VALUES (?, ?, ?, ?, ?, ?)",
                (driver_id, name, contact_number, license_info, license_expiry, assigned_vehicle_id or None),
            )
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "add_driver", None, details=f"Driver: {name}")
            flash("Driver added successfully.", "success")
        except sqlite3.IntegrityError:
            flash("Driver ID already exists.", "error")
        return redirect(url_for("drivers"))

    drivers_list = db.execute(
        "SELECT d.*, v.vehicle_number AS assigned_vehicle FROM drivers d LEFT JOIN vehicles v ON v.id = d.assigned_vehicle_id ORDER BY d.name ASC"
    ).fetchall()
    vehicles = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number ASC").fetchall()
    return render_template("drivers.html", drivers=drivers_list, vehicles=vehicles)


@app.route("/routes/<int:route_id>/edit", methods=["GET", "POST"])
@login_required
@role_required("admin")
def edit_route(route_id):
    db = get_db()
    route = db.execute("SELECT * FROM routes WHERE id = ?", (route_id,)).fetchone()
    if not route:
        flash("Route not found.", "error")
        return redirect(url_for("routes"))
    if request.method == "POST":
        route_id_text = request.form.get("route_id", "").strip()
        route_name = request.form.get("route_name", "").strip()
        stops = request.form.get("stops", "").strip()
        pickup_time = request.form.get("pickup_time", "").strip()
        dropoff_time = request.form.get("dropoff_time", "").strip()
        if not all([route_id_text, route_name, stops, pickup_time, dropoff_time]):
            flash("Please complete all route fields.", "error")
            return redirect(url_for("edit_route", route_id=route_id))
        try:
            db.execute("""UPDATE routes SET route_id = ?, route_name = ?, stops = ?, pickup_time = ?, dropoff_time = ? WHERE id = ?""",
                       (route_id_text, route_name, stops, pickup_time, dropoff_time, route_id))
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "update_route", None, route_id=route_id, details=f"Route: {route_name}")
            flash("Route updated successfully.", "success")
            return redirect(url_for("routes"))
        except sqlite3.IntegrityError:
            flash("Route ID already exists.", "error")
            return redirect(url_for("edit_route", route_id=route_id))
    routes_list = db.execute("SELECT * FROM routes ORDER BY route_name ASC").fetchall()
    return render_template("routes.html", routes=routes_list, edit_route=route)

@app.route("/routes", methods=["GET", "POST"])
@login_required
@role_required("admin")
def routes():
    db = get_db()
    if request.method == "POST":
        route_id = request.form.get("route_id", "").strip()
        route_name = request.form.get("route_name", "").strip()
        stops = request.form.get("stops", "").strip()
        pickup_time = request.form.get("pickup_time", "").strip()
        dropoff_time = request.form.get("dropoff_time", "").strip()
        if not all([route_id, route_name, stops, pickup_time, dropoff_time]):
            flash("Please complete all route fields.", "error")
            return redirect(url_for("routes"))
        try:
            db.execute(
                "INSERT INTO routes (route_id, route_name, stops, pickup_time, dropoff_time) VALUES (?, ?, ?, ?, ?)",
                (route_id, route_name, stops, pickup_time, dropoff_time),
            )
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", "add_route", None, route_id=None, details=f"Route: {route_name}")
            flash("Route added successfully.", "success")
        except sqlite3.IntegrityError:
            flash("Route ID already exists.", "error")
        return redirect(url_for("routes"))

    routes_list = db.execute("SELECT * FROM routes ORDER BY route_name ASC").fetchall()
    return render_template("routes.html", routes=routes_list)


@app.route("/assignments", methods=["GET", "POST"])
@login_required
@role_required("admin")
def assignments():
    db = get_db()
    today = datetime.today().strftime("%Y-%m-%d")
    if request.method == "POST":
        student_id = request.form.get("student_id")
        vehicle_id = request.form.get("vehicle_id")
        route_id = request.form.get("route_id")
        assigned_date = request.form.get("assigned_date") or today
        assignment_id = request.form.get("assignment_id")
        if not all([student_id, vehicle_id, route_id]):
            flash("Student, vehicle and route are required.", "error")
            return redirect(url_for("assignments"))
        try:
            student_id_i, vehicle_id_i, route_id_i = int(student_id), int(vehicle_id), int(route_id)
            vehicle = db.execute("SELECT * FROM vehicles WHERE id = ?", (vehicle_id_i,)).fetchone()
            if not vehicle:
                flash("Selected vehicle was not found.", "error")
                return redirect(url_for("assignments"))
            assigned_count = db.execute("SELECT COUNT(*) FROM transport_assignments WHERE vehicle_id = ? AND id != COALESCE(?, -1)", (vehicle_id_i, int(assignment_id) if assignment_id else -1)).fetchone()[0]
            if assigned_count >= int(vehicle["capacity"]):
                flash(f"Vehicle {vehicle['vehicle_number']} has reached its capacity of {vehicle['capacity']} students.", "error")
                return redirect(url_for("edit_assignment", assignment_id=assignment_id)) if assignment_id else redirect(url_for("assignments"))
            existing_student = db.execute("SELECT id FROM transport_assignments WHERE student_id = ? AND id != COALESCE(?, -1)", (student_id_i, int(assignment_id) if assignment_id else -1)).fetchone()
            if existing_student:
                flash("This student is already assigned to a transport route.", "error")
                return redirect(url_for("edit_assignment", assignment_id=assignment_id)) if assignment_id else redirect(url_for("assignments"))
            if assignment_id:
                db.execute("UPDATE transport_assignments SET student_id = ?, vehicle_id = ?, route_id = ?, assigned_date = ? WHERE id = ?", (student_id_i, vehicle_id_i, route_id_i, assigned_date, int(assignment_id)))
                action = "update_student_assignment"
            else:
                db.execute("INSERT INTO transport_assignments (student_id, vehicle_id, route_id, assigned_date) VALUES (?, ?, ?, ?)", (student_id_i, vehicle_id_i, route_id_i, assigned_date))
                action = "assign_student"
            db.execute("UPDATE vehicles SET route_id = COALESCE(?, route_id) WHERE id = ?", (route_id_i, vehicle_id_i))
            db.commit()
            user = get_current_user()
            log_activity(user["id"], "admin", action, student_id_i, vehicle_id_i, route_id_i, details="Transport assignment updated" if assignment_id else "Transport assignment created")
            flash("Student assignment updated successfully." if assignment_id else "Student assignment saved successfully.", "success")
        except (sqlite3.IntegrityError, ValueError):
            flash("Unable to save the assignment. Check the selected student, vehicle and route.", "error")
        return redirect(url_for("assignments"))

    assignments_list = db.execute("SELECT ta.*, s.name AS student_name, s.pickup_point, v.vehicle_number, v.capacity, r.route_name FROM transport_assignments ta JOIN students s ON s.id = ta.student_id JOIN vehicles v ON v.id = ta.vehicle_id JOIN routes r ON r.id = ta.route_id ORDER BY s.name ASC").fetchall()
    students = db.execute("SELECT * FROM students ORDER BY name").fetchall()
    vehicles = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number").fetchall()
    routes_list = db.execute("SELECT * FROM routes ORDER BY route_name").fetchall()
    return render_template("assignments.html", assignments=assignments_list, students=students, vehicles=vehicles, routes=routes_list, today=today, edit_assignment=None)


@app.route("/assignments/<int:assignment_id>/edit", methods=["GET"])
@login_required
@role_required("admin")
def edit_assignment(assignment_id):
    db = get_db()
    assignment = db.execute("SELECT * FROM transport_assignments WHERE id = ?", (assignment_id,)).fetchone()
    if not assignment:
        flash("Transport assignment not found.", "error")
        return redirect(url_for("assignments"))
    assignments_list = db.execute("SELECT ta.*, s.name AS student_name, s.pickup_point, v.vehicle_number, v.capacity, r.route_name FROM transport_assignments ta JOIN students s ON s.id = ta.student_id JOIN vehicles v ON v.id = ta.vehicle_id JOIN routes r ON r.id = ta.route_id ORDER BY s.name ASC").fetchall()
    students = db.execute("SELECT * FROM students ORDER BY name").fetchall()
    vehicles = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number").fetchall()
    routes_list = db.execute("SELECT * FROM routes ORDER BY route_name").fetchall()
    return render_template("assignments.html", assignments=assignments_list, students=students, vehicles=vehicles, routes=routes_list, today=datetime.today().strftime("%Y-%m-%d"), edit_assignment=assignment)


@app.route("/reports")
@login_required
@role_required("admin")
def reports():
    db = get_db()
    today = datetime.today().strftime("%Y-%m-%d")
    date_from = request.args.get("date_from", today)
    date_to = request.args.get("date_to", today)
    movements_report = db.execute("""SELECT sm.movement_date, sm.movement_time, s.student_id, s.name AS student_name, sm.movement_type, v.vehicle_number, r.route_name, u.name AS recorded_by, sm.notes FROM student_movements sm JOIN students s ON s.id=sm.student_id LEFT JOIN vehicles v ON v.id=sm.vehicle_id LEFT JOIN routes r ON r.id=sm.route_id JOIN users u ON u.id=sm.recorded_by WHERE sm.movement_date BETWEEN ? AND ? ORDER BY sm.movement_date DESC, sm.movement_time DESC""", (date_from,date_to)).fetchall()
    fees_summary=db.execute("SELECT COUNT(*) AS students, COALESCE(SUM(amount_due),0) AS due, COALESCE(SUM(amount_paid),0) AS paid, COALESCE(SUM(amount_due-amount_paid),0) AS balance FROM transport_fees").fetchone()
    return render_template("reports.html", movements=movements_report, date_from=date_from, date_to=date_to, fees_summary=fees_summary, vehicle_expiry_alerts=get_vehicle_expiry_alerts(), driver_expiry_alerts=get_driver_expiry_alerts())


@app.route("/reports/movements.csv")
@login_required
@role_required("admin")
def movement_report_csv():
    import csv, io
    db=get_db(); today=datetime.today().strftime("%Y-%m-%d")
    date_from=request.args.get("date_from",today); date_to=request.args.get("date_to",today)
    rows=db.execute("""SELECT sm.movement_date, sm.movement_time, s.student_id, s.name AS student_name, sm.movement_type, v.vehicle_number, r.route_name, u.name AS recorded_by, sm.notes FROM student_movements sm JOIN students s ON s.id=sm.student_id LEFT JOIN vehicles v ON v.id=sm.vehicle_id LEFT JOIN routes r ON r.id=sm.route_id JOIN users u ON u.id=sm.recorded_by WHERE sm.movement_date BETWEEN ? AND ? ORDER BY sm.movement_date DESC, sm.movement_time DESC""",(date_from,date_to)).fetchall()
    out=io.StringIO(); w=csv.writer(out); w.writerow(["Date","Time","Student ID","Student","Status","Vehicle","Route","Recorded By","Notes"])
    for r in rows: w.writerow([r["movement_date"],format_time_12h(r["movement_time"]),r["student_id"],r["student_name"],movement_label(r["movement_type"]),r["vehicle_number"] or "",r["route_name"] or "",r["recorded_by"],r["notes"] or ""])
    from flask import Response
    return Response(out.getvalue(),mimetype="text/csv",headers={"Content-Disposition":f"attachment; filename=transport-movements-{date_from}-to-{date_to}.csv"})


@app.route("/gps/update", methods=["POST"])
@login_required
@role_required("driver")
def gps_update():
    user=get_current_user(); db=get_db()
    driver=db.execute("SELECT * FROM drivers WHERE id=?",(user["driver_id"],)).fetchone()
    if not driver or not driver["assigned_vehicle_id"]:
        return jsonify({"ok":False,"message":"No vehicle is assigned to this driver."}),400
    vehicle=db.execute("SELECT * FROM vehicles WHERE id=?",(driver["assigned_vehicle_id"],)).fetchone()
    if not vehicle or not vehicle["gps_enabled"]:
        return jsonify({"ok":False,"message":"GPS tracking is not enabled for this vehicle."}),400
    try:
        lat=float(request.form.get("lat")); lng=float(request.form.get("lng"))
        if not (-90<=lat<=90 and -180<=lng<=180): raise ValueError
    except (TypeError,ValueError):
        return jsonify({"ok":False,"message":"Invalid GPS coordinates."}),400
    now=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.execute("UPDATE vehicles SET gps_tracking_status='live', gps_last_lat=?, gps_last_lng=?, gps_last_updated=? WHERE id=?",(lat,lng,now,vehicle["id"]))
    db.commit(); return jsonify({"ok":True,"updated_at":now})


@app.route("/gps/toggle", methods=["POST"])
@login_required
@role_required("driver")
def gps_toggle():
    user=get_current_user(); db=get_db(); driver=db.execute("SELECT * FROM drivers WHERE id=?",(user["driver_id"],)).fetchone()
    if not driver or not driver["assigned_vehicle_id"]: return jsonify({"ok":False,"message":"No vehicle is assigned."}),400
    action=request.form.get("action","start")
    status="live" if action=="start" else "offline"
    db.execute("UPDATE vehicles SET gps_tracking_status=? WHERE id=?",(status,driver["assigned_vehicle_id"])); db.commit()
    return jsonify({"ok":True,"status":status})


@app.route("/vehicles/<int:vehicle_id>/track")
@login_required
@role_required("admin")
def track_vehicle(vehicle_id):
    db = get_db()
    vehicle = db.execute(
        "SELECT v.*, d.name AS driver_name, r.route_name FROM vehicles v "
        "LEFT JOIN drivers d ON d.id = v.driver_id "
        "LEFT JOIN routes r ON r.id = v.route_id WHERE v.id = ?",
        (vehicle_id,),
    ).fetchone()
    if not vehicle:
        flash("Vehicle not found.", "error")
        return redirect(url_for("vehicles"))
    if not vehicle["gps_enabled"]:
        flash("GPS tracking is not enabled for this vehicle.", "error")
        return redirect(url_for("vehicles"))
    return render_template("track_vehicle.html", vehicle=vehicle)


@app.route("/movements", methods=["GET", "POST"])
@login_required
@role_required("admin", "driver")
def movements():
    db = get_db()
    user = get_current_user()
    if request.method == "POST":
        student_id = request.form.get("student_id")
        movement_type = request.form.get("movement_type")
        vehicle_id = request.form.get("vehicle_id")
        route_id = request.form.get("route_id")
        notes = request.form.get("notes", "")
        if not student_id or not movement_type:
            flash("Student and movement type are required.", "error")
            return redirect(url_for("movements"))
        if movement_type not in ALLOWED_MOVEMENT_TYPES:
            flash("Invalid movement/status type.", "error")
            return redirect(url_for("movements"))
        if not db.execute("SELECT 1 FROM students WHERE id = ?", (student_id,)).fetchone():
            flash("Selected student was not found.", "error")
            return redirect(url_for("movements"))

        if user["role"] == "driver":
            driver = db.execute("SELECT * FROM drivers WHERE id = ?", (user["driver_id"],)).fetchone()
            if driver and vehicle_id and int(vehicle_id) != driver["assigned_vehicle_id"]:
                flash("You can only record movements for your assigned vehicle.", "error")
                return redirect(url_for("movements"))
            if not vehicle_id:
                vehicle_id = driver["assigned_vehicle_id"] if driver else None
            if not route_id and driver and driver["assigned_vehicle_id"]:
                route = db.execute("SELECT route_id FROM vehicles WHERE id = ?", (driver["assigned_vehicle_id"],)).fetchone()
                route_id = route["route_id"] if route else None

        current_date = datetime.today().strftime("%Y-%m-%d")
        current_time = datetime.today().strftime("%H:%M:%S")
        db.execute(
            "INSERT INTO student_movements (student_id, movement_type, movement_date, movement_time, vehicle_id, route_id, recorded_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (int(student_id), movement_type, current_date, current_time, vehicle_id or None, route_id or None, user["id"], notes),
        )
        movement_id = db.execute("SELECT last_insert_rowid() AS id").fetchone()[0]
        db.commit()

        student = db.execute("SELECT * FROM students WHERE id = ?", (int(student_id),)).fetchone()
        if student and student["parent_contact"]:
            parent_users = db.execute(
                "SELECT u.* FROM users u JOIN parent_student_links psl ON psl.user_id = u.id WHERE u.role = 'parent' AND psl.student_id = ?",
                (int(student_id),),
            ).fetchall()
            for parent_user in parent_users:
                message = build_notification_message(movement_type, current_time)
                db.execute(
                    "INSERT INTO notifications (student_id, user_id, message, movement_id, is_read) VALUES (?, ?, ?, ?, 0)",
                    (int(student_id), parent_user["id"], message, movement_id),
                )
            db.commit()
        
        log_activity(user["id"], user["role"], f"record_{movement_type}", int(student_id), vehicle_id, route_id, movement_type, notes)
        flash("Movement recorded successfully.", "success")
        return redirect(url_for("movements"))

    if user["role"] == "driver":
        driver = db.execute("SELECT * FROM drivers WHERE id = ?", (user["driver_id"],)).fetchone()
        if driver:
            assigned_vehicle_id = driver["assigned_vehicle_id"]
            vehicle = db.execute("SELECT * FROM vehicles WHERE id = ?", (assigned_vehicle_id,)).fetchone() if assigned_vehicle_id else None
            route = db.execute("SELECT * FROM routes WHERE id = ?", (vehicle["route_id"],)).fetchone() if vehicle and vehicle["route_id"] else None
            students_for_driver = db.execute(
                "SELECT s.* FROM students s JOIN transport_assignments ta ON ta.student_id = s.id WHERE ta.vehicle_id = ? ORDER BY s.name",
                (assigned_vehicle_id,),
            ).fetchall() if assigned_vehicle_id else []
        else:
            students_for_driver = []
            vehicle = None
            route = None
            assigned_vehicle_id = None
    else:
        students_for_driver = db.execute("SELECT * FROM students ORDER BY name").fetchall()
        vehicle = None
        route = None
        assigned_vehicle_id = None

    students_list = db.execute("SELECT * FROM students ORDER BY name").fetchall()
    vehicles_list = db.execute("SELECT * FROM vehicles ORDER BY vehicle_number").fetchall()
    routes_list = db.execute("SELECT * FROM routes ORDER BY route_name").fetchall()
    records = db.execute(
        "SELECT sm.*, s.name AS student_name, u.name AS recorded_by_name FROM student_movements sm JOIN students s ON s.id = sm.student_id JOIN users u ON u.id = sm.recorded_by ORDER BY sm.id DESC LIMIT 20"
    ).fetchall()
    return render_template(
        "movements.html",
        students=students_for_driver if user["role"] == "driver" else students_list,
        vehicles=vehicles_list,
        routes=routes_list,
        records=records,
        vehicle=vehicle,
        route=route,
        assigned_vehicle_id=assigned_vehicle_id,
        user=user,
    )


@app.route("/users", methods=["GET", "POST"])
@login_required
@role_required("admin")
def users():
    db = get_db()
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        role = request.form.get("role", "parent")
        name = request.form.get("name", "").strip()
        driver_id = request.form.get("driver_id")
        parent_student_ids = request.form.getlist("parent_student_ids")
        if not all([username, password, role, name]):
            flash("All user fields are required.", "error")
            return redirect(url_for("users"))
        try:
            parent_student_id = parent_student_ids[0] if parent_student_ids else None
            cur = db.execute(
                "INSERT INTO users (username, password_hash, role, name, driver_id, parent_student_id) VALUES (?, ?, ?, ?, ?, ?)",
                (username, generate_password_hash(password), role, name, driver_id or None, parent_student_id),
            )
            user_id = cur.lastrowid
            if role == "parent":
                for student_id in parent_student_ids:
                    db.execute(
                        "INSERT OR IGNORE INTO parent_student_links (user_id, student_id) VALUES (?, ?)",
                        (user_id, int(student_id)),
                    )
            db.commit()
            current_user = get_current_user()
            log_activity(current_user["id"], "admin", "create_user", None, details=f"User: {username}, Role: {role}")
            flash("User account created successfully.", "success")
        except sqlite3.IntegrityError:
            flash("That username is already in use.", "error")
        return redirect(url_for("users"))

    users_list = db.execute("SELECT * FROM users ORDER BY name ASC").fetchall()
    drivers = db.execute("SELECT * FROM drivers ORDER BY name ASC").fetchall()
    students = db.execute("SELECT * FROM students ORDER BY name").fetchall()
    parent_links = {}
    for user in users_list:
        if user["role"] == "parent":
            parent_links[user["id"]] = db.execute(
                "SELECT s.name FROM parent_student_links psl JOIN students s ON s.id = psl.student_id WHERE psl.user_id = ? ORDER BY s.name",
                (user["id"],),
            ).fetchall()
    return render_template("users.html", users=users_list, drivers=drivers, students=students, parent_links=parent_links)


@app.route("/notifications")
@login_required
def notifications():
    user = get_current_user()
    db = get_db()
    if user["role"] == "parent":
        linked_ids = get_linked_student_ids_for_parent(user["id"])
        if not linked_ids:
            rows = []
        else:
            placeholders = ', '.join('?' for _ in linked_ids)
            rows = db.execute(
                f"SELECT n.*, s.name AS student_name FROM notifications n JOIN students s ON s.id = n.student_id WHERE n.user_id = ? AND n.student_id IN ({placeholders}) ORDER BY n.id DESC",
                (user["id"], *linked_ids),
            ).fetchall()
    elif user["role"] == "driver":
        driver = db.execute("SELECT * FROM drivers WHERE id = ?", (user["driver_id"],)).fetchone()
        vehicle_id = driver["assigned_vehicle_id"] if driver else None
        rows = db.execute(
            "SELECT n.*, s.name AS student_name FROM notifications n JOIN students s ON s.id = n.student_id WHERE n.student_id IN (SELECT student_id FROM transport_assignments WHERE vehicle_id = ?) ORDER BY n.id DESC",
            (vehicle_id,),
        ).fetchall() if vehicle_id else []
    else:
        rows = db.execute(
            "SELECT n.*, s.name AS student_name FROM notifications n JOIN students s ON s.id = n.student_id ORDER BY n.id DESC"
        ).fetchall()
    return render_template("notifications.html", notifications=rows, user=user)


@app.route("/school-activity")
@login_required
@role_required("admin", "driver")
def school_activity():
    db = get_db()
    records = db.execute(
        "SELECT sm.*, s.name AS student_name, u.name AS recorded_by_name FROM student_movements sm JOIN students s ON s.id = sm.student_id JOIN users u ON u.id = sm.recorded_by ORDER BY sm.id DESC"
    ).fetchall()
    return render_template("school_activity.html", records=records)


@app.route("/activity-audit-log")
@login_required
@role_required("admin")
def activity_audit_log():
    db = get_db()
    
    action_filter = request.args.get("action_filter", "").strip()
    user_filter = request.args.get("user_filter", "").strip()
    date_filter = request.args.get("date_filter", "").strip()
    
    query = "SELECT aal.*, u.name AS user_name FROM activity_audit_log aal JOIN users u ON u.id = aal.user_id WHERE 1=1"
    params = []
    
    if action_filter:
        query += " AND aal.action LIKE ?"
        params.append(f"%{action_filter}%")
    if user_filter:
        query += " AND u.name LIKE ?"
        params.append(f"%{user_filter}%")
    if date_filter:
        query += " AND aal.action_date = ?"
        params.append(date_filter)
    
    query += " ORDER BY aal.id DESC LIMIT 100"
    
    records = db.execute(query, params).fetchall()
    
    return render_template(
        "activity_audit_log.html",
        records=records,
        action_filter=action_filter,
        user_filter=user_filter,
        date_filter=date_filter,
    )


@app.route("/access-denied")
def access_denied():
    return render_template("403.html"), 403


@app.errorhandler(403)
def forbidden(error):
    return render_template("403.html"), 403


@app.errorhandler(404)
def not_found(error):
    return render_template("404.html"), 404


def build_notification_message(movement_type, movement_time):
    mapping = {
        "boarding": f"Your child boarded the school bus at {movement_time}.",
        "not_boarded": f"Your child was marked as not boarded at {movement_time}.",
        "not_travelling": f"Your child marked as not travelling.",
        "drop_off": f"Your child was dropped off at {movement_time}.",
        "school_entry": f"Your child entered the school at {movement_time}.",
        "school_exit": f"Your child exited the school at {movement_time}.",
    }
    return mapping.get(movement_type, f"Your child movement was recorded at {movement_time}.")


def seed_demo_data():
    db = get_db()
    if not db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='students'").fetchone():
        init_db()

    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
        ensure_parent_links()
        return

    # Bengaluru-inspired routes
    routes = [
        ("RTE-101", "Whitefield → Hoodi → KR Puram → Indiranagar", "Whitefield, Hoodi, KR Puram, Indiranagar", "7:10 AM", "4:15 PM"),
        ("RTE-102", "Electronic City → Bommanahalli → BTM → Jayanagar", "Electronic City, Bommanahalli, BTM, Jayanagar", "7:25 AM", "3:55 PM"),
        ("RTE-103", "Yelahanka → Hebbal → Sadashivanagar → Malleshwaram", "Yelahanka, Hebbal, Sadashivanagar, Malleshwaram", "7:40 AM", "4:05 PM"),
        ("RTE-104", "HSR Layout → Koramangala → Indiranagar", "HSR Layout, Koramangala, Indiranagar", "8:00 AM", "3:40 PM"),
        ("RTE-105", "JP Nagar → Jayanagar → Basavanagudi", "JP Nagar, Jayanagar, Basavanagudi", "7:15 AM", "4:10 PM"),
        ("RTE-106", "Marathahalli → Bellandur → HAL", "Marathahalli, Bellandur, HAL", "7:30 AM", "4:00 PM"),
        ("RTE-107", "Rajajinagar → Malleshwaram → Yeshwanthpur", "Rajajinagar, Malleshwaram, Yeshwanthpur", "7:45 AM", "3:50 PM"),
        ("RTE-108", "Banashankari → Jayanagar → JP Nagar", "Banashankari, Jayanagar, JP Nagar", "8:05 AM", "3:35 PM"),
        ("RTE-109", "Vijayanagar → Rajajinagar → Malleshwaram", "Vijayanagar, Rajajinagar, Malleshwaram", "7:20 AM", "4:20 PM"),
        ("RTE-110", "Whitefield → Brookefield → Marathahalli", "Whitefield, Brookefield, Marathahalli", "8:15 AM", "3:45 PM"),
    ]
    for route in routes:
        db.execute(
            "INSERT INTO routes (route_id, route_name, stops, pickup_time, dropoff_time) VALUES (?, ?, ?, ?, ?)",
            route,
        )

    # Drivers
    drivers_data = [
        ("DRV-001", "John Carter", "9876543210", "DL-77891", None),
        ("DRV-002", "Mary Gomez", "9812345678", "DL-88921", None),
        ("DRV-003", "Amit Singh", "9765432180", "DL-99712", None),
        ("DRV-004", "Priya Nair", "9988776655", "DL-55671", None),
        ("DRV-005", "Rohan Sharma", "9654321098", "DL-66543", None),
        ("DRV-006", "Neha Verma", "9543210987", "DL-77654", None),
        ("DRV-007", "Vikram Patel", "9876554321", "DL-88765", None),
        ("DRV-008", "Anjali Singh", "9765443210", "DL-99876", None),
        ("DRV-009", "Sanjay Kumar", "9654332109", "DL-11234", None),
        ("DRV-010", "Pooja Reddy", "9543221098", "DL-22345", None),
        ("DRV-011", "Rajesh Iyer", "9876665432", "DL-33456", None),
        ("DRV-012", "Sneha Nair", "9765554321", "DL-44567", None),
        ("DRV-013", "Arjun Das", "9654443210", "DL-55678", None),
        ("DRV-014", "Divya Sharma", "9543332109", "DL-66789", None),
        ("DRV-015", "Nikhil Verma", "9876776543", "DL-77890", None),
    ]
    for driver in drivers_data:
        db.execute(
            "INSERT INTO drivers (driver_id, name, contact_number, license_info, assigned_vehicle_id) VALUES (?, ?, ?, ?, ?)",
            driver,
        )

    # Vehicles
    vehicles_data = [
        ("VH-101", "KA-01-AB-1234", "School Bus", 40, 1, 1, "active"),
        ("VH-102", "KA-01-CD-2045", "Mini Bus", 24, 2, 2, "active"),
        ("VH-103", "KA-01-EF-2090", "School Van", 16, 3, 3, "active"),
        ("VH-104", "KA-01-GH-2134", "School Bus", 38, 4, 4, "active"),
        ("VH-105", "KA-01-IJ-3456", "Mini Bus", 28, 5, 5, "active"),
        ("VH-106", "KA-01-KL-4567", "School Bus", 42, 6, 6, "active"),
        ("VH-107", "KA-01-MN-5678", "School Van", 18, 7, 7, "active"),
        ("VH-108", "KA-01-OP-6789", "Mini Bus", 26, 8, 8, "active"),
        ("VH-109", "KA-01-QR-7890", "School Bus", 40, 9, 9, "active"),
        ("VH-110", "KA-01-ST-8901", "School Van", 20, 10, 10, "active"),
    ]
    for vehicle in vehicles_data:
        db.execute(
            "INSERT INTO vehicles (vehicle_id, vehicle_number, vehicle_type, capacity, driver_id, route_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            vehicle,
        )

    db.execute(
        "UPDATE drivers SET assigned_vehicle_id = (SELECT id FROM vehicles WHERE driver_id = drivers.id LIMIT 1) WHERE assigned_vehicle_id IS NULL"
    )

    # 100+ Students with Bengaluru-themed names
    students_data = [
        ("STD-001", "Aarav Sharma", "Grade 7-A", "Rohit Sharma", "9999988881", "Whitefield", "School Gate"),
        ("STD-002", "Diya Patel", "Grade 7-A", "Nisha Patel", "9898989898", "Hoodi", "School Gate"),
        ("STD-003", "Rohan Verma", "Grade 8-B", "Anil Verma", "9876543211", "KR Puram", "School Gate"),
        ("STD-004", "Meera Iyer", "Grade 8-B", "Vikram Iyer", "9876501234", "Indiranagar", "School Gate"),
        ("STD-005", "Kabir Singh", "Grade 9-A", "Harpreet Singh", "9765432109", "Electronic City", "School Gate"),
        ("STD-006", "Saanvi Nair", "Grade 9-A", "Anitha Nair", "9685747362", "Bommanahalli", "School Gate"),
        ("STD-007", "Ishaan Rao", "Grade 10-A", "Manoj Rao", "9543217890", "BTM", "School Gate"),
        ("STD-008", "Naina Joshi", "Grade 10-B", "Rakesh Joshi", "9761234567", "Jayanagar", "School Gate"),
        ("STD-009", "Vivaan Das", "Grade 11-A", "Sujata Das", "9988776654", "Yelahanka", "School Gate"),
        ("STD-010", "Aisha Khan", "Grade 11-B", "Faisal Khan", "9911223344", "Hebbal", "School Gate"),
        ("STD-011", "Arjun Nair", "Grade 7-B", "Suresh Nair", "9822334455", "Sadashivanagar", "School Gate"),
        ("STD-012", "Priya Reddy", "Grade 7-A", "Rajesh Reddy", "9733445566", "Malleshwaram", "School Gate"),
        ("STD-013", "Varun Gupta", "Grade 8-A", "Amit Gupta", "9644556677", "HSR Layout", "School Gate"),
        ("STD-014", "Sneha Roy", "Grade 8-B", "Ravi Roy", "9555667788", "Koramangala", "School Gate"),
        ("STD-015", "Zara Khan", "Grade 9-A", "Imran Khan", "9466778899", "Indiranagar", "School Gate"),
        ("STD-016", "Advaith Kumar", "Grade 9-B", "Suneel Kumar", "9377889900", "JP Nagar", "School Gate"),
        ("STD-017", "Pavani Iyer", "Grade 10-A", "Shankar Iyer", "9288990011", "Jayanagar", "School Gate"),
        ("STD-018", "Reyansh Singh", "Grade 10-B", "Prateek Singh", "9199001122", "Basavanagudi", "School Gate"),
        ("STD-019", "Anaya Desai", "Grade 11-A", "Arjun Desai", "9900112233", "Marathahalli", "School Gate"),
        ("STD-020", "Nikhil Rao", "Grade 11-B", "Vijay Rao", "9811223344", "Bellandur", "School Gate"),
        ("STD-021", "Tara Verma", "Grade 7-A", "Saurabh Verma", "9722334455", "HAL", "School Gate"),
        ("STD-022", "Aditya Patel", "Grade 7-B", "Bhavesh Patel", "9633445566", "Rajajinagar", "School Gate"),
        ("STD-023", "Maya Sharma", "Grade 8-A", "Vikram Sharma", "9544556677", "Malleshwaram", "School Gate"),
        ("STD-024", "Harsh Nair", "Grade 8-B", "Anand Nair", "9455667788", "Yeshwanthpur", "School Gate"),
        ("STD-025", "Riya Singh", "Grade 9-A", "Arun Singh", "9366778899", "Banashankari", "School Gate"),
        ("STD-026", "Karan Khosla", "Grade 9-B", "Sameer Khosla", "9277889900", "Jayanagar", "School Gate"),
        ("STD-027", "Sana Reddy", "Grade 10-A", "Balaji Reddy", "9188990011", "JP Nagar", "School Gate"),
        ("STD-028", "Yash Kumar", "Grade 10-B", "Rajesh Kumar", "9099001122", "Vijayanagar", "School Gate"),
        ("STD-029", "Chirag Verma", "Grade 11-A", "Ashok Verma", "9900112244", "Rajajinagar", "School Gate"),
        ("STD-030", "Drishti Iyer", "Grade 11-B", "Srikanth Iyer", "9811223355", "Malleshwaram", "School Gate"),
        ("STD-031", "Aryan Gupta", "Grade 7-A", "Rakesh Gupta", "9722334466", "Whitefield", "School Gate"),
        ("STD-032", "Pooja Nair", "Grade 7-B", "Vinay Nair", "9633445577", "Brookefield", "School Gate"),
        ("STD-033", "Siddharth Roy", "Grade 8-A", "Debdutta Roy", "9544556688", "Marathahalli", "School Gate"),
        ("STD-034", "Kshama Reddy", "Grade 8-B", "Ramamurthy Reddy", "9455667799", "Whitefield", "School Gate"),
        ("STD-035", "Vedant Singh", "Grade 9-A", "Javed Singh", "9366778800", "Hoodi", "School Gate"),
        ("STD-036", "Ishita Patel", "Grade 9-B", "Mansukh Patel", "9277889911", "KR Puram", "School Gate"),
        ("STD-037", "Amar Sharma", "Grade 10-A", "Suresh Sharma", "9188990122", "Indiranagar", "School Gate"),
        ("STD-038", "Isha Khan", "Grade 10-B", "Nasir Khan", "9099001233", "Electronic City", "School Gate"),
        ("STD-039", "Kabir Verma", "Grade 11-A", "Ravi Verma", "9900112355", "Bommanahalli", "School Gate"),
        ("STD-040", "Divya Iyer", "Grade 11-B", "Rajkumar Iyer", "9811223466", "BTM", "School Gate"),
        ("STD-041", "Varun Sharma", "Grade 7-A", "Rajiv Sharma", "9722334577", "Jayanagar", "School Gate"),
        ("STD-042", "Neha Reddy", "Grade 7-B", "Anand Reddy", "9633445688", "Yelahanka", "School Gate"),
        ("STD-043", "Arjun Nair", "Grade 8-A", "Prakash Nair", "9544556799", "Hebbal", "School Gate"),
        ("STD-044", "Tanya Singh", "Grade 8-B", "Nirmal Singh", "9455667800", "Sadashivanagar", "School Gate"),
        ("STD-045", "Ronit Patel", "Grade 9-A", "Dinesh Patel", "9366778911", "Malleshwaram", "School Gate"),
        ("STD-046", "Shalini Roy", "Grade 9-B", "Ajay Roy", "9277889922", "HSR Layout", "School Gate"),
        ("STD-047", "Nakul Kumar", "Grade 10-A", "Sunil Kumar", "9188990233", "Koramangala", "School Gate"),
        ("STD-048", "Zoya Khan", "Grade 10-B", "Farooq Khan", "9099001344", "Indiranagar", "School Gate"),
        ("STD-049", "Aryan Verma", "Grade 11-A", "Brijesh Verma", "9900112466", "JP Nagar", "School Gate"),
        ("STD-050", "Pihu Iyer", "Grade 11-B", "Harish Iyer", "9811223577", "Jayanagar", "School Gate"),
        ("STD-051", "Ayan Sharma", "Grade 7-A", "Sanjay Sharma", "9722334688", "Basavanagudi", "School Gate"),
        ("STD-052", "Roshni Reddy", "Grade 7-B", "Venkat Reddy", "9633445799", "Marathahalli", "School Gate"),
        ("STD-053", "Shubh Nair", "Grade 8-A", "Gopinath Nair", "9544556800", "Bellandur", "School Gate"),
        ("STD-054", "Tanvi Singh", "Grade 8-B", "Siddhartha Singh", "9455667911", "HAL", "School Gate"),
        ("STD-055", "Raghav Patel", "Grade 9-A", "Vipul Patel", "9366779022", "Rajajinagar", "School Gate"),
        ("STD-056", "Shreya Roy", "Grade 9-B", "Anupam Roy", "9277889033", "Malleshwaram", "School Gate"),
        ("STD-057", "Naman Kumar", "Grade 10-A", "Vikash Kumar", "9188990344", "Yeshwanthpur", "School Gate"),
        ("STD-058", "Aadhya Khan", "Grade 10-B", "Iqbal Khan", "9099001455", "Banashankari", "School Gate"),
        ("STD-059", "Ashwin Verma", "Grade 11-A", "Satish Verma", "9900112577", "Jayanagar", "School Gate"),
        ("STD-060", "Ritu Iyer", "Grade 11-B", "Ramesh Iyer", "9811223688", "JP Nagar", "School Gate"),
        ("STD-061", "Vishal Sharma", "Grade 7-A", "Manoj Sharma", "9722334799", "Vijayanagar", "School Gate"),
        ("STD-062", "Swapna Reddy", "Grade 7-B", "Narasimha Reddy", "9633445800", "Rajajinagar", "School Gate"),
        ("STD-063", "Siddhartha Nair", "Grade 8-A", "Chandran Nair", "9544556911", "Malleshwaram", "School Gate"),
        ("STD-064", "Tanu Singh", "Grade 8-B", "Surinder Singh", "9455668022", "Whitefield", "School Gate"),
        ("STD-065", "Ritik Patel", "Grade 9-A", "Jayesh Patel", "9366779133", "Hoodi", "School Gate"),
        ("STD-066", "Shreya Roy", "Grade 9-B", "Aditya Roy", "9277889144", "KR Puram", "School Gate"),
        ("STD-067", "Nitin Kumar", "Grade 10-A", "Sandeep Kumar", "9188990455", "Indiranagar", "School Gate"),
        ("STD-068", "Anika Khan", "Grade 10-B", "Rashid Khan", "9099001566", "Electronic City", "School Gate"),
        ("STD-069", "Abhishek Verma", "Grade 11-A", "Harendra Verma", "9900112688", "Bommanahalli", "School Gate"),
        ("STD-070", "Sapna Iyer", "Grade 11-B", "Santhosh Iyer", "9811223799", "BTM", "School Gate"),
        ("STD-071", "Yash Sharma", "Grade 7-A", "Ashish Sharma", "9722334800", "Jayanagar", "School Gate"),
        ("STD-072", "Sunita Reddy", "Grade 7-B", "Suresh Reddy", "9633445911", "Yelahanka", "School Gate"),
        ("STD-073", "Vaibhav Nair", "Grade 8-A", "Prakash Nair", "9544557022", "Hebbal", "School Gate"),
        ("STD-074", "Tamanna Singh", "Grade 8-B", "Prem Singh", "9455668133", "Sadashivanagar", "School Gate"),
        ("STD-075", "Ridhaan Patel", "Grade 9-A", "Kalpesh Patel", "9366779244", "Malleshwaram", "School Gate"),
        ("STD-076", "Shweta Roy", "Grade 9-B", "Ashok Roy", "9277889255", "HSR Layout", "School Gate"),
        ("STD-077", "Nishant Kumar", "Grade 10-A", "Rajesh Kumar", "9188990566", "Koramangala", "School Gate"),
        ("STD-078", "Anya Khan", "Grade 10-B", "Hassan Khan", "9099001677", "Indiranagar", "School Gate"),
        ("STD-079", "Arjun Verma", "Grade 11-A", "Vidyadhar Verma", "9900112799", "JP Nagar", "School Gate"),
        ("STD-080", "Sakshi Iyer", "Grade 11-B", "Srinivasn Iyer", "9811223800", "Jayanagar", "School Gate"),
        ("STD-081", "Yusuf Sharma", "Grade 7-A", "Ahmed Sharma", "9722334911", "Basavanagudi", "School Gate"),
        ("STD-082", "Swathi Reddy", "Grade 7-B", "Rammohan Reddy", "9633446022", "Marathahalli", "School Gate"),
        ("STD-083", "Vicky Nair", "Grade 8-A", "Mohan Nair", "9544557133", "Bellandur", "School Gate"),
        ("STD-084", "Tejaswini Singh", "Grade 8-B", "Tej Singh", "9455668244", "HAL", "School Gate"),
        ("STD-085", "Ravi Patel", "Grade 9-A", "Mahesh Patel", "9366779355", "Rajajinagar", "School Gate"),
        ("STD-086", "Simran Roy", "Grade 9-B", "Suraj Roy", "9277889366", "Malleshwaram", "School Gate"),
        ("STD-087", "Neeraj Kumar", "Grade 10-A", "Niraj Kumar", "9188990677", "Yeshwanthpur", "School Gate"),
        ("STD-088", "Amira Khan", "Grade 10-B", "Siddique Khan", "9099001788", "Banashankari", "School Gate"),
        ("STD-089", "Aditya Verma", "Grade 11-A", "Virendra Verma", "9900112800", "Jayanagar", "School Gate"),
        ("STD-090", "Samyukta Iyer", "Grade 11-B", "Sampath Iyer", "9811223911", "JP Nagar", "School Gate"),
        ("STD-091", "Yogesh Sharma", "Grade 7-A", "Yogendra Sharma", "9722335022", "Vijayanagar", "School Gate"),
        ("STD-092", "Swanna Reddy", "Grade 7-B", "Ranga Reddy", "9633446133", "Rajajinagar", "School Gate"),
        ("STD-093", "Vikram Nair", "Grade 8-A", "Vasant Nair", "9544557244", "Malleshwaram", "School Gate"),
        ("STD-094", "Tarun Singh", "Grade 8-B", "Tajendra Singh", "9455668355", "Whitefield", "School Gate"),
        ("STD-095", "Rohit Patel", "Grade 9-A", "Ramkumar Patel", "9366779466", "Hoodi", "School Gate"),
        ("STD-096", "Sonia Roy", "Grade 9-B", "Somnath Roy", "9277889477", "KR Puram", "School Gate"),
        ("STD-097", "Naveen Kumar", "Grade 10-A", "Naresh Kumar", "9188990788", "Indiranagar", "School Gate"),
        ("STD-098", "Amrita Khan", "Grade 10-B", "Ali Khan", "9099001899", "Electronic City", "School Gate"),
        ("STD-099", "Anmol Verma", "Grade 11-A", "Avanish Verma", "9900112911", "Bommanahalli", "School Gate"),
        ("STD-100", "Sanjana Iyer", "Grade 11-B", "Shankaranarayanan Iyer", "9811224022", "BTM", "School Gate"),
    ]
    for student in students_data:
        db.execute(
            "INSERT INTO students (student_id, name, class_section, parent_name, parent_contact, pickup_point, dropoff_point) VALUES (?, ?, ?, ?, ?, ?, ?)",
            student,
        )

    # Transport assignments
    assignments_data = []
    for i in range(1, 101):
        route_id = ((i - 1) % 10) + 1
        vehicle_id = ((i - 1) % 10) + 1
        assignments_data.append((i, vehicle_id, route_id, "2026-08-18"))

    for assignment in assignments_data:
        db.execute(
            "INSERT INTO transport_assignments (student_id, vehicle_id, route_id, assigned_date) VALUES (?, ?, ?, ?)",
            assignment,
        )

    # Create admin user
    db.execute(
        "INSERT INTO users (username, password_hash, role, name, driver_id, parent_student_id) VALUES (?, ?, ?, ?, ?, ?)",
        ("admin", generate_password_hash("admin123"), "admin", "Admin User", None, None),
    )

    # Create driver users
    for i in range(1, 6):
        db.execute(
            "INSERT INTO users (username, password_hash, role, name, driver_id, parent_student_id) VALUES (?, ?, ?, ?, ?, ?)",
            (f"driver{i}", generate_password_hash("driver123"), "driver", f"Driver {i}", i, None),
        )

    # Create parent users with multiple children
    parent_links_data = [
        ("parent1", "Rohit Sharma", [1, 2, 7]),  # 3 children
        ("parent2", "Nisha Patel", [3, 10]),  # 2 children
        ("parent3", "Anil Verma", [4]),  # 1 child
        ("parent4", "Vikram Iyer", [5]),  # 1 child
        ("parent5", "Harpreet Singh", [6, 8]),  # 2 children
        ("parent6", "Anitha Nair", [9]),  # 1 child
        ("parent7", "Manoj Rao", [11, 12]),  # 2 children
        ("parent8", "Rakesh Joshi", [13, 14]),  # 2 children
        ("parent9", "Sujata Das", [15]),  # 1 child
        ("parent10", "Faisal Khan", [16, 17, 18]),  # 3 children
    ]

    for username, parent_name, student_ids in parent_links_data:
        parent_id = db.execute(
            "INSERT INTO users (username, password_hash, role, name, driver_id, parent_student_id) VALUES (?, ?, ?, ?, ?, ?)",
            (username, generate_password_hash("parent123"), "parent", parent_name, None, student_ids[0]),
        ).lastrowid
        for student_id in student_ids:
            db.execute(
                "INSERT OR IGNORE INTO parent_student_links (user_id, student_id) VALUES (?, ?)",
                (parent_id, student_id),
            )

    # Add sample movements
    movement_rows = [
        (1, "boarding", "2026-08-18", "07:42:00", 1, 1, 1, "Boarding recorded by driver"),
        (2, "boarding", "2026-08-18", "07:48:00", 1, 1, 1, "Boarding recorded by driver"),
        (3, "drop_off", "2026-08-18", "16:05:00", 2, 2, 2, "Dropped at home"),
        (4, "school_entry", "2026-08-18", "08:20:00", 2, 2, 2, "Entered school"),
        (5, "school_exit", "2026-08-18", "15:30:00", 3, 3, 2, "Exited the school"),
        (1, "school_entry", "2026-08-18", "08:25:00", 1, 1, 2, "Entered school"),
        (2, "school_exit", "2026-08-18", "15:45:00", 1, 1, 2, "Exited school"),
        (7, "boarding", "2026-08-18", "07:58:00", 4, 4, 1, "Boarded bus"),
        (10, "boarding", "2026-08-18", "08:05:00", 1, 1, 3, "Boarded bus"),
        (15, "boarding", "2026-08-18", "08:10:00", 2, 2, 3, "Boarded bus"),
    ]
    for movement in movement_rows:
        db.execute(
            "INSERT INTO student_movements (student_id, movement_type, movement_date, movement_time, vehicle_id, route_id, recorded_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            movement,
        )

    # Add sample notifications
    parent_users = db.execute("SELECT id, name FROM users WHERE role = 'parent'").fetchall()
    for parent_user in parent_users:
        message = f"Welcome {parent_user['name']}! You can now track your child's transport updates here."
        linked_ids = db.execute("SELECT student_id FROM parent_student_links WHERE user_id = ? LIMIT 1", (parent_user['id'],)).fetchone()
        if linked_ids:
            db.execute(
                "INSERT INTO notifications (student_id, user_id, message, is_read) VALUES (?, ?, ?, 0)",
                (linked_ids['student_id'], parent_user['id'], message),
            )

    db.commit()
    db.close()


@app.before_request
def ensure_database_ready():
    db = get_db()
    table_names = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    required_tables = {'users', 'parent_student_links', 'students', 'drivers', 'routes', 'vehicles', 'transport_assignments', 'student_movements', 'notifications', 'not_travelling_today', 'activity_audit_log', 'transport_fees', 'fee_payments'}
    
    if not required_tables.issubset(table_names):
        init_db()
        migrate_optional_columns(db)
        seed_demo_data()
    else:
        try:
            db.execute("SELECT 1 FROM users LIMIT 1")
        except sqlite3.DatabaseError:
            init_db()
            migrate_optional_columns(db)
            seed_demo_data()
        else:
            migrate_optional_columns(db)
            ensure_parent_links()
    ensure_current_month_fees()


if __name__ == "__main__":
    with app.app_context():
        init_db()
        migrate_optional_columns(get_db())
        seed_demo_data()
    # The combined Hub assigns Transport port 5002 so it can run beside the
    # other modules. Keeping this configurable also supports standalone use.
    port = int(os.environ.get("PORT", "5002"))
    app.run(debug=True, host="0.0.0.0", port=port)
