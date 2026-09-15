import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRecords } from "../services/schoolDataService";
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  isDuplicateClass,
  seedIfEmpty,
} from "../services/academicStructureService";
import { emptyClass } from "../data/classSectionSchema";
import { canDeleteRecord } from "../utils/permissions";

// SCRUM-56 — Manage Classes
// AC: authorized user can create/view/update a class, duplicates are
// prevented, records persist after refresh, unauthorized users can't edit.
function ClassesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN"; // only an authorized School Administrator

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyClass());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    seedIfEmpty();
    setLoading(true);
    setClasses(await getClasses());
    setStudents(getRecords("student"));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyClass());
    setEditingId(null);
    setError("");
  };

  const handleEdit = (cls) => {
    if (!canEdit) return;
    setForm({ ...cls });
    setEditingId(cls.id);
    setSaved(false);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    await deleteClass(id);
    if (editingId === id) resetForm();
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    const name = (form.name || "").trim();
    if (!name) {
      setError("Class Name is required.");
      return;
    }
    if (isDuplicateClass(classes, name, editingId)) {
      setError(`A class named "${name}" already exists. Class names must be unique.`);
      return;
    }

    if (editingId) {
      await updateClass(editingId, { ...form, name });
    } else {
      await createClass({ ...form, name });
    }
    setError("");
    setSaved(true);
    resetForm();
    load();
  };

  const studentCount = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return 0;
    return students.filter((s) => s.class === cls.name).length;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Manage Classes</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <p className="upload-instructions">
          Create and maintain the classes that form the school's academic
          structure. Sections are configured separately once a class exists.
        </p>
        <div className="upload-actions">
          <button className="secondary-btn" onClick={() => navigate("/sections")}>
            Manage Sections →
          </button>
        </div>

        {canEdit ? (
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Class Name *</label>
              <input
                type="text"
                placeholder="e.g. 5 or Grade 5"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setSaved(false);
                }}
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <input
                type="text"
                placeholder="Optional"
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {saved && <div className="alert alert-success">Class saved successfully.</div>}

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                {editingId ? "Update Class" : "+ Add Class"}
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
            You have view-only access. Only a School Administrator can create or edit classes.
          </p>
        )}

        {!loading && (
          <div className="table-wrapper">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Description</th>
                  <th>Students</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.description || "—"}</td>
                    <td>{studentCount(c.id)}</td>
                    {canEdit && (
                      <td className="actions-cell">
                        <button className="link-btn" onClick={() => handleEdit(c)}>
                          Edit
                        </button>
                        {canDeleteRecord(user) && (
                          <>
                            {" · "}
                            <button
                              className="link-btn link-btn-danger"
                              onClick={() => handleDelete(c.id)}
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

export default ClassesPage;
