import * as XLSX from "xlsx";

// Builds a worksheet using the schema's human-readable column labels
// (e.g. "Admission Number" instead of the raw "admissionNumber" key),
// so the exported file reads the same as the on-screen forms/tables.
function toSheetRows(schema, records) {
  return records.map((record) => {
    const row = {};
    schema.fields.forEach((f) => {
      row[f.label] = record[f.name] ?? "";
    });
    return row;
  });
}

// Generates an .xlsx workbook for one entity type and triggers a browser
// download. This is the same mechanism used for CSV template downloads
// elsewhere in the app — the browser saves it to the user's Downloads
// folder (or prompts for a location), since a web page can't silently
// write to an arbitrary path on disk for security reasons.
export function exportRecordsToExcel(schema, records, filename) {
  if (!records || records.length === 0) return;
  const rows = toSheetRows(schema, records);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, schema.label.slice(0, 31));
  XLSX.writeFile(workbook, filename || `${schema.label}.xlsx`);
}
