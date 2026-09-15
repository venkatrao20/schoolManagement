from notification import get_notifications


# Get all notifications for user 1
notifications = get_notifications(1)

print("\nAll notifications:")

for notification in notifications:
    print(notification)