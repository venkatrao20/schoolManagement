import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({
        error: {
          message: 'A user with this email already exists',
          code: 'USER_ALREADY_EXISTS',
        },
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: role || 'STAFF',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      entityType: 'USER',
      entityId: user.id,
      action: 'CREATE',
      userId: req.user?.userId,
      details: { email: user.email, role: user.role, name: user.name },
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      });
      return;
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (role !== undefined) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = isActive;
    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (emailTaken) {
          res.status(409).json({
            error: { message: 'Email is already taken', code: 'EMAIL_TAKEN' },
          });
          return;
        }
        dataToUpdate.email = normalizedEmail;
      }
    }
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      userId: req.user?.userId,
      details: { updatedFields: Object.keys(dataToUpdate) },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}
