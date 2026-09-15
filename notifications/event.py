import sqlite3

from notification import create_notification, notify_teachers_for_student, notification_rule_enabled
from student import get_parent_id


# Create a school event
def create_event(student_id, title, description, event_date, location):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
    INSERT INTO events
    (student_id, title, description, event_date, location)
    VALUES (?, ?, ?, ?, ?)
    """, (
        student_id,
        title,
        description,
        event_date,
        location
    ))

    connection.commit()
    connection.close()

    print("Event created successfully!")

    # Find the parent/user
    parent_id = get_parent_id(student_id)

    if parent_id and notification_rule_enabled("event", "parent"):

        create_notification(
            parent_id,
            "New Event",
            f"{title} on {event_date} at {location}.",
            "event"
        )

        print("Event notification created!")

    else:
        print("No parent/user found for this student.")

    # Notify teachers for this event
    teacher_notification_count = notify_teachers_for_student(
        student_id,
        "Event Created",
        f"{title} scheduled for {event_date} at {location}",
        "event"
    )
    
    if teacher_notification_count > 0:
        print(f"Event notification sent to {teacher_notification_count} teacher(s)!")