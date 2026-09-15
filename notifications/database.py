import sqlite3

connection = sqlite3.connect("school.db")

cursor = connection.cursor()

print("Database connected successfully!")


# Create Users table
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
)
""")

print("Users table created successfully!")


# Create Students table
cursor.execute("""
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES users(id)
)
""")

print("Students table created successfully!")


# Create Notifications table
cursor.execute("""
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")

# Admin notification history and per-recipient read state.
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
    status TEXT NOT NULL DEFAULT 'sent',
    FOREIGN KEY (created_by) REFERENCES users(id)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS notification_recipients (
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at TIMESTAMP,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES admin_notifications(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
""")

print("Notifications table created successfully!")
# Create Attendance table
cursor.execute("""
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS transportation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    route TEXT,
    destination TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

print("Attendance table created successfully!")
# Create Grades table
cursor.execute("""
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    marks REAL NOT NULL,
    total_marks REAL NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

print("Grades table created successfully!")
# Save changes# Create Assignments table
cursor.execute("""
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

print("Assignments table created successfully!")
# Create Fees table
cursor.execute("""
CREATE TABLE IF NOT EXISTS fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    fee_type TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

print("Fees table created successfully!")
# Create Events table
cursor.execute("""
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    location TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id)
)
""")

print("Events table created successfully!")
# Create Reminder log table.
#
# Records which scheduled reminders have already been sent, so a job that
# runs repeatedly (hourly cron, for example) does not notify the same
# parent about the same assignment over and over. The UNIQUE constraint
# is what actually enforces it.
cursor.execute("""
CREATE TABLE IF NOT EXISTS reminder_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reminder_type TEXT NOT NULL,
    reference_id INTEGER NOT NULL,
    reminder_date TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reminder_type, reference_id, reminder_date)
)
""")

print("Reminder log table created successfully!")
connection.commit()

# Close database connection
connection.close()

print("Database setup completed successfully!")