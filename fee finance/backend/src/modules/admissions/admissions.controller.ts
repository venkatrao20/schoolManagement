import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';

export async function listAdmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const status = req.query.status as string;
    const academicYear = req.query.academicYear as string;
    const grade = req.query.grade as string;
    const search = (req.query.search as string)?.trim();
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (status && status !== 'ALL') {
      where.admissionStatus = status;
    }

    if (academicYear && academicYear !== 'ALL') {
      where.academicYear = academicYear;
    }

    if (grade && grade !== 'ALL') {
      where.gradeAppliedFor = grade;
    }

    if (search) {
      where.student = {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { admissionNumber: { contains: search } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [total, admissions] = await Promise.all([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          student: {
            include: {
              parents: {
                include: {
                  parentGuardian: true,
                },
              },
            },
          },
          decidedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    res.json({
      admissions,
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

export async function getAdmissionById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            parents: {
              include: {
                parentGuardian: true,
              },
            },
            admissions: {
              orderBy: { applicationDate: 'desc' },
            },
          },
        },
        decidedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!admission) {
      res.status(404).json({
        error: { message: 'Admission record not found', code: 'ADMISSION_NOT_FOUND' },
      });
      return;
    }

    res.json({ admission });
  } catch (err) {
    next(err);
  }
}

export async function getStudentAdmissions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params; // studentId

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        parents: {
          include: { parentGuardian: true },
        },
      },
    });

    if (!student) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    const admissions = await prisma.admission.findMany({
      where: { studentId: id },
      orderBy: { applicationDate: 'desc' },
      include: {
        student: {
          include: {
            parents: {
              include: { parentGuardian: true },
            },
          },
        },
        decidedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    res.json({ admissions, student });
  } catch (err) {
    next(err);
  }
}

export async function createAdmission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      studentId,
      academicYear,
      gradeAppliedFor,
      applicationDate,
      admissionDate,
      admissionStatus,
      previousSchool,
      documentsSubmitted,
      remarks,
    } = req.body;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    const docsString = Array.isArray(documentsSubmitted)
      ? JSON.stringify(documentsSubmitted)
      : documentsSubmitted || '[]';

    const admission = await prisma.admission.create({
      data: {
        studentId,
        academicYear,
        gradeAppliedFor,
        applicationDate: applicationDate ? new Date(applicationDate) : new Date(),
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        admissionStatus: admissionStatus || 'PENDING',
        previousSchool: previousSchool || null,
        documentsSubmitted: docsString,
        remarks: remarks || null,
        decidedById: admissionStatus && admissionStatus !== 'PENDING' ? req.user?.userId : null,
      },
      include: {
        student: {
          include: {
            parents: {
              include: { parentGuardian: true },
            },
          },
        },
        decidedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await logAudit({
      entityType: 'ADMISSION',
      entityId: admission.id,
      action: 'CREATE',
      userId: req.user?.userId,
      details: { studentId, academicYear, gradeAppliedFor, status: admission.admissionStatus },
    });

    res.status(201).json({ admission });
  } catch (err) {
    next(err);
  }
}

export async function updateAdmission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.admission.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!existing) {
      res.status(404).json({
        error: { message: 'Admission record not found', code: 'ADMISSION_NOT_FOUND' },
      });
      return;
    }

    const dataToUpdate: any = {};
    if (body.academicYear !== undefined) dataToUpdate.academicYear = body.academicYear;
    if (body.gradeAppliedFor !== undefined) dataToUpdate.gradeAppliedFor = body.gradeAppliedFor;
    if (body.remarks !== undefined) dataToUpdate.remarks = body.remarks;
    if (body.previousSchool !== undefined) dataToUpdate.previousSchool = body.previousSchool;
    if (body.documentsSubmitted !== undefined) {
      dataToUpdate.documentsSubmitted = Array.isArray(body.documentsSubmitted)
        ? JSON.stringify(body.documentsSubmitted)
        : body.documentsSubmitted;
    }

    if (body.admissionDate !== undefined) {
      dataToUpdate.admissionDate = body.admissionDate ? new Date(body.admissionDate) : null;
    }

    if (body.admissionStatus !== undefined) {
      dataToUpdate.admissionStatus = body.admissionStatus;
      dataToUpdate.decidedById = req.user?.userId;

      // Automatically sync student status if approved or enrolled
      if (body.updateStudentStatus !== false) {
        if (body.admissionStatus === 'ENROLLED') {
          await prisma.student.update({
            where: { id: existing.studentId },
            data: {
              status: 'ENROLLED',
              currentGrade: body.gradeAppliedFor || existing.gradeAppliedFor,
              updatedById: req.user?.userId,
            },
          });
        } else if (body.admissionStatus === 'APPROVED') {
          await prisma.student.update({
            where: { id: existing.studentId },
            data: {
              status: 'ADMITTED',
              updatedById: req.user?.userId,
            },
          });
        }
      }
    }

    const updated = await prisma.admission.update({
      where: { id },
      data: dataToUpdate,
      include: {
        student: {
          include: {
            parents: {
              include: { parentGuardian: true },
            },
          },
        },
        decidedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    await logAudit({
      entityType: 'ADMISSION',
      entityId: id,
      action: 'STATUS_CHANGE',
      userId: req.user?.userId,
      details: { previousStatus: existing.admissionStatus, newStatus: updated.admissionStatus },
    });

    res.json({ admission: updated });
  } catch (err) {
    next(err);
  }
}
