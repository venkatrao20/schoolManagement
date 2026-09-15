const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateField(field, value) {
  const errors = [];
  const isEmpty = value === undefined || value === null || String(value).trim() === "";

  if (field.required && isEmpty) {
    errors.push(`${field.label} is required`);
    return errors; // no point checking format on an empty required field
  }
  if (isEmpty) return errors; // optional & empty is fine

  switch (field.type) {
    case "email":
      if (!EMAIL_RE.test(value)) errors.push(`${field.label} is not a valid email`);
      break;
    case "phone":
      if (!PHONE_RE.test(value)) errors.push(`${field.label} must be 10 digits`);
      break;
    case "date":
      if (!DATE_RE.test(value)) errors.push(`${field.label} must be in YYYY-MM-DD format`);
      break;
    case "enum":
      if (!field.options.includes(value)) {
        errors.push(`${field.label} must be one of: ${field.options.join(", ")}`);
      }
      break;
    default:
      break;
  }
  return errors;
}

/**
 * Validates parsed records against a schema, flags duplicates
 * (both within the uploaded file and against already-stored records).
 */
export function validateRecords(schema, records, existingRecords = []) {
  const existingKeys = new Set(
    existingRecords.map((r) => String(r[schema.uniqueField] ?? "").toLowerCase())
  );
  const seenInFile = new Set();

  return records.map((record, index) => {
    const fieldErrors = schema.fields.flatMap((f) => validateField(f, record[f.name]));

    const keyValue = String(record[schema.uniqueField] ?? "").toLowerCase().trim();
    let isDuplicate = false;
    if (keyValue) {
      if (seenInFile.has(keyValue)) {
        isDuplicate = true;
        fieldErrors.push(`Duplicate ${schema.uniqueField} within uploaded file`);
      } else if (existingKeys.has(keyValue)) {
        isDuplicate = true;
        fieldErrors.push(`${schema.uniqueField} already exists in the system`);
      }
      seenInFile.add(keyValue);
    }

    const status = fieldErrors.length === 0 ? "valid" : isDuplicate && fieldErrors.length === 1 ? "duplicate" : "invalid";

    return {
      rowNumber: index + 2, // +2: header row + 1-indexing
      data: record,
      status,
      errors: fieldErrors,
    };
  });
}

export function summarize(results) {
  return {
    total: results.length,
    valid: results.filter((r) => r.status === "valid").length,
    invalid: results.filter((r) => r.status === "invalid").length,
    duplicate: results.filter((r) => r.status === "duplicate").length,
  };
}
