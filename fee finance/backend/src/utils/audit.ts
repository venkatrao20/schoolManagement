import { prisma } from '../config/prisma';

export interface FinanceAuditDetails {
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string | null;
  remarks?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, any> | null;
  [key: string]: any;
}

export async function logAudit(params: {
  entityType:
    | 'STUDENT'
    | 'PARENT'
    | 'ADMISSION'
    | 'USER'
    | 'LINK'
    | 'FEE_CATEGORY'
    | 'FEE_STRUCTURE'
    | 'PAYMENT_PLAN'
    | 'DISCOUNT_RULE'
    | 'STUDENT_DISCOUNT'
    | 'FEE_ASSIGNMENT';
  entityId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATUS_CHANGE'
    | 'LINK'
    | 'UNLINK'
    | 'LOGIN'
    | 'APPROVE'
    | 'REJECT'
    | 'CALCULATE'
    | 'SAVE';
  userId?: string;
  details?: Record<string, any> | string;
}) {
  try {
    const detailsStr = typeof params.details === 'object' ? JSON.stringify(params.details) : params.details;
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        userId: params.userId,
        details: detailsStr,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function logFinanceAudit(params: {
  entityType:
    | 'FEE_CATEGORY'
    | 'FEE_STRUCTURE'
    | 'PAYMENT_PLAN'
    | 'DISCOUNT_RULE'
    | 'STUDENT_DISCOUNT'
    | 'FEE_ASSIGNMENT';
  entityId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STATUS_CHANGE'
    | 'APPROVE'
    | 'REJECT';
  userId?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string | null;
  remarks?: string | null;
  metadata?: Record<string, any> | null;
}) {
  return logAudit({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId,
    details: {
      oldValue: params.oldValue || null,
      newValue: params.newValue || null,
      reason: params.reason || params.remarks || null,
      metadata: params.metadata || null,
      timestamp: new Date().toISOString(),
    },
  });
}
