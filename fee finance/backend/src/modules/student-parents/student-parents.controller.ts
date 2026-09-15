import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit } from '../../utils/audit';

export async function linkParentToStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId } = req.params;
    const { parentGuardianId, isPrimaryContact, isEmergencyContact, relationshipNotes } = req.body;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      res.status(404).json({
        error: { message: 'Student not found', code: 'STUDENT_NOT_FOUND' },
      });
      return;
    }

    const parent = await prisma.parentGuardian.findUnique({ where: { id: parentGuardianId } });
    if (!parent) {
      res.status(404).json({
        error: { message: 'Parent/Guardian not found', code: 'PARENT_NOT_FOUND' },
      });
      return;
    }

    const existingLink = await prisma.studentParentLink.findUnique({
      where: {
        studentId_parentGuardianId: {
          studentId,
          parentGuardianId,
        },
      },
    });

    if (existingLink) {
      res.status(409).json({
        error: {
          message: 'This parent/guardian is already linked to this student',
          code: 'LINK_ALREADY_EXISTS',
        },
      });
      return;
    }

    // If marked as primary contact, reset other links for this student to non-primary if desired
    if (isPrimaryContact) {
      await prisma.studentParentLink.updateMany({
        where: { studentId },
        data: { isPrimaryContact: false },
      });
    }

    const link = await prisma.studentParentLink.create({
      data: {
        studentId,
        parentGuardianId,
        isPrimaryContact: Boolean(isPrimaryContact),
        isEmergencyContact: Boolean(isEmergencyContact),
        relationshipNotes: relationshipNotes || null,
      },
      include: {
        parentGuardian: true,
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
    });

    await logAudit({
      entityType: 'LINK',
      entityId: link.id,
      action: 'LINK',
      userId: req.user?.userId,
      details: { studentId, parentGuardianId, isPrimaryContact, isEmergencyContact },
    });

    res.status(201).json({ link });
  } catch (err) {
    next(err);
  }
}

export async function updateStudentParentLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, parentGuardianId } = req.params;
    const { isPrimaryContact, isEmergencyContact, relationshipNotes } = req.body;

    const existingLink = await prisma.studentParentLink.findUnique({
      where: {
        studentId_parentGuardianId: {
          studentId,
          parentGuardianId,
        },
      },
    });

    if (!existingLink) {
      res.status(404).json({
        error: { message: 'Student-Parent link not found', code: 'LINK_NOT_FOUND' },
      });
      return;
    }

    if (isPrimaryContact === true) {
      await prisma.studentParentLink.updateMany({
        where: { studentId },
        data: { isPrimaryContact: false },
      });
    }

    const dataToUpdate: any = {};
    if (isPrimaryContact !== undefined) dataToUpdate.isPrimaryContact = isPrimaryContact;
    if (isEmergencyContact !== undefined) dataToUpdate.isEmergencyContact = isEmergencyContact;
    if (relationshipNotes !== undefined) dataToUpdate.relationshipNotes = relationshipNotes;

    const link = await prisma.studentParentLink.update({
      where: {
        studentId_parentGuardianId: {
          studentId,
          parentGuardianId,
        },
      },
      data: dataToUpdate,
      include: {
        parentGuardian: true,
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
    });

    await logAudit({
      entityType: 'LINK',
      entityId: link.id,
      action: 'UPDATE',
      userId: req.user?.userId,
      details: { studentId, parentGuardianId, ...dataToUpdate },
    });

    res.json({ link });
  } catch (err) {
    next(err);
  }
}

export async function unlinkParentFromStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { studentId, parentGuardianId } = req.params;

    const existingLink = await prisma.studentParentLink.findUnique({
      where: {
        studentId_parentGuardianId: {
          studentId,
          parentGuardianId,
        },
      },
    });

    if (!existingLink) {
      res.status(404).json({
        error: { message: 'Student-Parent link not found', code: 'LINK_NOT_FOUND' },
      });
      return;
    }

    await prisma.studentParentLink.delete({
      where: {
        studentId_parentGuardianId: {
          studentId,
          parentGuardianId,
        },
      },
    });

    await logAudit({
      entityType: 'LINK',
      entityId: existingLink.id,
      action: 'UNLINK',
      userId: req.user?.userId,
      details: { studentId, parentGuardianId },
    });

    res.json({ message: 'Parent/Guardian unlinked from student successfully' });
  } catch (err) {
    next(err);
  }
}
