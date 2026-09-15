import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SCHEMAS } from "../data/schoolDataSchemas";
import { validateRecords } from "../utils/validation";
import { getRecords, appendRecords, updateRecordAt } from "../services/schoolDataService";
import { exportRecordsToExcel } from "../utils/excelExport";
const LABELS = { student: "Student", parent: "Parent", staff: "Teacher / Staff" };

function emptyForm(schema) {
  return schema.fields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {});
}

function RecordFormPage() {
  const { type, index } = useParams();
  const navigate = useNavigate();
  const schema = SCHEMAS[type];
  const isEdit = index !== undefined;
  const recordIndex = isEdit ? parseInt(index, 10) : null;

  const [form, setForm] = useState(() => (schema ? emptyForm(schema) : {}));
  const [errors, setErrors] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (schema && isEdit) {
      const existing = getRecords(type);
      const record = existing[recordIndex];
      if (record) setForm(record);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, index]);

  if (!schema) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <p>Unknown record type.</p>
          <button className="secondary-btn" onClick={() => navigate("/admin-dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const allExisting = getRecords(type);
    // When editing, exclude the record itself from duplicate checks.
    const compareAgainst = isEdit
      ? allExisting.filter((_, i) => i !== recordIndex)
      : allExisting;

    const [result] = validateRecords(schema, [form], compareAgainst);

    if (result.status !== "valid") {
      setErrors(result.errors);
      setSaved(false);
      return;
    }

    if (isEdit) {
      updateRecordAt(type, recordIndex, form);
    } else {
      const updated = appendRecords(type, [form]);
      // Every newly added record is followed by a fresh Excel snapshot of
      // the full list for this entity type — no separate export step needed.
      exportRecordsToExcel(schema, updated, `${schema.label}.xlsx`);
      setForm(emptyForm(schema));
    }
    setErrors([]);
    setSaved(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>
          {isEdit ? "Edit" : "Add"} {LABELS[type]}
        </h1>
        <button className="logout-btn" onClick={() => navigate("/view-records")}>
          View Records
        </button>
      </div>

      <div className="dashboard-content">
        <form className="admin-form" onSubmit={handleSubmit}>
          {schema.fields.map((f) => (
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
                      {opt}
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
            <div className="alert alert-success">
              {LABELS[type]} {isEdit ? "updated" : "added"} successfully.
              {!isEdit && " An updated Excel sheet has been downloaded."}{" "}
              <button type="button" className="link-btn" onClick={() => navigate("/view-records")}>
                View records
              </button>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-btn">
              {isEdit ? "Save Changes" : `Save ${LABELS[type]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordFormPage;
