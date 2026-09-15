from app import app


client = app.test_client()

login_response = client.post(
    "/api/login",
    json={"email": "admin@example.com", "password": "admin123"}
)
assert login_response.status_code == 200, login_response.get_json()

admin = login_response.get_json()
required_capabilities = {
    "record_admissions",
    "record_events",
    "record_fees",
    "view_school_summary"
}
assert required_capabilities.issubset(set(admin["capabilities"]))

reports_response = client.get("/api/reports")
assert reports_response.status_code == 200
report_keys = {report["key"] for report in reports_response.get_json()["reports"]}
assert {"attendance", "grades", "assignments", "fees", "summary"}.issubset(report_keys)

summary_response = client.get("/api/reports/summary")
assert summary_response.status_code == 200
summary = summary_response.get_json()
assert {"students", "users_by_role", "notifications_by_type"}.issubset(summary)

client.post("/api/logout")
coordinator_login = client.post(
    "/api/login",
    json={
        "email": "primary.coordinator@example.com",
        "password": "primary123"
    }
)
assert coordinator_login.status_code == 200
coordinator = coordinator_login.get_json()
assert coordinator["role"] == "primary_coordinator"
coordinator_students = client.get("/api/students").get_json()["students"]
assert coordinator_students
assert all(1 <= student["class_level"] <= 5 for student in coordinator_students)
assert "record_grades" in coordinator["capabilities"]
assert "record_assignments" in coordinator["capabilities"]

invalid_date_response = client.get("/api/reports/attendance?date_from=invalid")
assert invalid_date_response.status_code == 400

client.post("/api/logout")
unauthorized_response = client.get("/api/reports")
assert unauthorized_response.status_code == 401

print("Smoke test passed")
