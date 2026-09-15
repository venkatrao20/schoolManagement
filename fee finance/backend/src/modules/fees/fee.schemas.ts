import { z } from 'zod';

export const FeeTypeEnum = z.enum(
  ['RECURRING', 'ONE_TIME', 'ANNUAL', 'SERVICE', 'OTHER'],
  {
    errorMap: () => ({
      message: 'Fee type must be one of: RECURRING, ONE_TIME, ANNUAL, SERVICE, OTHER',
    }),
  }
);

export const FeeFrequencyEnum = z.enum(
  ['QUARTERLY', 'FULL_YEAR', 'ONE_TIME', 'MONTHLY', 'HALF_YEARLY'],
  {
    errorMap: () => ({
      message: 'Frequency must be one of: QUARTERLY, FULL_YEAR, ONE_TIME, MONTHLY, HALF_YEARLY',
    }),
  }
);

export const createFeeCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z
    .string()
    .trim()
    .min(1, 'Fee head code is required')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must contain only alphanumeric characters, hyphens or underscores'),
  description: z.string().max(500).optional().nullable(),
  feeType: FeeTypeEnum.default('RECURRING'),
  defaultFrequency: FeeFrequencyEnum.default('QUARTERLY'),
  isMandatory: z.boolean().default(true).optional(),
  discountAllowed: z.boolean().default(true).optional(),
  isActive: z.boolean().default(true).optional(),
});

export const updateFeeCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name cannot be empty').max(100).optional(),
  code: z
    .string()
    .trim()
    .min(1, 'Code cannot be empty')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must contain only alphanumeric characters, hyphens or underscores')
    .optional(),
  description: z.string().max(500).optional().nullable(),
  feeType: FeeTypeEnum.optional(),
  defaultFrequency: FeeFrequencyEnum.optional(),
  isMandatory: z.boolean().optional(),
  discountAllowed: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const feeCategoryQuerySchema = z.object({
  search: z.string().optional(),
  feeType: z.string().optional(),
  frequency: z.string().optional(),
  isMandatory: z.string().optional(),
  discountAllowed: z.string().optional(),
  isActive: z.string().optional(),
  includeInactive: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const StudentCategoryEnum = z.enum(
  ['REGULAR', 'RTE', 'SIBLING', 'STAFF_CHILD', 'DAY_SCHOLAR', 'BOARDER', 'MANAGEMENT_QUOTA'],
  {
    errorMap: () => ({
      message: 'Student category must be one of: REGULAR, RTE, SIBLING, STAFF_CHILD, DAY_SCHOLAR, BOARDER, MANAGEMENT_QUOTA',
    }),
  }
);

export const feeStructureItemSchema = z.object({
  feeCategoryId: z.string().min(1, 'Fee category is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Fee head amount must be greater than 0'),
  frequency: FeeFrequencyEnum.default('QUARTERLY'),
  isMandatory: z.boolean().default(true).optional(),
  discountAllowed: z.boolean().default(true).optional(),
});

export const createFeeStructureSchema = z.object({
  name: z.string().trim().min(1, 'Fee structure name is required').max(150),
  academicYear: z.string().trim().min(1, 'Academic year is required (e.g. 2026-2027)'),
  gradeOrClass: z.string().trim().min(1, 'Grade or Class is required (e.g. Grade 1, VI)'),
  section: z.string().trim().max(50).optional().nullable(),
  studentCategory: StudentCategoryEnum.default('REGULAR'),
  items: z.array(feeStructureItemSchema).min(1, 'At least one fee head item is required').optional(),
  // Backward compatibility fields if items array not provided
  feeCategoryId: z.string().optional(),
  amount: z.number().positive('Fee amount must be greater than 0').optional(),
  currency: z.string().default('INR').optional(),
  paymentOptions: z.array(z.string()).optional(),
}).refine(
  (data) => (data.items && data.items.length > 0) || (data.feeCategoryId && data.amount),
  {
    message: 'At least one fee head item or feeCategoryId and amount is required',
    path: ['items'],
  }
);

export const updateFeeStructureSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  section: z.string().trim().max(50).optional().nullable(),
  studentCategory: StudentCategoryEnum.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  isActive: z.boolean().optional(),
  items: z.array(feeStructureItemSchema).min(1, 'At least one fee head item is required').optional(),
  amount: z.number().positive('Fee amount must be greater than 0').optional(),
  currency: z.string().optional(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
});

export const feeStructureQuerySchema = z.object({
  search: z.string().optional(),
  academicYear: z.string().optional(),
  gradeOrClass: z.string().optional(),
  studentCategory: z.string().optional(),
  status: z.string().optional(),
  isActive: z.string().optional(),
  includeInactive: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const installmentInputSchema = z.object({
  sequence: z.number().int().min(1).max(4).optional(),
  installmentNumber: z.number().int().min(1).max(4).optional(),
  quarter: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueMonth: z.string().optional().nullable(),
  dueDateRule: z.string().max(200).optional().nullable(),
  amount: z.number({ invalid_type_error: 'Installment amount must be a number' }).positive('Installment amount must be greater than 0'),
  status: z.enum(['CONFIGURED', 'ACTIVE', 'PENDING']).default('CONFIGURED').optional(),
});

export const createPaymentPlanSchema = z.object({
  feeStructureId: z.string().optional(),
  name: z.string().trim().min(1, 'Payment plan name is required').max(100).default('Standard Payment Plan').optional(),
  type: z.enum(['QUARTERLY', 'FULL_YEAR']).default('QUARTERLY').optional(),
  frequency: z.enum(['QUARTERLY', 'FULL_YEAR'], {
    errorMap: () => ({ message: 'Frequency must be QUARTERLY or FULL_YEAR' }),
  }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE').optional(),
  installments: z.array(installmentInputSchema).optional(),
});

export const updatePaymentPlanSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  isActive: z.boolean().optional(),
  installments: z.array(installmentInputSchema).optional(),
});

export const paymentPlanQuerySchema = z.object({
  search: z.string().optional(),
  feeStructureId: z.string().optional(),
  frequency: z.string().optional(),
  status: z.string().optional(),
  isActive: z.string().optional(),
  includeInactive: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const calculateScheduleSchema = z.object({
  frequency: z.enum(['QUARTERLY', 'FULL_YEAR']).default('QUARTERLY'),
  headAllocations: z
    .array(
      z.object({
        feeCategoryId: z.string(),
        q1Amount: z.number().min(0).optional(),
        q2Amount: z.number().min(0).optional(),
        q3Amount: z.number().min(0).optional(),
        q4Amount: z.number().min(0).optional(),
      })
    )
    .optional(),
});

export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FLAT_AMOUNT'], {
  errorMap: () => ({ message: 'Discount type must be PERCENTAGE, FIXED_AMOUNT, or FLAT_AMOUNT' }),
});

export const PaymentOptionEnum = z.enum(['ANY', 'FULL_YEAR', 'QUARTERLY'], {
  errorMap: () => ({ message: 'Payment option must be ANY, FULL_YEAR, or QUARTERLY' }),
});

export const EligibilityTypeEnum = z.enum(
  ['ALL', 'STUDENT_CATEGORY', 'CLASS', 'SIBLING', 'SCHOLARSHIP', 'SPECIFIC_STUDENT', 'CUSTOM'],
  {
    errorMap: () => ({
      message: 'Eligibility type must be one of: ALL, STUDENT_CATEGORY, CLASS, SIBLING, SCHOLARSHIP, SPECIFIC_STUDENT, CUSTOM',
    }),
  }
);

export const ApprovalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
  errorMap: () => ({ message: 'Approval status must be PENDING, APPROVED, or REJECTED' }),
});

