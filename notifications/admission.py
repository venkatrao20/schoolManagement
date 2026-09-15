import sqlite3

from notification import create_notification, notification_rule_enabled
from student import get_parent_id, get_student_name


VALID_ADMISSION_STATUSES = [
    "Applied",
    "Under Review",
    "Approved",
    "Rejected",
    "Waitlisted"
]


def ensure_admissions_schema():

    connection = sqlite3.connect("school.db")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS admissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    """)
    connection.commit()
    connection.close()


def record_admission(student_id, status, notes=None):

    if status not in VALID_ADMISSION_STATUSES:
        raise ValueError(f"Status must be one of {VALID_ADMISSION_STATUSES}")

    ensure_admissions_schema()
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    cursor.execute("""
        SELECT status, notes
        FROM admissions
        WHERE student_id = ?
        ORDER BY id DESC
        LIMIT 1
    """, (student_id,))
    existing = cursor.fetchone()

    changed = existing is None or existing != (status, notes)

    # Each change is kept as its own row, so the full status history stays
    # available for audit and dependent workflows instead of only the latest.
    if changed:
        cursor.execute("""
            INSERT INTO admissions (student_id, status, notes)
            VALUES (?, ?, ?)
        """, (student_id, status, notes))

    connection.commit()
    connection.close()

    result = {
        "student_id": student_id,
        "status": status,
        "notes": notes,
        "changed": changed,
        "notifications_sent": 0
    }

    if not changed:
        return result

    parent_id = get_parent_id(student_id)

    if parent_id and notification_rule_enabled("admission", "parent"):
        student_name = get_student_name(student_id)
        create_notification(
            parent_id,
            "Admissions Update",
            f"{student_name}'s admission status is now {status}." +
            (f" Note: {notes}" if notes else ""),
            "admission"
        )
        result["notifications_sent"] = 1

    return result


# Full status history for a student, most recent first
def get_admission_history(student_id):

    ensure_admissions_schema()
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    cursor.execute("""
        SELECT status, notes, updated_at
        FROM admissions
        WHERE student_id = ?
        ORDER BY id DESC
    """, (student_id,))
    rows = cursor.fetchall()
    connection.close()

    return [
        {"status": row[0], "notes": row[1], "updated_at": row[2]}
        for row in rows
    ]