import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCHEMAS, SAMPLE_DATA } from "../data/schoolDataSchemas";
import { parseCSV, buildTemplateCSV, downloadCSV } from "../utils/csv";
import { validateRecords, summarize } from "../utils/validation";
import { getRecords, appendRecords } from "../services/schoolDataService";
import { exportRecordsToExcel } from "../utils/excelExport";

const TABS = [
  { key: "student", label: "Students" },
  { key: "parent", label: "Parents" },
  { key: "staff", label: "Teachers & Staff" },
];

function DataUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("student");
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const schema = SCHEMAS[activeTab];

  const resetState = () => {
    setResults(null);
    setConfirmed(false);
    setError("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const switchTab = (key) => {
    setActiveTab(key);
    resetState();
  };

  const runValidation = (records) => {
    const existing = getRecords(activeTab);
    const validated = validateRecords(schema, records, existing);
    setResults(validated);
    setConfirmed(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const { headers, records } = parseCSV(reader.result);
      if (records.length === 0) {
        setError("No data rows found in the file. Please check the format and try again.");
        setResults(null);
        return;
      }
      const missingCols = schema.fields
        .filter((f) => f.required)
        .filter((f) => !headers.includes(f.name));
      if (missingCols.length > 0) {
        setError(
          `File is missing required columns: ${missingCols.map((f) => f.name).join(", ")}. Please use the approved template.`
        );
        setResults(null);
        return;
      }
      runValidation(records);
    };
    reader.onerror = () => setError("Could not read the file. Please try again.");
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setError("");
    setFileName(`sample-${activeTab}-data.csv (dummy data)`);
    runValidation(SAMPLE_DATA[activeTab]);
  };

  const handleDownloadTemplate = () => {
    downloadCSV(`${activeTab}-upload-template.csv`, buildTemplateCSV(schema));
  };

  const handleConfirmUpload = () => {
    const validRecords = results.filter((r) => r.status === "valid").map((r) => r.data);
    const updated = appendRecords(activeTab, validRecords);
    // Same auto-export as the single-record form: a fresh Excel snapshot
    // of the full list is downloaded right after the bulk upload lands.
    exportRecordsToExcel(schema, updated, `${schema.label}.xlsx`);
    setConfirmed(true);
  };

  const summary = results ? summarize(results) : null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Upload School Data</h1>
        <button className="logout-btn" onClick={() => navigate("/admin-dashboard")}>
          Back to Dashboard
        </button>
      </div>

      <div className="dashboard-content">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn ${activeTab === t.key ? "tab-btn-active" : ""}`}
              onClick={() => switchTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="upload-instructions">
          Upload {schema.label.toLowerCase()} using the approved template below. Mandatory fields
          are validated automatically, and duplicate or invalid records are flagged before anything
          is saved.
        </p>

        <div className="upload-actions">
          <button className="secondary-btn" onClick={handleDownloadTemplate}>
            Download {schema.label} Template
          </button>
          <button className="secondary-btn" onClick={handleLoadSample}>
            Load Sample / Dummy Data
          </button>
          <label className="primary-btn file-btn">
            Choose File to Upload
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              hidden
            />
          </label>
        </div>

        {fileName && <p className="file-name">Selected: {fileName}</p>}
        {error && <div className="alert alert-error">{error}</div>}

        {summary && (
          <div className="results-panel">
            <div className="results-summary">
              <div className="summary-chip summary-total">Total: {summary.total}</div>
              <div className="summary-chip summary-valid">Valid: {summary.valid}</div>
              <div className="summary-chip summary-duplicate">Duplicate: {summary.duplicate}</div>
              <div className="summary-chip summary-invalid">Invalid: {summary.invalid}</div>
            </div>

            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Status</th>
                    <th>{schema.uniqueField}</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.rowNumber} className={`row-${r.status}`}>
                      <td>{r.rowNumber}</td>
                      <td>
                        <span className={`status-badge status-${r.status}`}>{r.status}</span>
                      </td>
                      <td>{r.data[schema.uniqueField] || "—"}</td>
                      <td>{r.errors.length > 0 ? r.errors.join("; ") : "Looks good"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.valid > 0 && !confirmed && (
              <button className="primary-btn" onClick={handleConfirmUpload}>
                Confirm Upload ({summary.valid} valid record{summary.valid !== 1 ? "s" : ""})
              </button>
            )}

            {confirmed && (
              <div className="alert alert-success">
                {summary.valid} record{summary.valid !== 1 ? "s" : ""} uploaded successfully. An
                updated Excel sheet has been downloaded.{" "}
                <button className="link-btn" onClick={() => navigate("/view-records")}>
                  View uploaded records
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataUploadPage;
