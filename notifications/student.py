import sqlite3


def ensure_class_level_schema():

    connection = sqlite3.connect("school.db")
    columns = [row[1] for row in connection.execute("PRAGMA table_info(students)")]

    if "class_level" not in columns:
        connection.execute("ALTER TABLE students ADD COLUMN class_level INTEGER")

    connection.commit()
    connection.close()


def ensure_teacher_class_schema():
    """Create teacher_class_assignments table to track which teachers teach which classes"""
    
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    
    # Create table for teacher-class assignments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS teacher_class_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        class_level INTEGER NOT NULL,
        subject TEXT,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (teacher_id, class_level, subject)
    )
    """)
    
    connection.commit()
    connection.close()


# Look up a student and the parent linked to them
def get_student(student_id):

    ensure_class_level_schema()
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()

    cursor.execute("""
        SELECT s.id, s.name, s.class_level, s.parent_id, u.name, u.email
        FROM students s
        LEFT JOIN users u ON u.id = s.parent_id
        WHERE s.id = ?
    """, (student_id,))

    result = cursor.fetchone()

    connection.close()

    if result is None:
        return None

    return {
        "id": result[0],
        "name": result[1],
        "class_level": result[2],
        "parent_id": result[3],
        "parent_name": result[4],
        "parent_email": result[5]
    }


# Get the parent/user ID for a student
def get_parent_id(student_id):

    student = get_student(student_id)

    if student is None:
        return None

    return student["parent_id"]


# Get a student's name, for use in notification messages.
# A parent can have more than one child, so notifications need to say
# which child they are about.
def get_student_name(student_id):

    student = get_student(student_id)

    if student is None:
        return f"Student {student_id}"

    return student["name"]


# Get all teachers assigned to a student's class level
def get_teachers_for_student(student_id, subject=None):
    """
    Get all teachers assigned to teach a student's class level.
    If subject is specified, filter to that subject only.
    Returns a list of teacher user IDs.
    """
    
    ensure_teacher_class_schema()
    
    student = get_student(student_id)
    if student is None or student["class_level"] is None:
        return []
    
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    
    if subject:
        cursor.execute("""
            SELECT DISTINCT teacher_id
            FROM teacher_class_assignments
            WHERE class_level = ? AND subject = ?
        """, (student["class_level"], subject))
    else:
        cursor.execute("""
            SELECT DISTINCT teacher_id
            FROM teacher_class_assignments
            WHERE class_level = ?
        """, (student["class_level"],))
    
    rows = cursor.fetchall()
    connection.close()
    
    return [row[0] for row in rows]


# Add a teacher to teach a class level (with optional subject)
def assign_teacher_to_class(teacher_id, class_level, subject=None):
    """
    Assign a teacher to teach a specific class level.
    If subject is specified, the assignment is scoped to that subject.
    """
    
    ensure_teacher_class_schema()
    
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO teacher_class_assignments (teacher_id, class_level, subject)
            VALUES (?, ?, ?)
        """, (teacher_id, class_level, subject))
        
        connection.commit()
        connection.close()
        return True
    except sqlite3.IntegrityError:
        connection.close()
        return False


# Remove a teacher from teaching a class level
def unassign_teacher_from_class(teacher_id, class_level, subject=None):
    """Remove a teacher's assignment from a class level (optionally specific subject)"""
    
    ensure_teacher_class_schema()
    
    connection = sqlite3.connect("school.db")
    cursor = connection.cursor()
    
    if subject:
        cursor.execute("""
            DELETE FROM teacher_class_assignments
            WHERE teacher_id = ? AND class_level = ? AND subject = ?
        """, (teacher_id, class_level, subject))
    else:
        cursor.execute("""
            DELETE FROM teacher_class_assignments
            WHERE teacher_id = ? AND class_level = ?
        """, (teacher_id, class_level))
    
    connection.commit()
    connection.close()
