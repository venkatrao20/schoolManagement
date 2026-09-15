// Identity + default password for every mock login account. Split out of
// authService.js so services/userAccountService.js (which lets an Admin
// change a teacher's password) can import the account list without a
// circular import between the two services.
//
// "defaultPassword" is only the seed value used the first time the app
// runs. The password actually checked at login is looked up through
// userAccountService.getEffectivePassword(), which returns an
// admin-set override if one exists, or falls back to this default.

import { SEED_DATA } from "./schoolDataSchemas";

// One teacher login per class-section (1-A .. 8-B), following the
// teacher<class><section>@test.com pattern, e.g. teacher5b@test.com is
// the class teacher of 5-B. Generated from the same seeded staff records
// (SEED_DATA.staff) that populate View Records, so the login always
// matches whichever teacher is shown as class teacher of that section.
const TEACHER_MOCK_USERS = SEED_DATA.staff
  .filter((s) => s.classTeacherOf)
  .map((s) => ({
    username: `teacher${s.classTeacherOf.toLowerCase().replace("-", "")}@test.com`,
    defaultPassword: "teacher123",
    id: 100 + Number(s.staffId.replace("STF", "")),
    name: `${s.firstName} ${s.lastName}`,
    role: "TEACHER",
    staffId: s.staffId,
    classTeacherOf: s.classTeacherOf,
  }));

export const MOCK_USERS = [
  { username: "admin@test.com", defaultPassword: "admin123", id: 1, name: "Admin User", role: "ADMIN" },
  ...TEACHER_MOCK_USERS,
];
