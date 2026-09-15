import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Unauthorized() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="unauthorized-container">
      <h1>Access Denied</h1>
      <p>You don't have permission to view this page.</p>
      <button className="logout-btn" onClick={handleBackToLogin}>
        Back to Login
      </button>
    </div>
  );
}

export default Unauthorized;
