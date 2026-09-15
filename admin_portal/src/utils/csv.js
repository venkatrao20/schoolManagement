// Lightweight CSV parser (handles quoted fields containing commas).
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") pushField();
      else if (char === "\r") continue;
      else if (char === "\n") { pushField(); pushRow(); }
      else field += char;
    }
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  const cleanRows = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (cleanRows.length === 0) return { headers: [], records: [] };

  const headers = cleanRows[0].map((h) => h.trim());
  const records = cleanRows.slice(1).map((r) =>
    headers.reduce((obj, h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
      return obj;
    }, {})
  );

  return { headers, records };
}

export function toCSV(fields, records) {
  const headerRow = fields.map((f) => f.name).join(",");
  const dataRows = records.map((rec) =>
    fields.map((f) => escapeCSVValue(rec[f.name] ?? "")).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

function escapeCSVValue(value) {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildTemplateCSV(schema) {
  const headerRow = schema.fields.map((f) => f.name).join(",");
  const exampleRow = schema.fields
    .map((f) => (f.type === "enum" ? f.options[0] : f.type === "date" ? "2020-01-01" : f.type === "email" ? "example@school.com" : "example"))
    .join(",");
  return `${headerRow}\n${exampleRow}`;
}
