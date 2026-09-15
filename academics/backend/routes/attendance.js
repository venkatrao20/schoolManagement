const express = require('express');
const router = express.Router();
const db = require('../db/init');

const ok = (res, data) => res.json({ success: true, data });
const created = (res, data) => res.status(201).json({ success: true, data });
const fail = (res, code, msg) => res.status(code).json({ success: false, error: msg });

/* =========================================================
   DAILY STUDENT ATTENDANCE (Present/Absent/Late/Half-Day)
========================================================= */
router.get('/student', (req, res) => {
    const { class_id, date, student_id } = req.query;
    let query = `SELECT sa.*, st.name as student_name, st.roll_no, c.name as class_name, c.section
                 FROM student_attendance sa
                 JOIN students st ON st.id = sa.student_id
                 JOIN classes c ON c.id = sa.class_id WHERE 1=1`;
    const params = [];
    if (class_id) { query += ' AND sa.class_id = ?'; params.push(class_id); }
    if (date) { query += ' AND sa.attendance_date = ?'; params.push(date); }
    if (student_id) { query += ' AND sa.student_id = ?'; params.push(student_id); }
    query += ' ORDER BY sa.attendance_date DESC, st.roll_no';
    ok(res, db.prepare(query).all(...params));
});

// Mark attendance (single or bulk array)
router.post('/student', (req, res) => {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const insertOrUpdate = db.prepare(`
        INSERT INTO student_attendance (student_id, class_id, attendance_date, status, marked_by, remarks)
        VALUES (@student_id, @class_id, @attendance_date, @status, @marked_by, @remarks)
        ON CONFLICT(student_id, attendance_date) DO UPDATE SET
            status = excluded.status, remarks = excluded.remarks, marked_by = excluded.marked_by
    `);
    const txn = db.transaction((rows) => {
        for (const r of rows) {
            if (!r.student_id || !r.class_id || !r.status) throw new Error('student_id, class_id, status required for each record');
            insertOrUpdate.run({
                student_id: r.student_id,
                class_id: r.class_id,
                attendance_date: r.attendance_date || new Date().toISOString().slice(0, 10),
                status: r.status,
                marked_by: r.marked_by || null,
                remarks: r.remarks || null
            });
        }
    });
    try {
        txn(records);
        created(res, { marked: records.length });
    } catch (e) { fail(res, 400, e.message); }
});

/* ---------- ATTENDANCE CORRECTION ---------- */
router.put('/student/:id/correct', (req, res) => {
    const { status, remarks, corrected_by } = req.body;
    const existing = db.prepare('SELECT * FROM student_attendance WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Attendance record not found');
    if (!status) return fail(res, 400, 'status is required');
    db.prepare(`UPDATE student_attendance SET status = ?, remarks = COALESCE(?, remarks),
        is_corrected = 1, corrected_at = datetime('now'), corrected_by = ? WHERE id = ?`)
        .run(status, remarks || null, corrected_by || null, req.params.id);
    ok(res, db.prepare('SELECT * FROM student_attendance WHERE id = ?').get(req.params.id));
});

/* ---------- ATTENDANCE REPORTS ---------- */
router.get('/reports/class-summary', (req, res) => {
    const { class_id, from, to } = req.query;
    if (!class_id) return fail(res, 400, 'class_id required');
    let query = `SELECT st.id as student_id, st.name as student_name, st.roll_no,
            SUM(CASE WHEN sa.status='Present' THEN 1 ELSE 0 END) as present_count,
            SUM(CASE WHEN sa.status='Absent' THEN 1 ELSE 0 END) as absent_count,
            SUM(CASE WHEN sa.status='Late' THEN 1 ELSE 0 END) as late_count,
            SUM(CASE WHEN sa.status='Half-Day' THEN 1 ELSE 0 END) as half_day_count,
            COUNT(sa.id) as total_marked
        FROM students st
        LEFT JOIN student_attendance sa ON sa.student_id = st.id AND sa.class_id = st.class_id`;
    const params = [];
    let where = ' WHERE st.class_id = ?';
    params.push(class_id);
    if (from) { where += ' AND (sa.attendance_date IS NULL OR sa.attendance_date >= ?)'; params.push(from); }
    if (to) { where += ' AND (sa.attendance_date IS NULL OR sa.attendance_date <= ?)'; params.push(to); }
    query += where + ' GROUP BY st.id ORDER BY st.roll_no';
    ok(res, db.prepare(query).all(...params));
});

