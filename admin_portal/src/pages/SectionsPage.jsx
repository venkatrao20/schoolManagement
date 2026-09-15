import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRecords } from "../services/schoolDataService";
import {
  getClasses,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  isDuplicateSection,
  seedIfEmpty,
} from "../services/academicStructureService";
import { emptySection } from "../data/classSectionSchema";
import { canDeleteRecord } from "../utils/permissions";

// SCRUM-57 — Manage Sections
// AC: authorized user can create/view/update a section under a class, a
// section must be linked to a valid class, duplicates under the same class
// are prevented, records persist after refresh, unauthorized users can't edit.
function SectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptySection());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    seedIfEmpty();
    setLoading(true);
    const [cls, sec] = await Promise.all([getClasses(), getSections()]);
    setClasses(cls);
    setSections(sec);
    setStudents(getRecords("student"));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptySection());
    setEditingId(null);
    setError("");
  };

  const handleEdit = (sec) => {
    if (!canEdit) return;
    setForm({ ...sec });
    setEditingId(sec.id);
    setSaved(false);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    await deleteSection(id);
    if (editingId === id) resetForm();
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    const name = (form.name || "").trim();
    const classId = form.classId || "";

    if (!classId) {
      setError("A section must be linked to a valid class. Please select one.");
      return;
    }
    if (!classes.some((c) => c.id === classId)) {
      setError("Selected class no longer exists. Please choose a valid class.");
      return;
    }
    if (!name) {
      setError("Section Name is required.");
      return;
    }
    if (isDuplicateSection(sections, classId, name, editingId)) {
      const className = classes.find((c) => c.id === classId)?.name;
      setError(`Section "${name}" already exists under Class ${className}.`);
      return;
    }

    if (editingId) {
      await updateSection(editingId, { ...form, name, classId });
    } else {
      await createSection({ ...form, name, classId });
    }
    setError("");
    setSaved(true);
    resetForm();
    load();
  };

  const classNameFor = (classId) => classes.find((c) => c.id === classId)?.name || "—";

  const studentCount = (sec) => {
    const className = classNameFor(sec.classId);
    return students.filter((s) => s.class === className && s.section === sec.name).length;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Manage Sections</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <p className="upload-instructions">
          Create and maintain the sections under each class so students and
          teachers can be assigned to the correct academic structure.
        </p>
        <div className="upload-actions">
          <button className="secondary-btn" onClick={() => navigate("/classes")}>
            ← Manage Classes
          </button>
        </div>

        {canEdit ? (
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Class *</label>
              <select
                value={form.classId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, classId: e.target.value }));
                  setSaved(false);
                }}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Section Name *</label>
              <input
                type="text"
                placeholder="e.g. A"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Capacity</label>
              <input
                type="number"
                placeholder="Optional"
                value={form.capacity || ""}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>

            {classes.length === 0 && (
              <div className="alert alert-error">
                No classes exist yet. Create a class first on the Manage Classes screen.
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            {saved && <div className="alert alert-success">Section saved successfully.</div>}

            <div className="form-actions">
              <button type="submit" className="primary-btn" disabled={classes.length === 0}>
                {editingId ? "Update Section" : "+ Add Section"}
              </button>
              {editingId && (
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="view-only-label">
            You have view-only access. Only a School Administrator can create or edit sections.
          </p>
        )}

        {!loading && (
          <div className="table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Capacity</th>
                  <th>Students</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td>{classNameFor(s.classId)}</td>
                    <td>{s.name}</td>
                    <td>{s.capacity || "—"}</td>
                    <td>{studentCount(s)}</td>
                    {canEdit && (
                      <td className="actions-cell">
                        <button className="link-btn" onClick={() => handleEdit(s)}>
                          Edit
                        </button>
                        {canDeleteRecord(user) && (
                          <>
                            {" · "}
                            <button
                              className="link-btn link-btn-danger"
                              onClick={() => handleDelete(s.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SectionsPage;
