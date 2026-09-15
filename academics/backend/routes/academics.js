const express = require('express');
const router = express.Router();
const db = require('../db/init');

/* ---------- Helper ---------- */
const ok = (res, data) => res.json({ success: true, data });
const created = (res, data) => res.status(201).json({ success: true, data });
const fail = (res, code, msg) => res.status(code).json({ success: false, error: msg });

/* =========================================================
   TEACHER / STAFF PROFILES
========================================================= */
router.get('/teachers', (req, res) => {
    const rows = db.prepare('SELECT * FROM teachers ORDER BY name').all();
    ok(res, rows);
});

router.get('/teachers/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!row) return fail(res, 404, 'Teacher not found');
    ok(res, row);
});

router.post('/teachers', (req, res) => {
    const { employee_id, name, email, phone, qualification, designation, subject_specialization, joining_date, address, photo_url, status } = req.body;
    if (!employee_id || !name) return fail(res, 400, 'employee_id and name are required');
    try {
        const stmt = db.prepare(`INSERT INTO teachers (employee_id, name, email, phone, qualification, designation, subject_specialization, joining_date, address, photo_url, status)
            VALUES (@employee_id, @name, @email, @phone, @qualification, @designation, @subject_specialization, @joining_date, @address, @photo_url, @status)`);
        const info = stmt.run({
            employee_id, name, email: email || null, phone: phone || null, qualification: qualification || null,
            designation: designation || null, subject_specialization: subject_specialization || null,
            joining_date: joining_date || null, address: address || null, photo_url: photo_url || null,
            status: status || 'Active'
        });
        created(res, db.prepare('SELECT * FROM teachers WHERE id = ?').get(info.lastInsertRowid));
    } catch (e) { fail(res, 400, e.message); }
});

router.put('/teachers/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Teacher not found');
    const merged = { ...existing, ...req.body };
    db.prepare(`UPDATE teachers SET name=@name, email=@email, phone=@phone, qualification=@qualification,
        designation=@designation, subject_specialization=@subject_specialization, joining_date=@joining_date,
        address=@address, photo_url=@photo_url, status=@status WHERE id=@id`).run(merged);
    ok(res, db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id));
});

