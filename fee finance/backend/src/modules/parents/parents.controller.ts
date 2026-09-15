import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';

export async function listParents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const search = (req.query.search as string)?.trim();
    const relationship = req.query.relationship as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const includeDeleted = req.query.includeDeleted === 'true';

    const where: any = {};

    if (!includeDeleted) {
      where.isDeleted = false;
    }

    if (relationship && relationship !== 'ALL') {
      where.relationship = relationship;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { occupation: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, parents] = await Promise.all([
      prisma.parentGuardian.count({ where }),
      prisma.parentGuardian.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  admissionNumber: true,
                  firstName: true,
                  lastName: true,
                  currentGrade: true,
                  status: true,
                  photoUrl: true,
                  isDeleted: true,
                },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      parents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getParentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const parent = await prisma.parentGuardian.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: {
              include: {
                admissions: {
                  orderBy: { applicationDate: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      res.status(404).json({
        error: { message: 'Parent/Guardian not found', code: 'PARENT_NOT_FOUND' },
      });
      return;
    }

    res.json({ parent });
  } catch (err) {
    next(err);
  }
}

export async function createParent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      firstName,
      lastName,
      relationship,
      phone,
      email,
      occupation,
      address,
      idProofType,
      idProofNumber,
    } = req.body;

    const parent = await prisma.parentGuardian.create({
      data: {
        firstName,
        lastName,
        relationship: relationship || 'GUARDIAN',
        phone,
        email: email.toLowerCase().trim(),
        occupation: occupation || null,
        address,
        idProofType: idProofType || null,
        idProofNumber: idProofNumber || null,
      },
      include: {
        students: true,
      },
    });

    await logAudit({
      entityType: 'PARENT',
      entityId: parent.id,
      action: 'CREATE',
      userId: req.user?.userId,
      details: { name: `${firstName} ${lastName}`, email: parent.email },
    });

    res.status(201).json({ parent });
  } catch (err) {
    next(err);
  }
}

export async function updateParent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.parentGuardian.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        error: { message: 'Parent/Guardian not found', code: 'PARENT_NOT_FOUND' },
      });
      return;
    }

    const dataToUpdate: any = { ...body };
    if (body.email) {
      dataToUpdate.email = body.email.toLowerCase().trim();
    }

    const updated = await prisma.parentGuardian.update({
      where: { id },
      data: dataToUpdate,
      include: {
        students: {
          include: { student: true },
        },
      },
    });

    await logAudit({
      entityType: 'PARENT',
      entityId: id,
      action: 'UPDATE',
      userId: req.user?.userId,
      details: { updatedFields: Object.keys(body) },
    });

    res.json({ parent: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteParent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.parentGuardian.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        error: { message: 'Parent/Guardian not found', code: 'PARENT_NOT_FOUND' },
      });
      return;
    }

    const parent = await prisma.parentGuardian.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await logAudit({
      entityType: 'PARENT',
      entityId: id,
      action: 'DELETE',
      userId: req.user?.userId,
      details: { softDeleted: true },
    });

    res.json({
      message: 'Parent/Guardian record soft-deleted successfully',
      parent,
    });
  } catch (err) {
    next(err);
  }
}
