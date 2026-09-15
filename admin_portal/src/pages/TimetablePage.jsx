import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses } from "../utils/permissions";
import {
  getAssignmentFor,
  getClassTimetable,
  TIMETABLE_DAYS,
  TIMETABLE_PERIODS,
  getTodayName,
} from "../data/teacherAssignments";
import { getSchoolInfo } from "../services/schoolInfoService";

function TimetablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignedClasses = getAssignedClasses(user);
  const assignment = getAssignmentFor(user?.staffId);
  const ownSubject = assignment?.subject || "";

  // Which board's syllabus to draw subjects from — same School Information
  // record used everywhere else, so this timetable always matches
  // whatever board is currently set (CBSE/ICSE/State Board/IB).
  const board = getSchoolInfo()?.affiliationBoard || "CBSE";

  const [classSection, setClassSection] = useState(assignedClasses[0] || "");
  const todayName = getTodayName();
  const entries = classSection ? getClassTimetable(classSection, board) : [];

  const findEntry = (day, period) =>
    entries.find((e) => e.day === day && e.period === period);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Timetable</h1>
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
                  onClick={() => setClassSection(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <p className="view-only-label" style={{ marginBottom: 16 }}>
              Full weekly timetable for {classSection} — {board} syllabus. Your own
              subject ({ownSubject || "—"}) is highlighted.
            </p>

            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    {TIMETABLE_DAYS.map((d) => (
                      <th
                        key={d}
                        style={
                          d === todayName
                            ? { background: "#eef2ff", color: "#3730a3" }
                            : undefined
                        }
                      >
                        {d}
                        {d === todayName ? " (Today)" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIMETABLE_PERIODS.map((period) => (
                    <tr key={period}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{period}</td>
                      {TIMETABLE_DAYS.map((day) => {
                        const entry = findEntry(day, period);
                        const isOwnSubject = entry?.subject === ownSubject;
                        return (
                          <td
                            key={day}
                            style={day === todayName ? { background: "#f5f7ff" } : undefined}
                          >
                            {entry?.subject ? (
                              <span
                                className={`status-badge ${
                                  isOwnSubject ? "status-valid" : "status-duplicate"
                                }`}
                              >
                                {entry.subject}
                              </span>
                            ) : (
                              <span className="view-only-label">Free / Activity</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TimetablePage;
