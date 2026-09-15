import sqlite3


ADMIN_NOTIFICATION_TYPES = [
    "general_announcement",
    "school_event",
    "holiday",
    "examination",
    "fee_reminder",
    "parent_meeting",
    "emergency",
    "other"
]

NOTIFICATION_PRIORITIES = ["normal", "important", "urgent"]

STUDENT_NOTIFICATION_RULES = {
    "attendance": {"parent": True, "teacher": True},
    "grade": {"parent": True, "teacher": True},
    "assignment": {"parent": True, "teacher": True},
    "event": {"parent": True, "teacher": True},
    "fee": {"parent": True, "teacher": False},
    "admission": {"parent": True, "teacher": False}
}


def _connect():

    connection = sqlite3.connect("school.db")
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_admin_notification_schema():

    connection = _connect()
    cursor = connection.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        notification_type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        recipient_scope TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scheduled_at TIMESTAMP NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        FOREIGN KEY (created_by) REFERENCES users(id)
    )
    """)

    admin_columns = [row[1] for row in cursor.execute("PRAGMA table_info(admin_notifications)")]
    if "scheduled_at" not in admin_columns:
        cursor.execute("ALTER TABLE admin_notifications ADD COLUMN scheduled_at TIMESTAMP NULL")
    if "status" not in admin_columns:
        cursor.execute("ALTER TABLE admin_notifications ADD COLUMN status TEXT NOT NULL DEFAULT 'sent'")
    if "created_at" not in admin_columns:
        cursor.execute("ALTER TABLE admin_notifications ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notification_recipients (
        notification_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        read_at TIMESTAMP,
        PRIMARY KEY (notification_id, user_id),
        FOREIGN KEY (notification_id) REFERENCES admin_notifications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notification_rules (
        notification_type TEXT PRIMARY KEY,
        parent_enabled INTEGER NOT NULL DEFAULT 1,
        teacher_enabled INTEGER NOT NULL DEFAULT 1,
        channel TEXT NOT NULL DEFAULT 'in_app',
        updated_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        origin TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    push_columns = [row[1] for row in cursor.execute("PRAGMA table_info(push_subscriptions)")]
    if "origin" not in push_columns:
        cursor.execute("ALTER TABLE push_subscriptions ADD COLUMN origin TEXT")

    for notification_type, rule in STUDENT_NOTIFICATION_RULES.items():
        cursor.execute("""
            INSERT OR IGNORE INTO notification_rules
            (notification_type, parent_enabled, teacher_enabled, channel, updated_by)
                VALUES (?, ?, ?, 'in_app',
                    (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1))
        """, (
            notification_type,
            int(rule["parent"]),
            int(rule["teacher"])
        ))

    columns = [row[1] for row in cursor.execute("PRAGMA table_info(notifications)")]

    if "admin_notification_id" not in columns:
        cursor.execute("""
            ALTER TABLE notifications
            ADD COLUMN admin_notification_id INTEGER
        """)

    if "priority" not in columns:
        cursor.execute("""
            ALTER TABLE notifications
            ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
        """)

    connection.commit()
    connection.close()


def save_push_subscription(user_id, subscription, origin=None):

    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys", {})
    if not endpoint or not keys.get("p256dh") or not keys.get("auth"):
        return False

    ensure_admin_notification_schema()
    connection = _connect()
    connection.execute("""
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, origin)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET
            user_id = excluded.user_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            origin = excluded.origin
    """, (user_id, endpoint, keys["p256dh"], keys["auth"], origin))
    if origin:
        connection.execute("""
            DELETE FROM push_subscriptions
            WHERE user_id = ? AND endpoint != ? AND (origin IS NULL OR origin != ?)
        """, (user_id, endpoint, origin))
    connection.commit()
    connection.close()
    return True


def delete_push_subscription(user_id, endpoint):

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()
    cursor.execute(
        "DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
        (user_id, endpoint)
    )
    deleted = cursor.rowcount > 0
    connection.commit()
    connection.close()
    return deleted


def send_push_notifications(user_ids, title, message, notification_type, url="/"):

    from push_service import send_push

    ensure_admin_notification_schema()
    connection = _connect()
    rows = connection.execute("""
        SELECT id, user_id, endpoint, p256dh, auth
        FROM push_subscriptions
        WHERE user_id IN ({})
    """.format(",".join("?" for _ in user_ids)), user_ids).fetchall() if user_ids else []
    connection.close()

    expired_ids = []
    for subscription_id, user_id, endpoint, p256dh, auth in rows:
        result = send_push(
            {"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            title,
            message,
            notification_type,
            url=url
        )
        if result == "expired":
            expired_ids.append(subscription_id)

    if expired_ids:
        connection = _connect()
        connection.executemany(
            "DELETE FROM push_subscriptions WHERE id = ?",
            [(subscription_id,) for subscription_id in expired_ids]
        )
        connection.commit()
        connection.close()


def get_notification_rules():

    ensure_admin_notification_schema()
    connection = _connect()
    rows = connection.execute("""
        SELECT notification_type, parent_enabled, teacher_enabled, channel,
               updated_by, updated_at
        FROM notification_rules
        ORDER BY notification_type
    """).fetchall()
    connection.close()

    return [
        {
            "notification_type": row[0],
            "parent_enabled": bool(row[1]),
            "teacher_enabled": bool(row[2]),
            "channel": row[3],
            "updated_by": row[4],
            "updated_at": row[5]
        }
        for row in rows
    ]


def update_notification_rule(notification_type, parent_enabled, teacher_enabled,
                             channel, updated_by):

    if notification_type not in STUDENT_NOTIFICATION_RULES:
        return False

    if channel != "in_app":
        return False

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()
    cursor.execute("""
        UPDATE notification_rules
        SET parent_enabled = ?, teacher_enabled = ?, channel = ?,
            updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE notification_type = ?
    """, (
        int(parent_enabled), int(teacher_enabled), channel, updated_by,
        notification_type
    ))
    changed = cursor.rowcount == 1
    connection.commit()
    connection.close()
    return changed


def get_student_notification_recipients(student_id, notification_type, subject=None):

    ensure_admin_notification_schema()
    connection = _connect()
    rule = connection.execute("""
        SELECT parent_enabled, teacher_enabled
        FROM notification_rules
        WHERE notification_type = ?
    """, (notification_type,)).fetchone()

    if rule is None:
        connection.close()
        return []

    parent_enabled, teacher_enabled = rule
    recipient_ids = []

    if parent_enabled:
        parent = connection.execute("""
            SELECT u.id
            FROM students s
            JOIN users u ON u.id = s.parent_id AND u.role = 'parent'
            WHERE s.id = ?
        """, (student_id,)).fetchone()
        if parent:
            recipient_ids.append(parent[0])

    if teacher_enabled:
        query = """
            SELECT DISTINCT tca.teacher_id
            FROM teacher_class_assignments tca
            JOIN users u ON u.id = tca.teacher_id AND u.role = 'teacher'
            JOIN students s ON s.class_level = tca.class_level
            WHERE s.id = ?
        """
        parameters = [student_id]
        if subject:
            query += " AND tca.subject = ?"
            parameters.append(subject)
        recipient_ids.extend(
            row[0] for row in connection.execute(query, parameters).fetchall()
        )

    connection.close()
    return list(dict.fromkeys(recipient_ids))


def notification_rule_enabled(notification_type, role):

    ensure_admin_notification_schema()
    connection = _connect()
    column = "parent_enabled" if role == "parent" else "teacher_enabled"
    if role not in {"parent", "teacher"}:
        connection.close()
        return False
    row = connection.execute(
        f"SELECT {column} FROM notification_rules WHERE notification_type = ?",
        (notification_type,)
    ).fetchone()
    connection.close()
    return True if row is None else bool(row[0])


def get_admin_notification_users():

    connection = _connect()
    rows = connection.execute("""
        SELECT u.id, u.name, u.email, u.role,
               COALESCE(GROUP_CONCAT(s.name, ', '), '')
        FROM users u
        LEFT JOIN students s ON s.parent_id = u.id
        WHERE u.role != 'student'
        GROUP BY u.id
        ORDER BY u.name
    """).fetchall()
    connection.close()

    return [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "role": row[3],
            "student_names": row[4]
        }
        for row in rows
    ]


def create_admin_notification(
    title,
    message,
    notification_type,
    recipient_scope,
    recipient_ids,
    priority,
    created_by,
    send_option="send_now",
    scheduled_at=None
):

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()

    status = "scheduled" if send_option == "schedule" else "sent"

    cursor.execute("""
        INSERT INTO admin_notifications
        (title, message, notification_type, priority, recipient_scope, created_by, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (title, message, notification_type, priority, recipient_scope, created_by, scheduled_at, status))

    notification_id = cursor.lastrowid

    if send_option == "schedule" and recipient_scope == "specific_users":
        for user_id in recipient_ids:
            cursor.execute("""
                INSERT INTO notification_recipients (notification_id, user_id)
                VALUES (?, ?)
            """, (notification_id, user_id))

    if send_option == "send_now":
        for user_id in recipient_ids:
            cursor.execute("""
                INSERT INTO notification_recipients (notification_id, user_id)
                VALUES (?, ?)
            """, (notification_id, user_id))

            cursor.execute("""
                INSERT INTO notifications
                (user_id, title, message, type, admin_notification_id, priority)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, title, message, notification_type, notification_id, priority))

    connection.commit()
    connection.close()
    if send_option == "send_now":
        send_push_notifications(recipient_ids, title, message, notification_type)

    return notification_id


def deliver_scheduled_admin_notifications():

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT id, title, message, notification_type, priority, recipient_scope
        FROM admin_notifications
        WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= CURRENT_TIMESTAMP
    """).fetchall()

    for notification_id, title, message, notification_type, priority, recipient_scope in rows:
        recipient_ids = []
        if recipient_scope == "specific_users":
            recipient_ids = [
                row[0] for row in cursor.execute("""
                    SELECT user_id
                    FROM notification_recipients
                    WHERE notification_id = ?
                """, (notification_id,)).fetchall()
            ]
        else:
            recipient_ids = [
                row[0] for row in cursor.execute("""
                    SELECT DISTINCT u.id
                    FROM users u
                    WHERE (? = 'all_authorized_users' AND u.role != 'student')
                       OR (? = 'all_parents' AND u.role = 'parent')
                       OR (? = 'all_teachers' AND u.role = 'teacher')
                """, (recipient_scope, recipient_scope, recipient_scope)).fetchall()
            ]

        if not recipient_ids:
            cursor.execute("UPDATE admin_notifications SET status = 'sent' WHERE id = ?", (notification_id,))
            continue

        for user_id in recipient_ids:
            cursor.execute("""
                INSERT OR IGNORE INTO notification_recipients (notification_id, user_id)
                VALUES (?, ?)
            """, (notification_id, user_id))

            cursor.execute("""
                INSERT OR IGNORE INTO notifications
                (user_id, title, message, type, admin_notification_id, priority)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, title, message, notification_type, notification_id, priority))

        send_push_notifications(recipient_ids, title, message, notification_type)

        cursor.execute("UPDATE admin_notifications SET status = 'sent' WHERE id = ?", (notification_id,))

    connection.commit()
    connection.close()


def get_admin_notifications(created_by):

    ensure_admin_notification_schema()
    connection = _connect()
    rows = connection.execute("""
        SELECT n.id, n.title, n.notification_type, n.recipient_scope,
               n.priority, n.created_at, n.status,
               COUNT(r.user_id),
               COALESCE(SUM(CASE WHEN r.is_read = 1 THEN 1 ELSE 0 END), 0)
        FROM admin_notifications n
        LEFT JOIN notification_recipients r ON r.notification_id = n.id
        WHERE n.created_by = ?
        GROUP BY n.id
        ORDER BY n.created_at DESC, n.id DESC
    """, (created_by,)).fetchall()
    connection.close()

    return rows


def get_admin_notification(notification_id, created_by):

    ensure_admin_notification_schema()
    connection = _connect()
    row = connection.execute("""
        SELECT n.id, n.title, n.message, n.notification_type,
               n.recipient_scope, n.priority, n.created_at, n.status,
               u.name, COUNT(r.user_id),
               COALESCE(SUM(CASE WHEN r.is_read = 1 THEN 1 ELSE 0 END), 0)
        FROM admin_notifications n
        JOIN users u ON u.id = n.created_by
        LEFT JOIN notification_recipients r ON r.notification_id = n.id
        WHERE n.id = ? AND n.created_by = ?
        GROUP BY n.id
    """, (notification_id, created_by)).fetchone()
    connection.close()

    if row is None:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "message": row[2],
        "type": row[3],
        "recipients": row[4],
        "priority": row[5],
        "created_at": row[6],
        "status": row[7],
        "sender": row[8],
        "recipient_count": row[9],
        "read_count": row[10],
        "unread_count": row[9] - row[10]
    }


def delete_admin_notification(notification_id, created_by):

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id FROM admin_notifications
        WHERE id = ? AND created_by = ?
    """, (notification_id, created_by))

    if cursor.fetchone() is None:
        connection.close()
        return False

    cursor.execute("""
        DELETE FROM notifications
        WHERE admin_notification_id = ?
    """, (notification_id,))
    cursor.execute("""
        DELETE FROM notification_recipients
        WHERE notification_id = ?
    """, (notification_id,))
    cursor.execute("""
        DELETE FROM admin_notifications
        WHERE id = ? AND created_by = ?
    """, (notification_id, created_by))

    connection.commit()
    connection.close()

    return True


