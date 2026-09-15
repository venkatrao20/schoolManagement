import { Router } from 'express';
import { login, refresh, logout, getMe } from './auth.controller';
import { validate } from '../../middleware/validate';
import { loginSchema, refreshSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', validate({ body: loginSchema }), login);
router.post('/refresh', validate({ body: refreshSchema }), refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
