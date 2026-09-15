import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  listAccounts,
  setPassword,
  resetToDefaultPassword,
} from "../services/userAccountService";

const MIN_LENGTH = 6;

// Admin-only: reset a forgotten password for any Teacher (or the Admin
// account itself). MOCK_MODE stores the override in localStorage and
// authService checks it on the next login attempt; swap for a real
// PUT /api/users/:username/password call once a backend is available.
function ManagePasswordsPage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState(listAccounts());
  const [openFor, setOpenFor] = useState(null); // username currently being edited
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successFor, setSuccessFor] = useState(null);

  const openForm = (username) => {
    setOpenFor(username);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessFor(null);
  };

  const closeForm = () => {
    setOpenFor(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleSave = (e, username) => {
    e.preventDefault();
    if (newPassword.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPassword(username, newPassword);
    setAccounts(listAccounts());
    setSuccessFor(username);
    setOpenFor(null);
  };

  const handleResetToDefault = (username) => {
    resetToDefaultPassword(username);
    setAccounts(listAccounts());
    setSuccessFor(username);
    setOpenFor(null);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Manage Passwords</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <p className="upload-instructions">
          Reset the login password for any Teacher or Admin account — useful when someone
          forgets theirs. They can log in with the new password right away.
        </p>

        <div className="table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Login Email</th>
                <th>Role</th>
                <th>Class</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <Fragment key={a.username}>
                  <tr>
                    <td>{a.name}</td>
                    <td>{a.username}</td>
                    <td>{a.role}</td>
                    <td>{a.classTeacherOf || "—"}</td>
                    <td>{a.hasCustomPassword ? "Changed by Admin" : "Default"}</td>
                    <td className="actions-cell">
                      <button className="link-btn" onClick={() => openForm(a.username)}>
                        Change Password
                      </button>
                      {a.hasCustomPassword && (
                        <>
                          {" · "}
                          <button
                            className="link-btn link-btn-danger"
                            onClick={() => handleResetToDefault(a.username)}
                          >
                            Reset to Default
                          </button>
                        </>
                      )}
                    </td>
                  </tr>

                  {openFor === a.username && (
                    <tr>
                      <td colSpan={6}>
                        <form
                          className="admin-form"
                          style={{ margin: "8px 0" }}
                          onSubmit={(e) => handleSave(e, a.username)}
                        >
                          <div className="form-field">
                            <label>New Password *</label>
                            <input
                              type="password"
                              autoFocus
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={`At least ${MIN_LENGTH} characters`}
                            />
                          </div>
                          <div className="form-field">
                            <label>Confirm Password *</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                          </div>

                          {error && <div className="alert alert-error">{error}</div>}

                          <div className="form-actions">
                            <button type="submit" className="primary-btn">
                              Save New Password
                            </button>
                            <button type="button" className="secondary-btn" onClick={closeForm}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}

                  {successFor === a.username && openFor !== a.username && (
                    <tr>
                      <td colSpan={6}>
                        <div className="alert alert-success">
                          Password updated for {a.name} ({a.username}).
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManagePasswordsPage;
