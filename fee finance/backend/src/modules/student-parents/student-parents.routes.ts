import { Router } from 'express';
import {
  linkParentToStudent,
  updateStudentParentLink,
  unlinkParentFromStudent,
} from './student-parents.controller';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { linkParentSchema, updateLinkSchema } from './student-parents.schema';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/:studentId/parents',
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  validate({ body: linkParentSchema }),
  linkParentToStudent
);

router.patch(
  '/:studentId/parents/:parentGuardianId',
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  validate({ body: updateLinkSchema }),
  updateStudentParentLink
);

router.delete(
  '/:studentId/parents/:parentGuardianId',
  requireRoles('SUPER_ADMIN', 'ADMIN'),
  unlinkParentFromStudent
);

export default router;
