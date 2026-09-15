// Mock persistence for the demo. Swap these for real API calls
// (axios + your backend) once a server is available — same pattern
// as MOCK_MODE in authService.js.

import { SEED_DATA } from "../data/schoolDataSchemas";

const KEYS = {
  student: "records_student",
  parent: "records_parent",
  staff: "records_staff",
};

export function getRecords(entityType) {
  const raw = localStorage.getItem(KEYS[entityType]);
  return raw ? JSON.parse(raw) : [];
}

export function appendRecords(entityType, newRecords) {
  const existing = getRecords(entityType);
  const merged = [...existing, ...newRecords];
  localStorage.setItem(KEYS[entityType], JSON.stringify(merged));
  return merged;
}

export function updateRecordAt(entityType, index, updatedRecord) {
  const existing = getRecords(entityType);
  if (index < 0 || index >= existing.length) return existing;
  existing[index] = updatedRecord;
  localStorage.setItem(KEYS[entityType], JSON.stringify(existing));
  return existing;
}

export function deleteRecordAt(entityType, index) {
  const existing = getRecords(entityType);
  const updated = existing.filter((_, i) => i !== index);
  localStorage.setItem(KEYS[entityType], JSON.stringify(updated));
  return updated;
}

export function clearRecords(entityType) {
  localStorage.removeItem(KEYS[entityType]);
}

export function clearAllData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// Pre-populates the demo with sample students, parents, and staff the first
// time the app runs, so the portal is ready to explore without requiring a
// manual upload first. Only fills entity types that are still empty — never
// overwrites data that's already been uploaded or edited.
export function seedIfEmpty() {
  Object.keys(KEYS).forEach((entityType) => {
    if (getRecords(entityType).length === 0) {
      appendRecords(entityType, SEED_DATA[entityType]);
    }
  });
}
