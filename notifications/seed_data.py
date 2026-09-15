"""
Adds demo users, students and school records so the reports and the role
restrictions can actually be seen working.

The script resets the local demo database before inserting the records, so it
can be run again to get the same clean dataset.

    python seed_data.py
"""

import sqlite3

from werkzeug.security import generate_password_hash

from attendance import record_attendance
from grade import record_grade
from fee import create_fee
from assignment import create_assignment
from event import create_event
from admission import ensure_admissions_schema
from student import ensure_class_level_schema


DEMO_USERS = [
    ("Priya Sharma", "priya@example.com", "parent123", "parent"),
    ("Suresh Iyer", "karan.parent@example.com", "parent123", "parent"),
    ("Lakshmi Rao", "riya.parent@example.com", "parent123", "parent"),
    ("Vijay Nair", "aditya.parent@example.com", "parent123", "parent"),
    ("Pooja Desai", "sana.parent@example.com", "parent123", "parent"),
    ("Manoj Kulkarni", "neel.parent@example.com", "parent123", "parent"),
    ("Deepa Joshi", "tara.parent@example.com", "parent123", "parent"),
    ("Ramesh Bhat", "om.parent@example.com", "parent123", "parent"),
    ("Kavita Shah", "maya.parent@example.com", "parent123", "parent"),
    ("Rahul Verma", "rahul@example.com", "teacher123", "teacher"),
    ("Anita Menon", "anita@example.com", "teacher123", "teacher"),
    ("Joseph Thomas", "joseph@example.com", "teacher123", "teacher"),
    ("School Admin", "admin@example.com", "admin123", "admin"),
    ("Primary Coordinator", "primary.coordinator@example.com", "primary123", "primary_coordinator"),
    ("Secondary Coordinator", "secondary.coordinator@example.com", "secondary123", "secondary_coordinator")
]


def reset_demo_data():
    """Remove the old local demo data and all records that depend on it."""

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    for table in (
        "admissions",
        "notification_recipients",
        "admin_notifications",
        "notifications",
        "reminder_log",
        "transportation",
        "attendance",
        "grades",
        "assignments",
        "fees",
        "events",
        "students",
        "users"
    ):
        cursor.execute(f"DELETE FROM {table}")

    connection.commit()
    connection.close()
    print("Removed existing demo data")


# Create a user if that email is not already taken
def add_user(name, email, password, role):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))

    existing = cursor.fetchone()

    if existing:
        connection.close()
        print(f"User already exists: {email} (id {existing[0]})")
        return existing[0]

    cursor.execute("""
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
    """, (name, email, generate_password_hash(password), role))

    user_id = cursor.lastrowid

    connection.commit()
    connection.close()

    print(f"Created {role}: {email} (id {user_id})")

    return user_id


# Create a student if that name is not already used.
#
# If the student is already there but has no parent linked, the parent is
# filled in. A student with no parent can still be marked absent, but
# nobody receives the notification, so it is worth repairing.
def add_student(name, parent_id, class_level):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("SELECT id, parent_id FROM students WHERE name = ?", (name,))

    existing = cursor.fetchone()

    if existing:

        student_id, existing_parent_id = existing

        if existing_parent_id is None and parent_id is not None:

            cursor.execute("""
                UPDATE students
                SET parent_id = ?, class_level = ?
                WHERE id = ?
            """, (parent_id, class_level, student_id))

            connection.commit()
            print(f"Linked parent {parent_id} to existing student: {name} (id {student_id})")

        else:
            print(f"Student already exists: {name} (id {student_id})")

        connection.close()
        return student_id

    cursor.execute("""
        INSERT INTO students (name, parent_id, class_level)
        VALUES (?, ?, ?)
    """, (name, parent_id, class_level))

    student_id = cursor.lastrowid

    connection.commit()
    connection.close()

    print(f"Created student: {name} (id {student_id})")

    return student_id


# Insert attendance history directly, without firing a notification for
# every single day. The live alert is triggered separately below.
def add_attendance_history(student_id, records):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    for attendance_date, status in records:

        cursor.execute("""
            SELECT id FROM attendance
            WHERE student_id = ? AND date = ?
        """, (student_id, attendance_date))

        if cursor.fetchone():
            continue

        cursor.execute("""
            INSERT INTO attendance (student_id, date, status)
            VALUES (?, ?, ?)
        """, (student_id, attendance_date, status))

    connection.commit()
    connection.close()

    print(f"Attendance history added for student {student_id}")


