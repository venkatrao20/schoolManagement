// Mock persistence for the Teacher module (Attendance, Homework, Marks).
// Same pattern as schoolDataService.js — swap for real API calls once a
// backend is available.

const KEYS = {
  attendance: "teacher_attendance",
  homework: "teacher_homework",
  homeworkSubmissions: "teacher_homework_submissions",
  marks: "teacher_marks",
};

function readAll(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function writeAll(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

// ---------------------------------------------------------------------
// Attendance — one record per (classSection, date), holding a status per
// student admission number: "Present" | "Absent" | "Late".
// ---------------------------------------------------------------------

export function getAttendance(classSection, date) {
  const all = readAll(KEYS.attendance);
  const found = all.find((a) => a.classSection === classSection && a.date === date);
  return found ? found.statuses : {};
}

export function saveAttendance(classSection, date, statuses, markedBy) {
  const all = readAll(KEYS.attendance);
  const idx = all.findIndex((a) => a.classSection === classSection && a.date === date);
  const record = { classSection, date, statuses, markedBy, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  return writeAll(KEYS.attendance, all);
}

// ---------------------------------------------------------------------
// Homework — a flat list of assignments, each scoped to a classSection.
// Each record can carry a subject/board, attachments (file metadata or a
// link), marks/points, submission instructions, and a draft/published
// status. Per-student submission tracking lives in its own store below,
// keyed by homeworkId, so it survives edits to the homework itself.
// ---------------------------------------------------------------------

export const HOMEWORK_STATUS = { DRAFT: "draft", PUBLISHED: "published" };

export const ATTACHMENT_TYPES = { PDF: "pdf", IMAGE: "image", WORKSHEET: "worksheet", LINK: "link" };

export function getHomework(classSection) {
  const all = readAll(KEYS.homework);
  return classSection ? all.filter((h) => h.classSection === classSection) : all;
}

export function getHomeworkById(id) {
  return readAll(KEYS.homework).find((h) => h.id === id) || null;
}

export function addHomework(homework) {
  const all = readAll(KEYS.homework);
  const now = new Date().toISOString();
  all.push({
    status: HOMEWORK_STATUS.PUBLISHED,
    attachments: [],
    marks: "",
    submissionInstructions: "",
    ...homework,
    id: `HW${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  });
  return writeAll(KEYS.homework, all);
}

export function updateHomework(id, updated) {
  const all = readAll(KEYS.homework);
  const idx = all.findIndex((h) => h.id === id);
  if (idx < 0) return all;
  all[idx] = { ...all[idx], ...updated, id, updatedAt: new Date().toISOString() };
  return writeAll(KEYS.homework, all);
}

// Creates a copy of an existing homework as a new draft, ready to be
// reviewed and rescheduled instead of re-typed from scratch. Submission
// tracking is never copied — a duplicate starts with a clean slate.
export function duplicateHomework(id) {
  const all = readAll(KEYS.homework);
  const source = all.find((h) => h.id === id);
  if (!source) return all;
  const now = new Date().toISOString();
  const copy = {
    ...source,
    id: `HW${Date.now()}`,
    title: `${source.title} (Copy)`,
    status: HOMEWORK_STATUS.DRAFT,
    createdAt: now,
    updatedAt: now,
  };
  all.push(copy);
  return writeAll(KEYS.homework, all);
}

export function deleteHomework(id) {
  const all = readAll(KEYS.homework).filter((h) => h.id !== id);
  writeAll(KEYS.homework, all);
  // Cascade-delete any submission tracking for the removed homework so
  // stale records don't pile up under a homeworkId that no longer exists.
  const submissions = readAll(KEYS.homeworkSubmissions).filter((s) => s.homeworkId !== id);
  return writeAll(KEYS.homeworkSubmissions, submissions);
}

// True if a published homework's due date has passed and at least one
// student hasn't submitted yet. Drafts are never "overdue" since they
// haven't been shared with students.
export function isHomeworkOverdue(homework, todayIso) {
  if (!homework || homework.status !== HOMEWORK_STATUS.PUBLISHED || !homework.dueDate) return false;
  return homework.dueDate < todayIso;
}

// ---------------------------------------------------------------------
// Homework submission tracking — one record per (homeworkId, admissionNumber).
// Students not yet recorded are implicitly "pending".
// ---------------------------------------------------------------------

export const SUBMISSION_STATUS = { PENDING: "pending", SUBMITTED: "submitted", LATE: "late", REVIEWED: "reviewed" };

export function getSubmissionsForHomework(homeworkId) {
  return readAll(KEYS.homeworkSubmissions).filter((s) => s.homeworkId === homeworkId);
}

// Merges tracked submissions with the full student roster, so every
// student in the class shows up even if no record has been saved for
// them yet (they default to "pending").
export function getSubmissionRows(homeworkId, students) {
  const tracked = getSubmissionsForHomework(homeworkId);
  return students.map((s) => {
    const found = tracked.find((t) => t.admissionNumber === s.admissionNumber);
    return {
      admissionNumber: s.admissionNumber,
      name: `${s.firstName} ${s.lastName}`,
      status: found?.status || SUBMISSION_STATUS.PENDING,
      submittedAt: found?.submittedAt || "",
      grade: found?.grade ?? "",
      feedback: found?.feedback || "",
    };
  });
}

export function setSubmission(homeworkId, admissionNumber, patch) {
  const all = readAll(KEYS.homeworkSubmissions);
  const idx = all.findIndex((s) => s.homeworkId === homeworkId && s.admissionNumber === admissionNumber);
  const base = idx >= 0 ? all[idx] : { homeworkId, admissionNumber, status: SUBMISSION_STATUS.PENDING };
  const record = { ...base, ...patch, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  return writeAll(KEYS.homeworkSubmissions, all);
}

// Counts for the summary chips shown on each homework row.
export function getSubmissionSummary(homeworkId, students) {
  const rows = getSubmissionRows(homeworkId, students);
  const summary = { total: rows.length, pending: 0, submitted: 0, late: 0, reviewed: 0 };
  rows.forEach((r) => {
    summary[r.status] = (summary[r.status] || 0) + 1;
  });
  return summary;
}

// ---------------------------------------------------------------------
// Marks — one record per (classSection, subject, examName), holding a
// mark per student admission number.
// ---------------------------------------------------------------------

export function getMarks(classSection, subject, examName) {
  const all = readAll(KEYS.marks);
  const found = all.find(
    (m) => m.classSection === classSection && m.subject === subject && m.examName === examName
  );
  return found ? found.scores : {};
}

export function saveMarks(classSection, subject, examName, scores, maxMarks) {
  const all = readAll(KEYS.marks);
  const idx = all.findIndex(
    (m) => m.classSection === classSection && m.subject === subject && m.examName === examName
  );
  const record = {
    classSection,
    subject,
    examName,
    maxMarks,
    scores,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  return writeAll(KEYS.marks, all);
}

export function getExamNamesFor(classSection, subject) {
  const all = readAll(KEYS.marks);
  return all
    .filter((m) => m.classSection === classSection && m.subject === subject)
    .map((m) => m.examName);
}

// Standard exam names offered as quick-pick options everywhere an exam name
// is chosen, in the order the school runs them across the year: Test 1 and
// Test 2 lead into the Mid Term Exam, then Test 3 and Test 4 lead into the
// Final Exam. Teachers can still type a custom name for one-off class
// tests — those are ongoing and always shown first, ahead of this fixed
// sequence, in the class-wide ranking views below.
export const STANDARD_EXAM_NAMES = [
  "Test 1",
  "Test 2",
  "Mid Term Exam",
  "Test 3",
  "Test 4",
  "Final Exam",
];

// ---------------------------------------------------------------------
// Class-wide rankings (all subjects) — for the class teacher of a section.
// A subject teacher's Top Performer view is scoped to their own subject;
// the class teacher instead needs, for each exam (Test 1-4, Mid Term Exam,
// Final Exam, and any ad-hoc class tests), a single rank list built from
// every subject's marks for that exam.
// ---------------------------------------------------------------------

// Every exam name that has at least one mark record saved for this class,
// across all subjects. Class tests (any name outside the standard set) are
// ongoing, so they're listed first, in the order they were first recorded;
// the standard Test 1 → Test 2 → Mid Term Exam → Test 3 → Test 4 → Final
// Exam sequence follows after.
export function getExamNamesForClass(classSection) {
  const all = readAll(KEYS.marks);
  const found = new Set(
    all.filter((m) => m.classSection === classSection).map((m) => m.examName)
  );

  const classTests = [...found].filter((name) => !STANDARD_EXAM_NAMES.includes(name));
  const standard = STANDARD_EXAM_NAMES.filter((name) => found.has(name));
  return [...classTests, ...standard];
}

// Every subject that has at least one mark record saved for this class.
export function getSubjectsWithMarksForClass(classSection) {
  const all = readAll(KEYS.marks);
  return [...new Set(all.filter((m) => m.classSection === classSection).map((m) => m.subject))];
}

// Rank every student in the class for a single named exam, combining marks
// from every subject that recorded that exam (e.g. Mid Term across Maths,
// Science, English, ...). Returns the same shape as getTopPerformers, plus
// which subjects were counted in for transparency.
export function getClassWideRankingForExam(classSection, examName, students) {
  const all = readAll(KEYS.marks);
  const records = all.filter((m) => m.classSection === classSection && m.examName === examName);

  const totals = {}; // admissionNumber -> { earned, possible, subjects: Set }
  records.forEach((record) => {
    Object.entries(record.scores || {}).forEach(([admissionNumber, rawScore]) => {
      const score = Number(rawScore);
      if (Number.isNaN(score)) return;
      if (!totals[admissionNumber]) {
        totals[admissionNumber] = { earned: 0, possible: 0, subjects: new Set() };
      }
      totals[admissionNumber].earned += score;
      totals[admissionNumber].possible += Number(record.maxMarks) || 0;
      totals[admissionNumber].subjects.add(record.subject);
    });
  });

  const ranked = students
    .map((s) => {
      const t = totals[s.admissionNumber];
      const percentage = t && t.possible > 0 ? (t.earned / t.possible) * 100 : null;
      return {
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        subjectsCounted: t ? t.subjects.size : 0,
        percentage,
      };
    })
    .filter((s) => s.percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);

  return { subjectsRecorded: [...new Set(records.map((r) => r.subject))], ranked };
}

// Overall class ranking across every subject and every exam recorded so
// far — the class teacher's big-picture view of standing in their class.
export function getClassOverallRanking(classSection, students) {
  const all = readAll(KEYS.marks);
  const records = all.filter((m) => m.classSection === classSection);

  const totals = {}; // admissionNumber -> { earned, possible, examsCounted }
  records.forEach((record) => {
    Object.entries(record.scores || {}).forEach(([admissionNumber, rawScore]) => {
      const score = Number(rawScore);
      if (Number.isNaN(score)) return;
      if (!totals[admissionNumber]) {
        totals[admissionNumber] = { earned: 0, possible: 0, examsCounted: 0 };
      }
      totals[admissionNumber].earned += score;
      totals[admissionNumber].possible += Number(record.maxMarks) || 0;
      totals[admissionNumber].examsCounted += 1;
    });
  });

  return students
    .map((s) => {
      const t = totals[s.admissionNumber];
      const percentage = t && t.possible > 0 ? (t.earned / t.possible) * 100 : null;
      return {
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        examsCounted: t ? t.examsCounted : 0,
        percentage,
      };
    })
    .filter((s) => s.percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);
}

// ---------------------------------------------------------------------
// Top Performer — ranks students in a class by their average percentage
// across every exam recorded for that class/subject so far.
// ---------------------------------------------------------------------

export function getAllMarkRecordsForClass(classSection, subject) {
  const all = readAll(KEYS.marks);
  return all.filter((m) => m.classSection === classSection && m.subject === subject);
}

export function getTopPerformers(classSection, subject, students) {
  const records = getAllMarkRecordsForClass(classSection, subject);

  const totals = {}; // admissionNumber -> { earned, possible, examsCounted }
  records.forEach((record) => {
    Object.entries(record.scores || {}).forEach(([admissionNumber, rawScore]) => {
      const score = Number(rawScore);
      if (Number.isNaN(score)) return;
      if (!totals[admissionNumber]) {
        totals[admissionNumber] = { earned: 0, possible: 0, examsCounted: 0 };
      }
      totals[admissionNumber].earned += score;
      totals[admissionNumber].possible += Number(record.maxMarks) || 0;
      totals[admissionNumber].examsCounted += 1;
    });
  });

  const ranked = students
    .map((s) => {
      const t = totals[s.admissionNumber];
      const percentage = t && t.possible > 0 ? (t.earned / t.possible) * 100 : null;
      return {
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`,
        examsCounted: t ? t.examsCounted : 0,
        percentage,
      };
    })
    .filter((s) => s.percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);

  return ranked;
}
