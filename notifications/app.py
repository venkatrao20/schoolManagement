import os

from datetime import date, datetime, timedelta

from flask import Flask, jsonify, request, render_template, redirect, url_for
from dotenv import load_dotenv

from notification import (
    user_exists,
    get_notifications,
    get_notification_owner,
    mark_notification_as_read,
    mark_notification_as_read_for_user,
    create_notification,
    get_unread_notifications,
    get_unread_notification_count,
    delete_notification,
    delete_all_notifications_for_user,
    ADMIN_NOTIFICATION_TYPES,
    NOTIFICATION_PRIORITIES,
    ensure_admin_notification_schema,
    get_admin_notification_users,
    save_push_subscription,
    delete_push_subscription,
    get_notification_rules,
    update_notification_rule,
    create_admin_notification,
    get_admin_notifications,
    get_admin_notification,
    delete_admin_notification
)

from auth import (
    login_user,
    logout_user,
    current_user,
    role_can,
    capabilities_for_role,
    accessible_student_ids,
    login_required,
    capability_required
)

from reports import (
    attendance_report,
    grade_report,
    fee_report,
    assignment_report,
    admission_report,
    school_summary
)

from reminders import run_all_reminders

from attendance import (
    record_attendance,
    get_attendance_for_date,
    VALID_STATUSES
)

from transportation import (
    ensure_transportation_schema,
    get_transportation_for_date,
    record_transportation,
    VALID_TRANSPORT_STATUSES
)

from grade import record_grade

from assignment import create_assignment, update_assignment, get_assignment_student_id

from admission import (
    ensure_admissions_schema,
    record_admission,
    get_admission_history,
    VALID_ADMISSION_STATUSES
)

from event import create_event
from fee import create_fee

from student import get_student, get_parent_id, ensure_class_level_schema, ensure_teacher_class_schema


load_dotenv()

app = Flask(__name__)

# Sessions need a signing key. Set SECRET_KEY in the environment for anything
# other than local development.
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=90)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True

ensure_admin_notification_schema()
ensure_transportation_schema()
ensure_admissions_schema()
ensure_class_level_schema()
ensure_teacher_class_schema()


# ---------------------------------------------------------------- helpers


# Turn notification rows into JSON friendly dictionaries
def build_notification_list(notifications):

    notification_list = []

    for notification in notifications:

        notification_data = {
            "id": notification[0],
            "title": notification[1],
            "message": notification[2],
            "type": notification[3],
            "is_read": notification[4],
            "created_at": notification[5]
        }

        notification_list.append(notification_data)

    return notification_list


# Decide whether the logged in user may read another user's notifications.
# Everyone can read their own. Admins can read anyone's.
def can_view_notifications_of(user, target_user_id):

    if user["id"] == target_user_id:
        return True

    return role_can(user["role"], "view_all_notifications")


# Work out which students a report should cover.
# A caller may narrow it with ?student_id=, but never widen it.
def resolve_report_students(user):

    allowed = accessible_student_ids(user)

    requested = request.args.get("student_id")

    if requested is None:
        return allowed, None

    try:
        requested_id = int(requested)
    except ValueError:
        return None, ("Invalid student_id", 400)

    if requested_id not in allowed:
        return None, ("You cannot view reports for this student", 403)

    return [requested_id], None


def resolve_report_dates():

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    if date_from and not valid_date(date_from):
        return None, None, ("Invalid date_from", 400)

    if date_to and not valid_date(date_to):
        return None, None, ("Invalid date_to", 400)

    if date_from and date_to and date_from > date_to:
        return None, None, ("date_from must be before or equal to date_to", 400)

    return date_from, date_to, None


# ---------------------------------------------------------------- pages


@app.route("/")
def home():

    # Send anyone who is not logged in to the login screen
    if current_user() is None:
        return redirect(url_for("login_page", redirect=request.full_path if request.query_string else None))

    return render_template("index.html")


@app.route("/login")
def login_page():

    if current_user() is not None:
        target = request.args.get("redirect") or request.args.get("next") or url_for("home")
        return redirect(target)

    return render_template("login.html")


# ---------------------------------------------------------------- auth API


@app.route("/api/login", methods=["POST"])
def api_login():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    user = login_user(email, password)

    if user is None:
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    user["capabilities"] = capabilities_for_role(user["role"])

    return jsonify(user)


