import { Router } from 'express';
import {
  listParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
} from './parents.controller';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createParentSchema, updateParentSchema, parentQuerySchema } from './parents.schema';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: parentQuerySchema }), listParents);
router.get('/:id', getParentById);

router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: createParentSchema }), createParent);
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: updateParentSchema }), updateParent);
router.delete('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), deleteParent);

export default router;
