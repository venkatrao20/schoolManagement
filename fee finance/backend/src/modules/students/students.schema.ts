import { z } from 'zod';

export const StudentStatusEnum = z.enum([
  'ENQUIRY',
  'APPLIED',
  'ADMITTED',
  'ENROLLED',
  'ALUMNI',
  'WITHDRAWN',
]);

export const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

export const createStudentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format for date of birth',
  }),
  gender: GenderEnum,
  bloodGroup: z.string().optional().nullable(),
  nationality: z.string().default('Indian'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  photoUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: StudentStatusEnum.default('APPLIED'),
  currentGrade: z.string().min(1, 'Current grade/class is required'),
});

export const updateStudentSchema = z.object({
  admissionNumber: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  gender: GenderEnum.optional(),
  bloodGroup: z.string().optional().nullable(),
  nationality: z.string().optional(),
  address: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  photoUrl: z.string().url().optional().nullable().or(z.literal('')),
  status: StudentStatusEnum.optional(),
  currentGrade: z.string().min(1).optional(),
});

export const studentQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.string().optional(),
  grade: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeDeleted: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
