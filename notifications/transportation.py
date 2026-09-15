import sqlite3

from notification import create_notification
from reminder_log import claim_once
from student import get_parent_id, get_student_name


VALID_TRANSPORT_STATUSES = [
    "Boarded",
    "Not Boarded",
    "Destination Reached"
]


def ensure_transportation_schema():

    connection = sqlite3.connect("school.db")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS transportation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            route TEXT,
            destination TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (student_id, date),
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    """)
    connection.commit()
    connection.close()


def get_transportation_for_date(student_ids, transport_date):

    if not student_ids:
        return {}

    ensure_transportation_schema()
    connection = sqlite3.connect("school.db")
    placeholders = ", ".join("?" for _ in student_ids)
    rows = connection.execute(f"""
        SELECT student_id, status, route, destination, updated_at
        FROM transportation
        WHERE date = ? AND student_id IN ({placeholders})
    """, [transport_date] + list(student_ids)).fetchall()
    connection.close()

    return {
        row[0]: {
            "status": row[1],
            "route": row[2],
            "destination": row[3],
            "updated_at": row[4]
        }
        for row in rows
    }


def record_transportation(student_id, transport_date, status, route, destination):

    if status not in VALID_TRANSPORT_STATUSES:
        raise ValueError(f"Status must be one of {VALID_TRANSPORT_STATUSES}")

    ensure_transportation_schema()
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, status, route, destination
        FROM transportation
        WHERE student_id = ? AND date = ?
    """, (student_id, transport_date))
    existing = cursor.fetchone()

    if existing is None:
        cursor.execute("""
            INSERT INTO transportation
            (student_id, date, status, route, destination)
            VALUES (?, ?, ?, ?, ?)
        """, (student_id, transport_date, status, route, destination))
        changed = True
    elif existing[1:] != (status, route, destination):
        cursor.execute("""
            UPDATE transportation
            SET status = ?, route = ?, destination = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status, route, destination, existing[0]))
        changed = True
    else:
        changed = False

    connection.commit()
    connection.close()

    result = {
        "student_id": student_id,
        "date": transport_date,
        "status": status,
        "route": route,
        "destination": destination,
        "changed": changed,
        "notifications_sent": 0
    }

    if not changed:
        return result

    parent_id = get_parent_id(student_id)

    if not parent_id:
        return result

    student_name = get_student_name(student_id)

    if status == "Not Boarded" and claim_once("transport_not_boarded", student_id, transport_date):
        create_notification(
            parent_id,
            "Transportation Alert",
            f"{student_name} did not board the bus on {transport_date}.",
            "transportation"
        )
        result["notifications_sent"] = 1

    if status == "Destination Reached" and claim_once("transport_destination_reached", student_id, transport_date):
        create_notification(
            parent_id,
            "Transportation Update",
            f"{student_name} reached the destination on {transport_date}.",
            "transportation"
        )
        result["notifications_sent"] = 1

    return result