router.delete('/teachers/:id', (req, res) => {
    db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   CLASSES & SUBJECTS (support data)
========================================================= */
router.get('/classes', (req, res) => ok(res, db.prepare('SELECT * FROM classes ORDER BY name, section').all()));
router.post('/classes', (req, res) => {
    const { name, section } = req.body;
    if (!name || !section) return fail(res, 400, 'name and section required');
    const info = db.prepare('INSERT INTO classes (name, section) VALUES (?, ?)').run(name, section);
    created(res, db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/subjects', (req, res) => ok(res, db.prepare('SELECT * FROM subjects ORDER BY name').all()));
router.post('/subjects', (req, res) => {
    const { name, code } = req.body;
    if (!name) return fail(res, 400, 'name required');
    const info = db.prepare('INSERT INTO subjects (name, code) VALUES (?, ?)').run(name, code || null);
    created(res, db.prepare('SELECT * FROM subjects WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/students', (req, res) => {
    const { class_id } = req.query;
    let rows;
    if (class_id) rows = db.prepare('SELECT * FROM students WHERE class_id = ? ORDER BY roll_no').all(class_id);
    else rows = db.prepare('SELECT * FROM students ORDER BY name').all();
    ok(res, rows);
});
router.post('/students', (req, res) => {
    const { admission_no, name, class_id, roll_no } = req.body;
    if (!admission_no || !name || !class_id) return fail(res, 400, 'admission_no, name, class_id required');
    const info = db.prepare('INSERT INTO students (admission_no, name, class_id, roll_no) VALUES (?, ?, ?, ?)').run(admission_no, name, class_id, roll_no || null);
    created(res, db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid));
});

/* =========================================================
   TEACHER - CLASS ALLOCATION
========================================================= */
router.get('/allocations', (req, res) => {
    const rows = db.prepare(`
        SELECT tca.*, t.name as teacher_name, c.name as class_name, c.section, s.name as subject_name
        FROM teacher_class_allocation tca
        JOIN teachers t ON t.id = tca.teacher_id
        JOIN classes c ON c.id = tca.class_id
        JOIN subjects s ON s.id = tca.subject_id
        ORDER BY c.name, c.section
    `).all();
    ok(res, rows);
});

router.post('/allocations', (req, res) => {
    const { teacher_id, class_id, subject_id, is_class_teacher, academic_year } = req.body;
    if (!teacher_id || !class_id || !subject_id) return fail(res, 400, 'teacher_id, class_id, subject_id required');
    const info = db.prepare(`INSERT INTO teacher_class_allocation (teacher_id, class_id, subject_id, is_class_teacher, academic_year)
        VALUES (?, ?, ?, ?, ?)`).run(teacher_id, class_id, subject_id, is_class_teacher ? 1 : 0, academic_year || '2026-2027');
    created(res, db.prepare('SELECT * FROM teacher_class_allocation WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/allocations/:id', (req, res) => {
    db.prepare('DELETE FROM teacher_class_allocation WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   CLASS & TEACHER TIMETABLE
========================================================= */
router.get('/timetable', (req, res) => {
    const { class_id, teacher_id } = req.query;
    let query = `SELECT tt.*, c.name as class_name, c.section, s.name as subject_name, t.name as teacher_name
                 FROM timetable tt
                 JOIN classes c ON c.id = tt.class_id
                 JOIN subjects s ON s.id = tt.subject_id
                 JOIN teachers t ON t.id = tt.teacher_id WHERE 1=1`;
    const params = [];
    if (class_id) { query += ' AND tt.class_id = ?'; params.push(class_id); }
    if (teacher_id) { query += ' AND tt.teacher_id = ?'; params.push(teacher_id); }
    query += ' ORDER BY CASE day_of_week WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 END, period_no';
    ok(res, db.prepare(query).all(...params));
});

router.post('/timetable', (req, res) => {
    const { class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room } = req.body;
    if (!class_id || !subject_id || !teacher_id || !day_of_week || !period_no) return fail(res, 400, 'Missing required fields');
    const info = db.prepare(`INSERT INTO timetable (class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(class_id, subject_id, teacher_id, day_of_week, period_no, start_time, end_time, room || null);
    created(res, db.prepare('SELECT * FROM timetable WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/timetable/:id', (req, res) => {
    db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   HOMEWORK & ASSIGNMENTS (Creation + View)
========================================================= */
router.get('/homework', (req, res) => {
    const { class_id, subject_id } = req.query;
    let query = `SELECT h.*, c.name as class_name, c.section, s.name as subject_name, t.name as teacher_name
                 FROM homework h
                 JOIN classes c ON c.id = h.class_id
                 JOIN subjects s ON s.id = h.subject_id
                 JOIN teachers t ON t.id = h.teacher_id WHERE 1=1`;
    const params = [];
    if (class_id) { query += ' AND h.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND h.subject_id = ?'; params.push(subject_id); }
    query += ' ORDER BY h.assigned_date DESC';
    ok(res, db.prepare(query).all(...params));
});

router.post('/homework', (req, res) => {
    const { class_id, subject_id, teacher_id, title, description, assigned_date, due_date, attachment_url, status } = req.body;
    if (!class_id || !subject_id || !teacher_id || !title) return fail(res, 400, 'Missing required fields');
    const info = db.prepare(`INSERT INTO homework (class_id, subject_id, teacher_id, title, description, assigned_date, due_date, attachment_url, status)
        VALUES (?, ?, ?, ?, ?, COALESCE(?, date('now')), ?, ?, ?)`).run(
        class_id, subject_id, teacher_id, title, description || null, assigned_date || null, due_date || null, attachment_url || null, status || 'Published'
    );
    created(res, db.prepare('SELECT * FROM homework WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/homework/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM homework WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Homework not found');
    const merged = { ...existing, ...req.body };
    db.prepare(`UPDATE homework SET title=@title, description=@description, due_date=@due_date, attachment_url=@attachment_url, status=@status WHERE id=@id`).run(merged);
    ok(res, db.prepare('SELECT * FROM homework WHERE id = ?').get(req.params.id));
});

router.delete('/homework/:id', (req, res) => {
    db.prepare('DELETE FROM homework WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   SYLLABUS / LESSON PLAN
========================================================= */
router.get('/syllabus', (req, res) => {
    const { class_id, subject_id } = req.query;
    let query = `SELECT sy.*, c.name as class_name, c.section, s.name as subject_name, t.name as teacher_name
                 FROM syllabus sy
                 JOIN classes c ON c.id = sy.class_id
                 JOIN subjects s ON s.id = sy.subject_id
                 JOIN teachers t ON t.id = sy.teacher_id WHERE 1=1`;
    const params = [];
    if (class_id) { query += ' AND sy.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND sy.subject_id = ?'; params.push(subject_id); }
    ok(res, db.prepare(query).all(...params));
});

router.post('/syllabus', (req, res) => {
    const { class_id, subject_id, teacher_id, unit_title, topics, planned_start_date, planned_end_date, completion_status, completion_percent } = req.body;
    if (!class_id || !subject_id || !teacher_id || !unit_title) return fail(res, 400, 'Missing required fields');
    const info = db.prepare(`INSERT INTO syllabus (class_id, subject_id, teacher_id, unit_title, topics, planned_start_date, planned_end_date, completion_status, completion_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        class_id, subject_id, teacher_id, unit_title, topics || null, planned_start_date || null, planned_end_date || null,
        completion_status || 'Not Started', completion_percent || 0
    );
    created(res, db.prepare('SELECT * FROM syllabus WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/syllabus/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM syllabus WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Syllabus entry not found');
    const merged = { ...existing, ...req.body };
    db.prepare(`UPDATE syllabus SET unit_title=@unit_title, topics=@topics, planned_start_date=@planned_start_date,
        planned_end_date=@planned_end_date, completion_status=@completion_status, completion_percent=@completion_percent WHERE id=@id`).run(merged);
    ok(res, db.prepare('SELECT * FROM syllabus WHERE id = ?').get(req.params.id));
});

router.delete('/syllabus/:id', (req, res) => {
    db.prepare('DELETE FROM syllabus WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   ACADEMIC CALENDAR
========================================================= */
router.get('/calendar', (req, res) => {
    ok(res, db.prepare('SELECT * FROM academic_calendar ORDER BY start_date').all());
});

router.post('/calendar', (req, res) => {
    const { title, event_type, start_date, end_date, description } = req.body;
    if (!title || !start_date) return fail(res, 400, 'title and start_date required');
    const info = db.prepare(`INSERT INTO academic_calendar (title, event_type, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)`)
        .run(title, event_type || null, start_date, end_date || start_date, description || null);
    created(res, db.prepare('SELECT * FROM academic_calendar WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/calendar/:id', (req, res) => {
    db.prepare('DELETE FROM academic_calendar WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   ACADEMIC DASHBOARD (aggregated view)
========================================================= */
router.get('/dashboard', (req, res) => {
    const totalTeachers = db.prepare('SELECT COUNT(*) c FROM teachers WHERE status = "Active"').get().c;
    const totalStudents = db.prepare('SELECT COUNT(*) c FROM students').get().c;
    const totalClasses = db.prepare('SELECT COUNT(*) c FROM classes').get().c;
    const totalHomeworkThisWeek = db.prepare("SELECT COUNT(*) c FROM homework WHERE assigned_date >= date('now','-7 day')").get().c;
    const syllabusProgress = db.prepare(`
        SELECT s.name as subject_name, c.name as class_name, c.section, AVG(sy.completion_percent) as avg_completion
        FROM syllabus sy JOIN subjects s ON s.id = sy.subject_id JOIN classes c ON c.id = sy.class_id
        GROUP BY sy.subject_id, sy.class_id
    `).all();
    const upcomingEvents = db.prepare(`SELECT * FROM academic_calendar WHERE start_date >= date('now') ORDER BY start_date LIMIT 5`).all();
    const todayAttendanceSummary = db.prepare(`
        SELECT status, COUNT(*) as count FROM student_attendance WHERE attendance_date = date('now') GROUP BY status
    `).all();

    ok(res, {
        totalTeachers, totalStudents, totalClasses, totalHomeworkThisWeek,
        syllabusProgress, upcomingEvents, todayAttendanceSummary
    });
});

/* =========================================================
   MARKS / ACADEMIC INFORMATION (student-centric summary)
========================================================= */
router.get('/academic-info/:studentId', (req, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId);
    if (!student) return fail(res, 404, 'Student not found');

    const marks = db.prepare(`
        SELECT m.*, e.name as exam_name, e.exam_type, e.max_marks, s.name as subject_name
        FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
        WHERE m.student_id = ? ORDER BY e.exam_date DESC
    `).all(req.params.studentId);

    const attendance = db.prepare(`
        SELECT status, COUNT(*) as count FROM student_attendance WHERE student_id = ? GROUP BY status
    `).all(req.params.studentId);

    const homeworkAssigned = db.prepare(`
        SELECT COUNT(*) c FROM homework WHERE class_id = ?
    `).get(student.class_id).c;

    ok(res, { student, marks, attendance, homeworkAssigned });
});

module.exports = router;
