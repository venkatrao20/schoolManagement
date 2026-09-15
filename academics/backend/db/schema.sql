-- =========================================================
-- SCHOOL MANAGEMENT APP - ACADEMICS MODULE SCHEMA
-- Covers: Teachers & Academics | Attendance | Examination & Results
-- =========================================================

-- ---------- CORE ----------
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,          -- e.g. "Grade 5"
    section TEXT NOT NULL,       -- e.g. "A"
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class_id INTEGER NOT NULL,
    roll_no TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- ---------- 1. TEACHERS & ACADEMICS ----------

-- Teacher / Staff Profiles
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    qualification TEXT,
    designation TEXT,           -- e.g. "PGT", "TGT", "Principal"
    subject_specialization TEXT,
    joining_date TEXT,
    address TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'Active', -- Active / Inactive / On Leave
    created_at TEXT DEFAULT (datetime('now'))
);

-- Teacher-Class Allocation
CREATE TABLE IF NOT EXISTS teacher_class_allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    is_class_teacher INTEGER DEFAULT 0,  -- 1 = class teacher/homeroom
    academic_year TEXT DEFAULT '2026-2027',
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Class & Teacher Timetable
CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    day_of_week TEXT NOT NULL,   -- Monday..Saturday
    period_no INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Homework & Assignments (Creation + View share same table)
CREATE TABLE IF NOT EXISTS homework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_date TEXT DEFAULT (date('now')),
    due_date TEXT,
    attachment_url TEXT,
    status TEXT DEFAULT 'Published', -- Draft / Published
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Syllabus / Lesson Plan
CREATE TABLE IF NOT EXISTS syllabus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    unit_title TEXT NOT NULL,
    topics TEXT,
    planned_start_date TEXT,
    planned_end_date TEXT,
    completion_status TEXT DEFAULT 'Not Started', -- Not Started/In Progress/Completed
    completion_percent INTEGER DEFAULT 0,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Academic Calendar
CREATE TABLE IF NOT EXISTS academic_calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    event_type TEXT,       -- Holiday / Exam / Event / PTM / Sports Day
    start_date TEXT NOT NULL,
    end_date TEXT,
    description TEXT
);

-- ---------- 2. ATTENDANCE ----------

-- Daily Student Attendance (Present/Absent/Late/Half-Day)
CREATE TABLE IF NOT EXISTS student_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    attendance_date TEXT DEFAULT (date('now')),
    status TEXT NOT NULL,  -- Present / Absent / Late / Half-Day
    marked_by INTEGER,     -- teacher_id
    remarks TEXT,
    is_corrected INTEGER DEFAULT 0,
    corrected_at TEXT,
    corrected_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (marked_by) REFERENCES teachers(id),
    UNIQUE(student_id, attendance_date)
);

-- Teacher / Staff Attendance
CREATE TABLE IF NOT EXISTS staff_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    attendance_date TEXT DEFAULT (date('now')),
    status TEXT NOT NULL,  -- Present / Absent / Late / Half-Day / On Leave
    check_in TEXT,
    check_out TEXT,
    remarks TEXT,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    UNIQUE(teacher_id, attendance_date)
);

-- Leave Management (applies to staff; extendable to students)
CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_type TEXT NOT NULL, -- Teacher / Student
    teacher_id INTEGER,
    student_id INTEGER,
    leave_type TEXT,       -- Sick / Casual / Earned / Other
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending', -- Pending / Approved / Rejected
    applied_on TEXT DEFAULT (datetime('now')),
    approved_by TEXT,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
);

-- ---------- 3. EXAMINATION & RESULTS ----------

-- Exam Types & Schedule
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,          -- e.g. "Mid-Term", "Final Exam"
    exam_type TEXT,              -- Unit Test / Mid-Term / Final / Practical
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    exam_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    max_marks INTEGER DEFAULT 100,
    pass_marks INTEGER DEFAULT 33,
    academic_year TEXT DEFAULT '2026-2027',
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Marks Entry
CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    marks_obtained REAL NOT NULL,
    grade TEXT,
    remarks TEXT,
    entered_by INTEGER,   -- teacher_id
    entered_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (entered_by) REFERENCES teachers(id),
    UNIQUE(exam_id, student_id)
);

-- Grade scale reference (for Grade/Result Summary)
CREATE TABLE IF NOT EXISTS grade_scale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade TEXT NOT NULL,
    min_percent REAL NOT NULL,
    max_percent REAL NOT NULL,
    remarks TEXT
);
