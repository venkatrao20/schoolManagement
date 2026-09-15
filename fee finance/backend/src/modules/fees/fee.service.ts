import { prisma } from '../../config/prisma';
import { Prisma } from '@prisma/client';

export interface AppliedDiscountBreakdown {
  discountRuleId: string;
  name: string;
  code?: string;
  discountType: string;
  ruleValue: number;
  calculatedDiscount: number;
  eligibleHeads?: string[];
}

export interface CalculatedInstallment {
  sequence?: number;
  installmentNumber: number;
  quarter?: string | null;
  dueDate: string | null;
  dueMonth: string | null;
  dueDateRule?: string | null;
  baseAmount: number;
  discountAmount?: number;
  finalAmount: number;
  payableAmount?: number;
  status?: string;
}

export interface FeeHeadBreakdown {
  feeCategoryId: string;
  feeCategoryName: string;
  feeType: string;
  frequency?: string;
  originalAmount: number;
  discountEligible: boolean;
  discountAmount: number;
  payableAmount: number;
}

export interface CalculateStudentFeeParams {
  studentId: string;
  academicYear?: string;
  paymentOption?: 'FULL_YEAR' | 'QUARTERLY' | string;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ALL' | string;
  feeStructureId?: string;
  paymentPlanId?: string;
}

export interface CalculateStudentFeeResult {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  academicYear: string;
  gradeOrClass: string;
  studentCategory: string;
  paymentOption: string;
  quarter: string | null;
  items: FeeHeadBreakdown[];
  quarters: CalculatedInstallment[];
  installments: CalculatedInstallment[];
  appliedDiscounts: AppliedDiscountBreakdown[];
  grossAmount: number;
  originalAmount: number; // alias
  discountAmount: number;
  discountApplied: number; // alias
  finalPayable: number;
  finalPayableAmount: number; // alias
  currency: string;
  feeStructure: {
    id: string;
    name: string;
    academicYear: string;
    gradeOrClass: string;
    studentCategory: string;
    amount: number;
  };
  paymentPlan: {
    id: string;
    name: string;
    frequency: string;
    installmentCount: number;
    numberOfInstallments: number;
  };
}

/**
 * Central 16-Step Fee Calculation Engine (Source of Truth)
 */
