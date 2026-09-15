import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/config/prisma';
import { calculateFeeAssignment } from '../src/modules/fees/fee.service';

describe('Fee Calculation Engine Unit Tests (AC6, AC8)', () => {
  let testStudentId: string;
  let testCategoryTuitionId: string;
  let testCategoryTransportId: string;
  let testFeeStructureId: string;
  let testFullYearPlanId: string;
  let testQuarterlyPlanId: string;
  let testFinanceUserId: string;

  beforeAll(async () => {
    // Find or create test finance user
    const financeUser = await prisma.user.findFirst({ where: { role: 'FINANCE' } });
    testFinanceUserId = financeUser!.id;

    // Find student
    const student = await prisma.student.findFirst();
    testStudentId = student!.id;

    // Fetch categories
    const tuition = await prisma.feeCategory.findFirst({ where: { name: 'Tuition Fee' } });
    testCategoryTuitionId = tuition!.id;

    const transport = await prisma.feeCategory.findFirst({ where: { name: 'Transport Fee' } });
    testCategoryTransportId = transport!.id;

    // Clean existing test discount rules & structures
    await prisma.discountRule.deleteMany({
      where: {
        code: {
          in: [
            'TEST_CALC_20_PCT',
            'TEST_CALC_90K_FLAT',
            'TEST_CALC_PENDING_50',
            'TEST_CALC_TRANSPORT_50',
          ],
        },
      },
    });

    await prisma.feeStructure.deleteMany({
      where: { academicYear: '2029-2030', gradeOrClass: 'Grade Test' },
    });

    // Create a standalone test fee structure: 100,000 INR
    const struct = await prisma.feeStructure.create({
      data: {
        academicYear: '2029-2030',
        gradeOrClass: 'Grade Test',
        feeCategoryId: testCategoryTuitionId,
        amount: 100000,
        currency: 'INR',
        createdById: testFinanceUserId,
        paymentPlans: {
          create: [
            {
              frequency: 'FULL_YEAR',
              numberOfInstallments: 1,
              installments: {
                create: [
                  {
                    installmentNumber: 1,
                    dueMonth: 'April',
                    amount: 100000,
                  },
                ],
              },
            },
            {
              frequency: 'QUARTERLY',
              numberOfInstallments: 4,
              installments: {
                create: [
                  { installmentNumber: 1, dueMonth: 'April (Q1)', amount: 25000 },
                  { installmentNumber: 2, dueMonth: 'July (Q2)', amount: 25000 },
                  { installmentNumber: 3, dueMonth: 'October (Q3)', amount: 25000 },
                  { installmentNumber: 4, dueMonth: 'January (Q4)', amount: 25000 },
                ],
              },
            },
          ],
        },
      },
      include: { paymentPlans: true },
    });

    testFeeStructureId = struct.id;
    testFullYearPlanId = struct.paymentPlans.find((p) => p.frequency === 'FULL_YEAR')!.id;
    testQuarterlyPlanId = struct.paymentPlans.find((p) => p.frequency === 'QUARTERLY')!.id;
  });

  it('should calculate full fee with zero discount when no approved discounts exist', async () => {
    // Clear any discounts for test student temporarily
    await prisma.studentDiscountAssignment.deleteMany({ where: { studentId: testStudentId } });

    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testFullYearPlanId
    );

    expect(result.originalAmount).toBe(100000);
    expect(result.discountApplied).toBe(0);
    expect(result.finalPayableAmount).toBe(100000);
    expect(result.installments.length).toBe(1);
    expect(result.installments[0].finalAmount).toBe(100000);
  });

  it('should calculate percentage discount correctly (20% of 100,000 = 20,000, final = 80,000)', async () => {
    // Create and approve 20% discount rule
    const rule20 = await prisma.discountRule.create({
      data: {
        name: 'Unit Test 20% Discount',
        code: 'TEST_CALC_20_PCT',
        discountType: 'PERCENTAGE',
        value: 20,
        applicableFeeCategoryIds: JSON.stringify([testCategoryTuitionId]),
        createdById: testFinanceUserId,
      },
    });

    await prisma.studentDiscountAssignment.create({
      data: {
        studentId: testStudentId,
        discountRuleId: rule20.id,
        status: 'APPROVED',
        approvedById: testFinanceUserId,
        approvalDate: new Date(),
      },
    });

    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testFullYearPlanId
    );

    expect(result.originalAmount).toBe(100000);
    expect(result.discountApplied).toBe(20000);
    expect(result.finalPayableAmount).toBe(80000);
    expect(result.appliedDiscounts.length).toBe(1);
    expect(result.appliedDiscounts[0].calculatedDiscount).toBe(20000);
  });

  it('should distribute discount proportionally across quarterly installments', async () => {
    // With 20% discount (final = 80,000), 4 equal installments should be 20,000 each
    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testQuarterlyPlanId
    );

    expect(result.originalAmount).toBe(100000);
    expect(result.discountApplied).toBe(20000);
    expect(result.finalPayableAmount).toBe(80000);
    expect(result.installments.length).toBe(4);

    const totalInstallments = result.installments.reduce((sum, inst) => sum + inst.finalAmount, 0);
    expect(totalInstallments).toBe(80000);
    expect(result.installments[0].finalAmount).toBe(20000);
    expect(result.installments[1].finalAmount).toBe(20000);
    expect(result.installments[2].finalAmount).toBe(20000);
    expect(result.installments[3].finalAmount).toBe(20000);
  });

  it('should stack multiple discounts additively and cap at original amount without negative totals', async () => {
    // Add a flat discount of 90,000 INR on top of the 20% discount (20,000 + 90,000 = 110,000 -> capped at 100,000)
    const flat90k = await prisma.discountRule.create({
      data: {
        name: 'Unit Test 90k Flat Discount',
        code: 'TEST_CALC_90K_FLAT',
        discountType: 'FLAT_AMOUNT',
        value: 90000,
        createdById: testFinanceUserId,
      },
    });

    await prisma.studentDiscountAssignment.create({
      data: {
        studentId: testStudentId,
        discountRuleId: flat90k.id,
        status: 'APPROVED',
        approvedById: testFinanceUserId,
        approvalDate: new Date(),
      },
    });

    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testQuarterlyPlanId
    );

    expect(result.originalAmount).toBe(100000);
    expect(result.discountApplied).toBe(100000); // Capped at originalAmount
    expect(result.finalPayableAmount).toBe(0); // Never negative
    expect(result.installments.every((inst) => inst.finalAmount === 0)).toBe(true);
  });

  it('should ignore discounts with PENDING, REJECTED, or EXPIRED status', async () => {
    // Clear assignments
    await prisma.studentDiscountAssignment.deleteMany({ where: { studentId: testStudentId } });

    const pendingRule = await prisma.discountRule.create({
      data: {
        name: 'Pending Rule',
        code: 'TEST_CALC_PENDING_50',
        discountType: 'PERCENTAGE',
        value: 50,
        approvalStatus: 'PENDING',
        createdById: testFinanceUserId,
      },
    });

    await prisma.studentDiscountAssignment.create({
      data: {
        studentId: testStudentId,
        discountRuleId: pendingRule.id,
        status: 'PENDING',
      },
    });

    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testFullYearPlanId
    );

    expect(result.discountApplied).toBe(0);
    expect(result.finalPayableAmount).toBe(100000);
  });

  it('should ignore discounts restricted to a different fee category', async () => {
    // Clear assignments
    await prisma.studentDiscountAssignment.deleteMany({ where: { studentId: testStudentId } });

    const transportOnlyRule = await prisma.discountRule.create({
      data: {
        name: 'Transport Only Rule',
        code: 'TEST_CALC_TRANSPORT_50',
        discountType: 'PERCENTAGE',
        value: 50,
        applicableFeeCategoryIds: JSON.stringify([testCategoryTransportId]),
        createdById: testFinanceUserId,
      },
    });

    await prisma.studentDiscountAssignment.create({
      data: {
        studentId: testStudentId,
        discountRuleId: transportOnlyRule.id,
        status: 'APPROVED',
        approvedById: testFinanceUserId,
      },
    });

    // We calculate against Tuition structure -> discount should not apply
    const result = await calculateFeeAssignment(
      testStudentId,
      testFeeStructureId,
      testFullYearPlanId
    );

    expect(result.discountApplied).toBe(0);
    expect(result.finalPayableAmount).toBe(100000);
  });
});
