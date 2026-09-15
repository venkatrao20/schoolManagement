// Lets an Admin change the login password for any account (Teacher or
// Admin) — e.g. a teacher forgot their password and can't log in. Same
// mock-persistence pattern as the other services (localStorage now, swap
// for a real backend later): PUT /api/users/:username/password, ADMIN-only.

import { MOCK_USERS } from "../data/mockAccounts";

const KEY = "password_overrides";

function readOverrides() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

function writeOverrides(overrides) {
  localStorage.setItem(KEY, JSON.stringify(overrides));
}

// The password actually checked at login: an admin-set override if one
// exists, otherwise the account's original seed password.
export function getEffectivePassword(username, defaultPassword) {
  const overrides = readOverrides();
  return overrides[username] ?? defaultPassword;
}

export function hasCustomPassword(username) {
  return Object.prototype.hasOwnProperty.call(readOverrides(), username);
}

// AC: an Admin can set a new password for any account.
export function setPassword(username, newPassword) {
  const overrides = readOverrides();
  overrides[username] = newPassword;
  writeOverrides(overrides);
}

// Convenience: undo a change and go back to the original seed password.
export function resetToDefaultPassword(username) {
  const overrides = readOverrides();
  delete overrides[username];
  writeOverrides(overrides);
}

// Every account an Admin can manage, without exposing any password.
export function listAccounts() {
  return MOCK_USERS.map(({ username, name, role, classTeacherOf }) => ({
    username,
    name,
    role,
    classTeacherOf: classTeacherOf || null,
    hasCustomPassword: hasCustomPassword(username),
  }));
}