@app.route("/api/logout", methods=["POST"])
def api_logout():

    logout_user()

    return jsonify({
        "message": "Logged out"
    })


# Who am I, and what am I allowed to see?
@app.route("/api/me", methods=["GET"])
@login_required
def api_me():

    user = current_user()

    user["capabilities"] = capabilities_for_role(user["role"])
    user["student_ids"] = accessible_student_ids(user)

    return jsonify(user)


@app.route("/service-worker.js")
def service_worker():
    return app.send_static_file("service-worker.js")


@app.route("/api/push/public-key", methods=["GET"])
@login_required
def push_public_key_api():
    public_key = os.environ.get("VAPID_PUBLIC_KEY")
    if not public_key:
        return jsonify({"error": "Push notifications are not configured"}), 503
    return jsonify({"public_key": public_key})


@app.route("/api/push/subscribe", methods=["POST"])
@login_required
def push_subscribe_api():
    data = request.get_json()
    origin = request.host_url.rstrip("/")
    if not isinstance(data, dict) or not save_push_subscription(current_user()["id"], data, origin):
        return jsonify({"error": "A valid push subscription is required"}), 400
    return jsonify({"message": "Push notifications enabled"}), 201


@app.route("/api/push/subscribe", methods=["DELETE"])
@login_required
def push_unsubscribe_api():
    data = request.get_json()
    endpoint = data.get("endpoint") if isinstance(data, dict) else None
    if not endpoint:
        return jsonify({"error": "Subscription endpoint is required"}), 400
    delete_push_subscription(current_user()["id"], endpoint)
    return jsonify({"message": "Push notifications disabled"})


# ---------------------------------------------------------------- notifications


def admin_recipient_ids(scope, requested_ids):

    connection = __import__("sqlite3").connect("school.db")
    cursor = connection.cursor()

    if scope == "all_authorized_users":
        cursor.execute("SELECT id FROM users WHERE role != 'student'")
    elif scope == "all_parents":
        cursor.execute("SELECT id FROM users WHERE role = 'parent'")
    elif scope == "all_teachers":
        cursor.execute("SELECT id FROM users WHERE role = 'teacher'")
    elif scope == "specific_users":
        placeholders = ",".join("?" for _ in requested_ids)
        cursor.execute(
            "SELECT id FROM users WHERE role != 'student' AND id IN (" + placeholders + ")",
            requested_ids
        )
    else:
        connection.close()
        return None

    ids = [row[0] for row in cursor.fetchall()]
    connection.close()

    if scope == "specific_users" and len(ids) != len(set(requested_ids)):
        return None

    return ids


@app.route("/api/admin/notifications/users", methods=["GET"])
@capability_required("manage_notifications")
def admin_notification_users_api():
    return jsonify({"users": get_admin_notification_users()})


@app.route("/api/admin/notification-rules", methods=["GET"])
@capability_required("manage_notifications")
def notification_rules_api():
    return jsonify({"rules": get_notification_rules()})


@app.route("/api/admin/notification-rules/<notification_type>", methods=["PUT"])
@capability_required("manage_notifications")
def update_notification_rule_api(notification_type):

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    parent_enabled = data.get("parent_enabled")
    teacher_enabled = data.get("teacher_enabled")
    channel = data.get("channel", "in_app")

    if not isinstance(parent_enabled, bool) or not isinstance(teacher_enabled, bool):
        return jsonify({"error": "parent_enabled and teacher_enabled must be boolean"}), 400

    if channel != "in_app":
        return jsonify({"error": "Only the in-app channel is available"}), 400

    user = current_user()
    if not update_notification_rule(
        notification_type,
        parent_enabled,
        teacher_enabled,
        channel,
        user["id"]
    ):
        return jsonify({"error": "Unknown notification type"}), 404

    return jsonify({"message": "Notification rule updated"})


@app.route("/api/admin/notifications", methods=["GET"])
@capability_required("manage_notifications")
def admin_notifications_api():

    user = current_user()
    rows = get_admin_notifications(user["id"])

    return jsonify({
        "total": len(rows),
        "notifications": [
            {
                "id": row[0],
                "title": row[1],
                "type": row[2],
                "recipients": row[3],
                "priority": row[4],
                "created_at": row[5],
                "status": row[6],
                "recipient_count": row[7],
                "read_count": row[8],
                "unread_count": row[7] - row[8]
            }
            for row in rows
        ]
    })


