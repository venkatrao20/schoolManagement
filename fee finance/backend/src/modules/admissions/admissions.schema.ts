import { z } from 'zod';

export const AdmissionStatusEnum = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'WAITLISTED',
  'ENROLLED',
]);

export const createAdmissionSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  academicYear: z.string().min(1, 'Academic year is required'), // e.g. "2026-2027"
  gradeAppliedFor: z.string().min(1, 'Grade applied for is required'),
  applicationDate: z.string().optional(),
  admissionDate: z.string().optional().nullable(),
  admissionStatus: AdmissionStatusEnum.default('PENDING'),
  previousSchool: z.string().optional().nullable(),
  documentsSubmitted: z.array(z.string()).or(z.string()).optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const updateAdmissionSchema = z.object({
  academicYear: z.string().min(1).optional(),
  gradeAppliedFor: z.string().min(1).optional(),
  admissionStatus: AdmissionStatusEnum.optional(),
  admissionDate: z.string().optional().nullable(),
  previousSchool: z.string().optional().nullable(),
  documentsSubmitted: z.array(z.string()).or(z.string()).optional().nullable(),
  remarks: z.string().optional().nullable(),
  updateStudentStatus: z.boolean().optional().default(true),
});

export const admissionQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  status: z.string().optional(),
  academicYear: z.string().optional(),
  grade: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
export type UpdateAdmissionInput = z.infer<typeof updateAdmissionSchema>;
