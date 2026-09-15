import sqlite3

from notification import create_notification, notify_teachers_for_student, notification_rule_enabled
from student import get_parent_id, get_student_name
from reminder_log import claim_once


ATTENDANCE_THRESHOLD = 75

VALID_STATUSES = ["Present", "Absent"]


# Calculate attendance percentage
def get_attendance_percentage(student_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
    SELECT
        COUNT(*) AS total_classes,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_classes
    FROM attendance
    WHERE student_id = ?
    """, (student_id,))

    result = cursor.fetchone()

    connection.close()

    total_classes = result[0]
    present_classes = result[1] or 0

    if total_classes == 0:
        return 0

    percentage = (present_classes / total_classes) * 100

    return percentage


# What was already marked for these students on this date.
# Used to pre-fill the attendance screen so a teacher can see and correct
# what they entered earlier.
def get_attendance_for_date(student_ids, attendance_date):

    if not student_ids:
        return {}

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    placeholders = ", ".join("?" for student_id in student_ids)

    cursor.execute(f"""
        SELECT student_id, status
        FROM attendance
        WHERE date = ? AND student_id IN ({placeholders})
    """, [attendance_date] + list(student_ids))

    rows = cursor.fetchall()

    connection.close()

    return {row[0]: row[1] for row in rows}


# Record attendance for one student on one date.
#
# A teacher may save the same day more than once, so this updates an
# existing record instead of adding a second one. Notifications only go out
# when something actually changed, and claim_once makes sure a parent is
# never told twice that their child was absent on the same day.
def record_attendance(student_id, date, status):

    if status not in VALID_STATUSES:
        raise ValueError(f"Status must be one of {VALID_STATUSES}")

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, status
        FROM attendance
        WHERE student_id = ? AND date = ?
    """, (student_id, date))

    existing = cursor.fetchone()

    if existing is None:

        cursor.execute("""
        INSERT INTO attendance (student_id, date, status)
        VALUES (?, ?, ?)
        """, (student_id, date, status))

        changed = True
        print("Attendance recorded successfully!")

    elif existing[1] != status:

        cursor.execute("""
            UPDATE attendance
            SET status = ?
            WHERE id = ?
        """, (status, existing[0]))

        changed = True
        print(f"Attendance updated: {existing[1]} -> {status}")

    else:

        changed = False
        print("Attendance unchanged.")

    connection.commit()
    connection.close()

    percentage = get_attendance_percentage(student_id)

    print(f"Current attendance: {percentage:.2f}%")

    result = {
        "student_id": student_id,
        "date": date,
        "status": status,
        "changed": changed,
        "percentage": round(percentage, 2),
        "notifications_sent": 0
    }

    if not changed:
        return result

    parent_id = get_parent_id(student_id)

    if parent_id and notification_rule_enabled("attendance", "parent"):
        student_name = get_student_name(student_id)

        # 1. Absent today
        if status.lower() == "absent":

            if claim_once("absence_alert", student_id, date):

                create_notification(
                    parent_id,
                    "Absence Alert",
                    f"{student_name} was marked absent on {date}. "
                    f"Overall attendance is now {percentage:.2f}%.",
                    "attendance"
                )

                result["notifications_sent"] = result["notifications_sent"] + 1
                print("Absence notification created!")

        # 2. Overall attendance below the threshold.
        # Claimed per day as well, so a parent gets at most one of these a day
        # however many times attendance is saved.
        if percentage < ATTENDANCE_THRESHOLD:

            if claim_once("low_attendance_alert", student_id, date):

                create_notification(
                    parent_id,
                    "Low Attendance Alert",
                    f"{student_name}'s attendance is {percentage:.2f}%, "
                    f"which is below the required {ATTENDANCE_THRESHOLD}%.",
                    "attendance"
                )

                result["notifications_sent"] = result["notifications_sent"] + 1
                print("Low attendance notification created!")
    else:
        print("No parent/user found for this student.")

    # Notify teachers about attendance (regardless of parent)
    if status.lower() == "absent":
        teacher_notification_count = notify_teachers_for_student(
            student_id,
            "Student Absence",
            f"Marked absent on {date}. Current attendance: {percentage:.2f}%",
            "attendance"
        )
        result["notifications_sent"] += teacher_notification_count

    return result
