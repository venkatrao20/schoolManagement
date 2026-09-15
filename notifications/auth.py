import sqlite3

from functools import wraps

from flask import session, jsonify

from werkzeug.security import check_password_hash


# What each role is allowed to do.
#
# "view_all_students" is the scope switch: roles that have it see reports for
# every student, roles that do not see only their own children.
#
# Note that teacher deliberately has no "view_fee_report" — fees are financial
# data, so only parents (for their own children) and admins can see them.
ROLE_CAPABILITIES = {

    "parent": {
        "view_notifications",
        "view_attendance_report",
        "view_grade_report",
        "view_assignment_report",
        "view_fee_report",
        "view_admission_report"
    },

    "teacher": {
        "view_notifications",
        "view_attendance_report",
        "view_grade_report",
        "view_assignment_report",
        "view_admission_report",
        "view_all_students",
        "record_attendance",
        "record_grades",
        "record_assignments"
    },

    "primary_coordinator": {
        "view_notifications",
        "view_attendance_report",
        "view_grade_report",
        "view_assignment_report",
        "view_admission_report",
        "record_grades",
        "record_assignments",
        "record_events"
    },

    "secondary_coordinator": {
        "view_notifications",
        "view_attendance_report",
        "view_grade_report",
        "view_assignment_report",
        "view_admission_report",
        "record_grades",
        "record_assignments",
        "record_events"
    },

    "admin": {
        "view_notifications",
        "manage_notifications",
        "view_attendance_report",
        "view_grade_report",
        "view_assignment_report",
        "view_fee_report",
        "view_admission_report",
        "view_all_students",
        "view_all_notifications",
        "view_school_summary",
        "record_attendance",
        "record_grades",
        "record_transportation",
        "record_assignments",
        "record_admissions",
        "record_events",
        "record_fees",
        "run_reminders"
    }
}


# Find a user by email address
def get_user_by_email(email):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, name, email, password, role
        FROM users
        WHERE email = ?
    """, (email,))

    user = cursor.fetchone()

    connection.close()

    if user is None:
        return None

    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "password": user[3],
        "role": user[4]
    }


# Find a user by ID
def get_user_by_id(user_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, name, email, role
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()

    connection.close()

    if user is None:
        return None

    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "role": user[3]
    }


# Check a submitted password against the stored one.
#
# Users created by seed_data.py have hashed passwords, but the original
# test user was inserted with a plain text password, so fall back to a
# direct comparison for those rows.
def verify_password(stored_password, submitted_password):

    looks_hashed = (
        stored_password.startswith("pbkdf2:")
        or stored_password.startswith("scrypt:")
        or stored_password.startswith("argon2")
    )

    if looks_hashed:
        return check_password_hash(stored_password, submitted_password)

    return stored_password == submitted_password


# Log a user in and return their details
def login_user(email, password):

    user = get_user_by_email(email)

    if user is None:
        return None

    if not verify_password(user["password"], password):
        return None

    # Unknown roles get no capabilities at all, so reject them at login
    if user["role"] not in ROLE_CAPABILITIES:
        return None

    session.permanent = True
    session["user_id"] = user["id"]
    session["role"] = user["role"]

    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }


# Log the current user out
def logout_user():
    session.clear()


# Get the currently logged in user, or None
def current_user():

    user_id = session.get("user_id")

    if user_id is None:
        return None

    return get_user_by_id(user_id)


# Check whether a role is allowed to do something
def role_can(role, capability):

    capabilities = ROLE_CAPABILITIES.get(role, set())

    return capability in capabilities


# List the capabilities of a role, so the frontend can hide what is not allowed
def capabilities_for_role(role):

    return sorted(ROLE_CAPABILITIES.get(role, set()))


# Get the student IDs a user is allowed to see reports for
def accessible_student_ids(user):

    from student import ensure_class_level_schema

    ensure_class_level_schema()
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    # Teachers and admins see every student
    if role_can(user["role"], "view_all_students"):

        cursor.execute("""
            SELECT id
            FROM students
            ORDER BY id
        """)

    # Parents see only their own children
    elif user["role"] == "primary_coordinator":
        cursor.execute("""
            SELECT id
            FROM students
            WHERE class_level BETWEEN 1 AND 5
            ORDER BY id
        """)

    elif user["role"] == "secondary_coordinator":
        cursor.execute("""
            SELECT id
            FROM students
            WHERE class_level BETWEEN 6 AND 10
            ORDER BY id
        """)

    else:

        cursor.execute("""
            SELECT id
            FROM students
            WHERE parent_id = ?
            ORDER BY id
        """, (user["id"],))

    students = cursor.fetchall()

    connection.close()

    return [student[0] for student in students]


# Require a logged in user
def login_required(view_function):

    @wraps(view_function)
    def wrapper(*args, **kwargs):

        if current_user() is None:
            return jsonify({
                "error": "Login required"
            }), 401

        return view_function(*args, **kwargs)

    return wrapper


# Require a logged in user whose role has a specific capability
def capability_required(capability):

    def decorator(view_function):

        @wraps(view_function)
        def wrapper(*args, **kwargs):

            user = current_user()

            if user is None:
                return jsonify({
                    "error": "Login required"
                }), 401

            if not role_can(user["role"], capability):
                return jsonify({
                    "error": f"Your role ({user['role']}) cannot access this"
                }), 403

            return view_function(*args, **kwargs)

        return wrapper

    return decorator