# Check whether a row already exists, so the live event calls below only
# fire once. Without this, re-running would add duplicate fees, assignments
# and events, and a fresh notification for each one.
def row_exists(table, filters):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    where = " AND ".join(f"{column} = ?" for column in filters)

    cursor.execute(
        f"SELECT id FROM {table} WHERE {where}",
        list(filters.values())
    )

    found = cursor.fetchone() is not None

    connection.close()

    return found


# Insert grades directly, for the same reason
def add_grade_history(student_id, records):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    for subject, marks, total_marks, grade_date in records:

        cursor.execute("""
            SELECT id FROM grades
            WHERE student_id = ? AND subject = ? AND date = ?
        """, (student_id, subject, grade_date))

        if cursor.fetchone():
            continue

        cursor.execute("""
            INSERT INTO grades (student_id, subject, marks, total_marks, date)
            VALUES (?, ?, ?, ?, ?)
        """, (student_id, subject, marks, total_marks, grade_date))

    connection.commit()
    connection.close()

    print(f"Grades added for student {student_id}")


ensure_admissions_schema()
ensure_class_level_schema()
reset_demo_data()

print("\n--- Users ---")

priya_id = add_user(*DEMO_USERS[0])
karan_parent_id = add_user(*DEMO_USERS[1])
riya_parent_id = add_user(*DEMO_USERS[2])
aditya_parent_id = add_user(*DEMO_USERS[3])
sana_parent_id = add_user(*DEMO_USERS[4])
neel_parent_id = add_user(*DEMO_USERS[5])
tara_parent_id = add_user(*DEMO_USERS[6])
om_parent_id = add_user(*DEMO_USERS[7])
maya_parent_id = add_user(*DEMO_USERS[8])
rahul_id = add_user(*DEMO_USERS[9])
anita_id = add_user(*DEMO_USERS[10])
joseph_id = add_user(*DEMO_USERS[11])
admin_id = add_user(*DEMO_USERS[12])
primary_coordinator_id = add_user(*DEMO_USERS[13])
secondary_coordinator_id = add_user(*DEMO_USERS[14])


print("\n--- Students ---")

# These two students share the same parent as the relationship example.
aarav_id = add_student("Aarav Sharma", priya_id, 1)
diya_id = add_student("Diya Sharma", priya_id, 2)

# Each remaining student has their own parent account.
karan_id = add_student("Karan Reddy", karan_parent_id, 3)
riya_id = add_student("Riya Reddy", riya_parent_id, 4)
aditya_id = add_student("Aditya Kapoor", aditya_parent_id, 5)
sana_id = add_student("Sana Kapoor", sana_parent_id, 6)
neel_id = add_student("Neel Patel", neel_parent_id, 7)
tara_id = add_student("Tara Patel", tara_parent_id, 8)
om_id = add_student("Om Singh", om_parent_id, 9)
maya_id = add_student("Maya Singh", maya_parent_id, 10)


print("\n--- Attendance ---")

# Aarav attends well, Diya falls below the 75% threshold
add_attendance_history(aarav_id, [
    ("2026-08-10", "Present"),
    ("2026-08-11", "Present"),
    ("2026-08-12", "Present"),
    ("2026-08-13", "Absent"),
    ("2026-08-14", "Present"),
    ("2026-08-17", "Present"),
    ("2026-08-18", "Present"),
    ("2026-08-19", "Present")
])

add_attendance_history(diya_id, [
    ("2026-08-10", "Present"),
    ("2026-08-11", "Absent"),
    ("2026-08-12", "Absent"),
    ("2026-08-13", "Present"),
    ("2026-08-14", "Absent"),
    ("2026-08-17", "Present"),
    ("2026-08-18", "Absent")
])

add_attendance_history(karan_id, [
    ("2026-08-10", "Present"),
    ("2026-08-11", "Present"),
    ("2026-08-12", "Present"),
    ("2026-08-13", "Present"),
    ("2026-08-14", "Present"),
    ("2026-08-17", "Absent")
])


print("\n--- Grades ---")

