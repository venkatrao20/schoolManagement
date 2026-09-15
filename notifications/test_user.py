import sqlite3

connection = sqlite3.connect("school.db")
cursor = connection.cursor()

cursor.execute("""
SELECT id FROM users
WHERE email = ?
""", ("testparent@example.com",))

user = cursor.fetchone()

if user is None:
    cursor.execute("""
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
    """, (
        "Test Parent",
        "testparent@example.com",
        "test123",
        "parent"
    ))
    user_id = cursor.lastrowid
else:
    user_id = user[0]

cursor.execute("""
SELECT id FROM students
WHERE name = ?
ORDER BY id ASC
LIMIT 1
""", ("Test Student",))

student = cursor.fetchone()

if student is not None:
    cursor.execute("""
    UPDATE students
    SET parent_id = ?
    WHERE id = ?
    """, (user_id, student[0]))

connection.commit()

print("Test user created successfully!")
print("User ID:", user_id)
if student is not None:
    print("Linked Test Student to User ID:", user_id, "(student id:", student[0], ")")
else:
    print("No Test Student row found to link")

connection.close()