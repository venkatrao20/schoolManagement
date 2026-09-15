// Central place for "who can do what" logic on records.

import { getAssignmentFor } from "../data/teacherAssignments";
import { SAMPLE_DATA } from "../data/schoolDataSchemas";
import { getRecords } from "../services/schoolDataService";

export function canDeleteRecord(user) {
  return user?.role === "ADMIN";
}

// ---------------------------------------------------------------------
// Teacher module: a teacher may only see/act on the classes (and the
// students within them) they are assigned to. This is the single place
// that decides that scope, so every teacher page enforces it the same way.
// ---------------------------------------------------------------------

export function isTeacher(user) {
  return user?.role === "TEACHER";
}

export function getAssignedClasses(user) {
  if (!isTeacher(user)) return [];
  const assignment = getAssignmentFor(user.staffId);
  return assignment ? assignment.classes : [];
}

export function canAccessClass(user, classSection) {
  return getAssignedClasses(user).includes(classSection);
}

// True if this teacher is the class teacher (form teacher) of the given
// class-section — the one person who should see rankings across every
// subject for that class, not just their own subject.
export function isClassTeacherOf(user, classSection) {
  if (!isTeacher(user)) return false;
  const assignment = getAssignmentFor(user.staffId);
  return !!assignment && assignment.isClassTeacherOf === classSection;
}

// Students in a given "class-section" (e.g. "5-A"), scoped to what the
// teacher is authorized to see.
export function getStudentsForClass(user, classSection) {
  if (!canAccessClass(user, classSection)) return [];
  const [cls, section] = classSection.split("-");
  const uploaded = getRecords("student");
  const pool = uploaded.length > 0 ? uploaded : SAMPLE_DATA.student;
  return pool.filter((s) => s.class === cls && s.section === section);
}

