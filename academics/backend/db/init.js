const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'school.db');
const isNew = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Always ensure schema exists (idempotent)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

function seed() {
    const classCount = db.prepare('SELECT COUNT(*) as c FROM classes').get().c;
    if (classCount > 0) return; // already seeded

    console.log('Seeding initial demo data...');

    const insertClass = db.prepare('INSERT INTO classes (name, section) VALUES (?, ?)');
    const c1 = insertClass.run('Grade 5', 'A').lastInsertRowid;
    const c2 = insertClass.run('Grade 6', 'B').lastInsertRowid;
    const c3 = insertClass.run('Grade 7', 'A').lastInsertRowid;

    const insertSubject = db.prepare('INSERT INTO subjects (name, code) VALUES (?, ?)');
    const subMath = insertSubject.run('Mathematics', 'MATH').lastInsertRowid;
    const subSci = insertSubject.run('Science', 'SCI').lastInsertRowid;
    const subEng = insertSubject.run('English', 'ENG').lastInsertRowid;
    const subSocial = insertSubject.run('Social Studies', 'SOC').lastInsertRowid;

    const insertTeacher = db.prepare(`INSERT INTO teachers
        (employee_id, name, email, phone, qualification, designation, subject_specialization, joining_date, address, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const t1 = insertTeacher.run('EMP001', 'Anita Sharma', 'anita.sharma@school.edu', '9876500001', 'M.Sc, B.Ed', 'TGT', 'Mathematics', '2019-06-01', 'Bengaluru', 'Active').lastInsertRowid;
    const t2 = insertTeacher.run('EMP002', 'Rahul Verma', 'rahul.verma@school.edu', '9876500002', 'M.Sc, B.Ed', 'TGT', 'Science', '2020-07-15', 'Bengaluru', 'Active').lastInsertRowid;
    const t3 = insertTeacher.run('EMP003', 'Priya Nair', 'priya.nair@school.edu', '9876500003', 'M.A, B.Ed', 'PGT', 'English', '2018-04-10', 'Bengaluru', 'Active').lastInsertRowid;

    const insertAlloc = db.prepare(`INSERT INTO teacher_class_allocation (teacher_id, class_id, subject_id, is_class_teacher) VALUES (?, ?, ?, ?)`);
    insertAlloc.run(t1, c1, subMath, 1);
    insertAlloc.run(t2, c1, subSci, 0);
    insertAlloc.run(t3, c2, subEng, 1);
    insertAlloc.run(t1, c3, subMath, 0);

    const insertTimetable = db.prepare(`INSERT INTO timetable (class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertTimetable.run(c1, subMath, t1, 'Monday', 1, '09:00', '09:45', 'Room 101');
    insertTimetable.run(c1, subSci, t2, 'Monday', 2, '09:45', '10:30', 'Lab 1');
    insertTimetable.run(c2, subEng, t3, 'Tuesday', 1, '09:00', '09:45', 'Room 205');

    const insertStudent = db.prepare('INSERT INTO students (admission_no, name, class_id, roll_no) VALUES (?, ?, ?, ?)');
    const s1 = insertStudent.run('ADM2026001', 'Aarav Kumar', c1, '1').lastInsertRowid;
    const s2 = insertStudent.run('ADM2026002', 'Diya Patel', c1, '2').lastInsertRowid;
    const s3 = insertStudent.run('ADM2026003', 'Kabir Singh', c1, '3').lastInsertRowid;
    const s4 = insertStudent.run('ADM2026004', 'Meera Iyer', c2, '1').lastInsertRowid;

    const insertHomework = db.prepare(`INSERT INTO homework (class_id, subject_id, teacher_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertHomework.run(c1, subMath, t1, 'Fractions Worksheet', 'Complete exercises 1-10 from Chapter 4', '2026-09-05', 'Published');
    insertHomework.run(c1, subSci, t2, 'Plant Cell Diagram', 'Draw and label a plant cell', '2026-09-06', 'Published');

    const insertSyllabus = db.prepare(`INSERT INTO syllabus (class_id, subject_id, teacher_id, unit_title, topics, planned_start_date, planned_end_date, completion_status, completion_percent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insertSyllabus.run(c1, subMath, t1, 'Chapter 4: Fractions', 'Introduction, Addition, Subtraction of fractions', '2026-08-01', '2026-08-20', 'Completed', 100);
    insertSyllabus.run(c1, subSci, t2, 'Chapter 3: Cell Structure', 'Plant cell, Animal cell, Cell organelles', '2026-08-15', '2026-09-10', 'In Progress', 60);

    const insertCalendar = db.prepare(`INSERT INTO academic_calendar (title, event_type, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)`);
    insertCalendar.run('Independence Day', 'Holiday', '2026-08-15', '2026-08-15', 'National Holiday');
    insertCalendar.run('Mid-Term Exams', 'Exam', '2026-09-15', '2026-09-22', 'Mid-term examinations for all classes');
    insertCalendar.run('Parent-Teacher Meeting', 'PTM', '2026-09-25', '2026-09-25', 'Quarterly PTM');

    const insertStudentAtt = db.prepare(`INSERT INTO student_attendance (student_id, class_id, attendance_date, status, marked_by) VALUES (?, ?, ?, ?, ?)`);
    insertStudentAtt.run(s1, c1, '2026-08-28', 'Present', t1);
    insertStudentAtt.run(s2, c1, '2026-08-28', 'Absent', t1);
    insertStudentAtt.run(s3, c1, '2026-08-28', 'Late', t1);
    insertStudentAtt.run(s4, c2, '2026-08-28', 'Present', t3);

    const insertStaffAtt = db.prepare(`INSERT INTO staff_attendance (teacher_id, attendance_date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?)`);
    insertStaffAtt.run(t1, '2026-08-28', 'Present', '08:45', '15:30');
    insertStaffAtt.run(t2, '2026-08-28', 'Present', '08:50', '15:30');
    insertStaffAtt.run(t3, '2026-08-28', 'On Leave', null, null);

    const insertLeave = db.prepare(`INSERT INTO leave_requests (applicant_type, teacher_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertLeave.run('Teacher', t3, 'Sick', '2026-08-28', '2026-08-29', 'Fever', 'Approved');

    const insertExam = db.prepare(`INSERT INTO exams (name, exam_type, class_id, subject_id, exam_date, start_time, end_time, max_marks, pass_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const e1 = insertExam.run('Mid-Term Mathematics', 'Mid-Term', c1, subMath, '2026-09-16', '09:00', '11:00', 100, 33).lastInsertRowid;
    const e2 = insertExam.run('Mid-Term Science', 'Mid-Term', c1, subSci, '2026-09-18', '09:00', '11:00', 100, 33).lastInsertRowid;

    const insertMarks = db.prepare(`INSERT INTO marks (exam_id, student_id, marks_obtained, grade, entered_by) VALUES (?, ?, ?, ?, ?)`);
    insertMarks.run(e1, s1, 88, 'A', t1);
    insertMarks.run(e1, s2, 45, 'C', t1);
    insertMarks.run(e1, s3, 72, 'B', t1);
    insertMarks.run(e2, s1, 91, 'A+', t2);
    insertMarks.run(e2, s2, 55, 'C', t2);

    const insertGrade = db.prepare(`INSERT INTO grade_scale (grade, min_percent, max_percent, remarks) VALUES (?, ?, ?, ?)`);
    insertGrade.run('A+', 90, 100, 'Outstanding');
    insertGrade.run('A', 80, 89.99, 'Excellent');
    insertGrade.run('B', 70, 79.99, 'Very Good');
    insertGrade.run('C', 50, 69.99, 'Good');
    insertGrade.run('D', 33, 49.99, 'Satisfactory');
    insertGrade.run('F', 0, 32.99, 'Needs Improvement');

    console.log('Seeding complete.');
}

seed();

module.exports = db;
