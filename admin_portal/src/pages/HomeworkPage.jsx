import { Fragment, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAssignedClasses, getStudentsForClass } from "../utils/permissions";
import { getAssignmentFor } from "../data/teacherAssignments";
import { getSchoolInfo } from "../services/schoolInfoService";
import { getSubjectsForBoard, getBoardLabel } from "../data/subjectsByBoard";
import {
  getHomework,
  addHomework,
  updateHomework,
  deleteHomework,
  duplicateHomework,
  isHomeworkOverdue,
  getSubmissionRows,
  getSubmissionSummary,
  setSubmission,
  HOMEWORK_STATUS,
  SUBMISSION_STATUS,
} from "../services/teacherDataService";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(classSection, subject) {
  return {
    classSection,
    subject: subject || "",
    title: "",
    details: "",
    submissionInstructions: "",
    marks: "",
    dueDate: "",
    attachments: [],
  };
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: HOMEWORK_STATUS.PUBLISHED, label: "Published" },
  { key: HOMEWORK_STATUS.DRAFT, label: "Drafts" },
  { key: "overdue", label: "Overdue" },
];

const SUBMISSION_STATUS_OPTIONS = [
  SUBMISSION_STATUS.PENDING,
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.LATE,
  SUBMISSION_STATUS.REVIEWED,
];

// Maps a homework/submission status to one of the existing badge color
// classes already defined in index.css, so no new CSS is needed.
function statusBadgeClass(status) {
  if (status === HOMEWORK_STATUS.PUBLISHED || status === SUBMISSION_STATUS.SUBMITTED || status === SUBMISSION_STATUS.REVIEWED) {
    return "status-valid";
  }
  if (status === "overdue" || status === SUBMISSION_STATUS.LATE) {
    return "status-invalid";
  }
  return "status-duplicate"; // draft / pending
}

function summaryChipClass(kind) {
  if (kind === SUBMISSION_STATUS.SUBMITTED || kind === SUBMISSION_STATUS.REVIEWED) return "summary-chip summary-valid";
  if (kind === SUBMISSION_STATUS.LATE) return "summary-chip summary-invalid";
  if (kind === SUBMISSION_STATUS.PENDING) return "summary-chip summary-duplicate";
  return "summary-chip summary-total";
}

function HomeworkPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const assignedClasses = getAssignedClasses(user);
  const assignment = getAssignmentFor(user?.staffId);
  const board = getSchoolInfo()?.affiliationBoard || "CBSE";
  const boardSubjects = getSubjectsForBoard(board);
  const defaultSubject = assignment?.subject && boardSubjects.includes(assignment.subject)
    ? assignment.subject
    : boardSubjects[0];

  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const worksheetInputRef = useRef(null);

  const [activeClass, setActiveClass] = useState(assignedClasses[0] || "");
  const [form, setForm] = useState(emptyForm(assignedClasses[0] || "", defaultSubject));
  const [linkUrl, setLinkUrl] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [trackingId, setTrackingId] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  const students = activeClass ? getStudentsForClass(user, activeClass) : [];
  const homeworkList = activeClass ? getHomework(activeClass) : [];
  const today = todayISO();

  const filteredHomework = homeworkList.filter((h) => {
    if (subjectFilter && h.subject !== subjectFilter) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "overdue") return isHomeworkOverdue(h, today);
    return h.status === statusFilter;
  });

  const switchClass = (c) => {
    setActiveClass(c);
    setForm(emptyForm(c, defaultSubject));
    setLinkUrl("");
    setEditingId(null);
    setError("");
    setSaved("");
    setTrackingId(null);
    setReschedulingId(null);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved("");
  };

  // Max size for a single attachment stored as a base64 data URL in
  // localStorage. Browsers cap localStorage at ~5-10MB total, and base64
  // inflates file size by ~33%, so we keep individual files small and warn
  // the teacher instead of silently failing later.
  const MAX_ATTACHMENT_MB = 3;

  const handleFileAttach = (type, file) => {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setError(`"${file.name}" is larger than ${MAX_ATTACHMENT_MB}MB. Please choose a smaller file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const attachment = {
        id: `ATT${Date.now()}`,
        type,
        name: file.name,
        mimeType: file.type,
        sizeKB: Math.max(1, Math.round(file.size / 1024)),
        // The actual file content, so it can be reopened later by the
        // teacher or a parent — not just its filename/metadata.
        dataUrl: reader.result,
      };
      setForm((prev) => ({ ...prev, attachments: [...prev.attachments, attachment] }));
      setSaved("");
      setError("");
    };
    reader.onerror = () => {
      setError(`Could not read "${file.name}". Please try again.`);
    };
    reader.readAsDataURL(file);
  };

  const handleAddLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const attachment = { id: `ATT${Date.now()}`, type: "link", name: url, url };
    setForm((prev) => ({ ...prev, attachments: [...prev.attachments, attachment] }));
    setLinkUrl("");
    setSaved("");
  };

  const removeAttachment = (id) => {
    setForm((prev) => ({ ...prev, attachments: prev.attachments.filter((a) => a.id !== id) }));
    setSaved("");
  };

  const resetForm = () => {
    setForm(emptyForm(activeClass, defaultSubject));
    setLinkUrl("");
    setEditingId(null);
  };

  const submitHomework = (status) => {
    if (!form.title.trim() || !form.dueDate) {
      setError("Title and due date are required.");
      setSaved("");
      return;
    }
    if (!form.subject) {
      setError("Please select a subject.");
      setSaved("");
      return;
    }
    const payload = { ...form, classSection: activeClass, status, postedBy: user?.name };
    if (editingId) {
      updateHomework(editingId, payload);
      setSaved("Homework updated.");
    } else {
      addHomework(payload);
      setSaved(status === HOMEWORK_STATUS.DRAFT ? "Saved as draft." : `Homework shared with ${activeClass}.`);
    }
    resetForm();
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitHomework(form.status || HOMEWORK_STATUS.PUBLISHED);
  };

  const handleEdit = (h) => {
    setEditingId(h.id);
    setForm({
      classSection: h.classSection,
      subject: h.subject || defaultSubject,
      title: h.title,
      details: h.details || "",
      submissionInstructions: h.submissionInstructions || "",
      marks: h.marks ?? "",
      dueDate: h.dueDate,
      attachments: h.attachments || [],
      status: h.status,
    });
    setError("");
    setSaved("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (id) => {
    duplicateHomework(id);
    setSaved("Duplicated as a new draft — set a due date and publish when ready.");
  };

  const handleDelete = (id) => {
    deleteHomework(id);
    if (editingId === id) resetForm();
    if (trackingId === id) setTrackingId(null);
    setSaved("");
  };

  const openReschedule = (h) => {
    setReschedulingId(h.id);
    setRescheduleDate(h.dueDate || "");
    setTrackingId(null);
  };

  const confirmReschedule = (id) => {
    if (!rescheduleDate) return;
    updateHomework(id, { dueDate: rescheduleDate });
    setReschedulingId(null);
    setSaved("Due date updated.");
  };

  const toggleTracking = (id) => {
    setTrackingId((prev) => (prev === id ? null : id));
    setReschedulingId(null);
  };

  const handleSubmissionChange = (homeworkId, admissionNumber, patch) => {
    setSubmission(homeworkId, admissionNumber, patch);
    setSaved("");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Homework</h1>
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
                  className={`tab-btn ${activeClass === c ? "tab-btn-active" : ""}`}
                  onClick={() => switchClass(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <form className="admin-form" onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div className="form-field" style={{ maxWidth: 260 }}>
                  <label>Subject ({getBoardLabel(board)})</label>
                  <select value={form.subject} onChange={(e) => handleChange("subject", e.target.value)}>
                    {boardSubjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ maxWidth: 220 }}>
                  <label>Marks / Points</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={form.marks}
                    onChange={(e) => handleChange("marks", e.target.value)}
                  />
                </div>
                <div className="form-field" style={{ maxWidth: 220 }}>
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleChange("dueDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. Chapter 4 exercises"
                />
              </div>
              <div className="form-field">
                <label>Details</label>
                <textarea
                  rows={4}
                  value={form.details}
                  onChange={(e) => handleChange("details", e.target.value)}
                  placeholder="Instructions for students"
                />
              </div>
              <div className="form-field">
                <label>Submission Instructions</label>
                <textarea
                  rows={2}
                  value={form.submissionInstructions}
                  onChange={(e) => handleChange("submissionInstructions", e.target.value)}
                  placeholder="e.g. Submit in the notebook, or upload before 6 PM"
                />
              </div>

              <div className="form-field">
                <label>Attachments</label>
                <div className="upload-actions">
                  <label className="secondary-btn file-btn">
                    Add PDF
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      onChange={(e) => {
                        handleFileAttach("pdf", e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="secondary-btn file-btn">
                    Add Image
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        handleFileAttach("image", e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="secondary-btn file-btn">
                    Add Worksheet
                    <input
                      ref={worksheetInputRef}
                      type="file"
                      accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      hidden
                      onChange={(e) => {
                        handleFileAttach("worksheet", e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="Paste a link (e.g. video or reading)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    style={{ minWidth: 220 }}
                  />
                  <button type="button" className="secondary-btn" onClick={handleAddLink}>
                    Add Link
                  </button>
                </div>

                {form.attachments.length > 0 && (
                  <div className="results-summary" style={{ marginTop: 10 }}>
                    {form.attachments.map((a) => (
                      <span key={a.id} className="summary-chip summary-total">
                        {a.type === "link" ? (
                          <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                            🔗 {a.name}
                          </a>
                        ) : a.dataUrl ? (
                          <a href={a.dataUrl} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                            {a.type === "pdf" ? "📄" : a.type === "image" ? "🖼️" : "📝"} {a.name}
                            {a.sizeKB ? ` (${a.sizeKB} KB)` : ""}
                          </a>
                        ) : (
                          <>
                            {a.type === "pdf" ? "📄" : a.type === "image" ? "🖼️" : "📝"} {a.name}
                            {a.sizeKB ? ` (${a.sizeKB} KB)` : ""}
                          </>
                        )}{" "}
                        <button
                          type="button"
                          className="link-btn link-btn-danger"
                          style={{ marginLeft: 6 }}
                          onClick={() => removeAttachment(a.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {saved && <div className="alert alert-success">{saved}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => submitHomework(HOMEWORK_STATUS.DRAFT)}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => submitHomework(HOMEWORK_STATUS.PUBLISHED)}
                >
                  {editingId ? "Update & Publish" : "Publish Homework"}
                </button>
                {editingId && (
                  <button type="button" className="link-btn" onClick={resetForm}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>

            <div className="results-panel">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "var(--font-display)", margin: 0 }}>
                  Posted to {activeClass}
                </h3>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={`tab-btn ${statusFilter === f.key ? "tab-btn-active" : ""}`}
                        onClick={() => setStatusFilter(f.key)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                    <option value="">All subjects</option>
                    {boardSubjects.map((subj) => (
                      <option key={subj} value={subj}>
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredHomework.length === 0 ? (
                <p className="upload-instructions">No homework matches these filters for {activeClass}.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Subject</th>
                        <th>Due Date</th>
                        <th>Marks</th>
                        <th>Status</th>
                        <th>Submissions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHomework.map((h) => {
                        const overdue = isHomeworkOverdue(h, today);
                        const summary = getSubmissionSummary(h.id, students);
                        return (
                          <Fragment key={h.id}>
                            <tr>
                              <td>
                                {h.title}
                                {h.attachments?.length > 0 && (
                                  <div className="view-only-label" style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                                    {h.attachments.map((a) =>
                                      a.dataUrl || a.url ? (
                                        <a
                                          key={a.id}
                                          href={a.dataUrl || a.url}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {a.type === "pdf" ? "📄" : a.type === "image" ? "🖼️" : a.type === "link" ? "🔗" : "📝"} {a.name}
                                        </a>
                                      ) : (
                                        <span key={a.id}>
                                          {a.type === "pdf" ? "📄" : a.type === "image" ? "🖼️" : "📝"} {a.name}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              </td>
                              <td>{h.subject || "—"}</td>
                              <td>
                                {reschedulingId === h.id ? (
                                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <input
                                      type="date"
                                      value={rescheduleDate}
                                      onChange={(e) => setRescheduleDate(e.target.value)}
                                      style={{ width: 140 }}
                                    />
                                    <button
                                      type="button"
                                      className="link-btn"
                                      onClick={() => confirmReschedule(h.id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      className="link-btn link-btn-danger"
                                      onClick={() => setReschedulingId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {h.dueDate}
                                    {overdue && (
                                      <span className={`status-badge ${statusBadgeClass("overdue")}`} style={{ marginLeft: 6 }}>
                                        Overdue
                                      </span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td>{h.marks || "—"}</td>
                              <td>
                                <span className={`status-badge ${statusBadgeClass(h.status)}`}>{h.status}</span>
                              </td>
                              <td>
                                <div className="results-summary" style={{ marginBottom: 0 }}>
                                  <span className={summaryChipClass(SUBMISSION_STATUS.SUBMITTED)}>
                                    {summary.submitted} submitted
                                  </span>
                                  <span className={summaryChipClass(SUBMISSION_STATUS.PENDING)}>
                                    {summary.pending} pending
                                  </span>
                                  {summary.late > 0 && (
                                    <span className={summaryChipClass(SUBMISSION_STATUS.LATE)}>{summary.late} late</span>
                                  )}
                                </div>
                              </td>
                              <td className="actions-cell">
                                <button className="link-btn" onClick={() => handleEdit(h)}>
                                  Edit
                                </button>{" "}
                                <button className="link-btn" onClick={() => handleDuplicate(h.id)}>
                                  Duplicate
                                </button>{" "}
                                <button className="link-btn" onClick={() => openReschedule(h)}>
                                  Reschedule
                                </button>{" "}
                                <button className="link-btn" onClick={() => toggleTracking(h.id)}>
                                  {trackingId === h.id ? "Hide Submissions" : "Track Submissions"}
                                </button>{" "}
                                <button className="link-btn link-btn-danger" onClick={() => handleDelete(h.id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                            {trackingId === h.id && (
                              <tr>
                                <td colSpan={7}>
                                  <div className="table-wrapper" style={{ margin: 0 }}>
                                    <table className="results-table">
                                      <thead>
                                        <tr>
                                          <th>Admission No.</th>
                                          <th>Student</th>
                                          <th>Status</th>
                                          <th>Grade</th>
                                          <th>Feedback</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {getSubmissionRows(h.id, students).map((row) => (
                                          <tr key={row.admissionNumber}>
                                            <td>{row.admissionNumber}</td>
                                            <td>{row.name}</td>
                                            <td>
                                              <select
                                                value={row.status}
                                                onChange={(e) =>
                                                  handleSubmissionChange(h.id, row.admissionNumber, {
                                                    status: e.target.value,
                                                    submittedAt:
                                                      e.target.value === SUBMISSION_STATUS.PENDING
                                                        ? ""
                                                        : row.submittedAt || today,
                                                  })
                                                }
                                              >
                                                {SUBMISSION_STATUS_OPTIONS.map((s) => (
                                                  <option key={s} value={s}>
                                                    {s}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                            <td>
                                              <input
                                                type="text"
                                                style={{ width: 70 }}
                                                value={row.grade}
                                                onChange={(e) =>
                                                  handleSubmissionChange(h.id, row.admissionNumber, {
                                                    grade: e.target.value,
                                                  })
                                                }
                                              />
                                            </td>
                                            <td>
                                              <input
                                                type="text"
                                                style={{ width: 220 }}
                                                value={row.feedback}
                                                placeholder="Optional feedback"
                                                onChange={(e) =>
                                                  handleSubmissionChange(h.id, row.admissionNumber, {
                                                    feedback: e.target.value,
                                                  })
                                                }
                                              />
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HomeworkPage;