export const createDiscountRuleSchema = z
  .object({
    name: z.string().trim().min(1, 'Discount rule name is required').max(150),
    code: z.string().trim().min(1, 'Discount code is required').max(50).optional(),
    description: z.string().max(500).optional(),
    discountType: DiscountTypeEnum.default('PERCENTAGE'),
    discountValue: z.number({ invalid_type_error: 'Discount value must be a number' }).optional(),
    value: z.number({ invalid_type_error: 'Discount value must be a number' }).optional(),
    paymentOption: PaymentOptionEnum.default('ANY').optional(),
    eligibilityType: EligibilityTypeEnum.default('ALL').optional(),
    eligibilityCriteria: z.string().max(1000).optional().nullable(),
    applicableClasses: z.array(z.string()).optional().nullable(),
    applicableStudentCategories: z.array(z.string()).optional().nullable(),
    applicableFeeCategoryIds: z.array(z.string()).optional().nullable(),
    validFrom: z.string().optional().nullable(),
    validUntil: z.string().optional().nullable(),
    validTo: z.string().optional().nullable(),
    minimumAmount: z.number().positive('Minimum amount must be greater than 0').optional().nullable(),
    maximumDiscount: z.number().positive('Maximum discount cap must be greater than 0').optional().nullable(),
    approvalRequired: z.boolean().default(false).optional(),
    approvalStatus: ApprovalStatusEnum.default('APPROVED').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED']).default('ACTIVE').optional(),
    active: z.boolean().default(true).optional(),
    isActive: z.boolean().default(true).optional(),
  })
  .superRefine((data, ctx) => {
    const rawVal = data.discountValue !== undefined ? data.discountValue : data.value;
    if (rawVal === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Discount value is required',
        path: ['discountValue'],
      });
      return;
    }

    if (data.discountType === 'PERCENTAGE') {
      if (rawVal <= 0 || rawVal > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount must be between 0.01 and 100',
          path: ['discountValue'],
        });
      }
    } else if (data.discountType === 'FIXED_AMOUNT' || data.discountType === 'FLAT_AMOUNT') {
      if (rawVal <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fixed amount discount must be greater than 0',
          path: ['discountValue'],
        });
      }
    }
  });