# Check if a user exists
def user_exists(user_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()

    connection.close()

    return user is not None


# Find out which user a notification belongs to.
# Used to stop one user acting on another user's notifications.
def get_notification_owner(notification_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT user_id
        FROM notifications
        WHERE id = ?
    """, (notification_id,))

    result = cursor.fetchone()

    connection.close()

    if result is None:
        return None

    return result[0]


# Create a new notification
def create_notification(user_id, title, message, notification_type):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO notifications
        (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
    """, (user_id, title, message, notification_type))

    connection.commit()
    connection.close()

    send_push_notifications([user_id], title, message, notification_type)

    print("Notification created successfully!")


# Get all notifications for a user
def get_notifications(user_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
    """, (user_id,))

    notifications = cursor.fetchall()

    connection.close()

    return notifications


# Mark a notification as read
def mark_notification_as_read(notification_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    # Check if notification exists
    cursor.execute("""
        SELECT id
        FROM notifications
        WHERE id = ?
    """, (notification_id,))

    notification = cursor.fetchone()

    if notification is None:
        connection.close()
        return False

    # Mark notification as read
    cursor.execute("""
        UPDATE notifications
        SET is_read = 1
        WHERE id = ?
    """, (notification_id,))

    connection.commit()
    connection.close()

    print("Notification marked as read!")

    return True


def mark_notification_as_read_for_user(notification_id, user_id):

    ensure_admin_notification_schema()
    connection = _connect()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
    """, (notification_id, user_id))

    if cursor.rowcount == 0:
        connection.close()
        return False

    cursor.execute("""
        UPDATE notification_recipients
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE notification_id = (
            SELECT admin_notification_id
            FROM notifications
            WHERE id = ? AND user_id = ?
        ) AND user_id = ?
    """, (notification_id, user_id, user_id))

    connection.commit()
    connection.close()

    return True


# Get only unread notifications
def get_unread_notifications(user_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = ? AND is_read = 0
        ORDER BY created_at DESC, id DESC
    """, (user_id,))

    notifications = cursor.fetchall()

    connection.close()

    return notifications


# Get unread notification count
def get_unread_notification_count(user_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = ? AND is_read = 0
    """, (user_id,))

    count = cursor.fetchone()[0]

    connection.close()

    return count


# Delete a notification
def delete_notification(notification_id):

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    # Check if notification exists
    cursor.execute("""
        SELECT id
        FROM notifications
        WHERE id = ?
    """, (notification_id,))

    notification = cursor.fetchone()

    if notification is None:
        connection.close()
        return False

    # Delete notification
    cursor.execute("""
        DELETE FROM notifications
        WHERE id = ?
    """, (notification_id,))

    connection.commit()
    connection.close()

    print("Notification deleted successfully!")

    return True


def delete_all_notifications_for_user(user_id):
    """Remove every notification owned by a user in a single action."""

    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        DELETE FROM notifications
        WHERE user_id = ?
    """, (user_id,))

    connection.commit()
    connection.close()

    print(f"All notifications deleted for user {user_id}")
    return True


def notify_teachers_for_student(student_id, title, message, notification_type, subject=None):
    """
    Notify all teachers assigned to a student's class level.
    If subject is specified, only teachers teaching that subject are notified.
    Returns the number of notifications sent.
    """
    
    from student import get_teachers_for_student, get_student_name
    
    if not notification_rule_enabled(notification_type, "teacher"):
        return 0

    teachers = get_teachers_for_student(student_id, subject)
    
    if not teachers:
        return 0
    
    student_name = get_student_name(student_id)
    # Prepend student name to message for context
    full_message = f"{student_name}: {message}"
    
    sent_count = 0
    for teacher_id in teachers:
        create_notification(teacher_id, title, full_message, notification_type)
        sent_count += 1
    
    return sent_count