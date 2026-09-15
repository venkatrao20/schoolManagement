// Field schemas for each uploadable entity.
// `key` = unique identifier used for duplicate detection.

export const SCHEMAS = {
  student: {
    label: "Students",
    uniqueField: "admissionNumber",
    fields: [
      { name: "admissionNumber", label: "Admission Number", required: true },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", required: true, type: "date" },
      { name: "gender", label: "Gender", required: true, type: "enum", options: ["Male", "Female", "Other"] },
      { name: "class", label: "Class", required: true },
      { name: "section", label: "Section", required: true },
      { name: "parentEmail", label: "Parent Email", required: true, type: "email" },
      { name: "address", label: "Address", required: false },
      { name: "phone", label: "Phone", required: false, type: "phone" },
    ],
  },
  parent: {
    label: "Parents",
    uniqueField: "email",
    fields: [
      { name: "email", label: "Email", required: true, type: "email" },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "phone", label: "Phone", required: true, type: "phone" },
      { name: "relation", label: "Relation", required: true, type: "enum", options: ["Father", "Mother", "Guardian"] },
      { name: "studentAdmissionNumber", label: "Linked Student Admission Number", required: true },
      { name: "address", label: "Address", required: false },
    ],
  },
  staff: {
    label: "Teachers & Staff",
    uniqueField: "staffId",
    fields: [
      { name: "staffId", label: "Staff ID", required: true },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "email", label: "Email", required: true, type: "email" },
      { name: "phone", label: "Phone", required: true, type: "phone" },
      { name: "role", label: "Role", required: true, type: "enum", options: ["Teacher", "Admin Staff", "Support Staff"] },
      { name: "subject", label: "Subject (Teachers only)", required: false },
      { name: "dateOfJoining", label: "Date of Joining (YYYY-MM-DD)", required: false, type: "date" },
      { name: "classTeacherOf", label: "Class Teacher Of (e.g. 5-A)", required: false },
    ],
  },
};

// Sample/dummy data is generated programmatically below so volumes can be
// realistic (100 students, 100 linked parents, 20 staff) while staying
// fully synthetic — no real student/parent/staff data, ever.
//
// Structure: classes 1-8, sections A/B (16 class-sections total). The first
// 16 teachers are each assigned as the "class teacher" of one class-section
// (classTeacherOf, e.g. "5-A"); the remaining teachers are subject-only staff
// with no class-teacher assignment. Students are distributed evenly across
// the 16 class-sections so every class teacher has a real, editable roster.

const FIRST_NAMES_M = ["Aarav", "Vivaan", "Kabir", "Ishaan", "Arjun", "Rohan", "Aditya", "Karthik", "Manoj", "Sai", "Vikram", "Dev", "Nikhil", "Rahul", "Yash", "Aryan", "Krishna", "Siddharth", "Varun", "Om"];
const FIRST_NAMES_F = ["Diya", "Saanvi", "Ananya", "Ishita", "Meera", "Priya", "Sneha", "Anika", "Riya", "Neha", "Pooja", "Kavya", "Tanvi", "Shreya", "Aisha", "Divya", "Radhika", "Nandini", "Lakshmi", "Isha"];
const LAST_NAMES = ["Sharma", "Reddy", "Nair", "Verma", "Gupta", "Menon", "Pillai", "Iyer", "Rao", "Joshi", "Kulkarni", "Patel", "Singh", "Das", "Bose", "Chatterjee", "Mishra", "Desai", "Kumar", "Shetty"];
const SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Kannada", "Hindi", "Computer Science", "Physical Education"];

// 16 class-sections: 1-A, 1-B, 2-A, 2-B, ... 8-A, 8-B
export const CLASS_SECTIONS = [];
for (let c = 1; c <= 8; c++) {
  CLASS_SECTIONS.push({ class: String(c), section: "A" });
  CLASS_SECTIONS.push({ class: String(c), section: "B" });
}

function pick(arr, i) { return arr[i % arr.length]; }
function pad(n, len) { return String(n).padStart(len, "0"); }

