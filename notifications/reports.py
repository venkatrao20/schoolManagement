import sqlite3

from datetime import date


ATTENDANCE_THRESHOLD = 75
PASS_THRESHOLD = 50


# Build the "?, ?, ?" placeholder list for an IN clause
def placeholders(items):
    return ", ".join("?" for item in items)


def date_filter(column, date_from=None, date_to=None):

    clauses = []
    values = []

    if date_from:
        clauses.append(f"{column} >= ?")
        values.append(date_from)

    if date_to:
        clauses.append(f"{column} <= ?")
        values.append(date_to)

    return (" AND " + " AND ".join(clauses)) if clauses else "", values


# Look up the names of the students a report covers
def get_student_names(student_ids):

    if not student_ids:
        return {}

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute(f"""
        SELECT students.id, students.name, users.name
        FROM students
        LEFT JOIN users ON students.parent_id = users.id
        WHERE students.id IN ({placeholders(student_ids)})
    """, student_ids)

    rows = cursor.fetchall()

    connection.close()

    names = {}

    for row in rows:
        names[row[0]] = {
            "student_name": row[1],
            "parent_name": row[2]
        }

    return names


# Attendance report: classes held, attended and the resulting percentage
def attendance_report(student_ids, date_from=None, date_to=None):

    if not student_ids:
        return {"students": [], "summary": {}}

    names = get_student_names(student_ids)

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    date_sql, date_values = date_filter("date", date_from, date_to)
    cursor.execute(f"""
        SELECT
            student_id,
            COUNT(*),
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)
        FROM attendance
        WHERE student_id IN ({placeholders(student_ids)}){date_sql}
        GROUP BY student_id
    """, list(student_ids) + date_values)

    counts = {}

    for row in cursor.fetchall():
        counts[row[0]] = {
            "total": row[1],
            "present": row[2] or 0
        }

    connection.close()

    students = []

    for student_id in student_ids:

        record = counts.get(student_id, {"total": 0, "present": 0})

        total = record["total"]
        present = record["present"]
        absent = total - present

        # A student with no attendance records has no percentage to report,
        # which is different from a student who attended 0% of their classes
        if total == 0:
            percentage = None
            status = "No data"
        else:
            percentage = round((present / total) * 100, 2)
            status = "Low" if percentage < ATTENDANCE_THRESHOLD else "Good"

        students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, {}).get("student_name"),
            "parent_name": names.get(student_id, {}).get("parent_name"),
            "total_classes": total,
            "present": present,
            "absent": absent,
            "percentage": percentage,
            "status": status
        })

    with_data = [s for s in students if s["percentage"] is not None]

    summary = {
        "students_covered": len(students),
        "below_threshold": len([
            s for s in with_data
            if s["percentage"] < ATTENDANCE_THRESHOLD
        ]),
        "threshold": ATTENDANCE_THRESHOLD
    }

    return {"students": students, "summary": summary}


# Grade report: every recorded grade plus a per student average
def grade_report(student_ids, date_from=None, date_to=None):

    if not student_ids:
        return {"students": [], "summary": {}}

    names = get_student_names(student_ids)

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    date_sql, date_values = date_filter("date", date_from, date_to)
    cursor.execute(f"""
        SELECT student_id, subject, marks, total_marks, date
        FROM grades
        WHERE student_id IN ({placeholders(student_ids)}){date_sql}
        ORDER BY date DESC, subject
    """, list(student_ids) + date_values)

    rows = cursor.fetchall()

    connection.close()

    grades_by_student = {}

    for row in rows:

        student_id = row[0]
        marks = row[2]
        total_marks = row[3]

        percentage = round((marks / total_marks) * 100, 2) if total_marks else 0

        grades_by_student.setdefault(student_id, []).append({
            "subject": row[1],
            "marks": marks,
            "total_marks": total_marks,
            "percentage": percentage,
            "date": row[4],
            "result": "Pass" if percentage >= PASS_THRESHOLD else "Fail"
        })

    students = []
    failing_count = 0

    for student_id in student_ids:

        grades = grades_by_student.get(student_id, [])

        if grades:
            average = round(
                sum(grade["percentage"] for grade in grades) / len(grades), 2
            )
        else:
            average = None

        if average is not None and average < PASS_THRESHOLD:
            failing_count = failing_count + 1

        students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, {}).get("student_name"),
            "parent_name": names.get(student_id, {}).get("parent_name"),
            "grades": grades,
            "subjects_recorded": len(grades),
            "average_percentage": average
        })

    summary = {
        "students_covered": len(students),
        "below_pass_mark": failing_count,
        "pass_mark": PASS_THRESHOLD
    }

    return {"students": students, "summary": summary}


# Fee report: every fee record plus paid and pending totals
def fee_report(student_ids, date_from=None, date_to=None):

    if not student_ids:
        return {"students": [], "summary": {}}

    names = get_student_names(student_ids)

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    date_sql, date_values = date_filter("due_date", date_from, date_to)
    cursor.execute(f"""
        SELECT student_id, fee_type, amount, due_date, status
        FROM fees
        WHERE student_id IN ({placeholders(student_ids)}){date_sql}
        ORDER BY due_date
    """, list(student_ids) + date_values)

    rows = cursor.fetchall()

    connection.close()

    fees_by_student = {}

    for row in rows:
        fees_by_student.setdefault(row[0], []).append({
            "fee_type": row[1],
            "amount": row[2],
            "due_date": row[3],
            "status": row[4]
        })

    today = date.today().isoformat()

    students = []
    total_pending = 0
    total_paid = 0

    for student_id in student_ids:

        fees = fees_by_student.get(student_id, [])

        pending = 0
        paid = 0

        for fee in fees:

            is_paid = fee["status"].lower() == "paid"

            if is_paid:
                paid = paid + fee["amount"]
            else:
                pending = pending + fee["amount"]

            fee["overdue"] = (not is_paid) and fee["due_date"] < today

        total_pending = total_pending + pending
        total_paid = total_paid + paid

        students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, {}).get("student_name"),
            "parent_name": names.get(student_id, {}).get("parent_name"),
            "fees": fees,
            "pending_amount": round(pending, 2),
            "paid_amount": round(paid, 2)
        })

    summary = {
        "students_covered": len(students),
        "total_pending": round(total_pending, 2),
        "total_paid": round(total_paid, 2)
    }

    return {"students": students, "summary": summary}


