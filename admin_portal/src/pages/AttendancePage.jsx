import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses, getStudentsForClass } from "../utils/permissions";
import { getAttendance, saveAttendance } from "../services/teacherDataService";

const STATUSES = ["Present", "Absent", "Late"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignedClasses = getAssignedClasses(user);

  const [classSection, setClassSection] = useState(assignedClasses[0] || "");
  const [date, setDate] = useState(todayISO());
  const [statuses, setStatuses] = useState(() =>
    classSection ? getAttendance(classSection, todayISO()) : {}
  );
  const [saved, setSaved] = useState(false);

  const students = classSection ? getStudentsForClass(user, classSection) : [];

  const loadFor = (nextClass, nextDate) => {
    setStatuses(getAttendance(nextClass, nextDate));
    setSaved(false);
  };

  const handleClassChange = (value) => {
    setClassSection(value);
    loadFor(value, date);
  };

  const handleDateChange = (value) => {
    setDate(value);
    loadFor(classSection, value);
  };

  const setStatus = (admissionNumber, status) => {
    setStatuses((prev) => ({ ...prev, [admissionNumber]: status }));
    setSaved(false);
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((s) => {
      next[s.admissionNumber] = status;
    });
    setStatuses(next);
    setSaved(false);
  };

  const handleSave = () => {
    saveAttendance(classSection, date, statuses, user?.name);
    setSaved(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Attendance</h1>
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

            <div className="form-field" style={{ maxWidth: 220, marginBottom: 16 }}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} />
            </div>

            {students.length === 0 ? (
              <p className="upload-instructions">No students found for {classSection}.</p>
            ) : (
              <>
                <div className="upload-actions">
                  <button className="secondary-btn" onClick={() => markAll("Present")}>
                    Mark All Present
                  </button>
                  <button className="secondary-btn" onClick={() => markAll("Absent")}>
                    Mark All Absent
                  </button>
                </div>

                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Admission No.</th>
                        <th>Student Name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.admissionNumber}>
                          <td>{s.admissionNumber}</td>
                          <td>
                            {s.firstName} {s.lastName}
                          </td>
                          <td>
                            <div className="tabs" style={{ marginBottom: 0 }}>
                              {STATUSES.map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  className={`tab-btn ${
                                    statuses[s.admissionNumber] === st ? "tab-btn-active" : ""
                                  }`}
                                  onClick={() => setStatus(s.admissionNumber, st)}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="form-actions">
                  <button className="primary-btn" onClick={handleSave}>
                    Save Attendance
                  </button>
                  {saved && <span className="save-confirm">Attendance saved for {date}.</span>}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AttendancePage;
