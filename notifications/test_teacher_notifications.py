"""
Test teacher notifications for role-based notification delivery.
Tests that teachers receive notifications only for events relevant to their assigned classes.
"""

import sqlite3
from datetime import date

from student import (
    ensure_class_level_schema,
    ensure_teacher_class_schema,
    assign_teacher_to_class,
    get_teachers_for_student,
    get_student
)
from notification import (
    create_notification,
    notify_teachers_for_student,
    get_notifications,
    delete_all_notifications_for_user,
    _connect
)
from grade import record_grade
from assignment import create_assignment
from attendance import record_attendance
from event import create_event


def setup_test_data():
    """Set up test database with teachers, students, and class assignments"""
    
    # Ensure schemas exist first
    ensure_class_level_schema()
    ensure_teacher_class_schema()
    
    connection = _connect()
    cursor = connection.cursor()
    
    # Clear test data
    cursor.execute("DELETE FROM notifications")
    cursor.execute("DELETE FROM teacher_class_assignments")
    cursor.execute("DELETE FROM grades")
    cursor.execute("DELETE FROM assignments")
    cursor.execute("DELETE FROM attendance")
    cursor.execute("DELETE FROM events")
    
    # Create test users: teachers
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, name, email, password, role)
        VALUES (?, ?, ?, ?, ?)
    """, (100, "Math Teacher", "math@example.com", "pass", "teacher"))
    
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, name, email, password, role)
        VALUES (?, ?, ?, ?, ?)
    """, (101, "English Teacher", "english@example.com", "pass", "teacher"))
    
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, name, email, password, role)
        VALUES (?, ?, ?, ?, ?)
    """, (102, "Science Teacher", "science@example.com", "pass", "teacher"))
    
    # Create test students
    cursor.execute("""
        INSERT OR REPLACE INTO students (id, name, parent_id, class_level)
        VALUES (?, ?, ?, ?)
    """, (200, "Student One", None, 3))
    
    cursor.execute("""
        INSERT OR REPLACE INTO students (id, name, parent_id, class_level)
        VALUES (?, ?, ?, ?)
    """, (201, "Student Two", None, 7))
    
    connection.commit()
    connection.close()
    
    # Assign teachers to class levels
    assign_teacher_to_class(100, 3, "Math")      # Math Teacher teaches Math in class 3
    assign_teacher_to_class(101, 3, "English")   # English Teacher teaches English in class 3
    assign_teacher_to_class(102, 7, "Science")   # Science Teacher teaches Science in class 7
    
    print("✓ Test data setup complete")


def test_teacher_assignment():
    """Test that teachers are correctly assigned to class levels"""
    
    setup_test_data()
    
    # Test getting teachers for student in class 3
    teachers_for_student_1 = get_teachers_for_student(200)
    assert 100 in teachers_for_student_1, "Math teacher should be assigned to class 3"
    assert 101 in teachers_for_student_1, "English teacher should be assigned to class 3"
    assert 102 not in teachers_for_student_1, "Science teacher should NOT be in class 3"
    
    # Test subject-specific teacher assignment
    math_teachers = get_teachers_for_student(200, "Math")
    assert 100 in math_teachers, "Math teacher should teach Math in class 3"
    assert 101 not in math_teachers, "English teacher should not teach Math"
    
    print("✓ Teacher assignment test passed")


def test_delete_all_notifications_for_user():
    """Test deleting all notifications for a user in one action."""

    setup_test_data()

    create_notification(100, "Alert 1", "First message", "attendance")
    create_notification(100, "Alert 2", "Second message", "grade")
    create_notification(101, "Other user", "Should remain", "assignment")

    assert len(get_notifications(100)) == 2, "User should have two notifications before deletion"

    deleted = delete_all_notifications_for_user(100)

    assert deleted is True, "Bulk delete should succeed when notifications exist"
    assert get_notifications(100) == [], "All notifications for the user should be removed"
    assert len(get_notifications(101)) == 1, "Other users' notifications should remain untouched"

    print("✓ Bulk delete test passed")


def test_grade_notification_to_teachers():
    """Test that teachers are notified when grades are recorded"""
    
    setup_test_data()
    
    # Record a grade for student in class 3
    result = record_grade(200, "Math", 85, 100, date.today().isoformat())
    
    # Check that teachers were notified
    math_teacher_notifs = get_notifications(100)  # Math teacher
    english_teacher_notifs = get_notifications(101)  # English teacher
    science_teacher_notifs = get_notifications(102)  # Science teacher (should be 0)
    
    assert len(math_teacher_notifs) > 0, "Math teacher should receive grade notification"
    assert math_teacher_notifs[0][1] == "Grade Recorded", "Notification title should be 'Grade Recorded'"
    
    assert len(english_teacher_notifs) == 0, "English teacher should NOT receive Math grade notification"
    assert len(science_teacher_notifs) == 0, "Science teacher (different class) should NOT receive notification"
    
    print("✓ Grade notification to teachers test passed")


def test_assignment_notification_to_teachers():
    """Test that teachers are notified when assignments are created"""
    
    setup_test_data()
    
    # Create an assignment for student in class 3
    result = create_assignment(200, "English", "Essay", "Write an essay", date.today().isoformat())
    
    # Check that English teacher was notified
    english_teacher_notifs = get_notifications(101)
    math_teacher_notifs = get_notifications(100)
    
    assert len(english_teacher_notifs) > 0, "English teacher should receive assignment notification"
    assert english_teacher_notifs[0][1] == "Assignment Created", "Should have 'Assignment Created' title"
    
    # Math teacher should NOT be notified about English assignment
    assert len(math_teacher_notifs) == 0, "Math teacher should NOT receive English assignment notification"
    
    print("✓ Assignment notification to teachers test passed")


def test_attendance_notification_to_teachers():
    """Test that teachers are notified about student absences"""
    
    setup_test_data()
    
    # Record absence for student in class 3
    result = record_attendance(200, date.today().isoformat(), "Absent")
    print(f"  Attendance result: {result}")
    
    # Check that teachers were notified
    math_teacher_notifs = get_notifications(100)
    english_teacher_notifs = get_notifications(101)
    science_teacher_notifs = get_notifications(102)
    
    print(f"  Math teacher notifications: {len(math_teacher_notifs)}")
    print(f"  English teacher notifications: {len(english_teacher_notifs)}")
    print(f"  Science teacher notifications: {len(science_teacher_notifs)}")
    
    if len(math_teacher_notifs) > 0:
        print(f"  First notification: {math_teacher_notifs[0]}")
    
    assert len(math_teacher_notifs) > 0, "Math teacher should receive absence notification"
    assert len(english_teacher_notifs) > 0, "English teacher should receive absence notification"
    assert len(science_teacher_notifs) == 0, "Science teacher (different class) should NOT receive notification"
    
    assert "Student One" in math_teacher_notifs[0][2], "Notification should include student name"
    
    print("✓ Attendance notification to teachers test passed")


def test_event_notification_to_teachers():
    """Test that teachers are notified about events"""
    
    setup_test_data()
    
    # Create an event for student in class 3
    create_event(200, "Sports Day", "Annual sports competition", date.today().isoformat(), "School Ground")
    
    # Check that teachers were notified
    math_teacher_notifs = get_notifications(100)
    english_teacher_notifs = get_notifications(101)
    science_teacher_notifs = get_notifications(102)
    
    assert len(math_teacher_notifs) > 0, "Math teacher should receive event notification"
    assert len(english_teacher_notifs) > 0, "English teacher should receive event notification"
    assert len(science_teacher_notifs) == 0, "Science teacher (different class) should NOT receive notification"
    
    print("✓ Event notification to teachers test passed")


def test_cross_class_isolation():
    """Test that teachers from different classes don't receive cross-class notifications"""
    
    setup_test_data()
    
    # Record grade for student in class 7
    record_grade(201, "Science", 90, 100, date.today().isoformat())
    
    # Science teacher (class 7) should be notified
    science_teacher_notifs = get_notifications(102)
    assert len(science_teacher_notifs) > 0, "Science teacher should receive notification for class 7 student"
    
    # Math and English teachers (class 3) should NOT be notified
    math_teacher_notifs = get_notifications(100)
    english_teacher_notifs = get_notifications(101)
    assert len(math_teacher_notifs) == 0, "Math teacher (class 3) should NOT receive class 7 notification"
    assert len(english_teacher_notifs) == 0, "English teacher (class 3) should NOT receive class 7 notification"
    
    print("✓ Cross-class isolation test passed")


def test_notify_teachers_for_student():
    """Test the notify_teachers_for_student helper function"""
    
    setup_test_data()
    
    # Use the helper function directly
    count = notify_teachers_for_student(200, "Test Title", "Test message", "test_type")
    
    # Should notify 2 teachers (Math and English assigned to class 3)
    assert count == 2, f"Should notify 2 teachers, but notified {count}"
    
    print("✓ notify_teachers_for_student helper test passed")


if __name__ == "__main__":
    print("\n🧪 Running Teacher Notification Tests...\n")
    
    test_teacher_assignment()
    test_grade_notification_to_teachers()
    test_assignment_notification_to_teachers()
    test_attendance_notification_to_teachers()
    test_event_notification_to_teachers()
    test_cross_class_isolation()
    test_notify_teachers_for_student()
    
    print("\n✅ All teacher notification tests passed!")
