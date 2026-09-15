import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('Fee Management Module Integration Tests', () => {
  let superAdminToken: string;
  let financeToken: string;
  let adminToken: string;
  let staffToken: string;
  let testStudentId: string;

  beforeAll(async () => {
    // 1. Get tokens for all roles
    const saLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@schoolconnect.edu', password: 'Admin@123' });
    superAdminToken = saLogin.body.accessToken;

    const finLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'finance@schoolconnect.edu', password: 'Finance@123' });
    financeToken = finLogin.body.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@schoolconnect.edu', password: 'Admin@123' });
    adminToken = adminLogin.body.accessToken;

    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@schoolconnect.edu', password: 'Staff@123' });
    staffToken = staffLogin.body.accessToken;

    const student = await prisma.student.findFirst();
    testStudentId = student!.id;

    // Clean up any previous test artifacts to ensure test idempotency
    await prisma.feeAssignment.deleteMany({
      where: { feeStructure: { academicYear: '2027-2028' } },
    });
    await prisma.feeStructure.deleteMany({
      where: { academicYear: '2027-2028' },
    });
    await prisma.discountRule.deleteMany({
      where: { name: { in: ['Staff Child Special Waiver', 'Integration Valid 10% Discount'] } },
    });
    await prisma.feeCategory.deleteMany({
      where: {
        code: {
          in: [
            'ROBO',
            'MUSIC',
            'SWIM',
            'DUPLICATE',
            'TEST_INACTIVE',
          ],
        },
      },
    });
  });

  // ====================================================
  // 1. RBAC & Role Enforcement Tests (AC11)
  // ====================================================
  describe('RBAC & Role Enforcement (AC11)', () => {
    it('should allow Finance user to create fee categories', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Robotics & AI Club Fee',
          code: 'ROBO',
          description: 'Special club fee for robotics lab',
          feeType: 'RECURRING',
          defaultFrequency: 'QUARTERLY',
          isMandatory: false,
          discountAllowed: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBeDefined();
      expect(res.body.category.name).toBe('Robotics & AI Club Fee');
      expect(res.body.category.code).toBe('ROBO');
      expect(res.body.category.feeType).toBe('RECURRING');
      expect(res.body.category.defaultFrequency).toBe('QUARTERLY');
      expect(res.body.category.isMandatory).toBe(false);
      expect(res.body.category.discountAllowed).toBe(true);
    });

    it('should allow SuperAdmin to create fee categories', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Music & Arts Academy Fee',
          code: 'MUSIC',
          description: 'Music curriculum fee',
          feeType: 'ANNUAL',
          defaultFrequency: 'FULL_YEAR',
        });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('Music & Arts Academy Fee');
      expect(res.body.category.code).toBe('MUSIC');
    });

    it('should allow Admin to read fee categories (view-only context)', async () => {
      const res = await request(app)
        .get('/api/fees/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    it('should FORBID Admin from creating fee categories (403)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unauthorized Admin Category',
          code: 'UNAUTH_ADM',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should FORBID Staff from accessing fee endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/fees/categories')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should reject unauthenticated requests on fee endpoints (401)', async () => {
      const res = await request(app).get('/api/fees/categories');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ====================================================
  // 2. Fee Categories CRUD & Uniqueness (Module 1 Requirements)
  // ====================================================
  describe('Fee Categories Management (Module 1)', () => {
    let createdCatId: string;

    it('should reject creating duplicate category names (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Tuition Fee', // Already exists in seed
          code: 'NEW_TUI',
          description: 'Duplicate tuition fee attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('NAME_EXISTS');
    });

    it('should reject creating duplicate category codes (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Unique Tuition Alt',
          code: 'TUI', // Already exists in seed
          description: 'Duplicate code attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CODE_EXISTS');
    });

    it('should validate mandatory fields when creating fee category (400)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: '', // Empty name
          code: '', // Empty code
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid feeType enum values (400)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid Type Test',
          code: 'INV_TYPE',
          feeType: 'HOURLY_RATE', // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid frequency enum values (400)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid Frequency Test',
          code: 'INV_FREQ',
          defaultFrequency: 'DAILY', // Invalid enum
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create a complete fee category with all attributes', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Integration Test Swimming Fee',
          code: 'SWIM',
          description: 'Olympic size pool coaching and safety maintenance fee',
          feeType: 'SERVICE',
          defaultFrequency: 'QUARTERLY',
          isMandatory: false,
          discountAllowed: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.category.id).toBeDefined();
      expect(res.body.category.code).toBe('SWIM');
      expect(res.body.category.feeType).toBe('SERVICE');
      expect(res.body.category.defaultFrequency).toBe('QUARTERLY');
      expect(res.body.category.isMandatory).toBe(false);
      expect(res.body.category.discountAllowed).toBe(true);
      expect(res.body.category.isActive).toBe(true);
      createdCatId = res.body.category.id;
    });

    it('should retrieve fee category by ID', async () => {
      const res = await request(app)
        .get(`/api/fees/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.category.id).toBe(createdCatId);
      expect(res.body.category.name).toBe('Integration Test Swimming Fee');
    });

    it('should update fee category attributes', async () => {
      const res = await request(app)
        .patch(`/api/fees/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          description: 'Updated description for swimming pool',
          discountAllowed: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.category.description).toBe('Updated description for swimming pool');
      expect(res.body.category.discountAllowed).toBe(false);
    });

    it('should soft-deactivate and reactivate a fee category', async () => {
      // 1. Deactivate
      const deactRes = await request(app)
        .delete(`/api/fees/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.category.isActive).toBe(false);

      // 2. Verify inactive category cannot be used to create new fee structures
      const structRes = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Inactive Category Test Structure',
          academicYear: '2027-2028',
          gradeOrClass: 'Grade 10',
          feeCategoryId: createdCatId,
          amount: 50000,
        });

      expect(structRes.status).toBe(400);
      expect(structRes.body.error.code).toBe('INACTIVE_FEE_CATEGORY');

      // 3. Reactivate
      const reactRes = await request(app)
        .delete(`/api/fees/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.category.isActive).toBe(true);
    });

    it('should support search and query filtering on categories', async () => {
      const res = await request(app)
        .get('/api/fees/categories?search=Swimming&feeType=SERVICE')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories.some((c: any) => c.code === 'SWIM')).toBe(true);
    });
  });

  // ====================================================
  // 3. Fee Structures Management (Module 2 Requirements)
  // ====================================================
  describe('Fee Structures Management (Module 2)', () => {
    let tuitionCategory: any;
    let labCategory: any;
    let annualCategory: any;
    let devCategory: any;
    let createdMultiStructureId: string;

    beforeAll(async () => {
      const catRes = await request(app)
        .get('/api/fees/categories')
        .set('Authorization', `Bearer ${financeToken}`);
      const cats = catRes.body.categories;
      tuitionCategory = cats.find((c: any) => c.code === 'TUI');
      labCategory = cats.find((c: any) => c.code === 'LAB');
      annualCategory = cats.find((c: any) => c.code === 'ANN');
      devCategory = cats.find((c: any) => c.code === 'DEV');
    });

    it('should create a multi-item fee structure with aggregate total and auto-generate payment plans', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Middle School Standard Regular',
          academicYear: '2027-2028',
          gradeOrClass: 'Grade 6',
          section: 'Section A',
          studentCategory: 'REGULAR',
          items: [
            {
              feeCategoryId: tuitionCategory.id,
              amount: 48000,
              frequency: 'QUARTERLY',
              isMandatory: true,
              discountAllowed: true,
            },
            {
              feeCategoryId: annualCategory.id,
              amount: 6000,
              frequency: 'FULL_YEAR',
              isMandatory: true,
              discountAllowed: true,
            },
            {
              feeCategoryId: devCategory.id,
              amount: 4000,
              frequency: 'FULL_YEAR',
              isMandatory: true,
              discountAllowed: false,
            },
            {
              feeCategoryId: labCategory.id,
              amount: 2000,
              frequency: 'QUARTERLY',
              isMandatory: true,
              discountAllowed: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.structure).toBeDefined();
      expect(res.body.structure.name).toBe('Middle School Standard Regular');
      expect(res.body.structure.academicYear).toBe('2027-2028');
      expect(res.body.structure.gradeOrClass).toBe('Grade 6');
      expect(res.body.structure.studentCategory).toBe('REGULAR');
      expect(res.body.structure.version).toBe(1);
      expect(res.body.structure.status).toBe('ACTIVE');

      // Total annual amount sum check: 48000 + 6000 + 4000 + 2000 = 60000
      expect(Number(res.body.structure.amount)).toBe(60000);
      expect(res.body.structure.items.length).toBe(4);

      // Payment plans
      expect(res.body.structure.paymentPlans.length).toBe(2);
      const fullYear = res.body.structure.paymentPlans.find((p: any) => p.frequency === 'FULL_YEAR');
      expect(fullYear).toBeDefined();
      expect(fullYear.numberOfInstallments).toBe(1);

      const quarterly = res.body.structure.paymentPlans.find((p: any) => p.frequency === 'QUARTERLY');
      expect(quarterly).toBeDefined();
      expect(quarterly.numberOfInstallments).toBe(4);

      createdMultiStructureId = res.body.structure.id;
    });

    it('should retrieve detailed fee structure with item breakdown and audit info', async () => {
      const res = await request(app)
        .get(`/api/fees/structures/${createdMultiStructureId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.structure.id).toBe(createdMultiStructureId);
      expect(res.body.structure.items.length).toBe(4);
      expect(Number(res.body.structure.amount)).toBe(60000);
      expect(res.body.structure.createdBy).toBeDefined();
    });

    it('should reject creating a structure with non-positive fee item amount (400)', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid Negative Item',
          academicYear: '2027-2028',
          gradeOrClass: 'Grade 7',
          studentCategory: 'REGULAR',
          items: [
            {
              feeCategoryId: tuitionCategory.id,
              amount: -500, // Invalid negative
              frequency: 'QUARTERLY',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject creating a structure with empty items array (400)', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Empty Items Structure',
          academicYear: '2027-2028',
          gradeOrClass: 'Grade 8',
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent duplicate active structure for same class + academic year + studentCategory + section (409)', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Duplicate Middle School',
          academicYear: '2027-2028',
          gradeOrClass: 'Grade 6',
          section: 'Section A',
          studentCategory: 'REGULAR',
          items: [
            {
              feeCategoryId: tuitionCategory.id,
              amount: 50000,
              frequency: 'QUARTERLY',
            },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should filter fee structures by academicYear, class/grade, studentCategory, or search keyword', async () => {
      const res = await request(app)
        .get('/api/fees/structures?academicYear=2027-2028&gradeOrClass=Grade 6&studentCategory=REGULAR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.structures.length).toBeGreaterThanOrEqual(1);
      expect(res.body.structures[0].gradeOrClass).toBe('Grade 6');
      expect(res.body.structures[0].studentCategory).toBe('REGULAR');
    });

    it('should soft-deactivate and reactivate a fee structure', async () => {
      // 1. Deactivate
      const deactRes = await request(app)
        .delete(`/api/fees/structures/${createdMultiStructureId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.structure.isActive).toBe(false);
      expect(deactRes.body.structure.status).toBe('INACTIVE');

      // 2. Reactivate
      const reactRes = await request(app)
        .delete(`/api/fees/structures/${createdMultiStructureId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.structure.isActive).toBe(true);
      expect(reactRes.body.structure.status).toBe('ACTIVE');
    });

    it('should protect financial history: creating new version when updating structure with active assignments', async () => {
      // 1. Create a sample student fee assignment on this structure
      const plan = await prisma.paymentPlan.findFirst({
        where: { feeStructureId: createdMultiStructureId },
      });

      await prisma.feeAssignment.create({
        data: {
          studentId: testStudentId,
          feeStructureId: createdMultiStructureId,
          paymentPlanId: plan!.id,
          originalAmount: 60000,
          discountApplied: 0,
          finalPayableAmount: 60000,
          currency: 'INR',
          createdById: financeToken ? (await prisma.user.findFirst({ where: { role: 'FINANCE' } }))?.id : null,
        },
      });

      // 2. Attempt to update fee structure amounts (e.g. increase Tuition to ₹52,000)
      const updateRes = await request(app)
        .patch(`/api/fees/structures/${createdMultiStructureId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Middle School Revised Regular',
          items: [
            {
              feeCategoryId: tuitionCategory.id,
              amount: 52000,
              frequency: 'QUARTERLY',
            },
            {
              feeCategoryId: annualCategory.id,
              amount: 6000,
              frequency: 'FULL_YEAR',
            },
          ],
        });

      expect(updateRes.status).toBe(200);
      // Verify Version 2 created
      expect(updateRes.body.structure.version).toBe(2);
      expect(Number(updateRes.body.structure.amount)).toBe(58000);
      expect(updateRes.body.structure.status).toBe('ACTIVE');

      // Verify original Version 1 is archived to protect history
      const originalVersion = await prisma.feeStructure.findUnique({
        where: { id: createdMultiStructureId },
      });
      expect(originalVersion?.status).toBe('ARCHIVED');
    });
  });

  // ====================================================
  // 4. Payment Plan & Payment Frequency Management (Module 3)
  // ====================================================
  describe('Payment Plan & Frequency Management (Module 3)', () => {
    let testStructure: any;
    let createdCustomPlanId: string;

    beforeAll(async () => {
      const structRes = await request(app)
        .get('/api/fees/structures?academicYear=2026-2027&gradeOrClass=Grade 6')
        .set('Authorization', `Bearer ${financeToken}`);
      testStructure = structRes.body.structures[0];
    });

    it('should preview/calculate head-aware installment schedule for a fee structure', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/calculate-schedule`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ frequency: 'QUARTERLY' });

      expect(res.status).toBe(200);
      expect(res.body.frequency).toBe('QUARTERLY');
      expect(res.body.installments.length).toBe(4);
      expect(res.body.isConsistent).toBe(true);

      // Q1 should contain tuition quarter + annual charges + dev fee (head-aware)
      expect(res.body.installments[0].quarter).toBe('Q1');
      expect(res.body.installments[0].amount).toBeGreaterThan(res.body.installments[1].amount);
    });

    it('should create a custom quarterly payment plan with 4 quarters matching structure total (₹60,000)', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Grade 6 Custom Quarterly Schedule',
          frequency: 'QUARTERLY',
          installments: [
            { sequence: 1, quarter: 'Q1', dueMonth: 'April–June (Q1)', dueDateRule: 'Due on 15th April (Session Start)', amount: 22000 },
            { sequence: 2, quarter: 'Q2', dueMonth: 'July–September (Q2)', dueDateRule: 'Due on 15th July', amount: 13000 },
            { sequence: 3, quarter: 'Q3', dueMonth: 'October–December (Q3)', dueDateRule: 'Due on 15th October', amount: 13000 },
            { sequence: 4, quarter: 'Q4', dueMonth: 'January–March (Q4)', dueDateRule: 'Due on 15th January', amount: 12000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.plan).toBeDefined();
      expect(res.body.plan.name).toBe('Grade 6 Custom Quarterly Schedule');
      expect(res.body.plan.frequency).toBe('QUARTERLY');
      expect(res.body.plan.installmentCount).toBe(4);
      expect(res.body.plan.installments.length).toBe(4);

      // Sum of installments: 22000 + 13000 + 13000 + 12000 = 60000
      const total = res.body.plan.installments.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);
      expect(total).toBe(60000);

      createdCustomPlanId = res.body.plan.id;
    });

    it('should create a full-year payment plan with 1 installment', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Grade 6 Annual Advance Discounted Plan',
          frequency: 'FULL_YEAR',
          installments: [
            { sequence: 1, dueMonth: 'Full Year (Annual)', dueDateRule: 'Payable upfront by 15th April', amount: 60000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.plan.frequency).toBe('FULL_YEAR');
      expect(res.body.plan.installmentCount).toBe(1);
      expect(res.body.plan.installments.length).toBe(1);
      expect(Number(res.body.plan.installments[0].amount)).toBe(60000);
    });

    it('should reject quarterly plan with invalid installment count (!= 4) (400)', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid 3 Quarters Plan',
          frequency: 'QUARTERLY',
          installments: [
            { sequence: 1, quarter: 'Q1', dueMonth: 'April', amount: 20000 },
            { sequence: 2, quarter: 'Q2', dueMonth: 'July', amount: 20000 },
            { sequence: 3, quarter: 'Q3', dueMonth: 'October', amount: 20000 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INSTALLMENT_COUNT');
    });

    it('should reject full-year plan with invalid installment count (!= 1) (400)', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid 2-Part Full Year',
          frequency: 'FULL_YEAR',
          installments: [
            { sequence: 1, dueMonth: 'Part 1', amount: 30000 },
            { sequence: 2, dueMonth: 'Part 2', amount: 30000 },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_INSTALLMENT_COUNT');
    });

    it('should reject schedule whose installment sum does not equal structure amount (400)', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Mismatch Schedule Plan',
          frequency: 'QUARTERLY',
          installments: [
            { sequence: 1, quarter: 'Q1', dueMonth: 'Q1', amount: 10000 },
            { sequence: 2, quarter: 'Q2', dueMonth: 'Q2', amount: 10000 },
            { sequence: 3, quarter: 'Q3', dueMonth: 'Q3', amount: 10000 },
            { sequence: 4, quarter: 'Q4', dueMonth: 'Q4', amount: 10000 },
          ], // Total 40,000 != 60,000
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SCHEDULE_AMOUNT_MISMATCH');
    });

    it('should retrieve single payment plan by ID with complete breakdown and structure details', async () => {
      const res = await request(app)
        .get(`/api/fees/payment-plans/${createdCustomPlanId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.plan.id).toBe(createdCustomPlanId);
      expect(res.body.plan.installments.length).toBe(4);
      expect(res.body.plan.feeStructure).toBeDefined();
    });

    it('should list and filter all payment plans by fee structure, frequency, and keyword', async () => {
      const res = await request(app)
        .get(`/api/fees/payment-plans?feeStructureId=${testStructure.id}&frequency=QUARTERLY`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.paymentPlans.length).toBeGreaterThanOrEqual(1);
      expect(res.body.paymentPlans.every((p: any) => p.frequency === 'QUARTERLY')).toBe(true);
    });

    it('should update payment plan name and schedule with verified reconciliation', async () => {
      const res = await request(app)
        .patch(`/api/fees/payment-plans/${createdCustomPlanId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Grade 6 Adjusted Quarterly Schedule',
          installments: [
            { sequence: 1, quarter: 'Q1', dueMonth: 'April–June (Q1)', dueDateRule: 'Due on 15th April', amount: 24000 },
            { sequence: 2, quarter: 'Q2', dueMonth: 'July–September (Q2)', dueDateRule: 'Due on 15th July', amount: 12000 },
            { sequence: 3, quarter: 'Q3', dueMonth: 'October–December (Q3)', dueDateRule: 'Due on 15th October', amount: 12000 },
            { sequence: 4, quarter: 'Q4', dueMonth: 'January–March (Q4)', dueDateRule: 'Due on 15th January', amount: 12000 },
          ], // Total 60,000
        });

      expect(res.status).toBe(200);
      expect(res.body.plan.name).toBe('Grade 6 Adjusted Quarterly Schedule');
      expect(Number(res.body.plan.installments[0].amount)).toBe(24000);
    });

    it('should soft-deactivate and reactivate a payment plan', async () => {
      // 1. Deactivate
      const deactRes = await request(app)
        .delete(`/api/fees/payment-plans/${createdCustomPlanId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.plan.isActive).toBe(false);
      expect(deactRes.body.plan.status).toBe('INACTIVE');

      // 2. Reactivate
      const reactRes = await request(app)
        .delete(`/api/fees/payment-plans/${createdCustomPlanId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.plan.isActive).toBe(true);
      expect(reactRes.body.plan.status).toBe('ACTIVE');
    });

    it('should FORBID Staff from creating or modifying payment plans (403)', async () => {
      const res = await request(app)
        .post(`/api/fees/structures/${testStructure.id}/payment-plans`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Unauthorized Plan',
          frequency: 'FULL_YEAR',
        });

      expect(res.status).toBe(403);
    });
  });

  // ====================================================
  // 5. Discount & Concession Management (Module 4)
  // ====================================================
  describe('Discount & Concession Management (Module 4)', () => {
    let createdPercentageRule: any;
    let createdFixedRule: any;
    let pendingApprovalRule: any;
    let tuitionCat: any;

    beforeAll(async () => {
      await prisma.discountRule.deleteMany({
        where: {
          code: {
            in: [
              'SIBLING_CONCESSION_10',
              'EARLY_WAIVER_4K',
              'PRINCIPAL_WAIVER_50',
              'DUPLICATE_TEST_CODE',
            ],
          },
        },
      });
      tuitionCat = await prisma.feeCategory.findFirst({ where: { name: 'Tuition Fee' } });
      if (!tuitionCat) {
        tuitionCat = await prisma.feeCategory.findFirst();
      }
    });

    it('should reject percentage discount greater than 100% (400)', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Invalid 150% Discount',
          code: 'OVER_100_PCT',
          discountType: 'PERCENTAGE',
          value: 150,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative percentage discount (400)', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Negative Percentage Discount',
          code: 'NEG_PCT',
          discountType: 'PERCENTAGE',
          value: -10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-positive fixed amount discount (400)', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Zero Flat Discount',
          code: 'ZERO_FLAT',
          discountType: 'FIXED_AMOUNT',
          value: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create valid percentage discount rule with fee head restrictions', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Sibling Concession 10%',
          code: 'SIBLING_CONCESSION_10',
          discountType: 'PERCENTAGE',
          value: 10,
          paymentOption: 'ANY',
          eligibilityType: 'SIBLING',
          eligibilityCriteria: 'Enrolled younger sibling',
          applicableFeeCategoryIds: [tuitionCat.id],
          applicableStudentCategories: ['SIBLING', 'REGULAR'],
          applicableClasses: ['Grade 5', 'Grade 6'],
          maximumDiscount: 6000,
        });

      expect(res.status).toBe(201);
      expect(res.body.discountRule.name).toBe('Sibling Concession 10%');
      expect(res.body.discountRule.code).toBe('SIBLING_CONCESSION_10');
      expect(Number(res.body.discountRule.discountValue)).toBe(10);
      expect(res.body.discountRule.paymentOption).toBe('ANY');
      expect(res.body.discountRule.eligibilityType).toBe('SIBLING');
      expect(res.body.discountRule.feeHeads.length).toBe(1);
      expect(res.body.discountRule.feeHeads[0].feeCategoryId).toBe(tuitionCat.id);

      createdPercentageRule = res.body.discountRule;
    });

    it('should create valid fixed amount discount rule restricted to Full-Year upfront payment', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Early Registration Fixed Waiver',
          code: 'EARLY_WAIVER_4K',
          discountType: 'FIXED_AMOUNT',
          value: 4000,
          paymentOption: 'FULL_YEAR',
          eligibilityType: 'SCHOLARSHIP',
          minimumAmount: 40000,
        });

      expect(res.status).toBe(201);
      expect(res.body.discountRule.name).toBe('Early Registration Fixed Waiver');
      expect(res.body.discountRule.code).toBe('EARLY_WAIVER_4K');
      expect(Number(res.body.discountRule.discountValue)).toBe(4000);
      expect(res.body.discountRule.paymentOption).toBe('FULL_YEAR');

      createdFixedRule = res.body.discountRule;
    });

    it('should reject duplicate discount code (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Duplicate Code Rule',
          code: 'SIBLING_CONCESSION_10', // Already exists
          discountType: 'PERCENTAGE',
          value: 12,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should handle approval workflow: create PENDING rule, then approve and reject', async () => {
      // 1. Create rule requiring approval
      const createRes = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Principal Discretionary Concession',
          code: 'PRINCIPAL_WAIVER_50',
          discountType: 'PERCENTAGE',
          value: 50,
          approvalRequired: true,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.discountRule.approvalStatus).toBe('PENDING');
      expect(createRes.body.discountRule.isActive).toBe(false);

      pendingApprovalRule = createRes.body.discountRule;

      // 2. Approve rule
      const approveRes = await request(app)
        .post(`/api/fees/discount-rules/${pendingApprovalRule.id}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ status: 'APPROVED', remarks: 'Approved by principal' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.discountRule.approvalStatus).toBe('APPROVED');
      expect(approveRes.body.discountRule.isActive).toBe(true);
      expect(approveRes.body.discountRule.status).toBe('ACTIVE');

      // 3. Reject rule
      const rejectRes = await request(app)
        .post(`/api/fees/discount-rules/${pendingApprovalRule.id}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ status: 'REJECTED', remarks: 'Quota exceeded' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.discountRule.approvalStatus).toBe('REJECTED');
      expect(rejectRes.body.discountRule.isActive).toBe(false);
      expect(rejectRes.body.discountRule.status).toBe('REJECTED');
    });

    it('should list and filter discount rules with search and query params', async () => {
      const res = await request(app)
        .get('/api/fees/discount-rules?discountType=PERCENTAGE&includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.discountRules.length).toBeGreaterThanOrEqual(1);
      expect(res.body.discountRules.every((r: any) => r.discountType === 'PERCENTAGE')).toBe(true);
    });

    it('should retrieve single discount rule by ID with fee head relations and audit info', async () => {
      const res = await request(app)
        .get(`/api/fees/discount-rules/${createdPercentageRule.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.discountRule.id).toBe(createdPercentageRule.id);
      expect(res.body.discountRule.feeHeads.length).toBe(1);
      expect(res.body.discountRule.createdBy).toBeDefined();
    });

    it('should update discount rule details and fee heads', async () => {
      const res = await request(app)
        .patch(`/api/fees/discount-rules/${createdPercentageRule.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Sibling Concession 12% Revised',
          value: 12,
          description: 'Revised from 10% to 12%',
        });

      expect(res.status).toBe(200);
      expect(res.body.discountRule.name).toBe('Sibling Concession 12% Revised');
      expect(Number(res.body.discountRule.discountValue)).toBe(12);
    });

    it('should soft-toggle active status of discount rule', async () => {
      // 1. Deactivate
      const deactRes = await request(app)
        .delete(`/api/fees/discount-rules/${createdPercentageRule.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ isActive: false });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.discountRule.isActive).toBe(false);

      // 2. Reactivate
      const reactRes = await request(app)
        .delete(`/api/fees/discount-rules/${createdPercentageRule.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ isActive: true });

      expect(reactRes.status).toBe(200);
      expect(reactRes.body.discountRule.isActive).toBe(true);
    });

    it('should FORBID Staff from creating or approving discount rules (403)', async () => {
      const res = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Unauthorized Discount',
          discountType: 'PERCENTAGE',
          value: 10,
        });

      expect(res.status).toBe(403);
    });
  });

  // ====================================================
  // 5. Student Discount Assignment & Workflow (AC7, AC9)
  // ====================================================
  describe('Student Discount Assignment Workflow', () => {
    let testRule: any;

    beforeAll(async () => {
      const ruleRes = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Staff Child Special Waiver',
          discountType: 'PERCENTAGE',
          value: 30,
        });
      testRule = ruleRes.body.discountRule;
    });

    it('should assign a discount to a student and allow status update to APPROVED (AC9)', async () => {
      // 1. Assign discount
      const assignRes = await request(app)
        .post(`/api/students/${testStudentId}/discounts`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          discountRuleId: testRule.id,
          status: 'PENDING',
          remarks: 'Awaiting HR verification',
        });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.assignment.status).toBe('PENDING');

      const assignmentId = assignRes.body.assignment.id;

      // 2. Approve discount
      const updateRes = await request(app)
        .patch(`/api/students/${testStudentId}/discounts/${assignmentId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          status: 'APPROVED',
          remarks: 'HR verification completed',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.assignment.status).toBe('APPROVED');
      expect(updateRes.body.assignment.approvedById).toBeDefined();
    });

    it('should list all assigned discounts for a student', async () => {
      const res = await request(app)
        .get(`/api/students/${testStudentId}/discounts`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.assignments).toBeInstanceOf(Array);
      expect(res.body.assignments.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ====================================================
  // 6. Fee Assignment Persistence & Snapshot (AC6, AC8, AC14)
  // ====================================================
  describe('Fee Assignment Persistence & Calculation Breakdown (AC6, AC8, AC14)', () => {
    it('should calculate and persist FeeAssignment snapshot, and reload identically (AC14)', async () => {
      const feeStructure = await prisma.feeStructure.findFirst({
        where: { gradeOrClass: 'Grade 5', isActive: true },
        include: { paymentPlans: true },
      });

      const quarterlyPlan = feeStructure?.paymentPlans.find((p) => p.frequency === 'QUARTERLY');

      // 1. Save Fee Assignment
      const createRes = await request(app)
        .post(`/api/students/${testStudentId}/fee-assignments`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          feeStructureId: feeStructure!.id,
          paymentPlanId: quarterlyPlan!.id,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.feeAssignment).toBeDefined();
      expect(createRes.body.calculation).toBeDefined();
      expect(createRes.body.calculation.finalPayableAmount).toBeGreaterThanOrEqual(0);

      const assignmentId = createRes.body.feeAssignment.id;

      // 2. Fetch saved assignment (simulating page reload)
      const fetchRes = await request(app)
        .get(`/api/students/${testStudentId}/fee-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.feeAssignment.id).toBe(assignmentId);
      expect(Number(fetchRes.body.feeAssignment.originalAmount)).toBe(
        createRes.body.calculation.originalAmount
      );
      expect(Number(fetchRes.body.feeAssignment.discountApplied)).toBe(
        createRes.body.calculation.discountApplied
      );
      expect(Number(fetchRes.body.feeAssignment.finalPayableAmount)).toBe(
        createRes.body.calculation.finalPayableAmount
      );

      // Verify snapshot details contain breakdown & installments
      const parsedDetails = JSON.parse(fetchRes.body.feeAssignment.calculationDetails);
      expect(parsedDetails).toHaveProperty('installments');
      expect(parsedDetails.installments.length).toBe(4);
    });
  });

  // ====================================================
  // 7. Module 5 — Student Fee Assignment & Calculation Engine
  // ====================================================
  describe('Student Fee Assignment & Central Calculation Engine (Module 5)', () => {
    let testStructGrade6: any;
    let createdAssignmentId: string;

    beforeAll(async () => {
      // Find or create Grade 6 fee structure with items: Tuition 48,000 + Annual 6,000 + Dev 4,000 + Comp 2,000 = 60,000
      let tuitionCat = await prisma.feeCategory.findFirst({ where: { name: 'Tuition Fee' } });
      if (!tuitionCat) tuitionCat = await prisma.feeCategory.findFirst();

      const existingStruct = await prisma.feeStructure.findFirst({
        where: { gradeOrClass: 'Grade 6', academicYear: '2026-2027', isActive: true },
        include: { paymentPlans: true },
      });

      if (existingStruct) {
        testStructGrade6 = existingStruct;
      } else {
        const createRes = await request(app)
          .post('/api/fees/structures')
          .set('Authorization', `Bearer ${financeToken}`)
          .send({
            name: 'Middle School Class VI 2026-27',
            code: 'M_SCH_VI_26_27',
            academicYear: '2026-2027',
            gradeOrClass: 'Grade 6',
            studentCategory: 'REGULAR',
            amount: 60000,
            currency: 'INR',
            feeCategoryId: tuitionCat!.id,
            items: [
              { feeCategoryId: tuitionCat!.id, amount: 48000, frequency: 'QUARTERLY', isMandatory: true },
              { feeCategoryId: tuitionCat!.id, amount: 12000, frequency: 'ANNUAL', isMandatory: true },
            ],
            paymentPlans: [
              {
                name: 'Annual Lump Sum',
                frequency: 'FULL_YEAR',
                installmentCount: 1,
                installments: [{ installmentNumber: 1, dueMonth: 'April', amount: 60000 }],
              },
              {
                name: 'Standard Quarterly (Q1-Q4)',
                frequency: 'QUARTERLY',
                installmentCount: 4,
                installments: [
                  { installmentNumber: 1, dueMonth: 'April (Q1)', amount: 20000 },
                  { installmentNumber: 2, dueMonth: 'July (Q2)', amount: 15000 },
                  { installmentNumber: 3, dueMonth: 'October (Q3)', amount: 15000 },
                  { installmentNumber: 4, dueMonth: 'January (Q4)', amount: 10000 },
                ],
              },
            ],
          });
        testStructGrade6 = createRes.body.feeStructure;
      }
    });

    it('should calculate full-year fee with 16-step sequence, applying eligible full-year discount', async () => {
      // Create student in Grade 6
      const studentRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: `ADM-VI-${Date.now()}`,
          firstName: 'Rahul',
          lastName: 'Sharma',
          dateOfBirth: '2014-05-12',
          gender: 'MALE',
          address: '45 Connaught Place, New Delhi',
          currentGrade: 'Grade 6',
        });

      expect(studentRes.status).toBe(201);
      const studentId = studentRes.body.student.id;

      // Assign an approved 7% Early Full-Year Discount
      const discRuleRes = await request(app)
        .post('/api/fees/discount-rules')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: 'Early Full-Year Payment 7%',
          code: `EARLY_7_${Date.now()}`,
          discountType: 'PERCENTAGE',
          value: 7,
          paymentOption: 'FULL_YEAR',
          approvalRequired: false,
        });

      expect(discRuleRes.status).toBe(201);
      const discRuleId = discRuleRes.body.discountRule.id;

      await request(app)
        .post(`/api/students/${studentId}/discounts`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          discountRuleId: discRuleId,
          status: 'APPROVED',
        });

      // Calculate preview for Full Year: ₹60,000 gross - 7% (₹4,200) = ₹55,800 final
      const calcRes = await request(app)
        .post('/api/fees/calculate')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId,
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });

      expect(calcRes.status).toBe(200);
      expect(calcRes.body.grossAmount).toBe(60000);
      expect(calcRes.body.discountAmount).toBe(4200);
      expect(calcRes.body.finalPayable).toBe(55800);
      expect(calcRes.body.items).toBeInstanceOf(Array);
      expect(calcRes.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate quarterly fee using configured payment plan schedule without full-year discount', async () => {
      // Find a student
      const student = await prisma.student.findFirst({ where: { isDeleted: false } });

      const calcRes = await request(app)
        .post('/api/fees/calculate')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId: student!.id,
          academicYear: '2026-2027',
          paymentOption: 'QUARTERLY',
        });

      expect(calcRes.status).toBe(200);
      expect(calcRes.body.paymentOption).toBe('QUARTERLY');
      expect(calcRes.body.quarters).toBeInstanceOf(Array);
      expect(calcRes.body.quarters.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject calculation when student is not found (400/404)', async () => {
      const calcRes = await request(app)
        .post('/api/fees/calculate')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId: '00000000-0000-0000-0000-000000000000',
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });

      expect(calcRes.status).toBe(400);
      expect(calcRes.body.error.code).toBe('CALCULATION_ERROR');
    });

    it('should reject calculation when no active fee structure matches the class & academic year (400)', async () => {
      // Create student with a grade that has no fee structures
      const studentRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: `ADM-NOCLASS-${Date.now()}`,
          firstName: 'No',
          lastName: 'Structure',
          dateOfBirth: '2015-01-01',
          gender: 'OTHER',
          address: 'Test Address',
          currentGrade: 'Grade 99_Unconfigured',
        });

      const studentId = studentRes.body.student.id;

      const calcRes = await request(app)
        .post('/api/fees/calculate')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId,
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });

      expect(calcRes.status).toBe(400);
      expect(calcRes.body.error.code).toBe('CALCULATION_ERROR');
    });

    it('should persist fee assignment via top-level POST /api/fees/assignments with snapshot and audit log', async () => {
      const student = await prisma.student.findFirst({ where: { isDeleted: false, currentGrade: 'Grade 5' } });

      const createRes = await request(app)
        .post('/api/fees/assignments')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId: student!.id,
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.feeAssignment).toBeDefined();
      expect(createRes.body.feeAssignment.studentId).toBe(student!.id);
      expect(createRes.body.feeAssignment.academicYear).toBe('2026-2027');
      expect(createRes.body.feeAssignment.status).toBe('ACTIVE');

      createdAssignmentId = createRes.body.feeAssignment.id;
    });

    it('should list fee assignments with query filters (GET /api/fees/assignments)', async () => {
      const res = await request(app)
        .get('/api/fees/assignments?academicYear=2026-2027')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.feeAssignments).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve single fee assignment by ID with full calculation details (GET /api/fees/assignments/:id)', async () => {
      const res = await request(app)
        .get(`/api/fees/assignments/${createdAssignmentId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.feeAssignment.id).toBe(createdAssignmentId);
      expect(res.body.calculationDetails).toBeDefined();
      expect(res.body.calculationDetails.items).toBeInstanceOf(Array);
    });

    it('should update fee assignment status and recalculate when payment option is changed (PATCH /api/fees/assignments/:id)', async () => {
      const updateRes = await request(app)
        .patch(`/api/fees/assignments/${createdAssignmentId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          paymentOption: 'QUARTERLY',
          status: 'PARTIAL',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.feeAssignment.status).toBe('PARTIAL');
      expect(updateRes.body.feeAssignment.paymentOption).toBe('QUARTERLY');
      expect(updateRes.body.calculation).toBeDefined();
    });

    it('should retrieve active fee assignment for student (GET /api/students/:studentId/fee-assignment)', async () => {
      const student = await prisma.student.findFirst({ where: { isDeleted: false } });

      const res = await request(app)
        .get(`/api/students/${student!.id}/fee-assignment`)
        .set('Authorization', `Bearer ${staffToken}`); // Staff can view

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasAssignment');
    });

    it('should FORBID Staff from creating or modifying fee assignments (403)', async () => {
      const student = await prisma.student.findFirst({ where: { isDeleted: false } });

      const res = await request(app)
        .post('/api/fees/assignments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          studentId: student!.id,
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // MODULE 6: FINANCE AUTHORIZATION, RBAC & AUDIT
  // ==========================================
  describe('Finance Authorization, RBAC & Audit Controls (Module 6)', () => {
    let testAuditLogId: string;

    it('should allow Finance Admin to list finance audit logs with filters (GET /api/fees/audit-logs)', async () => {
      const res = await request(app)
        .get('/api/fees/audit-logs?page=1&limit=20')
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auditLogs).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      if (res.body.auditLogs.length > 0) {
        testAuditLogId = res.body.auditLogs[0].id;
      }
    });

    it('should allow Finance Admin to retrieve single audit log entry by ID with diff snapshot', async () => {
      if (!testAuditLogId) {
        const latest = await prisma.auditLog.findFirst({
          where: { entityType: { in: ['FEE_CATEGORY', 'FEE_STRUCTURE', 'PAYMENT_PLAN', 'DISCOUNT_RULE', 'FEE_ASSIGNMENT'] } },
        });
        testAuditLogId = latest!.id;
      }

      const res = await request(app)
        .get(`/api/fees/audit-logs/${testAuditLogId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auditLog).toBeDefined();
      expect(res.body.auditLog.id).toBe(testAuditLogId);
      expect(res.body.auditLog.user).toBeDefined();
    });

    it('should filter audit logs by entityType (GET /api/fees/audit-logs?entityType=FEE_STRUCTURE)', async () => {
      const res = await request(app)
        .get('/api/fees/audit-logs?entityType=FEE_STRUCTURE')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.auditLogs).toBeInstanceOf(Array);
      res.body.auditLogs.forEach((log: any) => {
        expect(log.entityType).toBe('FEE_STRUCTURE');
      });
    });

    it('should FORBID Staff from accessing Finance Audit Logs (GET /api/fees/audit-logs -> 403)', async () => {
      const res = await request(app)
        .get('/api/fees/audit-logs')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should FORBID Staff from creating Fee Categories (POST /api/fees/categories -> 403)', async () => {
      const res = await request(app)
        .post('/api/fees/categories')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Category',
          code: 'UNAUTH_CAT',
          feeType: 'RECURRING',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should FORBID Staff from creating Fee Structures (POST /api/fees/structures -> 403)', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Unauthorized Structure',
          academicYear: '2026-2027',
          gradeOrClass: 'Grade 10',
          amount: 50000,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should FORBID Staff from approving Discounts (POST /api/fees/discount-rules/:id/approve -> 403)', async () => {
      const rule = await prisma.discountRule.findFirst();
      if (rule) {
        const res = await request(app)
          .post(`/api/fees/discount-rules/${rule.id}/approve`)
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ action: 'APPROVE' });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('should preserve Historical Integrity: updating a fee structure does not alter existing FeeAssignment snapshots', async () => {
      const uniqueGrade = `Grade_Hist_${Date.now()}`;

      // 1. Create a student
      const studentRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          admissionNumber: `HIST-${Date.now()}`,
          firstName: 'Historical',
          lastName: 'IntegrityStudent',
          dateOfBirth: '2015-05-15',
          gender: 'MALE',
          address: 'Integrity Lane',
          currentGrade: uniqueGrade,
        });
      expect(studentRes.status).toBe(201);
      const studentId = studentRes.body.student.id;

      // 2. Create fee structure for Grade at ₹50,000
      const cat = await prisma.feeCategory.findFirst({ where: { isActive: true } });
      const structRes = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          name: `Historic Base Structure ${Date.now()}`,
          academicYear: '2026-2027',
          gradeOrClass: uniqueGrade,
          studentCategory: 'REGULAR',
          amount: 50000,
          items: [
            {
              feeCategoryId: cat!.id,
              amount: 50000,
              frequency: 'FULL_YEAR',
            },
          ],
        });
      expect(structRes.status).toBe(201);
      const structureId = structRes.body.structure.id;

      // 3. Assign fee to student (Snapshot = ₹50,000)
      const assignRes = await request(app)
        .post('/api/fees/assignments')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          studentId,
          feeStructureId: structureId,
          academicYear: '2026-2027',
          paymentOption: 'FULL_YEAR',
        });
      expect(assignRes.status).toBe(201);
      const assignmentId = assignRes.body.feeAssignment.id;
      const initialAssignedAmount = Number(assignRes.body.feeAssignment.finalPayableAmount);

      // 4. Update the fee structure with a higher amount (e.g. ₹65,000)
      const updateStructRes = await request(app)
        .patch(`/api/fees/structures/${structureId}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          amount: 65000,
          items: [
            {
              feeCategoryId: cat!.id,
              amount: 65000,
              frequency: 'FULL_YEAR',
            },
          ],
        });
      expect(updateStructRes.status).toBe(200);

      // 5. Verify the existing student's fee assignment is 100% UNCHANGED and retained its original snapshot
      const fetchAssignRes = await request(app)
        .get(`/api/fees/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(fetchAssignRes.status).toBe(200);
      expect(Number(fetchAssignRes.body.feeAssignment.originalAmount)).toBe(50000);
      expect(Number(fetchAssignRes.body.feeAssignment.finalPayableAmount)).toBe(initialAssignedAmount);
      expect(fetchAssignRes.body.calculationDetails.grossAmount).toBe(50000);
    });
  });
});

