import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  createFeeCategorySchema,
  updateFeeCategorySchema,
  feeCategoryQuerySchema,
  createFeeStructureSchema,
  updateFeeStructureSchema,
  feeStructureQuerySchema,
  createPaymentPlanSchema,
  updatePaymentPlanSchema,
  paymentPlanQuerySchema,
  calculateScheduleSchema,
  createDiscountRuleSchema,
  updateDiscountRuleSchema,
  discountRuleQuerySchema,
  approveDiscountRuleSchema,
  assignStudentDiscountSchema,
  updateStudentDiscountSchema,
  createFeeAssignmentSchema,
  updateFeeAssignmentSchema,
  feeAssignmentQuerySchema,
  calculateFeePreviewSchema,
  financeAuditLogQuerySchema,
} from './fee.schemas';
import {
  listFeeCategories,
  getFeeCategoryById,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory,
  listFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  listAllPaymentPlans,
  getPaymentPlanById,
  createPaymentPlan,
  getPaymentPlansByStructure,
  updatePaymentPlan,
  deletePaymentPlan,
  calculateConfiguredSchedule,
  listDiscountRules,
  getDiscountRuleById,
  createDiscountRule,
  updateDiscountRule,
  approveDiscountRule,
  deleteDiscountRule,
  assignStudentDiscount,
  listStudentDiscounts,
  updateStudentDiscount,
  calculateFeePreview,
  createFeeAssignment,
  listStudentFeeAssignments,
  getFeeAssignmentById,
  updateFeeAssignment,
  getStudentFeeAssignment,
  listFinanceAuditLogs,
  getFinanceAuditLogById,
} from './fee.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// FEE CATEGORIES
// ==========================================
router.get(
  '/categories',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateQuery(feeCategoryQuerySchema),
  listFeeCategories
);

router.get(
  '/categories/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getFeeCategoryById
);

router.post(
  '/categories',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createFeeCategorySchema),
  createFeeCategory
);

router.patch(
  '/categories/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateFeeCategorySchema),
  updateFeeCategory
);

router.delete(
  '/categories/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  deleteFeeCategory
);

// ==========================================
// FEE STRUCTURES
// ==========================================
router.get(
  '/structures',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateQuery(feeStructureQuerySchema),
  listFeeStructures
);

router.get(
  '/structures/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getFeeStructureById
);

router.post(
  '/structures',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createFeeStructureSchema),
  createFeeStructure
);

router.patch(
  '/structures/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateFeeStructureSchema),
  updateFeeStructure
);

router.delete(
  '/structures/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  deleteFeeStructure
);

// ==========================================
// PAYMENT PLANS
// ==========================================
router.get(
  '/payment-plans',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateQuery(paymentPlanQuerySchema),
  listAllPaymentPlans
);

router.get(
  '/payment-plans/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getPaymentPlanById
);

router.post(
  '/payment-plans',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createPaymentPlanSchema),
  createPaymentPlan
);

router.post(
  '/structures/:feeStructureId/payment-plans',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createPaymentPlanSchema),
  createPaymentPlan
);

router.get(
  '/structures/:feeStructureId/payment-plans',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getPaymentPlansByStructure
);

router.post(
  '/structures/:feeStructureId/calculate-schedule',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateBody(calculateScheduleSchema),
  calculateConfiguredSchedule
);

router.patch(
  '/payment-plans/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updatePaymentPlanSchema),
  updatePaymentPlan
);

router.delete(
  '/payment-plans/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  deletePaymentPlan
);

// ==========================================
// DISCOUNT RULES & CONCESSIONS
// ==========================================
router.get(
  '/discount-rules',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateQuery(discountRuleQuerySchema),
  listDiscountRules
);

router.get(
  '/discount-rules/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getDiscountRuleById
);

router.post(
  '/discount-rules',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createDiscountRuleSchema),
  createDiscountRule
);

router.patch(
  '/discount-rules/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateDiscountRuleSchema),
  updateDiscountRule
);

router.post(
  '/discount-rules/:id/approve',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(approveDiscountRuleSchema),
  approveDiscountRule
);

router.post(
  '/discount-rules/:id/reject',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(approveDiscountRuleSchema),
  approveDiscountRule
);

router.delete(
  '/discount-rules/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  deleteDiscountRule
);

// ==========================================
// 6. CALCULATION & FEE ASSIGNMENTS
// ==========================================
router.post(
  '/calculate',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateBody(calculateFeePreviewSchema),
  calculateFeePreview
);

router.get(
  '/assignments',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  validateQuery(feeAssignmentQuerySchema),
  listStudentFeeAssignments
);

router.post(
  '/assignments',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createFeeAssignmentSchema),
  createFeeAssignment
);

router.get(
  '/assignments/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getFeeAssignmentById
);

router.patch(
  '/assignments/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateFeeAssignmentSchema),
  updateFeeAssignment
);

// ==========================================
// 7. FINANCE AUDIT TRAIL
// ==========================================
router.get(
  '/audit-logs',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateQuery(financeAuditLogQuerySchema),
  listFinanceAuditLogs
);

router.get(
  '/audit-logs/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  getFinanceAuditLogById
);

export default router;

// -----------------------------------------------------------
// Student-nested fee routes (discounts & fee assignments)
// -----------------------------------------------------------
export const studentFeeRouter = Router({ mergeParams: true });
studentFeeRouter.use(authenticate);

// Student Discounts
studentFeeRouter.post(
  '/:studentId/discounts',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(assignStudentDiscountSchema),
  assignStudentDiscount
);

studentFeeRouter.get(
  '/:studentId/discounts',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  listStudentDiscounts
);

studentFeeRouter.patch(
  '/:studentId/discounts/:assignmentId',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateStudentDiscountSchema),
  updateStudentDiscount
);

// Student Fee Assignments (Snapshot Calculation & Save)
studentFeeRouter.get(
  '/:studentId/fee-assignment',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN', 'STAFF'),
  getStudentFeeAssignment
);

studentFeeRouter.post(
  '/:studentId/fee-assignments',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(createFeeAssignmentSchema),
  createFeeAssignment
);

studentFeeRouter.get(
  '/:studentId/fee-assignments',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  listStudentFeeAssignments
);

studentFeeRouter.get(
  '/:studentId/fee-assignments/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE', 'ADMIN'),
  getFeeAssignmentById
);

studentFeeRouter.patch(
  '/:studentId/fee-assignments/:id',
  requireRoles('SUPER_ADMIN', 'FINANCE'),
  validateBody(updateFeeAssignmentSchema),
  updateFeeAssignment
);
