// Schema for the single "School Information" record (AC 1).
// Reuses the same field-shape (name/label/required/type/options) as the
// bulk-upload schemas in schoolDataSchemas.js, so it works directly with
// validateRecords() from utils/validation.js.

export const SCHOOL_INFO_SCHEMA = {
  label: "School Information",
  // No uniqueField — this is a single settings record, not a list,
  // so duplicate-detection in validateRecords() is a no-op here.
  fields: [
    { name: "schoolName", label: "School Name", required: true },
    { name: "affiliationBoard", label: "Affiliation / Board", required: true, type: "enum", options: ["CBSE", "ICSE", "State Board", "IB", "Other"] },
    { name: "registrationNumber", label: "Registration / Affiliation Number", required: true },
    { name: "principalName", label: "Principal Name", required: true },
    { name: "email", label: "School Email", required: true, type: "email" },
    { name: "phone", label: "School Phone", required: true, type: "phone" },
    { name: "address", label: "Address", required: true },
    { name: "city", label: "City", required: true },
    { name: "state", label: "State", required: true },
    { name: "pincode", label: "Pincode", required: false },
    { name: "establishedYear", label: "Established Year (YYYY)", required: false },
    { name: "academicYearStart", label: "Academic Year Start (YYYY-MM-DD)", required: false, type: "date" },
    { name: "academicYearEnd", label: "Academic Year End (YYYY-MM-DD)", required: false, type: "date" },
  ],
};

export function emptySchoolInfo() {
  return SCHOOL_INFO_SCHEMA.fields.reduce((acc, f) => ({ ...acc, [f.name]: "" }), {});
}

// Sample profile used to pre-seed the School Information screen on first
// load, so it isn't blank before the admin has entered real details.
export const SEED_SCHOOL_INFO = {
  schoolName: "Greenwood Public School",
  affiliationBoard: "CBSE",
  registrationNumber: "CBSE/KA/2011/0457",
  principalName: "Dr. Meera Nair",
  email: "info@greenwoodpublicschool.edu",
  phone: "9845012345",
  address: "12th Main, Sample Layout",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560034",
  establishedYear: "2005",
  academicYearStart: "2026-06-01",
  academicYearEnd: "2027-03-31",
};
