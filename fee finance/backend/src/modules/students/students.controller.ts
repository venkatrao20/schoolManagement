import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';

export async function listStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const search = (req.query.search as string)?.trim();
    const status = req.query.status as string;
    const grade = req.query.grade as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';
    const includeDeleted = req.query.includeDeleted === 'true';

    const where: any = {};

    if (!includeDeleted) {
      where.isDeleted = false;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (grade && grade !== 'ALL') {
      where.currentGrade = grade;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { admissionNumber: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parents: {
            include: {
              parentGuardian: true,
            },
          },
          admissions: {
            orderBy: { applicationDate: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    res.json({
      students,
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

export async function getStudentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        parents: {
          include: {
            parentGuardian: true,
          },
          orderBy: { isPrimaryContact: 'desc' },
        },
        admissions: {
          orderBy: { applicationDate: 'desc' },
          include: {
            decidedBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        updatedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!student) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    res.json({ student });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      admissionNumber,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      nationality,
      address,
      phone,
      email,
      photoUrl,
      status,
      currentGrade,
    } = req.body;

    const existing = await prisma.student.findUnique({
      where: { admissionNumber },
    });

    if (existing) {
      res.status(409).json({
        error: {
          message: `Student with admission number "${admissionNumber}" already exists`,
          code: 'ADMISSION_NUMBER_EXISTS',
        },
      });
      return;
    }

    const student = await prisma.student.create({
      data: {
        admissionNumber,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup: bloodGroup || null,
        nationality: nationality || 'Indian',
        address,
        phone: phone || null,
        email: email || null,
        photoUrl: photoUrl || null,
        status: status || 'APPLIED',
        currentGrade,
        createdById: req.user?.userId,
        updatedById: req.user?.userId,
      },
      include: {
        parents: {
          include: { parentGuardian: true },
        },
        admissions: true,
      },
    });

    await logAudit({
      entityType: 'STUDENT',
      entityId: student.id,
      action: 'CREATE',
      userId: req.user?.userId,
      details: { admissionNumber: student.admissionNumber, name: `${firstName} ${lastName}` },
    });

    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    if (body.admissionNumber && body.admissionNumber !== existing.admissionNumber) {
      const duplicate = await prisma.student.findUnique({
        where: { admissionNumber: body.admissionNumber },
      });
      if (duplicate) {
        res.status(409).json({
          error: {
            message: `Student with admission number "${body.admissionNumber}" already exists`,
            code: 'ADMISSION_NUMBER_EXISTS',
          },
        });
        return;
      }
    }

    const dataToUpdate: any = { ...body, updatedById: req.user?.userId };
    if (body.dateOfBirth) {
      dataToUpdate.dateOfBirth = new Date(body.dateOfBirth);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: dataToUpdate,
      include: {
        parents: {
          include: { parentGuardian: true },
        },
        admissions: {
          orderBy: { applicationDate: 'desc' },
        },
      },
    });

    await logAudit({
      entityType: 'STUDENT',
      entityId: id,
      action: 'UPDATE',
      userId: req.user?.userId,
      details: { updatedFields: Object.keys(body) },
    });

    res.json({ student: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    // Soft delete to maintain historical records
    const student = await prisma.student.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedById: req.user?.userId,
      },
    });

    await logAudit({
      entityType: 'STUDENT',
      entityId: id,
      action: 'DELETE',
      userId: req.user?.userId,
      details: { softDeleted: true },
    });

    res.json({
      message: 'Student record soft-deleted successfully',
      student,
    });
  } catch (err) {
    next(err);
  }
}
