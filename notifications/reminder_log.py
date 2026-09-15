import sqlite3


# Claim a one-off notification before sending it.
#
# Returns True if this call won the claim and should send, False if the
# same notification was already sent. The UNIQUE constraint on reminder_log
# is what enforces it, so this is safe even when two processes run at once.
#
# Used for anything that must reach a parent at most once per day:
#   ("absence_alert", student_id, "2026-08-20")
#   ("low_attendance_alert", student_id, "2026-08-20")
#   ("assignment_due", assignment_id, "2026-08-26")
def claim_once(reminder_type, reference_id, reminder_date):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        INSERT OR IGNORE INTO reminder_log
        (reminder_type, reference_id, reminder_date)
        VALUES (?, ?, ?)
    """, (reminder_type, reference_id, reminder_date))

    claimed = cursor.rowcount == 1

    connection.commit()
    connection.close()

    return claimed
