// Field schemas for the two Academic Structure entities managed on the
// Classes & Sections screens (SCRUM-56 Manage Classes, SCRUM-57 Manage
// Sections). Same shape as SCHEMAS in schoolDataSchemas.js so the existing
// validateRecords()/summarize() helpers in utils/validation.js work as-is.

export const CLASS_SCHEMA = {
  label: "Classes",
  uniqueField: "name",
  fields: [
    { name: "name", label: "Class Name (e.g. 5 or Grade 5)", required: true },
    { name: "description", label: "Description", required: false },
  ],
};

export const SECTION_SCHEMA = {
  label: "Sections",
  uniqueField: "name",
  fields: [
    { name: "classId", label: "Class", required: true },
    { name: "name", label: "Section Name (e.g. A)", required: true },
    { name: "capacity", label: "Capacity", required: false },
  ],
};

export function emptyClass() {
  return { id: "", name: "", description: "" };
}

export function emptySection() {
  return { id: "", classId: "", name: "", capacity: "" };
}

// Seed data: classes 1-8, each with sections A and B — matches the
// class-section combinations already used across the app (students,
// teacher assignments) so nothing appears to change on first load.
function makeId(prefix, i) {
  return `${prefix}${String(i).padStart(3, "0")}`;
}

export const SEED_CLASSES = [];
for (let c = 1; c <= 8; c++) {
  SEED_CLASSES.push({
    id: makeId("CLS", c),
    name: String(c),
    description: `Class ${c}`,
  });
}

export const SEED_SECTIONS = [];
let sIdx = 1;
for (let c = 1; c <= 8; c++) {
  const classId = makeId("CLS", c);
  ["A", "B"].forEach((sectionName) => {
    SEED_SECTIONS.push({
      id: makeId("SEC", sIdx),
      classId,
      name: sectionName,
      capacity: "40",
    });
    sIdx++;
  });
}
