// Classes & Sections (SCRUM-56 / SCRUM-57).
//
// Same MOCK_MODE swap pattern as authService.js: while MOCK_MODE is true,
// everything is read from/written to localStorage (so the screens work
// with no backend running). Set MOCK_MODE to false once the Express
// backend in /backend is running — the same functions will then call it
// over HTTP, sending the JWT saved by authService on every request.

import axios from "axios";
import { SEED_CLASSES, SEED_SECTIONS } from "../data/classSectionSchema";

const API_BASE_URL = "http://localhost:5000/api";
const MOCK_MODE = true;

const KEYS = { class: "records_class", section: "records_section" };

const api = axios.create({ baseURL: API_BASE_URL, headers: { "Content-Type": "application/json" } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- localStorage helpers (mock mode) --------------------------------

function readAll(entityType) {
  const raw = localStorage.getItem(KEYS[entityType]);
  return raw ? JSON.parse(raw) : [];
}

function writeAll(entityType, records) {
  localStorage.setItem(KEYS[entityType], JSON.stringify(records));
  return records;
}

function nextId(prefix, existing) {
  let n = existing.length + 1;
  let id = `${prefix}${String(n).padStart(3, "0")}`;
  const taken = new Set(existing.map((r) => r.id));
  while (taken.has(id)) {
    n++;
    id = `${prefix}${String(n).padStart(3, "0")}`;
  }
  return id;
}

export function seedIfEmpty() {
  if (readAll("class").length === 0) writeAll("class", SEED_CLASSES);
  if (readAll("section").length === 0) writeAll("section", SEED_SECTIONS);
}

// ---- Classes -----------------------------------------------------------

export async function getClasses() {
  if (MOCK_MODE) return readAll("class");
  const { data } = await api.get("/classes");
  return data;
}

export async function createClass(payload) {
  if (MOCK_MODE) {
    const existing = readAll("class");
    const record = { ...payload, id: nextId("CLS", existing) };
    writeAll("class", [...existing, record]);
    return record;
  }
  const { data } = await api.post("/classes", payload);
  return data;
}

export async function updateClass(id, payload) {
  if (MOCK_MODE) {
    const existing = readAll("class");
    const updated = existing.map((c) => (c.id === id ? { ...c, ...payload, id } : c));
    writeAll("class", updated);
    return updated.find((c) => c.id === id);
  }
  const { data } = await api.put(`/classes/${id}`, payload);
  return data;
}

export async function deleteClass(id) {
  if (MOCK_MODE) {
    writeAll("class", readAll("class").filter((c) => c.id !== id));
    writeAll("section", readAll("section").filter((s) => s.classId !== id));
    return;
  }
  await api.delete(`/classes/${id}`);
}

// ---- Sections ------------------------------------------------------------

export async function getSections() {
  if (MOCK_MODE) return readAll("section");
  const { data } = await api.get("/sections");
  return data;
}

export async function createSection(payload) {
  if (MOCK_MODE) {
    const existing = readAll("section");
    const record = { ...payload, id: nextId("SEC", existing) };
    writeAll("section", [...existing, record]);
    return record;
  }
  const { data } = await api.post("/sections", payload);
  return data;
}

export async function updateSection(id, payload) {
  if (MOCK_MODE) {
    const existing = readAll("section");
    const updated = existing.map((s) => (s.id === id ? { ...s, ...payload, id } : s));
    writeAll("section", updated);
    return updated.find((s) => s.id === id);
  }
  const { data } = await api.put(`/sections/${id}`, payload);
  return data;
}

export async function deleteSection(id) {
  if (MOCK_MODE) {
    writeAll("section", readAll("section").filter((s) => s.id !== id));
    return;
  }
  await api.delete(`/sections/${id}`);
}

// Business rule (AC): the system prevents duplicate class/section records.
// A class is a duplicate if its name already exists; a section is a
// duplicate if its name already exists under the same class.

export function isDuplicateClass(classes, name, excludeId = null) {
  const key = String(name).trim().toLowerCase();
  return classes.some((c) => c.id !== excludeId && c.name.trim().toLowerCase() === key);
}

export function isDuplicateSection(sections, classId, name, excludeId = null) {
  const key = String(name).trim().toLowerCase();
  return sections.some(
    (s) => s.id !== excludeId && s.classId === classId && s.name.trim().toLowerCase() === key
  );
}
