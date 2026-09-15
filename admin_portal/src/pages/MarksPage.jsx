import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses, getStudentsForClass } from "../utils/permissions";
import { getAssignmentFor } from "../data/teacherAssignments";
import { getSchoolInfo, saveSchoolInfo } from "../services/schoolInfoService";
import { getSubjectsForBoard, getBoardLabel } from "../data/subjectsByBoard";
import {
  getMarks,
  saveMarks,
  getExamNamesFor,
  STANDARD_EXAM_NAMES,
} from "../services/teacherDataService";

// Boards offered in the quick switcher below — same set as
// SCHOOL_INFO_SCHEMA's affiliationBoard options.
const BOARD_OPTIONS = ["CBSE", "ICSE", "State Board", "IB", "Other"];

function MarksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignedClasses = getAssignedClasses(user);
  const assignment = getAssignmentFor(user?.staffId);
  const assignedSubject = assignment?.subject || "";

  // The school's affiliation board (CBSE, ICSE, State Board, IB) drives
  // which 6 subjects show up here. It's a single school-wide setting
  // (also editable on the School Information screen) — changing it here
  // updates it everywhere, since it's the same stored record.
  const [board, setBoard] = useState(() => getSchoolInfo()?.affiliationBoard || "CBSE");
  const boardSubjects = getSubjectsForBoard(board);

  const [classSection, setClassSection] = useState(assignedClasses[0] || "");
  const [examName, setExamName] = useState("Unit Test 1");
  const [maxMarks, setMaxMarks] = useState(50);
  // scores is now keyed by admissionNumber -> { [subject]: value }, so
  // every student has a mark for every one of the board's subjects.
  const [scores, setScores] = useState({});
  const [saved, setSaved] = useState(false);

  const students = classSection ? getStudentsForClass(user, classSection) : [];
  const existingExams = classSection ? getExamNamesFor(classSection, assignedSubject) : [];
  const examOptions = [
    ...STANDARD_EXAM_NAMES,
    ...existingExams.filter((e) => !STANDARD_EXAM_NAMES.includes(e)),
  ];

  // Loads marks for every subject on the current board's list, for the
  // given class + exam, and merges them into the per-student/per-subject
  // scores grid.
  const loadFor = (nextClass, nextBoard, nextExam) => {
    const subjects = getSubjectsForBoard(nextBoard);
    const merged = {};
    subjects.forEach((subj) => {
      const record = getMarks(nextClass, subj, nextExam);
      Object.entries(record).forEach(([admissionNumber, value]) => {
        if (!merged[admissionNumber]) merged[admissionNumber] = {};
        merged[admissionNumber][subj] = value;
      });
    });
    setScores(merged);
    setSaved(false);
  };

  // Load once on first mount so the grid is populated without requiring
  // the teacher to first switch class or board.
  useEffect(() => {
    if (classSection) loadFor(classSection, board, examName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleClassChange = (value) => {
    setClassSection(value);
    loadFor(value, board, examName);
  };

  // Changing the syllabus/board here updates the same School Information
  // record read across the app, so the new subject list applies
  // everywhere immediately — not just on this page.
  const handleBoardChange = (value) => {
    setBoard(value);
    const existing = getSchoolInfo() || {};
    saveSchoolInfo({ ...existing, affiliationBoard: value });
    loadFor(classSection, value, examName);
  };

  const handleExamChange = (value) => {
    setExamName(value);
    loadFor(classSection, board, value);
  };

  const setScore = (admissionNumber, subject, value) => {
    setScores((prev) => ({
      ...prev,
      [admissionNumber]: { ...prev[admissionNumber], [subject]: value },
    }));
    setSaved(false);
  };

  // Saves one mark record per subject (same storage shape as before —
  // one record per classSection/subject/examName), built from this
  // subject's column across every student.
  const handleSave = () => {
    boardSubjects.forEach((subj) => {
      const subjectScores = {};
      students.forEach((s) => {
        const value = scores[s.admissionNumber]?.[subj];
        if (value !== undefined && value !== "") {
          subjectScores[s.admissionNumber] = value;
        }
      });
      saveMarks(classSection, subj, examName, subjectScores, maxMarks);
    });
    setSaved(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Student Marks</h1>
        <button className="logout-btn" onClick={() => navigate("/teacher-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        {assignedClasses.length === 0 ? (
          <p className="upload-instructions">You have no assigned classes yet.</p>
        ) : (
          <>
            <div className="tabs">
              {assignedClasses.map((c) => (
                <button
                  key={c}
                  className={`tab-btn ${classSection === c ? "tab-btn-active" : ""}`}
                  onClick={() => handleClassChange(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              <div className="form-field" style={{ maxWidth: 200 }}>
                <label>Syllabus / Board</label>
                <select value={board} onChange={(e) => handleBoardChange(e.target.value)}>
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {getBoardLabel(b)}
                    </option>
                  ))}
                </select>
                <span className="view-only-label" style={{ marginTop: 4, display: "block" }}>
                  Changes the school's board everywhere, not just here.
                </span>
              </div>
              <div className="form-field" style={{ maxWidth: 260 }}>
                <label>Exam / Test Name</label>
                <input
                  type="text"
                  list="exam-options"
                  value={examName}
                  onChange={(e) => handleExamChange(e.target.value)}
                />
                <datalist id="exam-options">
                  {examOptions.map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
                <span className="view-only-label" style={{ marginTop: 4, display: "block" }}>
                  Pick a standard exam or type a custom name, e.g. "Class Test — Ch 4".
                </span>
              </div>
              <div className="form-field" style={{ maxWidth: 140 }}>
                <label>Max Marks</label>
                <input
                  type="number"
                  min="1"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                />
              </div>
            </div>

            {students.length === 0 ? (
              <p className="upload-instructions">No students found for {classSection}.</p>
            ) : (
              <>
                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Admission No.</th>
                        <th>Student Name</th>
                        {boardSubjects.map((subj) => (
                          <th key={subj}>{subj}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.admissionNumber}>
                          <td>{s.admissionNumber}</td>
                          <td>
                            {s.firstName} {s.lastName}
                          </td>
                          {boardSubjects.map((subj) => (
                            <td key={subj}>
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                style={{ width: 70 }}
                                value={scores[s.admissionNumber]?.[subj] ?? ""}
                                onChange={(e) => setScore(s.admissionNumber, subj, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-actions">
                  <button className="primary-btn" onClick={handleSave}>
                    Save Marks
                  </button>
                  {saved && (
                    <span className="save-confirm">
                      Marks saved for {examName} — {classSection} ({getBoardLabel(board)}).
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MarksPage;
