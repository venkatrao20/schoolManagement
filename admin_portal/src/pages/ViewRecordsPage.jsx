import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCHEMAS } from "../data/schoolDataSchemas";
import { getRecords, clearRecords, deleteRecordAt } from "../services/schoolDataService";
import { exportRecordsToExcel } from "../utils/excelExport";
import { useAuth } from "../context/AuthContext";
import { canDeleteRecord } from "../utils/permissions";

const ALL_TABS = [
  { key: "student", label: "Students" },
  { key: "parent", label: "Parents" },
  { key: "staff", label: "Teachers & Staff" },
];

function ViewRecordsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("student");
  const [records, setRecords] = useState(getRecords(activeTab));

  const schema = SCHEMAS[activeTab];

  const switchTab = (key) => {
    setActiveTab(key);
    setRecords(getRecords(key));
  };

  const handleClear = () => {
    clearRecords(activeTab);
    setRecords([]);
  };

  const handleDelete = (idx) => {
    const updated = deleteRecordAt(activeTab, idx);
    setRecords(updated);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Uploaded Records</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <div className="tabs">
          {ALL_TABS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? "tab-btn-active" : ""}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label} ({getRecords(t.key).length})
            </button>
          ))}
        </div>

        <div className="upload-actions">
          <button className="primary-btn" onClick={() => navigate(`/add-record/${activeTab}`)}>
            + Add {schema.label === "Teachers & Staff" ? "Teacher / Staff" : schema.label.replace(/s$/, "")}
          </button>
          <button
            className="secondary-btn"
            disabled={records.length === 0}
            onClick={() => exportRecordsToExcel(schema, records, `${schema.label}.xlsx`)}
          >
            Export to Excel
          </button>
        </div>

        {records.length === 0 ? (
          <p className="upload-instructions">
            No {schema.label.toLowerCase()} uploaded yet. Go to Upload School Data to add some.
          </p>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    {schema.fields.map((f) => (
                      <th key={f.name}>{f.label}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, i) => (
                    <tr key={i}>
                      {schema.fields.map((f) => (
                        <td key={f.name}>{rec[f.name] || "—"}</td>
                      ))}
                      <td className="actions-cell">
                        <button
                          className="link-btn"
                          onClick={() => navigate(`/edit-record/${activeTab}/${i}`)}
                        >
                          Edit
                        </button>
                        {canDeleteRecord(user) && (
                          <>
                            {" · "}
                            <button className="link-btn link-btn-danger" onClick={() => handleDelete(i)}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="secondary-btn clear-btn" onClick={handleClear}>
              Clear {schema.label} Data
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ViewRecordsPage;
