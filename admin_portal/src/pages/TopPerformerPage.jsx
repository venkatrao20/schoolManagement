import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses, getStudentsForClass, isClassTeacherOf } from "../utils/permissions";
import { getAssignmentFor } from "../data/teacherAssignments";
import {
  getTopPerformers,
  getExamNamesForClass,
  getClassWideRankingForExam,
  getClassOverallRanking,
} from "../services/teacherDataService";

function medalFor(rank) {
  if (rank === 0) return "🥇";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return null;
}

// Reusable ranked table — used both for the "your subject" view and the
// class-wide, all-subject exam views.
function RankingTable({ ranked, extraColumn }) {
  if (ranked.length === 0) {
    return (
      <p className="upload-instructions">No marks saved yet for this selection.</p>
    );
  }
  return (
    <div className="table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Admission No.</th>
            <th>Student Name</th>
            {extraColumn && <th>{extraColumn.label}</th>}
            <th>Average %</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((s, idx) => (
            <tr key={s.admissionNumber}>
              <td>{medalFor(idx) || idx + 1}</td>
              <td>{s.admissionNumber}</td>
              <td>{s.name}</td>
              {extraColumn && <td>{extraColumn.value(s)}</td>}
              <td>
                <span className="status-badge status-valid">{s.percentage.toFixed(1)}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopPerformerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignedClasses = getAssignedClasses(user);
  const assignment = getAssignmentFor(user?.staffId);
  const subject = assignment?.subject || "";

  const [classSection, setClassSection] = useState(assignedClasses[0] || "");
  const [selectedExam, setSelectedExam] = useState("__overall__");

  const handleClassChange = (c) => {
    setClassSection(c);
    setSelectedExam("__overall__");
  };

  const students = classSection ? getStudentsForClass(user, classSection) : [];

  // --- Your own subject, aggregated across every exam you've recorded ---
  const subjectRanked = classSection ? getTopPerformers(classSection, subject, students) : [];
  const subjectTop = subjectRanked[0];

  // --- Class teacher only: every subject, exam by exam ---
  const isClassTeacher = classSection && isClassTeacherOf(user, classSection);
  const classExamNames = isClassTeacher ? getExamNamesForClass(classSection) : [];

  let classRanked = [];
  let subjectsRecorded = [];
  if (isClassTeacher) {
    if (selectedExam === "__overall__") {
      classRanked = getClassOverallRanking(classSection, students);
    } else {
      const result = getClassWideRankingForExam(classSection, selectedExam, students);
      classRanked = result.ranked;
      subjectsRecorded = result.subjectsRecorded;
    }
  }
  const classTop = classRanked[0];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Top Performer</h1>
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

            {/* ---- Your subject ---- */}
            <h3 style={{ marginTop: 8 }}>Your Subject — {subject}</h3>
            <p className="view-only-label">Ranked by average marks across all saved exams.</p>

            {subjectTop && (
              <div className="admin-nav-card" style={{ marginBottom: 20, cursor: "default" }}>
                <h3>🏆 {subjectTop.name}</h3>
                <p>
                  Top performer in {classSection} for {subject} with{" "}
                  {subjectTop.percentage.toFixed(1)}% average across {subjectTop.examsCounted} exam
                  {subjectTop.examsCounted === 1 ? "" : "s"}.
                </p>
              </div>
            )}
            <RankingTable ranked={subjectRanked} />

            {/* ---- Class-wide, all subjects (class teacher only) ---- */}
            {isClassTeacher && (
              <>
                <h3 style={{ marginTop: 32 }}>
                  Class-Wide Rankings — All Subjects ({classSection})
                </h3>
                <p className="view-only-label">
                  As class teacher of {classSection}, ranks below combine marks from every
                  subject teacher for the exam selected — any class tests, Test 1, Test 2, Mid
                  Term Exam, Test 3, Test 4, and the Final Exam.
                </p>

                {classExamNames.length === 0 ? (
                  <p className="upload-instructions">
                    No marks have been recorded for {classSection} in any subject yet.
                  </p>
                ) : (
                  <>
                    <div className="tabs" style={{ marginTop: 8 }}>
                      <button
                        className={`tab-btn ${selectedExam === "__overall__" ? "tab-btn-active" : ""}`}
                        onClick={() => setSelectedExam("__overall__")}
                      >
                        Overall (All Exams)
                      </button>
                      {classExamNames.map((name) => (
                        <button
                          key={name}
                          className={`tab-btn ${selectedExam === name ? "tab-btn-active" : ""}`}
                          onClick={() => setSelectedExam(name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>

                    {selectedExam !== "__overall__" && (
                      <p className="view-only-label">
                        {subjectsRecorded.length > 0
                          ? `Subjects counted for ${selectedExam}: ${subjectsRecorded.join(", ")}.`
                          : `No subject has recorded marks for ${selectedExam} yet.`}
                      </p>
                    )}

                    {classTop && (
                      <div className="admin-nav-card" style={{ marginBottom: 20, cursor: "default" }}>
                        <h3>🏆 {classTop.name}</h3>
                        <p>
                          Top performer in {classSection} for{" "}
                          {selectedExam === "__overall__" ? "all exams combined" : selectedExam}{" "}
                          with {classTop.percentage.toFixed(1)}% average.
                        </p>
                      </div>
                    )}

                    <RankingTable
                      ranked={classRanked}
                      extraColumn={
                        selectedExam === "__overall__"
                          ? { label: "Exams Counted", value: (s) => s.examsCounted }
                          : { label: "Subjects Counted", value: (s) => s.subjectsCounted }
                      }
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TopPerformerPage;
