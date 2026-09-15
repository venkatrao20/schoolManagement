import sqlite3

from notification import create_notification, notification_rule_enabled
from student import get_parent_id, get_student_name


# Create a fee
def create_fee(student_id, fee_type, amount, due_date, status):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
    INSERT INTO fees
    (student_id, fee_type, amount, due_date, status)
    VALUES (?, ?, ?, ?, ?)
    """, (student_id, fee_type, amount, due_date, status))

    connection.commit()
    connection.close()

    print("Fee record created successfully!")

    # Create notification if fee is pending
    if status.lower() == "pending":

        parent_id = get_parent_id(student_id)

        if parent_id and notification_rule_enabled("fee", "parent"):

            student_name = get_student_name(student_id)

            create_notification(
                parent_id,
                "Fee Reminder",
                f"{student_name}'s {fee_type} of ₹{amount:.2f} is pending. "
                f"Due date: {due_date}",
                "fee"
            )

            print("Fee notification created!")

        else:
            print("No parent/user found for this student.")