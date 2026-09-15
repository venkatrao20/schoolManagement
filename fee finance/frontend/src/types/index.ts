export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'FINANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type StudentStatus = 'ENQUIRY' | 'APPLIED' | 'ADMITTED' | 'ENROLLED' | 'ALUMNI' | 'WITHDRAWN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ParentRelationship = 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER';
export type AdmissionStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'ENROLLED';

export interface ParentGuardian {
  id: string;
  firstName: string;
  lastName: string;
  relationship: ParentRelationship;
  phone: string;
  email: string;
  occupation?: string | null;
  address: string;
  idProofType?: string | null;
  idProofNumber?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  students?: StudentParentLink[];
}

export interface StudentParentLink {
  id: string;
  studentId: string;
  parentGuardianId: string;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  relationshipNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  parentGuardian?: ParentGuardian;
  student?: Student;
}

export interface Admission {
  id: string;
  studentId: string;
  applicationDate: string;
  admissionDate?: string | null;
  academicYear: string;
  gradeAppliedFor: string;
  admissionStatus: AdmissionStatus;
  previousSchool?: string | null;
  documentsSubmitted?: string | null; // JSON string
  remarks?: string | null;
  decidedById?: string | null;
  decidedBy?: User | null;
  createdAt: string;
  updatedAt: string;
  student?: Student;
}

export interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  bloodGroup?: string | null;
  nationality: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  status: StudentStatus;
  currentGrade: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdById?: string | null;
  createdBy?: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  createdAt: string;
  updatedAt: string;
  parents?: StudentParentLink[];
  admissions?: Admission[];
  discountAssignments?: StudentDiscountAssignment[];
  feeAssignments?: FeeAssignment[];
}

// ----------------------------------------------------
// FEE MODULE TYPES
// ----------------------------------------------------

export type FeeType = 'RECURRING' | 'ONE_TIME' | 'ANNUAL' | 'SERVICE' | 'OTHER';
export type FeeFrequency = 'QUARTERLY' | 'FULL_YEAR' | 'ONE_TIME' | 'MONTHLY' | 'HALF_YEARLY';

export interface FeeCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  feeType: FeeType;
  defaultFrequency: FeeFrequency;
  isMandatory: boolean;
  discountAllowed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: User | null;
  _count?: {
    feeStructures: number;
  };
}

export type PaymentFrequency = 'QUARTERLY' | 'FULL_YEAR';

export interface PaymentPlanInstallment {
  id: string;
  paymentPlanId: string;
  sequence: number;
  installmentNumber: number;
  quarter?: string | null;
  dueDate?: string | null;
  dueMonth?: string | null;
  dueDateRule?: string | null;
  amount: number | string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentPlan {
  id: string;
  feeStructureId: string;
  feeStructure?: FeeStructure;
  name: string;
  type: PaymentFrequency;
  frequency: PaymentFrequency;
  installmentCount: number;
  numberOfInstallments: number;
  status: string;
  isActive: boolean;
  createdById?: string | null;
  createdBy?: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  createdAt: string;
  updatedAt: string;
  installments?: PaymentPlanInstallment[];
  _count?: {
    feeAssignments: number;
  };
}

export type StudentCategory =
  | 'REGULAR'
  | 'RTE'
  | 'SIBLING'
  | 'STAFF_CHILD'
  | 'DAY_SCHOLAR'
  | 'BOARDER'
  | 'MANAGEMENT_QUOTA';

export interface FeeStructureItem {
  id: string;
  feeStructureId: string;
  feeCategoryId: string;
  feeCategory?: FeeCategory;
  amount: number | string;
  frequency: FeeFrequency;
  isMandatory: boolean;
  discountAllowed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeStructure {
  id: string;
  name: string;
  academicYear: string;
  gradeOrClass: string;
  section?: string | null;
  studentCategory: StudentCategory;
  status: string;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  feeCategoryId?: string | null;
  amount: number | string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  feeCategory?: FeeCategory;
  items?: FeeStructureItem[];
  paymentPlans?: PaymentPlan[];
  _count?: {
    feeAssignments: number;
  };
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FLAT_AMOUNT';
export type PaymentOption = 'ANY' | 'FULL_YEAR' | 'QUARTERLY';
export type EligibilityType =
  | 'ALL'
  | 'STUDENT_CATEGORY'
  | 'CLASS'
  | 'SIBLING'
  | 'SCHOLARSHIP'
  | 'SPECIFIC_STUDENT'
  | 'CUSTOM';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface DiscountFeeHead {
  id: string;
  discountRuleId: string;
  feeCategoryId: string;
  feeCategory?: FeeCategory;
  createdAt?: string;
}

export interface DiscountRule {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
  value: number | string;
  paymentOption: PaymentOption;
  eligibilityType: EligibilityType;
  eligibilityCriteria?: string | null;
  applicableClasses?: string | null; // JSON array string
  applicableStudentCategories?: string | null; // JSON array string
  applicableFeeCategoryIds?: string | null; // JSON array string
  validFrom: string;
  validUntil?: string | null;
  validTo?: string | null;
  minimumAmount?: number | string | null;
  maximumDiscount?: number | string | null;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  status: string;
  active: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  approvedById?: string | null;
  approvedBy?: User | null;
  feeHeads?: DiscountFeeHead[];
  _count?: {
    studentAssignments: number;
  };
}

export interface StudentDiscountAssignment {
  id: string;
  studentId: string;
  discountRuleId: string;
  approvedById?: string | null;
  approvedBy?: User | null;
  approvalDate?: string | null;
  status: DiscountStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  discountRule?: DiscountRule;
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

export interface AppliedDiscountBreakdown {
  discountRuleId: string;
  name: string;
  code?: string;
  discountType: string;
  ruleValue: number;
  calculatedDiscount: number;
  eligibleHeads?: string[];
}

export interface FeeCalculationResult {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  academicYear?: string;
  gradeOrClass?: string;
  studentCategory?: string;
  paymentOption?: string;
  quarter?: string | null;
  grossAmount: number;
  originalAmount?: number;
  discountAmount: number;
  discountApplied?: number;
  finalPayable: number;
  finalPayableAmount?: number;
  currency: string;
  items?: FeeHeadBreakdown[];
  quarters?: CalculatedInstallment[];
  installments?: CalculatedInstallment[];
  appliedDiscounts?: AppliedDiscountBreakdown[];
  feeStructure?: {
    id: string;
    name?: string;
    academicYear: string;
    gradeOrClass: string;
    studentCategory?: string;
    feeCategoryId?: string;
    feeCategoryName?: string;
    amount?: number;
  };
  paymentPlan?: {
    id: string;
    name?: string;
    frequency: string;
    installmentCount?: number;
    numberOfInstallments: number;
  };
}

export interface FeeAssignment {
  id: string;
  studentId: string;
  student?: Student;
  academicYear?: string;
  feeStructureId: string;
  paymentPlanId: string;
  paymentOption?: string;
  originalAmount: number | string;
  discountApplied: number | string;
  finalPayableAmount: number | string;
  currency: string;
  status: 'ACTIVE' | 'ASSIGNED' | 'PARTIAL' | 'PAID' | 'SUPERSEDED' | 'CANCELLED';
  assignedAt?: string;
  calculationDetails?: string | null; // JSON string
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: User | null;
  updatedById?: string | null;
  updatedBy?: User | null;
  feeStructure?: FeeStructure;
  paymentPlan?: PaymentPlan;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
