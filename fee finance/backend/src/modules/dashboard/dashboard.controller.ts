import { Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalStudents,
      enrolledStudents,
      appliedStudents,
      admittedStudents,
      totalParents,
      pendingAdmissions,
      approvedAdmissions,
      recentAdmissions,
      recentStudents,
      gradeDistribution,
      admissionStatusCounts,
    ] = await Promise.all([
      prisma.student.count({ where: { isDeleted: false } }),
      prisma.student.count({ where: { isDeleted: false, status: 'ENROLLED' } }),
      prisma.student.count({ where: { isDeleted: false, status: 'APPLIED' } }),
      prisma.student.count({ where: { isDeleted: false, status: 'ADMITTED' } }),
      prisma.parentGuardian.count({ where: { isDeleted: false } }),
      prisma.admission.count({ where: { admissionStatus: 'PENDING' } }),
      prisma.admission.count({ where: { admissionStatus: 'APPROVED' } }),
      prisma.admission.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true, currentGrade: true },
          },
          decidedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.student.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          parents: {
            include: { parentGuardian: true },
            take: 1,
          },
        },
      }),
      prisma.student.groupBy({
        by: ['currentGrade'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      prisma.admission.groupBy({
        by: ['admissionStatus'],
        _count: { id: true },
      }),
    ]);

    res.json({
      metrics: {
        totalStudents,
        enrolledStudents,
        appliedStudents,
        admittedStudents,
        totalParents,
        pendingAdmissions,
        approvedAdmissions,
      },
      recentAdmissions,
      recentStudents,
      charts: {
        gradeDistribution: gradeDistribution.map((g) => ({
          grade: g.currentGrade,
          count: g._count.id,
        })),
        admissionStatusCounts: admissionStatusCounts.map((s) => ({
          status: s.admissionStatus,
          count: s._count.id,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
