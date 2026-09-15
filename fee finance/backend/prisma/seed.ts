import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.studentDiscountAssignment.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.paymentPlanInstallment.deleteMany();
  await prisma.paymentPlan.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.feeCategory.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.studentParentLink.deleteMany();
  await prisma.parentGuardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);
  const financePasswordHash = await bcrypt.hash('Finance@123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Eleanor Vance (SuperAdmin)',
      email: 'superadmin@schoolconnect.edu',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Marcus Sterling (Admin)',
      email: 'admin@schoolconnect.edu',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const finance = await prisma.user.create({
    data: {
      name: 'Fiona Gallagher (Finance)',
      email: 'finance@schoolconnect.edu',
      passwordHash: financePasswordHash,
      role: 'FINANCE',
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Clara Oswald (Staff)',
      email: 'staff@schoolconnect.edu',
      passwordHash: staffPasswordHash,
      role: 'STAFF',
      isActive: true,
    },
  });

  console.log('👥 Created Users: SuperAdmin, Admin, Finance, Staff');

  // 2. Create Parents/Guardians
  const parent1 = await prisma.parentGuardian.create({
    data: {
      firstName: 'Rajesh',
      lastName: 'Sharma',
      relationship: 'FATHER',
      phone: '+91 98765 43210',
      email: 'rajesh.sharma@example.com',
      occupation: 'Senior Software Architect',
      address: '42 Lotus Boulevard, Indiranagar, Bengaluru, 560038',
      idProofType: 'AADHAAR',
      idProofNumber: 'XXXX-XXXX-4819',
    },
  });

  const parent2 = await prisma.parentGuardian.create({
    data: {
      firstName: 'Meena',
      lastName: 'Sharma',
      relationship: 'MOTHER',
      phone: '+91 98765 43211',
      email: 'meena.sharma@example.com',
      occupation: 'Pediatrician',
      address: '42 Lotus Boulevard, Indiranagar, Bengaluru, 560038',
      idProofType: 'PASSPORT',
      idProofNumber: 'P8934201',
    },
  });

  const parent3 = await prisma.parentGuardian.create({
    data: {
      firstName: 'David',
      lastName: 'Miller',
      relationship: 'FATHER',
      phone: '+91 98234 11223',
      email: 'david.miller@example.com',
      occupation: 'Financial Analyst',
      address: '77 Oakwood Residency, Koramangala, Bengaluru, 560034',
      idProofType: 'DRIVING_LICENSE',
      idProofNumber: 'KA-01-2018-9921',
    },
  });

  const parent4 = await prisma.parentGuardian.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Miller',
      relationship: 'MOTHER',
      phone: '+91 98234 11224',
      email: 'sarah.miller@example.com',
      occupation: 'Graphic Designer',
      address: '77 Oakwood Residency, Koramangala, Bengaluru, 560034',
    },
  });

  const parent5 = await prisma.parentGuardian.create({
    data: {
      firstName: 'Ananya',
      lastName: 'Iyer',
      relationship: 'MOTHER',
      phone: '+91 99112 23344',
      email: 'ananya.iyer@example.com',
      occupation: 'Civil Engineer',
      address: '15 Green Meadows, Whitefield, Bengaluru, 560066',
      idProofType: 'PASSPORT',
      idProofNumber: 'P1122334',
    },
  });

  const parent6 = await prisma.parentGuardian.create({
    data: {
      firstName: 'Vikram',
      lastName: 'Kapoor',
      relationship: 'FATHER',
      phone: '+91 99887 76655',
      email: 'vikram.kapoor@example.com',
      occupation: 'Business Executive',
      address: '108 Palm Grove, HSR Layout, Bengaluru, 560102',
      idProofType: 'AADHAAR',
      idProofNumber: 'XXXX-XXXX-9012',
    },
  });

  console.log('👨‍👩‍👧 Created Parents & Guardians');

  // 3. Create Students
  const student1 = await prisma.student.create({
    data: {
      admissionNumber: 'SC-2026-001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: new Date('2015-06-14'),
      gender: 'MALE',
      bloodGroup: 'O+',
      nationality: 'Indian',
      address: '42 Lotus Boulevard, Indiranagar, Bengaluru, 560038',
      phone: '+91 98765 43210',
      email: 'aarav.sharma@schoolconnect.edu',
      status: 'ENROLLED',
      currentGrade: 'Grade 5',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  // Sibling of Aarav
  const student2 = await prisma.student.create({
    data: {
      admissionNumber: 'SC-2026-002',
      firstName: 'Priya',
      lastName: 'Sharma',
      dateOfBirth: new Date('2018-09-22'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      nationality: 'Indian',
      address: '42 Lotus Boulevard, Indiranagar, Bengaluru, 560038',
      phone: '+91 98765 43211',
      email: 'priya.sharma@schoolconnect.edu',
      status: 'ENROLLED',
      currentGrade: 'Grade 2',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      admissionNumber: 'SC-2026-003',
      firstName: 'Liam',
      lastName: 'Miller',
      dateOfBirth: new Date('2014-03-10'),
      gender: 'MALE',
      bloodGroup: 'B+',
      nationality: 'Indian',
      address: '77 Oakwood Residency, Koramangala, Bengaluru, 560034',
      phone: '+91 98234 11223',
      status: 'ADMITTED',
      currentGrade: 'Grade 6',
      createdById: admin.id,
      updatedById: superAdmin.id,
    },
  });

  const student4 = await prisma.student.create({
    data: {
      admissionNumber: 'SC-2026-004',
      firstName: 'Diya',
      lastName: 'Iyer',
      dateOfBirth: new Date('2016-11-05'),
      gender: 'FEMALE',
      bloodGroup: 'AB+',
      nationality: 'Indian',
      address: '15 Green Meadows, Whitefield, Bengaluru, 560066',
      status: 'APPLIED',
      currentGrade: 'Grade 4',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const student5 = await prisma.student.create({
    data: {
      admissionNumber: 'SC-2026-005',
      firstName: 'Kabir',
      lastName: 'Kapoor',
      dateOfBirth: new Date('2013-08-19'),
      gender: 'MALE',
      bloodGroup: 'O-',
      nationality: 'Indian',
      address: '108 Palm Grove, HSR Layout, Bengaluru, 560102',
      phone: '+91 99887 76655',
      status: 'ENQUIRY',
      currentGrade: 'Grade 7',
      createdById: staff.id,
      updatedById: staff.id,
    },
  });

  console.log('🎓 Created Students');

  // 4. Create Parent-Student Links
  await prisma.studentParentLink.createMany({
    data: [
      {
        studentId: student1.id,
        parentGuardianId: parent1.id,
        isPrimaryContact: true,
        isEmergencyContact: true,
        relationshipNotes: 'Father & primary point of contact for academics and billing.',
      },
      {
        studentId: student1.id,
        parentGuardianId: parent2.id,
        isPrimaryContact: false,
        isEmergencyContact: true,
        relationshipNotes: 'Mother, pediatrician at City Hospital.',
      },
      {
        studentId: student2.id,
        parentGuardianId: parent1.id,
        isPrimaryContact: true,
        isEmergencyContact: true,
        relationshipNotes: 'Father',
      },
      {
        studentId: student2.id,
        parentGuardianId: parent2.id,
        isPrimaryContact: false,
        isEmergencyContact: true,
        relationshipNotes: 'Mother',
      },
      {
        studentId: student3.id,
        parentGuardianId: parent3.id,
        isPrimaryContact: true,
        isEmergencyContact: true,
        relationshipNotes: 'Father',
      },
      {
        studentId: student3.id,
        parentGuardianId: parent4.id,
        isPrimaryContact: false,
        isEmergencyContact: false,
      },
      {
        studentId: student4.id,
        parentGuardianId: parent5.id,
        isPrimaryContact: true,
        isEmergencyContact: true,
      },
      {
        studentId: student5.id,
        parentGuardianId: parent6.id,
        isPrimaryContact: true,
        isEmergencyContact: true,
      },
    ],
  });

  console.log('🔗 Linked Students with Parents & Contact Flags');

  // 5. Create Admissions
  await prisma.admission.create({
    data: {
      studentId: student1.id,
      academicYear: '2026-2027',
      gradeAppliedFor: 'Grade 5',
      applicationDate: new Date('2026-01-10'),
      admissionDate: new Date('2026-02-15'),
      admissionStatus: 'ENROLLED',
      previousSchool: 'Greenwood International',
      documentsSubmitted: JSON.stringify(['Birth Certificate', 'Transfer Certificate', 'Report Card', 'Medical Form']),
      remarks: 'Enrolled with all documents verified.',
      decidedById: superAdmin.id,
    },
  });

  await prisma.admission.create({
    data: {
      studentId: student2.id,
      academicYear: '2026-2027',
      gradeAppliedFor: 'Grade 2',
      applicationDate: new Date('2026-01-15'),
      admissionDate: new Date('2026-02-18'),
      admissionStatus: 'ENROLLED',
      previousSchool: 'Little Angels Montessori',
      documentsSubmitted: JSON.stringify(['Birth Certificate', 'Medical Certificate', 'Address Proof']),
      remarks: 'Sibling discount applied as per policy.',
      decidedById: admin.id,
    },
  });

  await prisma.admission.create({
    data: {
      studentId: student3.id,
      academicYear: '2026-2027',
      gradeAppliedFor: 'Grade 6',
      applicationDate: new Date('2026-02-01'),
      admissionDate: new Date('2026-02-25'),
      admissionStatus: 'APPROVED',
      previousSchool: 'St. Joseph Academy',
      documentsSubmitted: JSON.stringify(['Transfer Certificate', 'Grade 5 Mark Sheet', 'Aadhaar Card']),
      remarks: 'Approved by admissions committee. Awaiting final fee deposit.',
      decidedById: superAdmin.id,
    },
  });

  // ----------------------------------------------------
  // 6. FEE MANAGEMENT MODULE SAMPLE DATA (AC15: Sample/Demo Data)
  // ----------------------------------------------------

  // 6.1 Fee Categories
  const tuitionCat = await prisma.feeCategory.create({
    data: {
      name: 'Tuition Fee',
      code: 'TUI',
      feeType: 'RECURRING',
      defaultFrequency: 'QUARTERLY',
      isMandatory: true,
      discountAllowed: true,
      description: 'Core instructional fee covering curriculum delivery and academic resources.',
      createdById: finance.id,
    },
  });

  const admissionCat = await prisma.feeCategory.create({
    data: {
      name: 'Admission Fee',
      code: 'ADM',
      feeType: 'ONE_TIME',
      defaultFrequency: 'ONE_TIME',
      isMandatory: true,
      discountAllowed: false,
      description: 'One-time registration and student intake admission fee.',
      createdById: finance.id,
    },
  });

  const annualCat = await prisma.feeCategory.create({
    data: {
      name: 'Annual Charges',
      code: 'ANN',
      feeType: 'ANNUAL',
      defaultFrequency: 'FULL_YEAR',
      isMandatory: true,
      discountAllowed: true,
      description: 'Annual institutional maintenance, library access, and co-curricular charges.',
      createdById: finance.id,
    },
  });

  const transportCat = await prisma.feeCategory.create({
    data: {
      name: 'Transport Fee',
      code: 'TRANS',
      feeType: 'SERVICE',
      defaultFrequency: 'QUARTERLY',
      isMandatory: false,
      discountAllowed: true,
      description: 'Optional school bus transit and GPS tracking service fee.',
      createdById: finance.id,
    },
  });

  const labCat = await prisma.feeCategory.create({
    data: {
      name: 'Laboratory & Technology Fee',
      code: 'LAB',
      feeType: 'RECURRING',
      defaultFrequency: 'QUARTERLY',
      isMandatory: true,
      discountAllowed: true,
      description: 'Covers STEM laboratories, computer science equipment, and high-speed campus internet.',
      createdById: finance.id,
    },
  });

  const devCat = await prisma.feeCategory.create({
    data: {
      name: 'Annual Development Fee',
      code: 'DEV',
      feeType: 'ANNUAL',
      defaultFrequency: 'FULL_YEAR',
      isMandatory: true,
      discountAllowed: false,
      description: 'Infrastructure development and campus facilities enhancement fee.',
      createdById: finance.id,
    },
  });

  const examCat = await prisma.feeCategory.create({
    data: {
      name: 'Examination Fee',
      code: 'EXAM',
      feeType: 'ANNUAL',
      defaultFrequency: 'FULL_YEAR',
      isMandatory: true,
      discountAllowed: false,
      description: 'Assessment materials, examination hall management, and report card preparation.',
      createdById: finance.id,
    },
  });

  const sportsCat = await prisma.feeCategory.create({
    data: {
      name: 'Sports & Activity Fee',
      code: 'SPORT',
      feeType: 'ANNUAL',
      defaultFrequency: 'FULL_YEAR',
      isMandatory: true,
      discountAllowed: true,
      description: 'Athletic training, sports kit, physical education coaching, and annual tournament events.',
      createdById: finance.id,
    },
  });

  console.log('🏷️ Created Fee Categories (Tuition, Admission, Annual, Transport, Lab, Dev, Exam, Sports)');

  // 6.2 Fee Structures with Multi-Head Items & Payment Plans
  const feeStructuresData = [
    {
      name: 'Middle School Regular',
      academicYear: '2026-2027',
      gradeOrClass: 'Grade 6',
      studentCategory: 'REGULAR',
      items: [
        { feeCategoryId: tuitionCat.id, amount: 48000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
        { feeCategoryId: annualCat.id, amount: 6000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
        { feeCategoryId: devCat.id, amount: 4000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: false },
        { feeCategoryId: labCat.id, amount: 2000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
      ],
    },
    {
      name: 'Grade 5 Standard Regular',
      academicYear: '2026-2027',
      gradeOrClass: 'Grade 5',
      studentCategory: 'REGULAR',
      items: [
        { feeCategoryId: tuitionCat.id, amount: 56000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
        { feeCategoryId: annualCat.id, amount: 5000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
        { feeCategoryId: labCat.id, amount: 3000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
      ],
    },
    {
      name: 'Grade 2 Primary Regular',
      academicYear: '2026-2027',
      gradeOrClass: 'Grade 2',
      studentCategory: 'REGULAR',
      items: [
        { feeCategoryId: tuitionCat.id, amount: 48000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
        { feeCategoryId: annualCat.id, amount: 4000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
        { feeCategoryId: sportsCat.id, amount: 2000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
      ],
    },
    {
      name: 'Kindergarten Early Years',
      academicYear: '2026-2027',
      gradeOrClass: 'Kindergarten',
      studentCategory: 'REGULAR',
      items: [
        { feeCategoryId: tuitionCat.id, amount: 40000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true },
        { feeCategoryId: annualCat.id, amount: 4000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
        { feeCategoryId: sportsCat.id, amount: 4000, frequency: 'FULL_YEAR', isMandatory: true, discountAllowed: true },
      ],
    },
  ];

  const createdStructures: any[] = [];
  for (const fs of feeStructuresData) {
    const totalAmount = fs.items.reduce((sum, it) => sum + it.amount, 0);
    const qAmount = Math.floor((totalAmount / 4) * 100) / 100;
    const fourthQAmount = Math.round((totalAmount - qAmount * 3) * 100) / 100;

    const structure = await prisma.feeStructure.create({
      data: {
        name: fs.name,
        academicYear: fs.academicYear,
        gradeOrClass: fs.gradeOrClass,
        studentCategory: fs.studentCategory,
        status: 'ACTIVE',
        version: 1,
        amount: totalAmount,
        currency: 'INR',
        feeCategoryId: fs.items[0].feeCategoryId, // Primary category compatibility
        createdById: finance.id,
        items: {
          create: fs.items.map((it) => ({
            feeCategoryId: it.feeCategoryId,
            amount: it.amount,
            frequency: it.frequency,
            isMandatory: it.isMandatory,
            discountAllowed: it.discountAllowed,
          })),
        },
        paymentPlans: {
          create: [
            {
              name: 'Full-Year Upfront Plan',
              type: 'FULL_YEAR',
              frequency: 'FULL_YEAR',
              installmentCount: 1,
              numberOfInstallments: 1,
              status: 'ACTIVE',
              createdById: finance.id,
              installments: {
                create: [
                  {
                    sequence: 1,
                    installmentNumber: 1,
                    quarter: null,
                    dueMonth: 'Full Year (Annual)',
                    dueDate: new Date('2026-04-15'),
                    dueDateRule: 'Payable upfront on or before 15th April',
                    amount: totalAmount,
                    status: 'CONFIGURED',
                  },
                ],
              },
            },
            {
              name: 'Quarterly Standard Plan',
              type: 'QUARTERLY',
              frequency: 'QUARTERLY',
              installmentCount: 4,
              numberOfInstallments: 4,
              status: 'ACTIVE',
              createdById: finance.id,
              installments: {
                create: [
                  {
                    sequence: 1,
                    installmentNumber: 1,
                    quarter: 'Q1',
                    dueMonth: 'April–June (Q1)',
                    dueDate: new Date('2026-04-15'),
                    dueDateRule: 'Due on 15th April (Session Start)',
                    amount: qAmount,
                    status: 'CONFIGURED',
                  },
                  {
                    sequence: 2,
                    installmentNumber: 2,
                    quarter: 'Q2',
                    dueMonth: 'July–September (Q2)',
                    dueDate: new Date('2026-07-15'),
                    dueDateRule: 'Due on 15th July',
                    amount: qAmount,
                    status: 'CONFIGURED',
                  },
                  {
                    sequence: 3,
                    installmentNumber: 3,
                    quarter: 'Q3',
                    dueMonth: 'October–December (Q3)',
                    dueDate: new Date('2026-10-15'),
                    dueDateRule: 'Due on 15th October',
                    amount: qAmount,
                    status: 'CONFIGURED',
                  },
                  {
                    sequence: 4,
                    installmentNumber: 4,
                    quarter: 'Q4',
                    dueMonth: 'January–March (Q4)',
                    dueDate: new Date('2027-01-15'),
                    dueDateRule: 'Due on 15th January',
                    amount: fourthQAmount,
                    status: 'CONFIGURED',
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        items: { include: { feeCategory: true } },
        paymentPlans: { include: { installments: true } },
      },
    });
    createdStructures.push(structure);
  }

  console.log('📊 Created Multi-Head Fee Structures with FeeStructureItems & Payment Plans');

  // 6.3 Discount Rules (Sample/Configurable - AC15)
  const siblingDiscount = await prisma.discountRule.create({
    data: {
      name: 'Sibling Concession',
      code: 'SIBLING_15',
      description: '15% concession on tuition fees for younger enrolled siblings.',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      value: 15,
      paymentOption: 'ANY',
      eligibilityType: 'SIBLING',
      eligibilityCriteria: 'Enrolled elder sibling in active academic standing.',
      applicableStudentCategories: JSON.stringify(['SIBLING', 'REGULAR']),
      applicableFeeCategoryIds: JSON.stringify([tuitionCat.id]),
      approvalRequired: true,
      approvalStatus: 'APPROVED',
      approvedById: finance.id,
      status: 'ACTIVE',
      active: true,
      createdById: finance.id,
      feeHeads: {
        create: [{ feeCategoryId: tuitionCat.id }],
      },
    },
  });

  const meritDiscount = await prisma.discountRule.create({
    data: {
      name: 'Merit Academic Scholarship',
      code: 'MERIT_25',
      description: '25% scholarship for top 5% entrance test performers.',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      value: 25,
      paymentOption: 'ANY',
      eligibilityType: 'SCHOLARSHIP',
      eligibilityCriteria: 'Entrance test score >= 90%.',
      applicableFeeCategoryIds: JSON.stringify([tuitionCat.id]),
      approvalRequired: true,
      approvalStatus: 'APPROVED',
      approvedById: finance.id,
      status: 'ACTIVE',
      active: true,
      createdById: finance.id,
      feeHeads: {
        create: [{ feeCategoryId: tuitionCat.id }],
      },
    },
  });

  const earlyBirdDiscount = await prisma.discountRule.create({
    data: {
      name: 'Early Full-Year Payment Discount',
      code: 'EARLY_FULL_YEAR_7',
      description: '7% discount on total tuition when paid 100% upfront in full year advance.',
      discountType: 'PERCENTAGE',
      discountValue: 7,
      value: 7,
      paymentOption: 'FULL_YEAR',
      eligibilityType: 'ALL',
      eligibilityCriteria: 'Available for all students selecting Full-Year upfront payment plan.',
      applicableFeeCategoryIds: JSON.stringify([tuitionCat.id]),
      approvalRequired: false,
      approvalStatus: 'APPROVED',
      approvedById: finance.id,
      status: 'ACTIVE',
      active: true,
      createdById: finance.id,
      feeHeads: {
        create: [{ feeCategoryId: tuitionCat.id }],
      },
    },
  });

  const scholarshipDiscount = await prisma.discountRule.create({
    data: {
      name: 'Special Talent Flat Scholarship',
      code: 'TALENT_5K',
      description: 'Flat ₹5,000 concession for state-level sports and arts performers.',
      discountType: 'FIXED_AMOUNT',
      discountValue: 5000,
      value: 5000,
      paymentOption: 'ANY',
      eligibilityType: 'SCHOLARSHIP',
      eligibilityCriteria: 'State-level certificate in recognized sports/cultural competition.',
      applicableFeeCategoryIds: JSON.stringify([tuitionCat.id, sportsCat.id]),
      approvalRequired: true,
      approvalStatus: 'APPROVED',
      approvedById: finance.id,
      status: 'ACTIVE',
      active: true,
      createdById: finance.id,
      feeHeads: {
        create: [{ feeCategoryId: tuitionCat.id }, { feeCategoryId: sportsCat.id }],
      },
    },
  });

  console.log('🎁 Created Discount Rules (Percentage & Flat Amount)');

  // 6.4 Student Discount Assignments
  // Sibling discount approved for Priya Sharma (Student 2)
  const priyaDiscount = await prisma.studentDiscountAssignment.create({
    data: {
      studentId: student2.id,
      discountRuleId: siblingDiscount.id,
      status: 'APPROVED',
      approvedById: finance.id,
      approvalDate: new Date(),
      remarks: 'Elder brother Aarav Sharma (SC-2026-001) verified in Grade 5.',
    },
  });

  // Merit discount pending for Liam Miller (Student 3)
  await prisma.studentDiscountAssignment.create({
    data: {
      studentId: student3.id,
      discountRuleId: meritDiscount.id,
      status: 'PENDING',
      remarks: 'Entrance score 92.5% awaiting committee sign-off.',
    },
  });

  console.log('🎯 Created Student Discount Assignments');

  // 6.5 Fee Assignment Snapshots (AC6, AC8, AC14)
  // For Priya Sharma (Grade 2 Tuition Fee: 64,000 INR, 15% discount = 9,600 INR, Final = 54,400 INR, Quarterly Plan: 13,600 INR x 4)
  const priyaStructure = createdStructures.find(
    (s) => s.gradeOrClass === 'Grade 2' && s.feeCategoryId === tuitionCat.id
  );
  const priyaQuarterlyPlan = priyaStructure?.paymentPlans.find(
    (p: any) => p.frequency === 'QUARTERLY'
  );

  if (priyaStructure && priyaQuarterlyPlan) {
    const orig = 64000;
    const disc = 9600; // 15% of 64000
    const final = 54400;
    const qFinal = 13600;

    await prisma.feeAssignment.create({
      data: {
        studentId: student2.id,
        feeStructureId: priyaStructure.id,
        paymentPlanId: priyaQuarterlyPlan.id,
        originalAmount: orig,
        discountApplied: disc,
        finalPayableAmount: final,
        currency: 'INR',
        status: 'ACTIVE',
        calculationDetails: JSON.stringify({
          appliedDiscounts: [
            {
              discountRuleId: siblingDiscount.id,
              name: siblingDiscount.name,
              discountType: 'PERCENTAGE',
              ruleValue: 15,
              calculatedDiscount: disc,
            },
          ],
          installments: [
            {
              installmentNumber: 1,
              dueDate: '2026-04-15T00:00:00.000Z',
              dueMonth: 'April (Q1)',
              baseAmount: 16000,
              finalAmount: qFinal,
            },
            {
              installmentNumber: 2,
              dueDate: '2026-07-15T00:00:00.000Z',
              dueMonth: 'July (Q2)',
              baseAmount: 16000,
              finalAmount: qFinal,
            },
            {
              installmentNumber: 3,
              dueDate: '2026-10-15T00:00:00.000Z',
              dueMonth: 'October (Q3)',
              baseAmount: 16000,
              finalAmount: qFinal,
            },
            {
              installmentNumber: 4,
              dueDate: '2027-01-15T00:00:00.000Z',
              dueMonth: 'January (Q4)',
              baseAmount: 16000,
              finalAmount: qFinal,
            },
          ],
          calculatedAt: new Date().toISOString(),
        }),
        createdById: finance.id,
      },
    });
  }

  // For Aarav Sharma (Grade 5 Tuition Fee: 72,000 INR, Full-Year Plan)
  const aaravStructure = createdStructures.find(
    (s) => s.gradeOrClass === 'Grade 5' && s.feeCategoryId === tuitionCat.id
  );
  const aaravFullYearPlan = aaravStructure?.paymentPlans.find(
    (p: any) => p.frequency === 'FULL_YEAR'
  );

  if (aaravStructure && aaravFullYearPlan) {
    await prisma.feeAssignment.create({
      data: {
        studentId: student1.id,
        feeStructureId: aaravStructure.id,
        paymentPlanId: aaravFullYearPlan.id,
        originalAmount: 72000,
        discountApplied: 0,
        finalPayableAmount: 72000,
        currency: 'INR',
        status: 'ACTIVE',
        calculationDetails: JSON.stringify({
          appliedDiscounts: [],
          installments: [
            {
              installmentNumber: 1,
              dueDate: '2026-04-15T00:00:00.000Z',
              dueMonth: 'April',
              baseAmount: 72000,
              finalAmount: 72000,
            },
          ],
          calculatedAt: new Date().toISOString(),
        }),
        createdById: finance.id,
      },
    });
  }

  console.log('💳 Created Sample Fee Assignment Snapshots (Persistent - AC14)');
  console.log('✨ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