export async function calculateStudentFee(params: CalculateStudentFeeParams): Promise<CalculateStudentFeeResult> {
  const {
    studentId,
    academicYear: requestedAcademicYear,
    paymentOption: requestedPaymentOption = 'FULL_YEAR',
    quarter: requestedQuarter,
    feeStructureId: requestedStructureId,
    paymentPlanId: requestedPlanId,
  } = params;

  // 1. Find Student
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      admissions: {
        where: { admissionStatus: { in: ['ENROLLED', 'APPROVED', 'ADMITTED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!student || student.isDeleted) {
    throw new Error(`Student with id '${studentId}' not found or has been removed.`);
  }

  // 2. Determine Academic Year
  const academicYear =
    requestedAcademicYear ||
    (student as any).academicYear ||
    student.admissions[0]?.academicYear ||
    '2026-2027';

  // 3. Determine Class & Student Category
  const gradeOrClass = student.currentGrade;
  const studentCategory = (student as any).studentCategory || 'REGULAR';

  // 4. Find Applicable Fee Structure
  let feeStructure: any = null;

  if (requestedStructureId) {
    feeStructure = await prisma.feeStructure.findUnique({
      where: { id: requestedStructureId },
      include: {
        feeCategory: true,
        items: { include: { feeCategory: true } },
        paymentPlans: {
          include: { installments: { orderBy: { sequence: 'asc' } } },
        },
      },
    });
    if (!feeStructure || !feeStructure.isActive || feeStructure.status === 'INACTIVE' || feeStructure.status === 'ARCHIVED') {
      throw new Error(`Fee structure '${requestedStructureId}' is inactive or does not exist.`);
    }
  } else {
    // Look up active structure matching Academic Year + Grade + Category
    feeStructure = await prisma.feeStructure.findFirst({
      where: {
        academicYear,
        gradeOrClass,
        studentCategory,
        isActive: true,
        status: 'ACTIVE',
      },
      include: {
        feeCategory: true,
        items: { include: { feeCategory: true } },
        paymentPlans: {
          include: { installments: { orderBy: { sequence: 'asc' } } },
        },
      },
    });

    // Fallback to REGULAR if specialized category structure is not defined
    if (!feeStructure && studentCategory !== 'REGULAR') {
      feeStructure = await prisma.feeStructure.findFirst({
        where: {
          academicYear,
          gradeOrClass,
          studentCategory: 'REGULAR',
          isActive: true,
          status: 'ACTIVE',
        },
        include: {
          feeCategory: true,
          items: { include: { feeCategory: true } },
          paymentPlans: {
            include: { installments: { orderBy: { sequence: 'asc' } } },
          },
        },
      });
    }

    // Generic fallback by grade only
    if (!feeStructure) {
      feeStructure = await prisma.feeStructure.findFirst({
        where: {
          academicYear,
          gradeOrClass,
          isActive: true,
          status: 'ACTIVE',
        },
        include: {
          feeCategory: true,
          items: { include: { feeCategory: true } },
          paymentPlans: {
            include: { installments: { orderBy: { sequence: 'asc' } } },
          },
        },
      });
    }
  }

  if (!feeStructure) {
    throw new Error(
      `No active Fee Structure found for ${gradeOrClass} (${academicYear}, Category: ${studentCategory}).`
    );
  }

  // 5. Retrieve Fee Structure Items & Calculate Gross
  const grossAmount = Number(feeStructure.amount);
  const structItems = feeStructure.items && feeStructure.items.length > 0 ? feeStructure.items : [];

  // 6. Determine Selected Payment Option & Plan
  const paymentOption = requestedPaymentOption === 'QUARTERLY' ? 'QUARTERLY' : 'FULL_YEAR';

  let paymentPlan: any = null;
  if (requestedPlanId) {
    paymentPlan = feeStructure.paymentPlans.find((p: any) => p.id === requestedPlanId);
  }
  if (!paymentPlan) {
    paymentPlan = feeStructure.paymentPlans.find(
      (p: any) => p.frequency === paymentOption && p.isActive
    );
  }
  if (!paymentPlan) {
    paymentPlan = feeStructure.paymentPlans.find((p: any) => p.isActive) || feeStructure.paymentPlans[0];
  }

  if (!paymentPlan) {
    throw new Error(`No payment plan configured for Fee Structure '${feeStructure.name}'.`);
  }

  // 7. Find Active Approved Discounts
  const discountAssignments = await prisma.studentDiscountAssignment.findMany({
    where: {
      studentId,
      status: 'APPROVED',
    },
    include: {
      discountRule: {
        include: { feeHeads: { include: { feeCategory: true } } },
      },
    },
  });

  const now = new Date();
  const appliedDiscounts: AppliedDiscountBreakdown[] = [];
  let totalDiscount = 0;

  // Track item-level discounts
  const itemDiscountMap = new Map<string, number>();

  for (const assignment of discountAssignments) {
    const rule = assignment.discountRule;
    if (!rule || !rule.isActive || rule.status === 'INACTIVE' || rule.approvalStatus !== 'APPROVED') {
      continue;
    }

    // Date range validation
    if (rule.validFrom && new Date(rule.validFrom) > now) continue;
    const ruleExpiry = rule.validUntil || rule.validTo;
    if (ruleExpiry && new Date(ruleExpiry) < now) continue;

    // Payment Option restriction
    if (rule.paymentOption && rule.paymentOption !== 'ANY' && rule.paymentOption !== paymentOption) {
      continue;
    }

    // Minimum fee threshold check
    if (rule.minimumAmount && grossAmount < Number(rule.minimumAmount)) {
      continue;
    }

    // Class restriction check
    if (rule.applicableClasses) {
      try {
        const allowed = JSON.parse(rule.applicableClasses);
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(gradeOrClass)) {
          continue;
        }
      } catch {
        // Ignored
      }
    }

    // Student Category restriction check
    if (rule.applicableStudentCategories) {
      try {
        const allowed = JSON.parse(rule.applicableStudentCategories);
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(studentCategory)) {
          continue;
        }
      } catch {
        // Ignored
      }
    }

    // Determine Eligible Fee Heads
    let eligibleHeadIds: Set<string> | null = null;
    if (rule.feeHeads && rule.feeHeads.length > 0) {
      eligibleHeadIds = new Set(rule.feeHeads.map((fh) => fh.feeCategoryId));
    } else if (rule.applicableFeeCategoryIds) {
      try {
        const parsed = JSON.parse(rule.applicableFeeCategoryIds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          eligibleHeadIds = new Set(parsed);
        }
      } catch {
        // Ignored
      }
    }

    // Calculate Eligible Base Amount
    let eligibleBaseAmount = 0;
    const matchingItems: any[] = [];

    if (structItems.length > 0) {
      structItems.forEach((item: any) => {
        if (!eligibleHeadIds || eligibleHeadIds.has(item.feeCategoryId)) {
          eligibleBaseAmount += Number(item.amount);
          matchingItems.push(item);
        }
      });
    } else {
      if (!eligibleHeadIds || (feeStructure.feeCategoryId && eligibleHeadIds.has(feeStructure.feeCategoryId))) {
        eligibleBaseAmount = grossAmount;
      }
    }

    if (eligibleBaseAmount <= 0) continue;

    const numDiscountValue = rule.discountValue !== null && rule.discountValue !== undefined ? Number(rule.discountValue) : 0;
    const numValue = rule.value !== null && rule.value !== undefined ? Number(rule.value) : 0;
    const ruleValue = numDiscountValue > 0 ? numDiscountValue : numValue;
    let calculatedDiscount = 0;

    if (rule.discountType === 'PERCENTAGE') {
      calculatedDiscount = (eligibleBaseAmount * ruleValue) / 100;
    } else if (rule.discountType === 'FIXED_AMOUNT' || rule.discountType === 'FLAT_AMOUNT') {
      calculatedDiscount = Math.min(ruleValue, eligibleBaseAmount);
    }

    // Apply Maximum Discount Cap
    if (rule.maximumDiscount) {
      const cap = Number(rule.maximumDiscount);
      if (cap > 0 && calculatedDiscount > cap) {
        calculatedDiscount = cap;
      }
    }

    calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;
    totalDiscount += calculatedDiscount;

    // Distribute discount into matching items
    if (matchingItems.length > 0 && eligibleBaseAmount > 0) {
      matchingItems.forEach((item: any) => {
        const ratio = Number(item.amount) / eligibleBaseAmount;
        const itemDisc = Math.round(calculatedDiscount * ratio * 100) / 100;
        const currentItemDisc = itemDiscountMap.get(item.feeCategoryId) || 0;
        itemDiscountMap.set(item.feeCategoryId, currentItemDisc + itemDisc);
      });
    }

    appliedDiscounts.push({
      discountRuleId: rule.id,
      name: rule.name,
      code: rule.code,
      discountType: rule.discountType,
      ruleValue,
      calculatedDiscount,
      eligibleHeads: rule.feeHeads?.map((fh) => fh.feeCategory?.name || fh.feeCategoryId) || ['All Categories'],
    });
  }

  // 8. Final Payable Amount Calculation
  const discountAmount = Math.min(totalDiscount, grossAmount);
  const finalPayable = Math.max(Math.round((grossAmount - discountAmount) * 100) / 100, 0);

  // 9. Build Itemized Fee Heads Breakdown
  const items: FeeHeadBreakdown[] = [];

  if (structItems.length > 0) {
    structItems.forEach((item: any) => {
      const origAmt = Number(item.amount);
      const discAmt = Math.min(itemDiscountMap.get(item.feeCategoryId) || 0, origAmt);
      items.push({
        feeCategoryId: item.feeCategoryId,
        feeCategoryName: item.feeCategory?.name || 'Fee Head',
        feeType: item.feeCategory?.feeType || 'RECURRING',
        frequency: item.frequency,
        originalAmount: origAmt,
        discountEligible: discAmt > 0 || !appliedDiscounts.some((d) => d.eligibleHeads && !d.eligibleHeads.includes('All Categories')),
        discountAmount: discAmt,
        payableAmount: Math.max(origAmt - discAmt, 0),
      });
    });
  } else {
    items.push({
      feeCategoryId: feeStructure.feeCategoryId || 'BASE',
      feeCategoryName: feeStructure.feeCategory?.name || feeStructure.name || 'General Tuition & School Fee',
      feeType: feeStructure.feeCategory?.feeType || 'RECURRING',
      originalAmount: grossAmount,
      discountEligible: discountAmount > 0,
      discountAmount,
      payableAmount: finalPayable,
    });
  }

  // 10. Derive Quarter / Installment Breakdown
  const planInstallments = paymentPlan.installments || [];
  const quarters: CalculatedInstallment[] = [];

  if (planInstallments.length === 0 || paymentPlan.frequency === 'FULL_YEAR') {
    quarters.push({
      sequence: 1,
      installmentNumber: 1,
      quarter: null,
      dueMonth: planInstallments[0]?.dueMonth || 'Full Year (Annual)',
      dueDate: planInstallments[0]?.dueDate ? planInstallments[0].dueDate.toISOString() : null,
      dueDateRule: planInstallments[0]?.dueDateRule || 'Payable upfront on admission',
      baseAmount: grossAmount,
      discountAmount,
      finalAmount: finalPayable,
      payableAmount: finalPayable,
      status: 'CONFIGURED',
    });
  } else {
    const planTotal = planInstallments.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);
    const effectivePlanTotal = planTotal > 0 ? planTotal : grossAmount;
    let accumulatedAssigned = 0;

    planInstallments.forEach((inst: any, index: number) => {
      const isLast = index === planInstallments.length - 1;
      const baseAmt = Number(inst.amount);

      let finalAmt = 0;
      if (isLast) {
        finalAmt = Math.round((finalPayable - accumulatedAssigned) * 100) / 100;
      } else {
        const ratio = baseAmt / effectivePlanTotal;
        finalAmt = Math.floor(finalPayable * ratio * 100) / 100;
        accumulatedAssigned += finalAmt;
      }

      const instDiscount = Math.max(Math.round((baseAmt - finalAmt) * 100) / 100, 0);

      quarters.push({
        sequence: inst.sequence || index + 1,
        installmentNumber: inst.installmentNumber || index + 1,
        quarter: inst.quarter || `Q${index + 1}`,
        dueMonth: inst.dueMonth,
        dueDate: inst.dueDate ? inst.dueDate.toISOString() : null,
        dueDateRule: inst.dueDateRule,
        baseAmount: baseAmt,
        discountAmount: instDiscount,
        finalAmount: Math.max(finalAmt, 0),
        payableAmount: Math.max(finalAmt, 0),
        status: inst.status || 'CONFIGURED',
      });
    });
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();

  return {
    studentId,
    studentName,
    admissionNumber: student.admissionNumber,
    academicYear,
    gradeOrClass,
    studentCategory,
    paymentOption,
    quarter: requestedQuarter || null,
    items,
    quarters,
    installments: quarters, // alias
    appliedDiscounts,
    grossAmount,
    originalAmount: grossAmount, // alias
    discountAmount,
    discountApplied: discountAmount, // alias
    finalPayable,
    finalPayableAmount: finalPayable, // alias
    currency: feeStructure.currency || 'INR',
    feeStructure: {
      id: feeStructure.id,
      name: feeStructure.name,
      academicYear: feeStructure.academicYear,
      gradeOrClass: feeStructure.gradeOrClass,
      studentCategory: feeStructure.studentCategory,
      amount: grossAmount,
    },
    paymentPlan: {
      id: paymentPlan.id,
      name: paymentPlan.name,
      frequency: paymentPlan.frequency,
      installmentCount: paymentPlan.installmentCount || paymentPlan.numberOfInstallments || quarters.length,
      numberOfInstallments: paymentPlan.numberOfInstallments || quarters.length,
    },
  };
}

/**
 * Legacy Adapter for Fee Assignment Calculation
 */
export async function calculateFeeAssignment(
  studentId: string,
  feeStructureId: string,
  paymentPlanId: string
): Promise<any> {
  const paymentPlan = await prisma.paymentPlan.findUnique({ where: { id: paymentPlanId } });
  const result = await calculateStudentFee({
    studentId,
    feeStructureId,
    paymentPlanId,
    paymentOption: paymentPlan?.frequency || 'FULL_YEAR',
  });

  return {
    studentId: result.studentId,
    feeStructureId: result.feeStructure.id,
    paymentPlanId: result.paymentPlan.id,
    originalAmount: result.grossAmount,
    discountApplied: result.discountAmount,
    finalPayableAmount: result.finalPayable,
    currency: result.currency,
    appliedDiscounts: result.appliedDiscounts,
    installments: result.installments,
    feeStructure: {
      id: result.feeStructure.id,
      academicYear: result.feeStructure.academicYear,
      gradeOrClass: result.feeStructure.gradeOrClass,
      feeCategoryId: result.items[0]?.feeCategoryId || 'BASE',
      feeCategoryName: result.items[0]?.feeCategoryName || 'Tuition Fee',
    },
    paymentPlan: {
      id: result.paymentPlan.id,
      frequency: result.paymentPlan.frequency,
      numberOfInstallments: result.paymentPlan.numberOfInstallments,
    },
  };
}