router.get('/reports/daily-overview', (req, res) => {
    const { date } = req.query;
    const d = date || new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`
        SELECT c.id as class_id, c.name as class_name, c.section,
            SUM(CASE WHEN sa.status='Present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN sa.status='Absent' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN sa.status='Late' THEN 1 ELSE 0 END) as late,
            SUM(CASE WHEN sa.status='Half-Day' THEN 1 ELSE 0 END) as half_day,
            COUNT(sa.id) as total_marked
        FROM classes c
        LEFT JOIN student_attendance sa ON sa.class_id = c.id AND sa.attendance_date = ?
        GROUP BY c.id
    `).all(d);
    ok(res, { date: d, classes: rows });
});

/* =========================================================
   TEACHER / STAFF ATTENDANCE
========================================================= */
router.get('/staff', (req, res) => {
    const { date, teacher_id } = req.query;
    let query = `SELECT sa.*, t.name as teacher_name, t.employee_id, t.designation
                 FROM staff_attendance sa JOIN teachers t ON t.id = sa.teacher_id WHERE 1=1`;
    const params = [];
    if (date) { query += ' AND sa.attendance_date = ?'; params.push(date); }
    if (teacher_id) { query += ' AND sa.teacher_id = ?'; params.push(teacher_id); }
    query += ' ORDER BY sa.attendance_date DESC';
    ok(res, db.prepare(query).all(...params));
});

router.post('/staff', (req, res) => {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const insertOrUpdate = db.prepare(`
        INSERT INTO staff_attendance (teacher_id, attendance_date, status, check_in, check_out, remarks)
        VALUES (@teacher_id, @attendance_date, @status, @check_in, @check_out, @remarks)
        ON CONFLICT(teacher_id, attendance_date) DO UPDATE SET
            status=excluded.status, check_in=excluded.check_in, check_out=excluded.check_out, remarks=excluded.remarks
    `);
    const txn = db.transaction((rows) => {
        for (const r of rows) {
            if (!r.teacher_id || !r.status) throw new Error('teacher_id and status required');
            insertOrUpdate.run({
                teacher_id: r.teacher_id,
                attendance_date: r.attendance_date || new Date().toISOString().slice(0, 10),
                status: r.status,
                check_in: r.check_in || null,
                check_out: r.check_out || null,
                remarks: r.remarks || null
            });
        }
    });
    try {
        txn(records);
        created(res, { marked: records.length });
    } catch (e) { fail(res, 400, e.message); }
});

/* =========================================================
   LEAVE MANAGEMENT
========================================================= */
router.get('/leave', (req, res) => {
    const { status, teacher_id } = req.query;
    let query = `SELECT lr.*, t.name as teacher_name, st.name as student_name
                 FROM leave_requests lr
                 LEFT JOIN teachers t ON t.id = lr.teacher_id
                 LEFT JOIN students st ON st.id = lr.student_id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND lr.status = ?'; params.push(status); }
    if (teacher_id) { query += ' AND lr.teacher_id = ?'; params.push(teacher_id); }
    query += ' ORDER BY lr.applied_on DESC';
    ok(res, db.prepare(query).all(...params));
});

router.post('/leave', (req, res) => {
    const { applicant_type, teacher_id, student_id, leave_type, start_date, end_date, reason } = req.body;
    if (!applicant_type || !start_date || !end_date) return fail(res, 400, 'applicant_type, start_date, end_date required');
    const info = db.prepare(`INSERT INTO leave_requests (applicant_type, teacher_id, student_id, leave_type, start_date, end_date, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`).run(applicant_type, teacher_id || null, student_id || null, leave_type || null, start_date, end_date, reason || null);
    created(res, db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/leave/:id/status', (req, res) => {
    const { status, approved_by } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) return fail(res, 400, 'Invalid status');
    const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Leave request not found');
    db.prepare('UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?').run(status, approved_by || null, req.params.id);
    ok(res, db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id));
});

module.exports = router;
