import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCHOOL_INFO_SCHEMA, emptySchoolInfo } from "../data/schoolInfoSchema";
import { validateRecords } from "../utils/validation";
import { getSchoolInfo, saveSchoolInfo } from "../services/schoolInfoService";
import { getBoardLabel } from "../data/subjectsByBoard";

function SchoolInfoPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySchoolInfo());
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getSchoolInfo();
    if (existing) setForm({ ...emptySchoolInfo(), ...existing });
  }, []);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const [result] = validateRecords(SCHOOL_INFO_SCHEMA, [form]);

    if (result.status !== "valid") {
      setErrors(result.errors);
      setSaved(false);
      return;
    }

    saveSchoolInfo(form);
    setErrors([]);
    setSaved(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>School Information</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <p className="upload-instructions">
          Maintain your school's basic profile. This information is used across the
          application (e.g. on reports, templates, and communications).
        </p>

        <form className="admin-form" onSubmit={handleSubmit}>
          {SCHOOL_INFO_SCHEMA.fields.map((f) => (
            <div className="form-field" key={f.name}>
              <label>
                {f.label}
                {f.required ? " *" : ""}
              </label>

              {f.type === "enum" ? (
                <select
                  value={form[f.name] || ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                >
                  <option value="">Select {f.label}</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {f.name === "affiliationBoard" ? getBoardLabel(opt) : opt}
                    </option>
                  ))}
                </select>
              ) : f.type === "date" ? (
                <input
                  type="date"
                  value={form[f.name] || ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  value={form[f.name] || ""}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                />
              )}
            </div>
          ))}

          {errors.length > 0 && (
            <div className="alert alert-error">{errors.join("; ")}</div>
          )}
          {saved && (
            <div className="alert alert-success">School information saved successfully.</div>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-btn">
              Save School Information
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SchoolInfoPage;
