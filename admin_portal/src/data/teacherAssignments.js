import { SEED_DATA } from "./schoolDataSchemas";
import { getSubjectsForBoard } from "./subjectsByBoard";

// Assignment data for the Teacher module.
// Sprint scope: Attendance, Homework, Timetable & Marks (owner: Teacher module).
//
// Each teacher account is assigned one or more class-sections (from the same
// 16 class-sections used in schoolDataSchemas: 1-A .. 8-B) and a subject.
// This is what enforces "teachers can access only the classes and students
// assigned to them" — see utils/permissions.js.
//
// Generated from the same seeded staff records (SEED_DATA.staff) that back
// the login accounts in authService.js and the records shown in View
// Records, so a teacher's login, name, and class assignment always agree.
export const TEACHER_ASSIGNMENTS = Object.fromEntries(
  SEED_DATA.staff
    .filter((s) => s.classTeacherOf)
    .map((s) => [
      s.staffId,
      {
        name: `${s.firstName} ${s.lastName}`,
        subject: s.subject,
        classes: [s.classTeacherOf],
        isClassTeacherOf: s.classTeacherOf,
      },
    ])
);

export function getAssignmentFor(staffId) {
  return TEACHER_ASSIGNMENTS[staffId] || null;
}

// Days used for the timetable grid.
export const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const TIMETABLE_PERIODS = [
  "Period 1 (9:00–9:45)",
  "Period 2 (9:45–10:30)",
  "Period 3 (10:45–11:30)",
  "Period 4 (11:30–12:15)",
  "Period 5 (1:00–1:45)",
  "Period 6 (1:45–2:30)",
];

// Deterministic mock timetable so each teacher sees a stable, believable
// weekly schedule across their assigned classes without needing a backend.
export function getTimetableFor(staffId) {
  const assignment = getAssignmentFor(staffId);
  if (!assignment) return [];

  const entries = [];
  let slot = 0;
  TIMETABLE_DAYS.forEach((day) => {
    TIMETABLE_PERIODS.forEach((period, periodIdx) => {
      // Roughly 1 in 3 slots is a free period for this teacher.
      if ((slot + periodIdx) % 3 === 0) {
        slot += 1;
        return;
      }
      const classSection = assignment.classes[slot % assignment.classes.length];
      entries.push({
        day,
        period,
        classSection,
        subject: assignment.subject,
      });
      slot += 1;
    });
  });
  return entries;
}

// Today's weekday name, matching the values used in TIMETABLE_DAYS
// ("Monday".."Saturday"). Returns "Sunday" on the one remaining day, which
// simply won't match anything in TIMETABLE_DAYS.
export function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

// A full weekly timetable for a class-section — every period across every
// subject the board's syllabus teaches, not just one teacher's own
// subject. Rotates through the board's subject list (CBSE/ICSE/State
// Board/IB — see subjectsByBoard.js) across the week's periods, so
// switching the school's board immediately changes which subjects appear
// here. The last period each day is reserved as a free/activity period,
// matching a typical school day.
//
// Deterministic per class-section (same seed every reload) so the
// schedule looks stable rather than reshuffling on every page visit.
export function getClassTimetable(classSection, board) {
  const subjects = getSubjectsForBoard(board);
  if (!classSection || subjects.length === 0) return [];

  // Offset the starting subject by the class-section string so different
  // classes don't all show an identical subject order.
  let offset = 0;
  for (let i = 0; i < classSection.length; i++) {
    offset += classSection.charCodeAt(i);
  }

  const entries = [];
  let slot = 0;
  TIMETABLE_DAYS.forEach((day) => {
    TIMETABLE_PERIODS.forEach((period, periodIdx) => {
      // Last period of the day is a free/activity period for every class.
      if (periodIdx === TIMETABLE_PERIODS.length - 1) {
        entries.push({ day, period, classSection, subject: null });
        return;
      }
      const subject = subjects[(slot + offset) % subjects.length];
      entries.push({ day, period, classSection, subject });
      slot += 1;
    });
  });
  return entries;
}

// This teacher's periods for today only, in period order — what a teacher
// actually wants to see the moment they log in: "what classes do I have
// today". Empty on weekends or on a fully free day.
export function getTodaysEntriesFor(staffId) {
  const today = getTodayName();
  const entries = getTimetableFor(staffId).filter((e) => e.day === today);
  return TIMETABLE_PERIODS
    .map((period) => entries.find((e) => e.period === period))
    .filter(Boolean);
}
