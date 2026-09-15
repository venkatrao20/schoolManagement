import { Router } from 'express';
import { listUsers, createUser, updateUser } from './users.controller';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema } from './users.schema';

const router = Router();

router.use(authenticate);
router.use(requireRoles('SUPER_ADMIN'));

router.get('/', listUsers);
router.post('/', validate({ body: createUserSchema }), createUser);
router.patch('/:id', validate({ body: updateUserSchema }), updateUser);

export default router;
