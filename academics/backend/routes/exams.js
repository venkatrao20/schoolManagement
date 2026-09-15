const express = require('express');
const router = express.Router();
const db = require('../db/init');

const ok = (res, data) => res.json({ success: true, data });
const created = (res, data) => res.status(201).json({ success: true, data });
const fail = (res, code, msg) => res.status(code).json({ success: false, error: msg });

function gradeFor(percent) {
    const scale = db.prepare('SELECT * FROM grade_scale ORDER BY min_percent DESC').all();
    for (const g of scale) {
        if (percent >= g.min_percent) return g.grade;
    }
    return 'F';
}

/* =========================================================
   EXAM TYPES & SCHEDULE
========================================================= */
router.get('/exams', (req, res) => {
    const { class_id, subject_id } = req.query;
    let query = `SELECT e.*, c.name as class_name, c.section, s.name as subject_name
                 FROM exams e JOIN classes c ON c.id = e.class_id JOIN subjects s ON s.id = e.subject_id WHERE 1=1`;
    const params = [];
    if (class_id) { query += ' AND e.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND e.subject_id = ?'; params.push(subject_id); }
    query += ' ORDER BY e.exam_date';
    ok(res, db.prepare(query).all(...params));
});

router.post('/exams', (req, res) => {
    const { name, exam_type, class_id, subject_id, exam_date, start_time, end_time, max_marks, pass_marks, academic_year } = req.body;
    if (!name || !class_id || !subject_id || !exam_date) return fail(res, 400, 'name, class_id, subject_id, exam_date required');
    const info = db.prepare(`INSERT INTO exams (name, exam_type, class_id, subject_id, exam_date, start_time, end_time, max_marks, pass_marks, academic_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        name, exam_type || null, class_id, subject_id, exam_date, start_time || null, end_time || null,
        max_marks || 100, pass_marks || 33, academic_year || '2026-2027'
    );
    created(res, db.prepare('SELECT * FROM exams WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/exams/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
    if (!existing) return fail(res, 404, 'Exam not found');
    const merged = { ...existing, ...req.body };
    db.prepare(`UPDATE exams SET name=@name, exam_type=@exam_type, exam_date=@exam_date, start_time=@start_time,
        end_time=@end_time, max_marks=@max_marks, pass_marks=@pass_marks WHERE id=@id`).run(merged);
    ok(res, db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id));
});

router.delete('/exams/:id', (req, res) => {
    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
    ok(res, { deleted: true });
});

/* =========================================================
   MARKS ENTRY
========================================================= */
router.get('/marks', (req, res) => {
    const { exam_id, student_id } = req.query;
    let query = `SELECT m.*, e.name as exam_name, e.max_marks, st.name as student_name, st.roll_no
                 FROM marks m JOIN exams e ON e.id = m.exam_id JOIN students st ON st.id = m.student_id WHERE 1=1`;
    const params = [];
    if (exam_id) { query += ' AND m.exam_id = ?'; params.push(exam_id); }
    if (student_id) { query += ' AND m.student_id = ?'; params.push(student_id); }
    ok(res, db.prepare(query).all(...params));
});

// Bulk marks entry for an exam
router.post('/marks', (req, res) => {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const upsert = db.prepare(`
        INSERT INTO marks (exam_id, student_id, marks_obtained, grade, remarks, entered_by)
        VALUES (@exam_id, @student_id, @marks_obtained, @grade, @remarks, @entered_by)
        ON CONFLICT(exam_id, student_id) DO UPDATE SET
            marks_obtained=excluded.marks_obtained, grade=excluded.grade, remarks=excluded.remarks, entered_by=excluded.entered_by
    `);
    const txn = db.transaction((rows) => {
        for (const r of rows) {
            if (!r.exam_id || !r.student_id || r.marks_obtained === undefined) throw new Error('exam_id, student_id, marks_obtained required');
            const exam = db.prepare('SELECT max_marks FROM exams WHERE id = ?').get(r.exam_id);
            const percent = exam ? (r.marks_obtained / exam.max_marks) * 100 : r.marks_obtained;
            const grade = r.grade || gradeFor(percent);
            upsert.run({
                exam_id: r.exam_id, student_id: r.student_id, marks_obtained: r.marks_obtained,
                grade, remarks: r.remarks || null, entered_by: r.entered_by || null
            });
        }
    });
    try {
        txn(records);
        created(res, { entered: records.length });
    } catch (e) { fail(res, 400, e.message); }
});

/* =========================================================
   GRADE / RESULT SUMMARY
========================================================= */
router.get('/results/student/:studentId', (req, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId);
    if (!student) return fail(res, 404, 'Student not found');
    const rows = db.prepare(`
        SELECT m.marks_obtained, m.grade, e.name as exam_name, e.exam_type, e.max_marks, e.pass_marks, s.name as subject_name
        FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
        WHERE m.student_id = ? ORDER BY e.exam_date
    `).all(req.params.studentId);

    const totalObtained = rows.reduce((sum, r) => sum + r.marks_obtained, 0);
    const totalMax = rows.reduce((sum, r) => sum + r.max_marks, 0);
    const overallPercent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    ok(res, {
        student,
        subjects: rows,
        summary: {
            totalObtained, totalMax,
            overallPercent: Math.round(overallPercent * 100) / 100,
            overallGrade: gradeFor(overallPercent),
            result: overallPercent >= 33 ? 'Pass' : 'Fail'
        }
    });
});

router.get('/results/class-summary/:examId', (req, res) => {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.examId);
    if (!exam) return fail(res, 404, 'Exam not found');
    const rows = db.prepare(`
        SELECT st.id as student_id, st.name as student_name, st.roll_no, m.marks_obtained, m.grade
        FROM students st
        LEFT JOIN marks m ON m.student_id = st.id AND m.exam_id = ?
        WHERE st.class_id = ?
        ORDER BY st.roll_no
    `).all(req.params.examId, exam.class_id);
    ok(res, { exam, results: rows });
});

/* =========================================================
   RANK & PERFORMANCE
========================================================= */
router.get('/rank/:examId', (req, res) => {
    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.examId);
    if (!exam) return fail(res, 404, 'Exam not found');
    const rows = db.prepare(`
        SELECT st.id as student_id, st.name as student_name, st.roll_no, m.marks_obtained, m.grade
        FROM marks m JOIN students st ON st.id = m.student_id
        WHERE m.exam_id = ? ORDER BY m.marks_obtained DESC
    `).all(req.params.examId);

    let rank = 0, prevMarks = null, position = 0;
    const ranked = rows.map((r) => {
        position++;
        if (r.marks_obtained !== prevMarks) { rank = position; prevMarks = r.marks_obtained; }
        return { ...r, rank };
    });
    ok(res, { exam, ranking: ranked });
});

// Overall class performance (average marks, top performers) across all exams for a class
router.get('/performance/class/:classId', (req, res) => {
    const classId = req.params.classId;
    const perStudent = db.prepare(`
        SELECT st.id as student_id, st.name as student_name, st.roll_no,
            AVG(m.marks_obtained * 100.0 / e.max_marks) as avg_percent,
            COUNT(m.id) as exams_taken
        FROM students st
        LEFT JOIN marks m ON m.student_id = st.id
        LEFT JOIN exams e ON e.id = m.exam_id
        WHERE st.class_id = ?
        GROUP BY st.id
        ORDER BY avg_percent DESC
    `).all(classId);

    const perSubject = db.prepare(`
        SELECT s.name as subject_name, AVG(m.marks_obtained * 100.0 / e.max_marks) as avg_percent
        FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
        WHERE e.class_id = ?
        GROUP BY s.id
    `).all(classId);

    ok(res, { perStudent, perSubject });
});

/* =========================================================
   MERIT LIST
========================================================= */
router.get('/merit-list/:classId', (req, res) => {
    const { academic_year } = req.query;
    const classId = req.params.classId;
    const rows = db.prepare(`
        SELECT st.id as student_id, st.name as student_name, st.roll_no,
            SUM(m.marks_obtained) as total_obtained,
            SUM(e.max_marks) as total_max
        FROM students st
        JOIN marks m ON m.student_id = st.id
        JOIN exams e ON e.id = m.exam_id
        WHERE st.class_id = ? ${academic_year ? 'AND e.academic_year = ?' : ''}
        GROUP BY st.id
        ORDER BY total_obtained DESC
    `).all(...(academic_year ? [classId, academic_year] : [classId]));

    const meritList = rows.map((r, idx) => ({
        rank: idx + 1,
        ...r,
        percent: r.total_max > 0 ? Math.round((r.total_obtained / r.total_max) * 10000) / 100 : 0
    }));
    ok(res, meritList);
});

/* =========================================================
   REPORT CARD GENERATION
========================================================= */
router.get('/report-card/:studentId', (req, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.studentId);
    if (!student) return fail(res, 404, 'Student not found');
    const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(student.class_id);

    const subjectMarks = db.prepare(`
        SELECT s.name as subject_name, e.name as exam_name, e.exam_type, m.marks_obtained, e.max_marks, m.grade
        FROM marks m JOIN exams e ON e.id = m.exam_id JOIN subjects s ON s.id = e.subject_id
        WHERE m.student_id = ? ORDER BY s.name, e.exam_date
    `).all(req.params.studentId);

    // group by subject
    const bySubject = {};
    for (const row of subjectMarks) {
        if (!bySubject[row.subject_name]) bySubject[row.subject_name] = [];
        bySubject[row.subject_name].push(row);
    }

    const totalObtained = subjectMarks.reduce((s, r) => s + r.marks_obtained, 0);
    const totalMax = subjectMarks.reduce((s, r) => s + r.max_marks, 0);
    const overallPercent = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    const attendance = db.prepare(`
        SELECT status, COUNT(*) as count FROM student_attendance WHERE student_id = ? GROUP BY status
    `).all(req.params.studentId);

    ok(res, {
        student,
        class: cls,
        subjects: bySubject,
        overall: {
            totalObtained, totalMax,
            percent: Math.round(overallPercent * 100) / 100,
            grade: gradeFor(overallPercent),
            result: overallPercent >= 33 ? 'Pass' : 'Fail'
        },
        attendance,
        generatedOn: new Date().toISOString()
    });
});

/* GRADE SCALE reference */
router.get('/grade-scale', (req, res) => {
    ok(res, db.prepare('SELECT * FROM grade_scale ORDER BY min_percent DESC').all());
});

module.exports = router;
