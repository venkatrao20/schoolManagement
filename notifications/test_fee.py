from fee import create_fee
from notification import get_notifications


# Create a pending fee for Student 1
create_fee(
    1,
    "Tuition Fee",
    25000,
    "2026-08-30",
    "Pending"
)


# Get notifications for User 1
notifications = get_notifications(1)

print("\nUser 1 notifications:")

for notification in notifications:
    print(notification)