// Seed data used the first time the backend runs (no data.json yet).
// Mirrors the frontend's mock structure (src/data/*.js) so the demo looks
// the same whether you're in MOCK_MODE or talking to this backend.

const bcrypt = require("bcryptjs");

function makeId(prefix, i) {
  return `${prefix}${String(i).padStart(3, "0")}`;
}

function buildClassesAndSections() {
  const classes = [];
  const sections = [];
  let sIdx = 1;
  for (let c = 1; c <= 8; c++) {
    const classId = makeId("CLS", c);
    classes.push({ id: classId, name: String(c), description: `Class ${c}` });
    ["A", "B"].forEach((name) => {
      sections.push({ id: makeId("SEC", sIdx), classId, name, capacity: "40" });
      sIdx++;
    });
  }
  return { classes, sections };
}

function seedDb() {
  const { classes, sections } = buildClassesAndSections();

  const users = [
    {
      id: 1,
      name: "Admin User",
      username: "admin@test.com",
      // admin123
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "ADMIN",
    },
    {
      id: 101,
      name: "Demo Teacher",
      username: "teacher5a@test.com",
      // teacher123
      passwordHash: bcrypt.hashSync("teacher123", 10),
      role: "TEACHER",
      staffId: "STF2005",
      classTeacherOf: "5-A",
    },
  ];

  return {
    users,
    schoolInfo: {
      schoolName: "Sample Public School",
      board: "State Board",
      email: "info@sampleschool.example",
      phone: "9800000000",
      address: "Sample Layout, Bengaluru",
      principalName: "Dr. Sample Principal",
    },
    classes,
    sections,
    students: [],
    parents: [],
    staff: [],
  };
}

module.exports = { seedDb };
