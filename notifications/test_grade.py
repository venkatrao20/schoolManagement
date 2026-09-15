from grade import record_grade
from notification import get_notifications


# Record a low grade for Student 1
record_grade(
    1,
    "Mathematics",
    42,
    100,
    "2026-08-19"
)


# Get notifications for User 1
notifications = get_notifications(1)

print("\nUser 1 notifications:")

for notification in notifications:
    print(notification)