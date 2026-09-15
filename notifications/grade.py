import sqlite3

from notification import create_notification, notify_teachers_for_student, notification_rule_enabled
from student import get_parent_id, get_student_name


PASS_THRESHOLD = 50


# Calculate grade percentage
def calculate_grade_percentage(marks, total_marks):

    if total_marks == 0:
        return 0

    percentage = (marks / total_marks) * 100

    return percentage


# Record a grade.
#
# The parent is notified every time marks are added or corrected. A pass
# gets a plain "Marks Updated" notification, anything below the pass mark
# gets a "Low Grade Alert" instead.
#
# Saving the same marks twice updates the existing row rather than adding a
# duplicate, and sends nothing, so a teacher can re-submit the form safely.
def record_grade(student_id, subject, marks, total_marks, date):

    if total_marks <= 0:
        raise ValueError("Total marks must be greater than zero")

    if marks < 0 or marks > total_marks:
        raise ValueError("Marks must be between 0 and the total marks")

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, marks, total_marks
        FROM grades
        WHERE student_id = ? AND subject = ? AND date = ?
    """, (student_id, subject, date))

    existing = cursor.fetchone()

    if existing is None:

        cursor.execute("""
        INSERT INTO grades
        (student_id, subject, marks, total_marks, date)
        VALUES (?, ?, ?, ?, ?)
        """, (student_id, subject, marks, total_marks, date))

        changed = True
        print("Grade recorded successfully!")

    elif existing[1] != marks or existing[2] != total_marks:

        cursor.execute("""
            UPDATE grades
            SET marks = ?, total_marks = ?
            WHERE id = ?
        """, (marks, total_marks, existing[0]))

        changed = True
        print(f"Grade updated: {existing[1]:g} -> {marks:g}")

    else:

        changed = False
        print("Grade unchanged.")

    connection.commit()
    connection.close()

    # Calculate percentage
    percentage = calculate_grade_percentage(marks, total_marks)

    print(f"Grade percentage: {percentage:.2f}%")

    result = {
        "student_id": student_id,
        "subject": subject,
        "marks": marks,
        "total_marks": total_marks,
        "date": date,
        "percentage": round(percentage, 2),
        "changed": changed,
        "notifications_sent": 0
    }

    if not changed:
        return result

    parent_id = get_parent_id(student_id)

    if not parent_id or not notification_rule_enabled("grade", "parent"):
        print("No parent/user found for this student.")
    else:
        student_name = get_student_name(student_id)

        if percentage < PASS_THRESHOLD:

            title = "Low Grade Alert"

            message = (
                f"{student_name} scored {marks:g}/{total_marks:g} "
                f"({percentage:.2f}%) in {subject} on {date}. "
                f"This is below the {PASS_THRESHOLD}% pass mark."
            )

        else:

            title = "Marks Updated"

            message = (
                f"{student_name} scored {marks:g}/{total_marks:g} "
                f"({percentage:.2f}%) in {subject} on {date}."
            )

        create_notification(parent_id, title, message, "grade")

        result["notifications_sent"] = 1

        print(f"Grade notification created: {title}")

    # Notify teachers for this subject
    teacher_notification_count = notify_teachers_for_student(
        student_id,
        "Grade Recorded",
        f"Marks recorded: {marks:g}/{total_marks:g} ({percentage:.2f}%) in {subject}",
        "grade",
        subject
    )
    result["notifications_sent"] += teacher_notification_count

    return result
