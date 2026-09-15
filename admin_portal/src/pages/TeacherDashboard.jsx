import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses } from "../utils/permissions";

function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const assignedClasses = getAssignedClasses(user);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="dashboard-content">
        <p>Welcome, {user?.name || "Teacher"}!</p>
        <p>
          Your assigned classes:{" "}
          {assignedClasses.length > 0 ? (
            assignedClasses.map((c) => (
              <span className="summary-chip summary-total" key={c} style={{ marginRight: 8 }}>
                {c}
              </span>
            ))
          ) : (
            <span className="view-only-label">No classes assigned yet.</span>
          )}
        </p>

        <div className="admin-nav-grid">
          <div className="admin-nav-card" onClick={() => navigate("/teacher/attendance")}>
            <h3>Attendance</h3>
            <p>Mark and update attendance for your assigned classes.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/teacher/homework")}>
            <h3>Homework</h3>
            <p>Create and share homework or assignments with your classes.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/teacher/timetable")}>
            <h3>Timetable</h3>
            <p>View your full weekly teaching schedule.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/teacher/marks")}>
            <h3>Student Marks</h3>
            <p>Enter and update marks for your assigned classes.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/teacher/top-performer")}>
            <h3>Top Performer</h3>
            <p>
              See ranks for your subject, plus — for classes where you're the class
              teacher — rankings across all subjects for every test and exam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
