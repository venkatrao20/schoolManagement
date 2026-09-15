from attendance import record_attendance, get_attendance_percentage
from notification import get_notifications


# Record absent attendance for Student 1
record_attendance(1, "2026-08-19", "Absent")


# Check attendance percentage
percentage = get_attendance_percentage(1)

print(f"\nFinal attendance percentage: {percentage:.2f}%")


# Get notifications for User 1
notifications = get_notifications(1)

print("\nUser 1 notifications:")

for notification in notifications:
    print(notification)