@app.route("/api/admin/notifications/<int:notification_id>", methods=["GET"])
@capability_required("manage_notifications")
def admin_notification_details_api(notification_id):

    user = current_user()
    notification = get_admin_notification(notification_id, user["id"])

    if notification is None:
        return jsonify({"error": "Notification not found"}), 404

    return jsonify(notification)


@app.route("/api/admin/notifications", methods=["POST"])
@capability_required("manage_notifications")
def create_admin_notification_api():

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    title = data.get("title")
    message = data.get("message")
    notification_type = data.get("notification_type")
    recipient_scope = data.get("recipient_scope")
    priority = data.get("priority", "normal")
    send_option = data.get("send_option", "send_now")
    scheduled_at = data.get("scheduled_at")
    requested_ids = data.get("user_ids", [])

    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "Notification title is required"}), 400

    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "Notification message is required"}), 400

    if notification_type not in ADMIN_NOTIFICATION_TYPES:
        return jsonify({"error": "Invalid notification type"}), 400

    if priority not in NOTIFICATION_PRIORITIES:
        return jsonify({"error": "Invalid notification priority"}), 400

    if send_option not in {"send_now", "schedule"}:
        return jsonify({"error": "Choose a valid send option"}), 400

    if send_option == "schedule":
        if not isinstance(scheduled_at, str) or not scheduled_at.strip():
            return jsonify({"error": "Scheduled date and time are required"}), 400
        try:
            scheduled_dt = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
            scheduled_at = scheduled_dt.isoformat()
        except ValueError:
            return jsonify({"error": "Use a valid ISO date/time for scheduling"}), 400

    if recipient_scope not in {
        "all_authorized_users", "all_parents", "all_teachers",
        "specific_users"
    }:
        return jsonify({"error": "Choose a recipient group"}), 400

    if not isinstance(requested_ids, list):
        return jsonify({"error": "Specific users must be a list"}), 400

    try:
        requested_ids = list(dict.fromkeys(int(user_id) for user_id in requested_ids))
    except (TypeError, ValueError):
        return jsonify({"error": "Specific user IDs must be numbers"}), 400

    if recipient_scope == "specific_users" and not requested_ids:
        return jsonify({"error": "Choose at least one specific user"}), 400

    recipient_ids = admin_recipient_ids(recipient_scope, requested_ids)

    if recipient_ids is None or not recipient_ids:
        return jsonify({"error": "No valid recipients were found"}), 400

    user = current_user()
    notification_id = create_admin_notification(
        title.strip(),
        message.strip(),
        notification_type,
        recipient_scope,
        recipient_ids,
        priority,
        user["id"],
        send_option,
        scheduled_at if send_option == "schedule" else None
    )

    action = "scheduled successfully" if send_option == "schedule" else "sent successfully"

    return jsonify({
        "message": f"Notification {action}",
        "id": notification_id,
        "recipient_count": len(recipient_ids),
        "send_option": send_option,
        "scheduled_at": scheduled_at if send_option == "schedule" else None
    }), 201


@app.route("/api/admin/notifications/<int:notification_id>", methods=["DELETE"])
@capability_required("manage_notifications")
def delete_admin_notification_api(notification_id):

    user = current_user()

    if not delete_admin_notification(notification_id, user["id"]):
        return jsonify({"error": "Notification not found"}), 404

    return jsonify({"message": "Notification deleted successfully"})


# Get all notifications for a user
@app.route("/notifications/<int:user_id>", methods=["GET"])
@login_required
def get_user_notifications(user_id):

    user = current_user()

    if not can_view_notifications_of(user, user_id):
        return jsonify({
            "error": "Unauthorized access"
        }), 403

    notifications = get_notifications(user_id)

    return jsonify(build_notification_list(notifications))


# Get unread notifications
@app.route("/notifications/<int:user_id>/unread", methods=["GET"])
@login_required
def get_unread(user_id):

    user = current_user()

    if not can_view_notifications_of(user, user_id):
        return jsonify({
            "error": "Unauthorized access"
        }), 403

    notifications = get_unread_notifications(user_id)

    return jsonify(build_notification_list(notifications))


