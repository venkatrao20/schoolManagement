from reports import school_summary
from student import ensure_class_level_schema


def test_school_summary_includes_each_students_class_level():
    ensure_class_level_schema()
    summary = school_summary()

    student = next(
        student for student in summary["students"]
        if student["student_name"] == "Linked Student"
    )

    assert student["class_level"] == 9


def test_school_summary_excludes_placeholder_students():
    summary = school_summary()

    student_names = [student["student_name"] for student in summary["students"]]

    assert "Student One" not in student_names
    assert "Student Two" not in student_names
    assert summary["total_students"] == len(summary["students"])