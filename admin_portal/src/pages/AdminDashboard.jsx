import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="dashboard-content">
        <p>Welcome, {user?.name || "Admin"}!</p>
        <p>You have access to all administrative activities here.</p>

        <div className="admin-nav-grid">
          <div className="admin-nav-card" onClick={() => navigate("/school-info")}>
            <h3>School Information</h3>
            <p>Maintain the school's basic profile — name, board, contact & address.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/classes")}>
            <h3>Manage Classes</h3>
            <p>Create and maintain the classes that make up the academic structure.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/sections")}>
            <h3>Manage Sections</h3>
            <p>Create and maintain the sections under each class.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/data-upload")}>
            <h3>Upload School Data</h3>
            <p>Bulk upload students, parents, teachers & staff using approved templates.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/view-records")}>
            <h3>View Records</h3>
            <p>Browse previously uploaded student, parent, and staff records.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/add-record/student")}>
            <h3>Add a Student</h3>
            <p>Add one student record directly, without a file upload.</p>
          </div>
          <div className="admin-nav-card" onClick={() => navigate("/manage-passwords")}>
            <h3>Manage Passwords</h3>
            <p>Reset the login password for any Teacher or Admin account if they forget it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
