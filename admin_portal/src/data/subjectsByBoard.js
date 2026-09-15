// Subject lists per affiliation board (matches SCHOOL_INFO_SCHEMA's
// affiliationBoard options: CBSE, ICSE, State Board, IB, Other).
// Used on the teacher Marks page so the subjects offered for an exam match
// the syllabus the school's board actually teaches, instead of a single
// hardcoded subject list.
//
// Six core subjects per board, at primary/middle-school level (classes 1-8,
// matching SEED_CLASSES in classSectionSchema.js).

export const SUBJECTS_BY_BOARD = {
  CBSE: [
    "English",
    "Hindi",
    "Mathematics",
    "Science",
    "Social Studies",
    "Computer Science",
  ],
  ICSE: [
    "English",
    "Second Language",
    "Mathematics",
    "Science",
    "History & Civics",
    "Computer Applications",
  ],
  "State Board": [
    "First Language (Regional)",
    "English",
    "Mathematics",
    "Science",
    "Social Science",
    "Computer Science",
  ],
  IB: [
    "Language & Literature",
    "Language Acquisition",
    "Mathematics",
    "Sciences",
    "Individuals & Societies",
    "Arts",
  ],
};

// Fallback list used for "Other" or any unrecognised board value, so the
// Marks page never renders with zero subjects.
export const DEFAULT_SUBJECTS = [
  "English",
  "Second Language",
  "Mathematics",
  "Science",
  "Social Studies",
  "Computer Science",
];

export function getSubjectsForBoard(board) {
  return SUBJECTS_BY_BOARD[board] || DEFAULT_SUBJECTS;
}

// Display labels for each board's stored value. The stored value (e.g.
// "ICSE") never changes — it's the key used for SUBJECTS_BY_BOARD lookups
// and is saved in School Information — but the label shown to users in
// dropdowns should read "CISCE (ICSE/ISC)" rather than the bare "ICSE",
// since CISCE is the actual board name and ICSE/ISC are the exams it runs.
export const BOARD_LABELS = {
  CBSE: "CBSE",
  ICSE: "CISCE (ICSE/ISC)",
  "State Board": "State Board",
  IB: "IB",
  Other: "Other",
};

export function getBoardLabel(board) {
  return BOARD_LABELS[board] || board;
}
