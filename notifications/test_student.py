import sqlite3

connection = sqlite3.connect("school.db")
cursor = connection.cursor()

cursor.execute("""
SELECT id, parent_id FROM students
WHERE name = ?
ORDER BY id ASC
LIMIT 1
""", ("Test Student",))

existing = cursor.fetchone()

if existing is None:
    cursor.execute("""
    INSERT INTO students (name, parent_id)
    VALUES (?, ?)
    """, ("Test Student", None))
    student_id = cursor.lastrowid
    print("Test student created successfully!")
    print("Student ID:", student_id)
else:
    student_id = existing[0]
    if existing[1] is None:
        cursor.execute("""
        UPDATE students
        SET parent_id = NULL
        WHERE id = ?
        """, (student_id,))
    print("Test student already exists.")
    print("Student ID:", student_id)

connection.commit()
connection.close()