# Get unread notification count
@app.route("/notifications/<int:user_id>/unread/count", methods=["GET"])
@login_required
def get_unread_count(user_id):

    user = current_user()

    if not can_view_notifications_of(user, user_id):
        return jsonify({
            "error": "Unauthorized access"
        }), 403

    count = get_unread_notification_count(user_id)

    return jsonify({
        "unread_count": count
    })


# Mark notification as read
@app.route("/notifications/<int:notification_id>/read", methods=["PUT"])
@login_required
def mark_as_read(notification_id):

    user = current_user()

    owner_id = get_notification_owner(notification_id)

    if owner_id is None:
        return jsonify({
            "error": "Notification not found"
        }), 404

    if not can_view_notifications_of(user, owner_id):
        return jsonify({
            "error": "Unauthorized access"
        }), 403

    mark_notification_as_read_for_user(notification_id, user["id"])

    return jsonify({
        "message": "Notification marked as read"
    })


# Create a new notification
@app.route("/notifications", methods=["POST"])
@capability_required("manage_notifications")
def create_new_notification():

    data = request.get_json()

    # Check if request body exists
    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # Check required fields
    required_fields = [
        "user_id",
        "title",
        "message",
        "type"
    ]

    for field in required_fields:

        if field not in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400

    user_id = data["user_id"]
    title = data["title"]
    message = data["message"]
    notification_type = data["type"]

    user = current_user()

    # Only admins can send notifications to other people
    if user_id != user["id"] and not role_can(user["role"], "view_all_notifications"):
        return jsonify({
            "error": "You can only create notifications for yourself"
        }), 403

    # Check if user exists
    if not user_exists(user_id):
        return jsonify({
            "error": "User not found"
        }), 404

    create_notification(
        user_id,
        title,
        message,
        notification_type
    )

    return jsonify({
        "message": "Notification created successfully"
    }), 201


# Delete notification
@app.route("/notifications/<int:notification_id>", methods=["DELETE"])
@login_required
def delete_notification_api(notification_id):

    user = current_user()

    owner_id = get_notification_owner(notification_id)

    if owner_id is None:
        return jsonify({
            "error": "Notification not found"
        }), 404

    if not can_view_notifications_of(user, owner_id):
        return jsonify({
            "error": "Unauthorized access"
        }), 403

    delete_notification(notification_id)

    return jsonify({
        "message": "Notification deleted successfully"
    })


# Delete all notifications for the current user
@app.route("/notifications", methods=["DELETE"])
@login_required
def delete_all_notifications_api():

    user = current_user()
    delete_all_notifications_for_user(user["id"])

    return jsonify({
        "message": "All notifications deleted successfully"
    })


# ---------------------------------------------------------------- reports


# Which reports may the logged in user open?
@app.route("/api/reports", methods=["GET"])
@login_required
def list_reports():

    user = current_user()

    catalogue = [
        {
            "key": "attendance",
            "name": "Attendance Report",
            "capability": "view_attendance_report"
        },
        {
            "key": "grades",
            "name": "Grade Report",
            "capability": "view_grade_report"
        },
        {
            "key": "assignments",
            "name": "Assignment Report",
            "capability": "view_assignment_report"
        },
        {
            "key": "fees",
            "name": "Fee Report",
            "capability": "view_fee_report"
        },
        {
            "key": "admissions",
            "name": "Admission Report",
            "capability": "view_admission_report"
        },
        {
            "key": "summary",
            "name": "School Summary",
            "capability": "view_school_summary"
        }
    ]

    available = [
        report for report in catalogue
        if role_can(user["role"], report["capability"])
    ]

    return jsonify({
        "role": user["role"],
        "scope": "all_students" if role_can(user["role"], "view_all_students") else "own_children",
        "reports": available
    })


# Run one of the student based reports
def run_student_report(report_function):

    user = current_user()

    student_ids, error = resolve_report_students(user)

    if error is not None:
        message, status = error
        return jsonify({"error": message}), status

    date_from, date_to, date_error = resolve_report_dates()

    if date_error is not None:
        message, status = date_error
        return jsonify({"error": message}), status

    report = report_function(student_ids, date_from, date_to)

    report["role"] = user["role"]
    report["generated_for"] = user["name"]

    return jsonify(report)


