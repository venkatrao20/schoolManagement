import { z } from 'zod';

export const linkParentSchema = z.object({
  parentGuardianId: z.string().min(1, 'Parent/Guardian ID is required'),
  isPrimaryContact: z.boolean().optional().default(false),
  isEmergencyContact: z.boolean().optional().default(false),
  relationshipNotes: z.string().optional().nullable(),
});

export const updateLinkSchema = z.object({
  isPrimaryContact: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
  relationshipNotes: z.string().optional().nullable(),
});

export type LinkParentInput = z.infer<typeof linkParentSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
