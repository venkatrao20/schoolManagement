"""
Scheduled reminders.

Some notifications cannot be triggered by an action, because nothing happens
at the moment they are due. An assignment due tomorrow is the example: no
one adds or changes anything, the date simply arrives. So this runs on a
schedule instead.

Run it by hand:

    python reminders.py

Or once a day from cron (8am), from the project directory:

    0 8 * * * cd "/path/to/project" && ./venv/bin/python reminders.py

Running it more than once a day is harmless. Every reminder is claimed in
the reminder_log table before it is sent, so a parent is never notified
twice about the same assignment on the same day.
"""

import sqlite3

from datetime import date, timedelta

from notification import create_notification, deliver_scheduled_admin_notifications, notification_rule_enabled
from student import get_parent_id, get_student_name
from reminder_log import claim_once


# How many days before the due date the reminder goes out
DAYS_BEFORE_DUE = 1


# Find assignments whose due date is exactly the given date
def assignments_due_on(due_date):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, student_id, subject, title, due_date
        FROM assignments
        WHERE due_date = ?
        ORDER BY id
    """, (due_date,))

    rows = cursor.fetchall()

    connection.close()

    assignments = []

    for row in rows:
        assignments.append({
            "id": row[0],
            "student_id": row[1],
            "subject": row[2],
            "title": row[3],
            "due_date": row[4]
        })

    return assignments


# Remind parents about assignments due tomorrow.
#
# today defaults to the real date, but can be passed in to test the job
# without waiting for the calendar.
def send_assignment_due_reminders(today=None):

    if today is None:
        today = date.today()

    target_date = (today + timedelta(days=DAYS_BEFORE_DUE)).isoformat()

    assignments = assignments_due_on(target_date)

    print(f"Assignments due {target_date}: {len(assignments)}")

    sent = 0
    skipped_already_sent = 0
    skipped_no_parent = 0

    for assignment in assignments:

        parent_id = get_parent_id(assignment["student_id"])

        if not parent_id or not notification_rule_enabled("assignment", "parent"):
            skipped_no_parent = skipped_no_parent + 1
            print(f"  no parent for student {assignment['student_id']}, skipping")
            continue

        # Claim first, so a crash cannot turn into a duplicate reminder
        if not claim_once("assignment_due", assignment["id"], target_date):
            skipped_already_sent = skipped_already_sent + 1
            print(f"  already reminded: {assignment['title']}")
            continue

        student_name = get_student_name(assignment["student_id"])

        create_notification(
            parent_id,
            "Assignment Due Tomorrow",
            f"{student_name}'s {assignment['subject']} assignment "
            f"\"{assignment['title']}\" is due tomorrow ({target_date}).",
            "assignment"
        )

        sent = sent + 1
        print(f"  reminded parent {parent_id} about: {assignment['title']}")

    return {
        "target_date": target_date,
        "assignments_found": len(assignments),
        "reminders_sent": sent,
        "already_sent": skipped_already_sent,
        "no_parent_linked": skipped_no_parent
    }


# Run every scheduled reminder job
def run_all_reminders(today=None):

    deliver_scheduled_admin_notifications()

    print("--- Assignment due reminders ---")

    assignment_result = send_assignment_due_reminders(today)

    return {
        "scheduled_admin_notifications": "processed",
        "assignment_due": assignment_result
    }


if __name__ == "__main__":

    results = run_all_reminders()

    print("\n--- Summary ---")

    for job_name, result in results.items():
        print(f"{job_name}: {result}")
