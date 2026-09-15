import sqlite3
from datetime import date

from app import app
from auth import login_user, logout_user
from grade import record_grade
from notification import (
    _connect,
    ensure_admin_notification_schema,
    get_notifications,
    get_notification_rules,
    update_notification_rule,
)
from student import assign_teacher_to_class, ensure_class_level_schema, ensure_teacher_class_schema


ADMIN_ID = 900
PARENT_ID = 901
TEACHER_ID = 902
STUDENT_ID = 903


def setup_rule_data():
    ensure_class_level_schema()
    ensure_teacher_class_schema()
    ensure_admin_notification_schema()

    connection = _connect()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM notifications")
    cursor.execute("DELETE FROM teacher_class_assignments WHERE teacher_id = ?", (TEACHER_ID,))
    cursor.execute("DELETE FROM grades WHERE student_id = ?", (STUDENT_ID,))

    for user_id, name, email, role in [
        (ADMIN_ID, "Rules Admin", "rules-admin@example.com", "admin"),
        (PARENT_ID, "Linked Parent", "linked-parent@example.com", "parent"),
        (TEACHER_ID, "Assigned Teacher", "assigned-teacher@example.com", "teacher"),
    ]:
        cursor.execute(
            """
            INSERT OR REPLACE INTO users (id, name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, name, email, "pass", role),
        )

    cursor.execute(
        """
        INSERT OR REPLACE INTO students (id, name, parent_id, class_level)
        VALUES (?, ?, ?, ?)
        """,
        (STUDENT_ID, "Linked Student", PARENT_ID, 9),
    )
    connection.commit()
    connection.close()
    assign_teacher_to_class(TEACHER_ID, 9, "Math")


def restore_grade_rule():
    update_notification_rule("grade", True, True, "in_app", ADMIN_ID)


def test_rule_controls_student_notification_recipients():
    setup_rule_data()
    restore_grade_rule()
    update_notification_rule("grade", False, True, "in_app", ADMIN_ID)

    try:
        record_grade(STUDENT_ID, "Math", 80, 100, date.today().isoformat())
        assert get_notifications(PARENT_ID) == []
        assert len(get_notifications(TEACHER_ID)) == 1
    finally:
        restore_grade_rule()


def test_rule_api_is_admin_only_and_updates_rule():
    setup_rule_data()
    restore_grade_rule()
    client = app.test_client()

    parent_login = client.post(
        "/api/login",
        json={"email": "linked-parent@example.com", "password": "pass"},
    )
    assert parent_login.status_code == 200
    assert client.get("/api/admin/notification-rules").status_code == 403

    client.post("/api/logout")
    admin_login = client.post(
        "/api/login",
        json={"email": "rules-admin@example.com", "password": "pass"},
    )
    assert admin_login.status_code == 200

    response = client.put(
        "/api/admin/notification-rules/grade",
        json={"parent_enabled": False, "teacher_enabled": True, "channel": "in_app"},
    )
    assert response.status_code == 200
    assert next(rule for rule in get_notification_rules() if rule["notification_type"] == "grade")["parent_enabled"] is False
    restore_grade_rule()
    client.post("/api/logout")
