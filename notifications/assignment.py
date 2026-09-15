import sqlite3

from notification import create_notification, notify_teachers_for_student, notification_rule_enabled
from student import get_parent_id, get_student_name


def get_assignment_student_id(assignment_id):

    connection = sqlite3.connect("school.db")
    row = connection.execute(
        "SELECT student_id FROM assignments WHERE id = ?",
        (assignment_id,)
    ).fetchone()
    connection.close()

    return row[0] if row else None


# Create an assignment
def create_assignment(student_id, subject, title, description, due_date):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
    INSERT INTO assignments
    (student_id, subject, title, description, due_date)
    VALUES (?, ?, ?, ?, ?)
    """, (student_id, subject, title, description, due_date))

    assignment_id = cursor.lastrowid
    connection.commit()
    connection.close()

    print("Assignment created successfully!")

    # Find the parent/user
    parent_id = get_parent_id(student_id)

    if parent_id and notification_rule_enabled("assignment", "parent"):

        student_name = get_student_name(student_id)

        create_notification(
            parent_id,
            "New Assignment",
            f"New {subject} assignment for {student_name}: {title}. "
            f"Due date: {due_date}",
            "assignment"
        )

        print("Assignment notification created!")

    else:
        print("No parent/user found for this student.")

    # Notify teachers for this subject
    teacher_notification_count = notify_teachers_for_student(
        student_id,
        "Assignment Created",
        f"New assignment in {subject}: {title}. Due: {due_date}",
        "assignment",
        subject
    )

    return {
        "id": assignment_id,
        "student_id": student_id,
        "subject": subject,
        "title": title,
        "description": description,
        "due_date": due_date,
        "changed": True,
        "notifications_sent": (1 if parent_id else 0) + teacher_notification_count
    }


def update_assignment(assignment_id, subject, title, description, due_date):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT student_id, subject, title, description, due_date
        FROM assignments
        WHERE id = ?
    """, (assignment_id,))
    existing = cursor.fetchone()

    if existing is None:
        connection.close()
        return None

    changed = existing[1:] != (subject, title, description, due_date)

    if changed:
        cursor.execute("""
            UPDATE assignments
            SET subject = ?, title = ?, description = ?, due_date = ?
            WHERE id = ?
        """, (subject, title, description, due_date, assignment_id))

    connection.commit()
    connection.close()

    result = {
        "id": assignment_id,
        "student_id": existing[0],
        "subject": subject,
        "title": title,
        "description": description,
        "due_date": due_date,
        "changed": changed,
        "notifications_sent": 0
    }

    if not changed:
        return result

    parent_id = get_parent_id(existing[0])

    if parent_id and notification_rule_enabled("assignment", "parent"):
        student_name = get_student_name(existing[0])
        create_notification(
            parent_id,
            "Assignment Updated",
            f"Updated {subject} assignment for {student_name}: {title}. "
            f"Due date: {due_date}",
            "assignment"
        )
        result["notifications_sent"] = 1

    # Notify teachers for this subject
    teacher_notification_count = notify_teachers_for_student(
        existing[0],
        "Assignment Updated",
        f"Assignment in {subject} updated: {title}. Due: {due_date}",
        "assignment",
        subject
    )
    result["notifications_sent"] += teacher_notification_count

    return result