add_grade_history(aarav_id, [
    ("Mathematics", 84, 100, "2026-08-05"),
    ("Science", 78, 100, "2026-08-07"),
    ("English", 91, 100, "2026-08-12")
])

add_grade_history(diya_id, [
    ("Mathematics", 38, 100, "2026-08-05"),
    ("Science", 55, 100, "2026-08-07"),
    ("English", 62, 100, "2026-08-12")
])

add_grade_history(karan_id, [
    ("Mathematics", 72, 100, "2026-08-05"),
    ("Science", 68, 100, "2026-08-07")
])


# From here on the real module functions are used, so notifications are
# generated exactly the way they are in normal use.

print("\n--- Live events (these generate notifications) ---")


# Each of these only runs the first time, so re-running the script does not
# pile up duplicate records and duplicate notifications.

# Diya's attendance is already low, so this triggers an attendance alert
if not row_exists("attendance", {"student_id": diya_id, "date": "2026-08-19"}):
    record_attendance(diya_id, "2026-08-19", "Absent")

# A failing grade triggers a low grade alert
if not row_exists("grades", {"student_id": diya_id, "subject": "History"}):
    record_grade(diya_id, "History", 31, 100, "2026-08-18")


# Pending fees trigger fee reminders, paid ones do not
DEMO_FEES = [
    (aarav_id, "Tuition Fee", 25000, "2026-09-10", "Pending"),
    (aarav_id, "Library Fee", 1500, "2026-08-01", "Paid"),
    (diya_id, "Tuition Fee", 25000, "2026-08-15", "Pending"),
    (diya_id, "Transport Fee", 4800, "2026-09-01", "Pending"),
    (karan_id, "Tuition Fee", 25000, "2026-08-05", "Paid")
]

for student_id, fee_type, amount, due_date, status in DEMO_FEES:

    if row_exists("fees", {"student_id": student_id, "fee_type": fee_type}):
        print(f"Fee already exists: {fee_type} for student {student_id}")
        continue

    create_fee(student_id, fee_type, amount, due_date, status)


# One overdue assignment and two still upcoming
DEMO_ASSIGNMENTS = [
    (aarav_id, "Science", "Photosynthesis Worksheet",
     "Complete the diagram and answer section B", "2026-08-15"),
    (aarav_id, "English", "Book Review",
     "Write 500 words on the assigned novel", "2026-08-28"),
    (diya_id, "Mathematics", "Geometry Practice",
     "Exercises 4.1 to 4.6", "2026-08-26")
]

for student_id, subject, title, description, due_date in DEMO_ASSIGNMENTS:

    if row_exists("assignments", {"student_id": student_id, "title": title}):
        print(f"Assignment already exists: {title}")
        continue

    create_assignment(student_id, subject, title, description, due_date)


# School events
DEMO_EVENTS = [
    (aarav_id, "Annual Sports Day",
     "Track and field events for all classes", "2026-09-05", "School Ground"),
    (diya_id, "Parent Teacher Meeting",
     "Discuss term progress with class teachers", "2026-08-29", "Room 12")
]

for student_id, title, description, event_date, location in DEMO_EVENTS:

    if row_exists("events", {"student_id": student_id, "title": title}):
        print(f"Event already exists: {title}")
        continue

    create_event(student_id, title, description, event_date, location)


print("\n--- Done ---")
print("\nLogin details:")
print("  Parent  : priya@example.com      / parent123    (Aarav, Diya)")
print("  Parent  : karan.parent@example.com / parent123  (Karan)")
print("  Parent  : riya.parent@example.com   / parent123  (Riya)")
print("  Parent  : aditya.parent@example.com / parent123 (Aditya)")
print("  Parent  : sana.parent@example.com   / parent123 (Sana)")
print("  Parent  : neel.parent@example.com   / parent123 (Neel)")
print("  Parent  : tara.parent@example.com   / parent123 (Tara)")
print("  Parent  : om.parent@example.com     / parent123 (Om)")
print("  Parent  : maya.parent@example.com   / parent123 (Maya)")
print("  Teacher : rahul@example.com      / teacher123")
print("  Teacher : anita@example.com      / teacher123")
print("  Teacher : joseph@example.com     / teacher123")
print("  Admin   : admin@example.com      / admin123")