function generateStaff(count) {
  const staff = [];
  for (let i = 1; i <= count; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? pick(FIRST_NAMES_M, i + 2) : pick(FIRST_NAMES_F, i + 2);
    const lastName = pick(LAST_NAMES, i + 7);
    const year = 2015 + (i % 9);
    const month = pad(1 + (i % 12), 2);
    const classSection = i <= CLASS_SECTIONS.length ? CLASS_SECTIONS[i - 1] : null;
    const role = "Teacher"; // all 20 are teaching staff; class-teacher duty layered on top

    staff.push({
      staffId: `STF${2000 + i}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      phone: `96${pad(i, 8)}`,
      role,
      subject: pick(SUBJECTS, i),
      dateOfJoining: `${year}-${month}-01`,
      classTeacherOf: classSection ? `${classSection.class}-${classSection.section}` : "",
    });
  }
  return staff;
}

function generateStudents(count) {
  const students = [];
  for (let i = 1; i <= count; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale ? pick(FIRST_NAMES_M, i) : pick(FIRST_NAMES_F, i);
    const lastName = pick(LAST_NAMES, i + 3);
    const combo = CLASS_SECTIONS[i % CLASS_SECTIONS.length]; // spreads evenly across all 16 class-sections
    const year = 2012 + (i % 6);
    const month = pad(1 + (i % 12), 2);
    const day = pad(1 + (i % 28), 2);

    students.push({
      admissionNumber: `STU${1000 + i}`,
      firstName,
      lastName,
      dateOfBirth: `${year}-${month}-${day}`,
      gender: isMale ? "Male" : "Female",
      class: combo.class,
      section: combo.section,
      parentEmail: `parent.${lastName.toLowerCase()}${i}@example.com`,
      address: "Sample Layout, Bengaluru",
      phone: `98${pad(i, 8)}`,
    });
  }
  return students;
}

function generateParents(students) {
  const relations = ["Father", "Mother", "Guardian"];
  return students.map((s, idx) => ({
    email: s.parentEmail,
    firstName: pick(idx % 2 === 0 ? FIRST_NAMES_M : FIRST_NAMES_F, idx + 5),
    lastName: s.lastName,
    phone: `97${pad(idx + 1, 8)}`,
    relation: pick(relations, idx),
    studentAdmissionNumber: s.admissionNumber,
    address: s.address,
  }));
}

const EXTRA_STUDENTS_CLASS_1_TO_8 = [
  { admissionNumber: "STUX3001", firstName: "Extra1", lastName: "Student", dateOfBirth: "2014-01-10", gender: "Female", class: "1", section: "A", parentEmail: "parent.extra1@example.com", address: "Sample Layout, Bengaluru", phone: "9900000001" },
  { admissionNumber: "STUX3002", firstName: "Extra2", lastName: "Student", dateOfBirth: "2014-02-10", gender: "Male", class: "2", section: "A", parentEmail: "parent.extra2@example.com", address: "Sample Layout, Bengaluru", phone: "9900000002" },
  { admissionNumber: "STUX3003", firstName: "Extra3", lastName: "Student", dateOfBirth: "2014-03-10", gender: "Female", class: "3", section: "A", parentEmail: "parent.extra3@example.com", address: "Sample Layout, Bengaluru", phone: "9900000003" },
  { admissionNumber: "STUX3004", firstName: "Extra4", lastName: "Student", dateOfBirth: "2014-04-10", gender: "Male", class: "4", section: "A", parentEmail: "parent.extra4@example.com", address: "Sample Layout, Bengaluru", phone: "9900000004" },
  { admissionNumber: "STUX3005", firstName: "Extra5", lastName: "Student", dateOfBirth: "2014-05-10", gender: "Female", class: "5", section: "A", parentEmail: "parent.extra5@example.com", address: "Sample Layout, Bengaluru", phone: "9900000005" },
  { admissionNumber: "STUX3006", firstName: "Extra6", lastName: "Student", dateOfBirth: "2014-06-10", gender: "Male", class: "6", section: "A", parentEmail: "parent.extra6@example.com", address: "Sample Layout, Bengaluru", phone: "9900000006" },
  { admissionNumber: "STUX3007", firstName: "Extra7", lastName: "Student", dateOfBirth: "2014-07-10", gender: "Female", class: "7", section: "A", parentEmail: "parent.extra7@example.com", address: "Sample Layout, Bengaluru", phone: "9900000007" },
  { admissionNumber: "STUX3008", firstName: "Extra8", lastName: "Student", dateOfBirth: "2014-08-10", gender: "Male", class: "8", section: "A", parentEmail: "parent.extra8@example.com", address: "Sample Layout, Bengaluru", phone: "9900000008" },
];

const generatedStaff = generateStaff(20);
const generatedStudents = generateStudents(100);
const generatedParents = generateParents(generatedStudents);
const extraStudentsClass1To8 = EXTRA_STUDENTS_CLASS_1_TO_8;
const extraParentsClass1To8 = generateParents(extraStudentsClass1To8);

// A handful of deliberately bad rows appended at the end so the
// validation/results pipeline has something to catch during a demo.
export const SAMPLE_DATA = {
  student: [
    ...generatedStudents,
    ...extraStudentsClass1To8,
    { ...generatedStudents[0] }, // duplicate admissionNumber within file
    { admissionNumber: "STU9999", firstName: "", lastName: "Invalid", dateOfBirth: "2013-07-15", gender: "Female", class: "6", section: "A", parentEmail: "bad-email", address: "", phone: "" },
  ],
  parent: [
    ...generatedParents,
    ...extraParentsClass1To8,
    { email: "not-an-email", firstName: "Test", lastName: "Invalid", phone: "123", relation: "Father", studentAdmissionNumber: "STU9999", address: "" },
  ],
  staff: [
    ...generatedStaff,
    { ...generatedStaff[0] }, // duplicate staffId within file
  ],
};

// Clean version (no deliberately-invalid/duplicate rows) used to pre-seed
// the app on first load, per AC: "so the school can start using the
// application without manually entering all existing records."
export const SEED_DATA = {
  student: [...generatedStudents, ...extraStudentsClass1To8],
  parent: [...generatedParents, ...extraParentsClass1To8],
  staff: generatedStaff,
};
