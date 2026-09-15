import { Router } from 'express';
import {
  listAdmissions,
  getAdmissionById,
  getStudentAdmissions,
  createAdmission,
  updateAdmission,
} from './admissions.controller';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import {
  createAdmissionSchema,
  updateAdmissionSchema,
  admissionQuerySchema,
} from './admissions.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: admissionQuerySchema }), listAdmissions);
router.get('/:id', getAdmissionById);
router.get('/student/:id', getStudentAdmissions);

router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: createAdmissionSchema }), createAdmission);
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: updateAdmissionSchema }), updateAdmission);

export default router;