@app.route("/api/reports/attendance", methods=["GET"])
@capability_required("view_attendance_report")
def attendance_report_api():
    return run_student_report(attendance_report)


@app.route("/api/reports/grades", methods=["GET"])
@capability_required("view_grade_report")
def grade_report_api():
    return run_student_report(grade_report)


@app.route("/api/reports/assignments", methods=["GET"])
@capability_required("view_assignment_report")
def assignment_report_api():
    return run_student_report(assignment_report)


@app.route("/api/reports/fees", methods=["GET"])
@capability_required("view_fee_report")
def fee_report_api():
    return run_student_report(fee_report)


@app.route("/api/reports/admissions", methods=["GET"])
@capability_required("view_admission_report")
def admission_report_api():
    return run_student_report(admission_report)


@app.route("/api/reports/summary", methods=["GET"])
@capability_required("view_school_summary")
def school_summary_api():
    return jsonify(school_summary())


# ---------------------------------------------------------------- class work


# Reject anything that is not a YYYY-MM-DD date
def valid_date(value):

    if not isinstance(value, str):
        return False

    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


# The students the logged in user is allowed to work with
@app.route("/api/students", methods=["GET"])
@login_required
def list_students():

    user = current_user()

    students = []

    for student_id in accessible_student_ids(user):

        student = get_student(student_id)

        if student is None:
            continue

        students.append({
            "id": student["id"],
            "name": student["name"],
            "class_level": student["class_level"],
            "has_parent": student["parent_id"] is not None,
            "parent_name": student["parent_name"],
            "parent_email": student["parent_email"]
        })

    return jsonify({
        "students": students,
        "scope": "all_students" if role_can(user["role"], "view_all_students") else "own_children"
    })


# What is already marked for a given date, so the teacher sees the current
# state of the register rather than a blank form
@app.route("/api/attendance", methods=["GET"])
@capability_required("record_attendance")
def get_attendance():

    user = current_user()

    attendance_date = request.args.get("date")

    if not valid_date(attendance_date):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    student_ids = accessible_student_ids(user)

    marked = get_attendance_for_date(student_ids, attendance_date)

    return jsonify({
        "date": attendance_date,
        "attendance": {str(key): value for key, value in marked.items()}
    })


# Save the register for one date.
#
# Takes the whole class at once, because that is how a teacher actually
# marks attendance. Marking a student absent notifies their parent.
@app.route("/api/attendance", methods=["POST"])
@capability_required("record_attendance")
def save_attendance():

    user = current_user()

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    attendance_date = data.get("date")

    if not valid_date(attendance_date):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    records = data.get("records")

    if not isinstance(records, list) or len(records) == 0:
        return jsonify({
            "error": "records must be a non-empty list"
        }), 400

    allowed = accessible_student_ids(user)

    # Validate everything before writing anything, so a bad row cannot
    # leave the register half saved
    for record in records:

        if not isinstance(record, dict):
            return jsonify({"error": "Each record must be an object"}), 400

        student_id = record.get("student_id")
        status = record.get("status")

        if student_id not in allowed:
            return jsonify({
                "error": f"You cannot record attendance for student {student_id}"
            }), 403

        if status not in VALID_STATUSES:
            return jsonify({
                "error": f"Status must be one of {VALID_STATUSES}"
            }), 400

    results = []
    notifications_sent = 0
    changed_count = 0

    for record in records:

        result = record_attendance(
            record["student_id"],
            attendance_date,
            record["status"]
        )

        notifications_sent = notifications_sent + result["notifications_sent"]

        if result["changed"]:
            changed_count = changed_count + 1

        results.append(result)

    return jsonify({
        "date": attendance_date,
        "saved": len(results),
        "changed": changed_count,
        "notifications_sent": notifications_sent,
        "results": results
    })


@app.route("/api/transportation", methods=["GET"])
@capability_required("record_transportation")
def get_transportation():

    user = current_user()
    transport_date = request.args.get("date")

    if not valid_date(transport_date):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    marked = get_transportation_for_date(
        accessible_student_ids(user),
        transport_date
    )

    return jsonify({
        "date": transport_date,
        "transportation": {str(key): value for key, value in marked.items()},
        "statuses": VALID_TRANSPORT_STATUSES
    })


