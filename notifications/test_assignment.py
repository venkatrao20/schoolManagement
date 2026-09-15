from assignment import create_assignment
from notification import get_notifications


# Create a test assignment for Student 1
create_assignment(
    1,
    "Mathematics",
    "Algebra Assignment",
    "Complete questions 1-20",
    "2026-08-25"
)


# Get notifications for User 1
notifications = get_notifications(1)

print("\nUser 1 notifications:")

for notification in notifications:
    print(notification)