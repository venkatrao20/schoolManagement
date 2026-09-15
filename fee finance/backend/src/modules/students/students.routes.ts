import { Router } from 'express';
import {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from './students.controller';
import { authenticate } from '../../middleware/auth';
import { requireRoles } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validate';
import { createStudentSchema, updateStudentSchema, studentQuerySchema } from './students.schema';

const router = Router();

router.use(authenticate);

// List & view (Staff, Admin, SuperAdmin)
router.get('/', validate({ query: studentQuerySchema }), listStudents);
router.get('/:id', getStudentById);

// Create, update, soft-delete (Admin, SuperAdmin only)
router.post('/', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: createStudentSchema }), createStudent);
router.patch('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), validate({ body: updateStudentSchema }), updateStudent);
router.delete('/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), deleteStudent);

export default router;