@app.route("/api/my-transportation", methods=["GET"])
@login_required
def get_my_transportation():

    user = current_user()
    transport_date = request.args.get("date")

    if not valid_date(transport_date):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    child_ids = accessible_student_ids(user)
    marked = get_transportation_for_date(child_ids, transport_date)
    children = []

    for child_id in child_ids:
        student = get_student(child_id)
        status = marked.get(child_id)
        children.append({
            "student_id": child_id,
            "student_name": student["name"],
            "status": status["status"] if status else "Not Recorded",
            "route": status["route"] if status else None,
            "destination": status["destination"] if status else None,
            "updated_at": status["updated_at"] if status else None
        })

    return jsonify({
        "date": transport_date,
        "children": children
    })


@app.route("/api/transportation", methods=["POST"])
@capability_required("record_transportation")
def save_transportation():

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    transport_date = data.get("date")

    if not valid_date(transport_date):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    records = data.get("records")

    if not isinstance(records, list) or not records:
        return jsonify({"error": "records must be a non-empty list"}), 400

    allowed = accessible_student_ids(user)
    seen_student_ids = set()

    for record in records:
        if not isinstance(record, dict):
            return jsonify({"error": "Each record must be an object"}), 400

        if record.get("student_id") not in allowed:
            return jsonify({
                "error": f"You cannot record transportation for student {record.get('student_id')}"
            }), 403

        if record["student_id"] in seen_student_ids:
            return jsonify({
                "error": "Each student may appear only once in the transport register"
            }), 400

        seen_student_ids.add(record["student_id"])

        if record.get("status") not in VALID_TRANSPORT_STATUSES:
            return jsonify({
                "error": f"Status must be one of {VALID_TRANSPORT_STATUSES}"
            }), 400

    results = []
    notifications_sent = 0

    for record in records:
        result = record_transportation(
            record["student_id"],
            transport_date,
            record["status"],
            str(record.get("route", "")).strip() or None,
            str(record.get("destination", "")).strip() or None
        )
        results.append(result)
        notifications_sent += result["notifications_sent"]

    return jsonify({
        "date": transport_date,
        "saved": len(results),
        "notifications_sent": notifications_sent,
        "results": results
    })


# Add or correct marks for one student. The parent is notified either way.
@app.route("/api/grades", methods=["POST"])
@capability_required("record_grades")
def save_grade():

    user = current_user()

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    required_fields = ["student_id", "subject", "marks", "total_marks", "date"]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"{field} is required"
            }), 400

    student_id = data["student_id"]

    if student_id not in accessible_student_ids(user):
        return jsonify({
            "error": f"You cannot record marks for student {student_id}"
        }), 403

    subject = str(data["subject"]).strip()

    if not subject:
        return jsonify({
            "error": "Subject cannot be empty"
        }), 400

    if not valid_date(data["date"]):
        return jsonify({
            "error": "A valid date (YYYY-MM-DD) is required"
        }), 400

    try:
        marks = float(data["marks"])
        total_marks = float(data["total_marks"])
    except (TypeError, ValueError):
        return jsonify({
            "error": "Marks and total marks must be numbers"
        }), 400

    # record_grade raises on out of range values, so turn that into a 400
    try:
        result = record_grade(
            student_id,
            subject,
            marks,
            total_marks,
            data["date"]
        )
    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 400

    return jsonify(result), 201


@app.route("/api/assignments", methods=["POST"])
@capability_required("record_assignments")
def create_assignment_api():

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    required_fields = ["student_id", "subject", "title", "due_date"]

    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    student_id = data["student_id"]

    if student_id not in accessible_student_ids(user):
        return jsonify({"error": f"You cannot create an assignment for student {student_id}"}), 403

    subject = str(data["subject"]).strip()
    title = str(data["title"]).strip()
    description = str(data.get("description", "")).strip() or None
    due_date = data["due_date"]

    if not subject or not title:
        return jsonify({"error": "Subject and title cannot be empty"}), 400

    if not valid_date(due_date):
        return jsonify({"error": "A valid due date (YYYY-MM-DD) is required"}), 400

    result = create_assignment(student_id, subject, title, description, due_date)
    return jsonify(result), 201