export const updateDiscountRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    code: z.string().trim().min(1).max(50).optional(),
    description: z.string().max(500).optional(),
    discountType: DiscountTypeEnum.optional(),
    discountValue: z.number().optional(),
    value: z.number().optional(),
    paymentOption: PaymentOptionEnum.optional(),
    eligibilityType: EligibilityTypeEnum.optional(),
    eligibilityCriteria: z.string().max(1000).optional().nullable(),
    applicableClasses: z.array(z.string()).optional().nullable(),
    applicableStudentCategories: z.array(z.string()).optional().nullable(),
    applicableFeeCategoryIds: z.array(z.string()).optional().nullable(),
    validFrom: z.string().optional().nullable(),
    validUntil: z.string().optional().nullable(),
    validTo: z.string().optional().nullable(),
    minimumAmount: z.number().positive().optional().nullable(),
    maximumDiscount: z.number().positive().optional().nullable(),
    approvalRequired: z.boolean().optional(),
    approvalStatus: ApprovalStatusEnum.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED']).optional(),
    active: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const rawVal = data.discountValue !== undefined ? data.discountValue : data.value;
    if (rawVal !== undefined) {
      if (data.discountType === 'PERCENTAGE' && (rawVal <= 0 || rawVal > 100)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount must be between 0.01 and 100',
          path: ['discountValue'],
        });
      } else if ((data.discountType === 'FIXED_AMOUNT' || data.discountType === 'FLAT_AMOUNT') && rawVal <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Fixed amount discount must be greater than 0',
          path: ['discountValue'],
        });
      }
    }
  });

export const discountRuleQuerySchema = z.object({
  search: z.string().optional(),
  discountType: z.string().optional(),
  paymentOption: z.string().optional(),
  eligibilityType: z.string().optional(),
  approvalStatus: z.string().optional(),
  status: z.string().optional(),
  isActive: z.string().optional(),
  includeInactive: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const approveDiscountRuleSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }),
  }),
  remarks: z.string().max(500).optional(),
});

export const assignStudentDiscountSchema = z.object({
  discountRuleId: z.string().min(1, 'Discount rule ID is required'),
  remarks: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']).optional(),
});

export const updateStudentDiscountSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or EXPIRED' }),
  }),
  remarks: z.string().max(500).optional(),
});

export const createFeeAssignmentSchema = z.object({
  studentId: z.string().optional(),
  academicYear: z.string().optional(),
  feeStructureId: z.string().optional(),
  paymentPlanId: z.string().optional(),
  paymentOption: z.enum(['FULL_YEAR', 'QUARTERLY']).default('FULL_YEAR').optional(),
  status: z.enum(['ACTIVE', 'ASSIGNED', 'PARTIAL', 'PAID', 'SUPERSEDED', 'CANCELLED']).default('ACTIVE').optional(),
});

export const updateFeeAssignmentSchema = z.object({
  paymentPlanId: z.string().optional(),
  paymentOption: z.enum(['FULL_YEAR', 'QUARTERLY']).optional(),
  status: z.enum(['ACTIVE', 'ASSIGNED', 'PARTIAL', 'PAID', 'SUPERSEDED', 'CANCELLED']).optional(),
});

export const calculateFeePreviewSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  academicYear: z.string().optional(),
  paymentOption: z.enum(['FULL_YEAR', 'QUARTERLY']).default('FULL_YEAR').optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'ALL']).optional(),
  feeStructureId: z.string().optional(),
  paymentPlanId: z.string().optional(),
});

export const feeAssignmentQuerySchema = z.object({
  studentId: z.string().optional(),
  academicYear: z.string().optional(),
  gradeOrClass: z.string().optional(),
  status: z.string().optional(),
  paymentOption: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});

export const financeAuditLogQuerySchema = z.object({
  entityType: z.enum([
    'ALL',
    'FEE_CATEGORY',
    'FEE_STRUCTURE',
    'PAYMENT_PLAN',
    'DISCOUNT_RULE',
    'STUDENT_DISCOUNT',
    'FEE_ASSIGNMENT',
  ]).optional(),
  action: z.enum([
    'ALL',
    'CREATE',
    'UPDATE',
    'DELETE',
    'STATUS_CHANGE',
    'APPROVE',
    'REJECT',
  ]).optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
});
