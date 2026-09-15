from admission import get_admission_history, record_admission
from app import app
from notification import _connect
from reports import admission_report


ADMIN_ID = 910
PARENT_ID = 911
OTHER_PARENT_ID = 912
STUDENT_ID = 913
OTHER_STUDENT_ID = 914


def setup_admission_data():

    connection = _connect()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM admissions WHERE student_id IN (?, ?)", (STUDENT_ID, OTHER_STUDENT_ID))

    for user_id, name, email, role in [
        (ADMIN_ID, "Admission Admin", "admission-admin@example.com", "admin"),
        (PARENT_ID, "Admission Parent", "admission-parent@example.com", "parent"),
        (OTHER_PARENT_ID, "Other Parent", "other-admission-parent@example.com", "parent"),
    ]:
        cursor.execute(
            """
            INSERT OR REPLACE INTO users (id, name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, name, email, "pass", role),
        )

    for student_id, name, parent_id in [
        (STUDENT_ID, "Admission Student", PARENT_ID),
        (OTHER_STUDENT_ID, "Other Admission Student", OTHER_PARENT_ID),
    ]:
        cursor.execute(
            """
            INSERT OR REPLACE INTO students (id, name, parent_id, class_level)
            VALUES (?, ?, ?, ?)
            """,
            (student_id, name, parent_id, 5),
        )

    connection.commit()
    connection.close()


def test_admission_report_reflects_recorded_status():
    setup_admission_data()
    record_admission(STUDENT_ID, "Under Review", "Documents pending")

    report = admission_report([STUDENT_ID])
    student = report["students"][0]

    assert student["status"] == "Under Review"
    assert student["notes"] == "Documents pending"
    assert report["summary"]["pending_review"] == 1


def test_admission_report_keeps_full_status_history():
    setup_admission_data()
    record_admission(STUDENT_ID, "Applied", None)
    record_admission(STUDENT_ID, "Under Review", "Documents pending")
    record_admission(STUDENT_ID, "Approved", None)

    report = admission_report([STUDENT_ID])
    student = report["students"][0]

    assert student["status"] == "Approved"
    assert [entry["status"] for entry in student["history"]] == [
        "Approved", "Under Review", "Applied"
    ]

    history = get_admission_history(STUDENT_ID)
    assert [entry["status"] for entry in history] == [
        "Approved", "Under Review", "Applied"
    ]


def test_admission_history_api_scopes_to_own_child():
    setup_admission_data()
    record_admission(STUDENT_ID, "Applied", None)
    record_admission(STUDENT_ID, "Approved", None)

    client = app.test_client()

    login = client.post(
        "/api/login",
        json={"email": "admission-parent@example.com", "password": "pass"},
    )
    assert login.status_code == 200

    response = client.get(f"/api/admissions/{STUDENT_ID}/history")
    assert response.status_code == 200
    assert [entry["status"] for entry in response.get_json()["history"]] == [
        "Approved", "Applied"
    ]

    forbidden = client.get(f"/api/admissions/{OTHER_STUDENT_ID}/history")
    assert forbidden.status_code == 403

    client.post("/api/logout")


def test_admission_report_marks_students_with_no_application():
    setup_admission_data()

    report = admission_report([STUDENT_ID])
    student = report["students"][0]

    assert student["status"] is None
    assert report["summary"]["pending_review"] == 0


def test_admission_report_api_scopes_to_own_child():
    setup_admission_data()
    record_admission(STUDENT_ID, "Approved", None)
    record_admission(OTHER_STUDENT_ID, "Rejected", None)

    client = app.test_client()

    login = client.post(
        "/api/login",
        json={"email": "admission-parent@example.com", "password": "pass"},
    )
    assert login.status_code == 200

    response = client.get("/api/reports/admissions")
    assert response.status_code == 200

    report = response.get_json()
    student_ids = [student["student_id"] for student in report["students"]]

    assert student_ids == [STUDENT_ID]

    client.post("/api/logout")


def test_admission_report_api_requires_capability_login():
    setup_admission_data()
    client = app.test_client()

    response = client.get("/api/reports/admissions")

    assert response.status_code == 401
