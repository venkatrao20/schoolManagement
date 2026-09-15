import { z } from 'zod';

export const RelationshipEnum = z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']);

export const createParentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: RelationshipEnum.default('GUARDIAN'),
  phone: z.string().min(6, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  occupation: z.string().optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  idProofType: z.string().optional().nullable(),
  idProofNumber: z.string().optional().nullable(),
});

export const updateParentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  relationship: RelationshipEnum.optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
  occupation: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  idProofType: z.string().optional().nullable(),
  idProofNumber: z.string().optional().nullable(),
});

export const parentQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  relationship: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeDeleted: z.string().optional(),
});

export type CreateParentInput = z.infer<typeof createParentSchema>;
export type UpdateParentInput = z.infer<typeof updateParentSchema>;
