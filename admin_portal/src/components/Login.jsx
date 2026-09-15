import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CLASS_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const SECTIONS = ["A", "B"];

function Login() {
  const [mode, setMode] = useState("password"); // "password" | "classKey"

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [classNumber, setClassNumber] = useState("");
  const [section, setSection] = useState("");
  const [classKeyError, setClassKeyError] = useState("");
  const [classKeyLoading, setClassKeyLoading] = useState(false);

  const { login, loginWithClassKey } = useAuth();
  const navigate = useNavigate();

  const goToDashboard = (user) => {
    if (user.role === "ADMIN") {
      navigate("/admin-dashboard");
    } else if (user.role === "TEACHER") {
      navigate("/teacher-dashboard");
    } else {
      navigate("/unauthorized");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: "" });
  };

  const validate = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = "Username or email is required.";
    if (!formData.password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    try {
      setLoading(true);
      const user = await login(formData.username, formData.password);
      goToDashboard(user);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const switchToClassKey = () => {
    setMode("classKey");
    setError("");
  };

  const switchToPassword = () => {
    setMode("password");
    setClassKeyError("");
  };

  const handleClassKeyLogin = async (e) => {
    e.preventDefault();
    setClassKeyError("");

    if (!classNumber || !section) {
      setClassKeyError("Select your class and section.");
      return;
    }

    try {
      setClassKeyLoading(true);
      const user = await loginWithClassKey(`${classNumber}${section}`);
      goToDashboard(user);
    } catch (err) {
      setClassKeyError(err.response?.data?.message || "That class key isn't recognized.");
    } finally {
      setClassKeyLoading(false);
    }
  };

  return (
    <div className="portal">
      <div className="portal-frame">
        {/* Branding panel */}
        <div className="portal-brand">
          <div className="portal-brand-top">
            <div className="seal" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="seal-svg">
                <circle cx="50" cy="50" r="47" className="seal-ring-outer" />
                <circle cx="50" cy="50" r="38" className="seal-ring-inner" />
                <text x="50" y="58" textAnchor="middle" className="seal-mark">
                  AP
                </text>
              </svg>
            </div>
            <span className="portal-eyebrow">Access Portal</span>
          </div>

          <div className="portal-brand-body">
            <h1 className="portal-title">
              Enter the
              <br />
              Admin Portal
            </h1>
            <p className="portal-tagline">
              One credential, every activity assigned to you &mdash; nothing more,
              nothing less.
            </p>
          </div>

          <dl className="portal-meta">
            <div className="portal-meta-row">
              <dt>Status</dt>
              <dd>
                <span className="status-dot" /> Systems operational
              </dd>
            </div>
            <div className="portal-meta-row">
              <dt>Session</dt>
              <dd>Encrypted, role&#8209;scoped access</dd>
            </div>
          </dl>
        </div>

        {/* Form panel */}
        <div className="portal-form-panel">
          <div className="portal-form-card">
            {mode === "password" ? (
              <>
                <span className="form-kicker">Sign in</span>
                <h2 className="form-heading">Welcome back</h2>
                <p className="form-subheading">Use your assigned credentials to continue.</p>

                <form onSubmit={handleLogin} noValidate>
                  <div className="field-group">
                    <label htmlFor="username">Username / Email</label>
                    <input
                      id="username"
                      type="text"
                      name="username"
                      placeholder="you@campus.edu"
                      value={formData.username}
                      onChange={handleChange}
                      autoComplete="username"
                      className={fieldErrors.username ? "has-error" : ""}
                    />
                    {fieldErrors.username && (
                      <span className="field-error">{fieldErrors.username}</span>
                    )}
                  </div>

                  <div className="field-group">
                    <div className="field-label-row">
                      <label htmlFor="password">Password</label>
                      <button
                        type="button"
                        className="ghost-toggle"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      className={fieldErrors.password ? "has-error" : ""}
                    />
                    {fieldErrors.password && (
                      <span className="field-error">{fieldErrors.password}</span>
                    )}
                  </div>

                  {error && (
                    <div className="form-alert" role="alert">
                      {error}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Verifying\u2026" : "Sign in"}
                  </button>
                </form>

                <p className="form-footnote">
                  Forgot your password? Teachers can{" "}
                  <button type="button" className="ghost-toggle" onClick={switchToClassKey}>
                    sign in with your class key
                  </button>{" "}
                  instead.
                </p>
              </>
            ) : (
              <>
                <span className="form-kicker">Teacher access</span>
                <h2 className="form-heading">Sign in with your class key</h2>
                <p className="form-subheading">
                  Every class-section has its own key so you can get back in without waiting on
                  an Admin. Select your class and section below.
                </p>

                <form onSubmit={handleClassKeyLogin} noValidate>
                  <div className="field-group-row">
                    <div className="field-group">
                      <label htmlFor="classNumber">Class</label>
                      <select
                        id="classNumber"
                        value={classNumber}
                        onChange={(e) => setClassNumber(e.target.value)}
                      >
                        <option value="">Select</option>
                        {CLASS_NUMBERS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="section">Section</label>
                      <select id="section" value={section} onChange={(e) => setSection(e.target.value)}>
                        <option value="">Select</option>
                        {SECTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {classKeyError && (
                    <div className="form-alert" role="alert">
                      {classKeyError}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={classKeyLoading}>
                    {classKeyLoading ? "Verifying\u2026" : "Sign in with class key"}
                  </button>
                </form>

                <p className="form-footnote">
                  Know your password?{" "}
                  <button type="button" className="ghost-toggle" onClick={switchToPassword}>
                    Sign in normally
                  </button>{" "}
                  instead.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