@app.route("/api/assignments/<int:assignment_id>", methods=["PUT"])
@capability_required("record_assignments")
def edit_assignment_api(assignment_id):

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    required_fields = ["subject", "title", "due_date"]

    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    subject = str(data["subject"]).strip()
    title = str(data["title"]).strip()
    description = str(data.get("description", "")).strip() or None
    due_date = data["due_date"]

    if not subject or not title:
        return jsonify({"error": "Subject and title cannot be empty"}), 400

    if not valid_date(due_date):
        return jsonify({"error": "A valid due date (YYYY-MM-DD) is required"}), 400

    assignment_student_id = get_assignment_student_id(assignment_id)

    if assignment_student_id is None:
        return jsonify({"error": "Assignment not found"}), 404

    if assignment_student_id not in accessible_student_ids(user):
        return jsonify({"error": "You cannot edit this assignment"}), 403

    result = update_assignment(assignment_id, subject, title, description, due_date)

    if result is None:
        return jsonify({"error": "Assignment not found"}), 404

    return jsonify(result)


@app.route("/api/admissions", methods=["POST"])
@capability_required("record_admissions")
def save_admission():

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    student_id = data.get("student_id")
    status = data.get("status")
    notes = str(data.get("notes", "")).strip() or None

    if student_id not in accessible_student_ids(user):
        return jsonify({"error": f"You cannot update admission for student {student_id}"}), 403

    if status not in VALID_ADMISSION_STATUSES:
        return jsonify({"error": f"Status must be one of {VALID_ADMISSION_STATUSES}"}), 400

    try:
        result = record_admission(student_id, status, notes)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify(result), 201


@app.route("/api/admissions/<int:student_id>/history", methods=["GET"])
@capability_required("view_admission_report")
def admission_history(student_id):

    user = current_user()

    if student_id not in accessible_student_ids(user):
        return jsonify({"error": f"You cannot view admission history for student {student_id}"}), 403

    return jsonify({
        "student_id": student_id,
        "history": get_admission_history(student_id)
    })


@app.route("/api/events", methods=["POST"])
@capability_required("record_events")
def save_event():

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    student_id = data.get("student_id")
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip() or None
    event_date = data.get("event_date")
    location = str(data.get("location", "")).strip() or None

    if student_id not in accessible_student_ids(user):
        return jsonify({"error": f"You cannot create an event for student {student_id}"}), 403

    if not title or not valid_date(event_date) or not location:
        return jsonify({"error": "Title, event date, and location are required"}), 400

    create_event(student_id, title, description, event_date, location)
    return jsonify({
        "student_id": student_id,
        "title": title,
        "event_date": event_date,
        "location": location,
        "notifications_sent": 1 if get_parent_id(student_id) else 0
    }), 201


@app.route("/api/fees", methods=["POST"])
@capability_required("record_fees")
def save_fee():

    user = current_user()
    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({"error": "Request body is required"}), 400

    student_id = data.get("student_id")
    fee_type = str(data.get("fee_type", "")).strip()
    due_date = data.get("due_date")
    status = str(data.get("status", "")).strip()

    if student_id not in accessible_student_ids(user):
        return jsonify({"error": f"You cannot create a fee for student {student_id}"}), 403

    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a number"}), 400

    if not fee_type or amount < 0 or not valid_date(due_date) or status not in {"Pending", "Paid"}:
        return jsonify({"error": "Fee type, non-negative amount, valid due date, and status are required"}), 400

    create_fee(student_id, fee_type, amount, due_date, status)
    return jsonify({
        "student_id": student_id,
        "fee_type": fee_type,
        "amount": amount,
        "due_date": due_date,
        "status": status,
        "notifications_sent": 1 if status == "Pending" and get_parent_id(student_id) else 0
    }), 201


# ---------------------------------------------------------------- reminders


# Run the scheduled reminder jobs on demand.
#
# Normally cron runs reminders.py once a day. This endpoint is here so an
# admin can trigger it from the interface without waiting, and it is safe
# to call repeatedly because the jobs skip anything already sent.
@app.route("/api/reminders/run", methods=["POST"])
@capability_required("run_reminders")
def run_reminders_api():

    results = run_all_reminders()

    return jsonify(results)


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in {"1", "true", "yes"}
    port = int(os.environ.get("PORT", "5001"))
    app.run(debug=debug, host="0.0.0.0", port=port)