# Assignment report: what is due, and what is already overdue
def assignment_report(student_ids, date_from=None, date_to=None):

    if not student_ids:
        return {"students": [], "summary": {}}

    names = get_student_names(student_ids)

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    date_sql, date_values = date_filter("due_date", date_from, date_to)
    cursor.execute(f"""
        SELECT id, student_id, subject, title, description, due_date
        FROM assignments
        WHERE student_id IN ({placeholders(student_ids)}){date_sql}
        ORDER BY due_date
    """, list(student_ids) + date_values)

    rows = cursor.fetchall()

    connection.close()

    today = date.today().isoformat()

    assignments_by_student = {}

    for row in rows:
        assignments_by_student.setdefault(row[0], []).append({
            "id": row[0],
            "subject": row[2],
            "title": row[3],
            "description": row[4],
            "due_date": row[5],
            "overdue": row[5] < today
        })

    students = []
    overdue_total = 0

    for student_id in student_ids:

        assignments = assignments_by_student.get(student_id, [])

        overdue = len([a for a in assignments if a["overdue"]])
        overdue_total = overdue_total + overdue

        students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, {}).get("student_name"),
            "parent_name": names.get(student_id, {}).get("parent_name"),
            "assignments": assignments,
            "total_assignments": len(assignments),
            "overdue_count": overdue,
            "upcoming_count": len(assignments) - overdue
        })

    summary = {
        "students_covered": len(students),
        "overdue_total": overdue_total
    }

    return {"students": students, "summary": summary}


# Admission report: current status for each student, plus the full history
# of changes that led there
def admission_report(student_ids, date_from=None, date_to=None):

    if not student_ids:
        return {"students": [], "summary": {}}

    names = get_student_names(student_ids)

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    date_sql, date_values = date_filter("updated_at", date_from, date_to)
    cursor.execute(f"""
        SELECT student_id, status, notes, updated_at
        FROM admissions
        WHERE student_id IN ({placeholders(student_ids)}){date_sql}
        ORDER BY updated_at DESC, id DESC
    """, list(student_ids) + date_values)

    rows = cursor.fetchall()

    connection.close()

    history_by_student = {}

    for row in rows:
        history_by_student.setdefault(row[0], []).append({
            "status": row[1],
            "notes": row[2],
            "updated_at": row[3]
        })

    students = []
    pending_review = 0

    for student_id in student_ids:

        history = history_by_student.get(student_id, [])
        current = history[0] if history else None
        status = current["status"] if current else None

        if status in ("Applied", "Under Review", "Waitlisted"):
            pending_review = pending_review + 1

        students.append({
            "student_id": student_id,
            "student_name": names.get(student_id, {}).get("student_name"),
            "parent_name": names.get(student_id, {}).get("parent_name"),
            "status": status,
            "notes": current["notes"] if current else None,
            "updated_at": current["updated_at"] if current else None,
            "history": history
        })

    summary = {
        "students_covered": len(students),
        "pending_review": pending_review
    }

    return {"students": students, "summary": summary}


# School wide summary, for admins only
def school_summary():

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    def count(table):
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        return cursor.fetchone()[0]

    cursor.execute("""
        SELECT role, COUNT(*)
        FROM users
        GROUP BY role
    """)

    users_by_role = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT COUNT(*)
        FROM notifications
        WHERE is_read = 0
    """)

    unread = cursor.fetchone()[0]

    cursor.execute("""
        SELECT type, COUNT(*)
        FROM notifications
        GROUP BY type
        ORDER BY COUNT(*) DESC
    """)

    notifications_by_type = [
        {"type": row[0], "count": row[1]}
        for row in cursor.fetchall()
    ]

    cursor.execute("""
        SELECT students.name, students.class_level, users.name, users.email
        FROM students
        LEFT JOIN users ON students.parent_id = users.id
        WHERE students.name NOT IN ('Student One', 'Student Two')
        ORDER BY students.name
    """)

    students = [
        {
            "student_name": row[0],
            "class_level": row[1],
            "parent_name": row[2],
            "parent_email": row[3]
        }
        for row in cursor.fetchall()
    ]

    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM fees
        WHERE LOWER(status) != 'paid'
    """)

    outstanding_fees = cursor.fetchone()[0]

    summary = {
        "total_users": count("users"),
        "users_by_role": users_by_role,
        "total_students": len(students),
        "total_notifications": count("notifications"),
        "unread_notifications": unread,
        "notifications_by_type": notifications_by_type,
        "students": students,
        "total_attendance_records": count("attendance"),
        "total_grades": count("grades"),
        "total_assignments": count("assignments"),
        "total_events": count("events"),
        "outstanding_fees": round(outstanding_fees, 2)
    }

    connection.close()

    return summary
