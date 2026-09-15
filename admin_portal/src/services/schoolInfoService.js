// Mock persistence for the single School Information record (AC 1).
// Same mock-persistence pattern as schoolDataService.js — swap for a real
// API call (e.g. GET/PUT /api/school-info) once a backend is available.

import { SEED_SCHOOL_INFO } from "../data/schoolInfoSchema";

const KEY = "school_info";

export function getSchoolInfo() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSchoolInfo(info) {
  localStorage.setItem(KEY, JSON.stringify(info));
  return info;
}

export function clearSchoolInfo() {
  localStorage.removeItem(KEY);
}

// Pre-populates a sample school profile the first time the app runs, so
// the School Information screen isn't blank on first visit. Never
// overwrites a profile the admin has already saved.
export function seedIfEmpty() {
  if (!getSchoolInfo()) {
    saveSchoolInfo(SEED_SCHOOL_INFO);
  }
}
