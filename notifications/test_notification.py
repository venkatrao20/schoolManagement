from notification import (
    create_notification,
    get_notifications,
    mark_notification_as_read
)


# Create a test notification
create_notification(
    1,
    "Attendance Alert",
    "Your attendance is below 75%",
    "attendance"
)


# Get notifications for user 1
notifications = get_notifications(1)

print("\nNotifications:")
for notification in notifications:
    print(notification)
    # Mark notification as read
mark_notification_as_read(1)


# Check notifications again
notifications = get_notifications(1)

print("\nNotifications after marking as read:")
for notification in notifications:
    print(notification)