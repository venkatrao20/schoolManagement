import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuthRequest } from '../../middleware/auth';
import { logAudit, logFinanceAudit } from '../../utils/audit';
import { calculateStudentFee, calculateFeeAssignment } from './fee.service';
import { Prisma } from '@prisma/client';

// ==========================================
// 1. FEE CATEGORIES
// ==========================================

export async function listFeeCategories(req: AuthRequest, res: Response): Promise<void> {
  const { search, feeType, frequency, isMandatory, discountAllowed, isActive, includeInactive, page, limit } = req.query as any;
  const where: Prisma.FeeCategoryWhereInput = {};

  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  } else if (includeInactive !== 'true' && isActive !== 'all') {
    where.isActive = true;
  }

  if (feeType) {
    where.feeType = String(feeType);
  }

  if (frequency) {
    where.defaultFrequency = String(frequency);
  }

  if (isMandatory !== undefined && isMandatory !== '') {
    where.isMandatory = isMandatory === 'true';
  }

  if (discountAllowed !== undefined && discountAllowed !== '') {
    where.discountAllowed = discountAllowed === 'true';
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { name: { contains: term } },
      { code: { contains: term } },
      { description: { contains: term } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [categories, total] = await Promise.all([
    prisma.feeCategory.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: req.query.page ? skip : undefined,
      take: req.query.limit ? limitNum : undefined,
      include: {
        _count: {
          select: { feeStructures: true },
        },
      },
    }),
    prisma.feeCategory.count({ where }),
  ]);

  res.json({
    categories,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getFeeCategoryById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const category = await prisma.feeCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { feeStructures: true },
      },
      feeStructures: {
        include: { paymentPlans: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      updatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!category) {
    res.status(404).json({ error: { message: 'Fee category not found', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ category });
}

export async function createFeeCategory(req: AuthRequest, res: Response): Promise<void> {
  const {
    name,
    code,
    description,
    feeType = 'RECURRING',
    defaultFrequency = 'QUARTERLY',
    isMandatory = true,
    discountAllowed = true,
    isActive = true,
  } = req.body;

  const normalizedCode = code.trim().toUpperCase();
  const normalizedName = name.trim();

  const existingCode = await prisma.feeCategory.findUnique({ where: { code: normalizedCode } });
  if (existingCode) {
    res.status(409).json({
      error: {
        message: `Fee category with code '${normalizedCode}' already exists`,
        code: 'CODE_EXISTS',
      },
    });
    return;
  }

  const existingName = await prisma.feeCategory.findFirst({
    where: { name: { equals: normalizedName } },
  });
  if (existingName) {
    res.status(409).json({
      error: {
        message: `Fee category with name '${normalizedName}' already exists`,
        code: 'NAME_EXISTS',
      },
    });
    return;
  }

  const category = await prisma.feeCategory.create({
    data: {
      name: normalizedName,
      code: normalizedCode,
      description: description ? description.trim() : null,
      feeType,
      defaultFrequency,
      isMandatory,
      discountAllowed,
      isActive,
      createdById: req.user?.userId,
    },
  });

  await logAudit({
    entityType: 'FEE_CATEGORY',
    entityId: category.id,
    action: 'CREATE',
    userId: req.user?.userId,
    details: { name: normalizedName, code: normalizedCode, feeType, defaultFrequency, isMandatory, discountAllowed },
  });

  res.status(201).json({ category, message: 'Fee category created successfully' });
}

export async function updateFeeCategory(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    name,
    code,
    description,
    feeType,
    defaultFrequency,
    isMandatory,
    discountAllowed,
    isActive,
  } = req.body;

  const existing = await prisma.feeCategory.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { message: 'Fee category not found', code: 'NOT_FOUND' } });
    return;
  }

  if (code && code.trim().toUpperCase() !== existing.code) {
    const normalizedCode = code.trim().toUpperCase();
    const duplicateCode = await prisma.feeCategory.findUnique({ where: { code: normalizedCode } });
    if (duplicateCode) {
      res.status(409).json({
        error: {
          message: `Fee category with code '${normalizedCode}' already exists`,
          code: 'CODE_EXISTS',
        },
      });
      return;
    }
  }

  if (name && name.trim() !== existing.name) {
    const normalizedName = name.trim();
    const duplicateName = await prisma.feeCategory.findFirst({
      where: {
        name: { equals: normalizedName },
        id: { not: id },
      },
    });
    if (duplicateName) {
      res.status(409).json({
        error: {
          message: `Fee category with name '${normalizedName}' already exists`,
          code: 'NAME_EXISTS',
        },
      });
      return;
    }
  }

  const updateData: any = {
    updatedById: req.user?.userId,
  };
  if (name !== undefined) updateData.name = name.trim();
  if (code !== undefined) updateData.code = code.trim().toUpperCase();
  if (description !== undefined) updateData.description = description ? description.trim() : null;
  if (feeType !== undefined) updateData.feeType = feeType;
  if (defaultFrequency !== undefined) updateData.defaultFrequency = defaultFrequency;
  if (isMandatory !== undefined) updateData.isMandatory = isMandatory;
  if (discountAllowed !== undefined) updateData.discountAllowed = discountAllowed;
  if (isActive !== undefined) updateData.isActive = isActive;

  const category = await prisma.feeCategory.update({
    where: { id },
    data: updateData,
  });

  await logAudit({
    entityType: 'FEE_CATEGORY',
    entityId: category.id,
    action: 'UPDATE',
    userId: req.user?.userId,
    details: { name: category.name, code: category.code, isActive: category.isActive },
  });

  res.json({ category, message: 'Fee category updated successfully' });
}

export async function deleteFeeCategory(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.feeCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Fee category not found', code: 'NOT_FOUND' } });
    return;
  }

  // Toggle active status or deactivate
  const targetStatus = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !existing.isActive;

  const category = await prisma.feeCategory.update({
    where: { id },
    data: { isActive: targetStatus, updatedById: req.user?.userId },
  });

  await logAudit({
    entityType: 'FEE_CATEGORY',
    entityId: category.id,
    action: 'STATUS_CHANGE',
    userId: req.user?.userId,
    details: { isActive: targetStatus, previousStatus: existing.isActive, action: targetStatus ? 'ACTIVATE' : 'DEACTIVATE' },
  });

  res.json({
    category,
    message: `Fee category '${category.name}' ${targetStatus ? 'activated' : 'deactivated'} successfully`,
  });
}

// ==========================================
// 2. FEE STRUCTURES
// ==========================================

export async function listFeeStructures(req: AuthRequest, res: Response): Promise<void> {
  const { academicYear, gradeOrClass, studentCategory, status, feeCategoryId, includeInactive, isActive, search, page, limit } = req.query as any;

  const where: Prisma.FeeStructureWhereInput = {};
  if (academicYear) where.academicYear = String(academicYear);
  if (gradeOrClass) where.gradeOrClass = String(gradeOrClass);
  if (studentCategory) where.studentCategory = String(studentCategory);
  if (status) where.status = String(status);
  if (feeCategoryId) {
    where.OR = [
      { feeCategoryId: String(feeCategoryId) },
      { items: { some: { feeCategoryId: String(feeCategoryId) } } },
    ];
  }

  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  } else if (includeInactive !== 'true' && !status) {
    where.isActive = true;
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      ...(where.OR || []),
      { name: { contains: term } },
      { gradeOrClass: { contains: term } },
      { academicYear: { contains: term } },
      { studentCategory: { contains: term } },
      { feeCategory: { name: { contains: term } } },
      { items: { some: { feeCategory: { name: { contains: term } } } } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [feeStructures, total] = await Promise.all([
    prisma.feeStructure.findMany({
      where,
      orderBy: [{ academicYear: 'desc' }, { gradeOrClass: 'asc' }, { version: 'desc' }],
      skip: req.query.page ? skip : undefined,
      take: req.query.limit ? limitNum : undefined,
      include: {
        feeCategory: true,
        items: {
          include: { feeCategory: true },
          orderBy: { amount: 'desc' },
        },
        paymentPlans: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: { feeAssignments: true },
        },
      },
    }),
    prisma.feeStructure.count({ where }),
  ]);

  res.json({
    feeStructures,
    structures: feeStructures,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function getFeeStructureById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id },
    include: {
      feeCategory: true,
      items: {
        include: { feeCategory: true },
        orderBy: { amount: 'desc' },
      },
      paymentPlans: {
        include: {
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: { feeAssignments: true },
      },
    },
  });

  if (!feeStructure) {
    res.status(404).json({ error: { message: 'Fee structure not found', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ feeStructure, structure: feeStructure });
}

export async function createFeeStructure(req: AuthRequest, res: Response): Promise<void> {
  const {
    name,
    academicYear,
    gradeOrClass,
    section,
    studentCategory = 'REGULAR',
    items,
    feeCategoryId,
    amount,
    currency = 'INR',
  } = req.body;

  // Normalize items array
  let structureItems = items as Array<{
    feeCategoryId: string;
    amount: number;
    frequency?: string;
    isMandatory?: boolean;
    discountAllowed?: boolean;
  }>;

  if ((!structureItems || structureItems.length === 0) && feeCategoryId && amount) {
    structureItems = [
      {
        feeCategoryId,
        amount: Number(amount),
        frequency: 'QUARTERLY',
        isMandatory: true,
        discountAllowed: true,
      },
    ];
  }

  if (!structureItems || structureItems.length === 0) {
    res.status(400).json({
      error: {
        message: 'At least one fee head item is required to define a fee structure',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  // 1. Validate all fee categories exist and are ACTIVE
  const categoryIds = structureItems.map((it) => it.feeCategoryId);
  const categories = await prisma.feeCategory.findMany({
    where: { id: { in: categoryIds } },
  });

  if (categories.length !== categoryIds.length) {
    res.status(400).json({
      error: {
        message: 'One or more selected fee categories do not exist',
        code: 'BAD_REQUEST',
      },
    });
    return;
  }

  const inactiveCategory = categories.find((c) => !c.isActive);
  if (inactiveCategory) {
    res.status(400).json({
      error: {
        message: `Cannot assign inactive fee head '${inactiveCategory.name}' to a new fee structure. Please reactivate the category first.`,
        code: 'INACTIVE_FEE_CATEGORY',
      },
    });
    return;
  }

  // 2. Validate all amounts are > 0
  for (const it of structureItems) {
    if (!it.amount || Number(it.amount) <= 0) {
      res.status(400).json({
        error: {
          message: 'All fee head amounts must be greater than 0',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }
  }

  // 3. Prevent duplicate active structure for the same academicYear, gradeOrClass, studentCategory, section
  const existingActive = await prisma.feeStructure.findFirst({
    where: {
      academicYear: academicYear.trim(),
      gradeOrClass: gradeOrClass.trim(),
      studentCategory,
      section: section ? section.trim() : null,
      isActive: true,
      status: 'ACTIVE',
    },
  });

  if (existingActive) {
    res.status(409).json({
      error: {
        message: `An active fee structure already exists for ${gradeOrClass} (${studentCategory}) in academic year ${academicYear}`,
        code: 'CONFLICT',
      },
    });
    return;
  }

  // 4. Calculate total aggregate annual amount
  const totalAnnualAmount = structureItems.reduce((sum, it) => sum + Number(it.amount), 0);
  const numericTotalAmount = new Prisma.Decimal(totalAnnualAmount);

  // 5. Calculate default installments for quarterly and full-year plans
  const quarterAmount = new Prisma.Decimal(Math.floor((totalAnnualAmount / 4) * 100) / 100);
  const fourthQuarterAmount = new Prisma.Decimal(
    Math.round((totalAnnualAmount - Number(quarterAmount) * 3) * 100) / 100
  );

  const primaryCategoryId = structureItems[0].feeCategoryId;

  // 6. Create structure, items, and default payment plans in a single transaction
  const structure = await prisma.feeStructure.create({
    data: {
      name: name ? name.trim() : `${gradeOrClass} ${studentCategory} Structure`,
      academicYear: academicYear.trim(),
      gradeOrClass: gradeOrClass.trim(),
      section: section ? section.trim() : null,
      studentCategory,
      status: 'ACTIVE',
      version: 1,
      effectiveFrom: new Date(),
      amount: numericTotalAmount,
      currency,
      feeCategoryId: primaryCategoryId,
      createdById: req.user?.userId,
      items: {
        create: structureItems.map((it) => ({
          feeCategoryId: it.feeCategoryId,
          amount: new Prisma.Decimal(it.amount),
          frequency: it.frequency || 'QUARTERLY',
          isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
          discountAllowed: it.discountAllowed !== undefined ? it.discountAllowed : true,
        })),
      },
      paymentPlans: {
        create: [
          {
            frequency: 'FULL_YEAR',
            numberOfInstallments: 1,
            installments: {
              create: [
                {
                  installmentNumber: 1,
                  dueMonth: 'April',
                  dueDate: new Date(`${academicYear.split('-')[0]}-04-15`),
                  amount: numericTotalAmount,
                },
              ],
            },
          },
          {
            frequency: 'QUARTERLY',
            numberOfInstallments: 4,
            installments: {
              create: [
                {
                  installmentNumber: 1,
                  dueMonth: 'April (Q1)',
                  dueDate: new Date(`${academicYear.split('-')[0]}-04-15`),
                  amount: quarterAmount,
                },
                {
                  installmentNumber: 2,
                  dueMonth: 'July (Q2)',
                  dueDate: new Date(`${academicYear.split('-')[0]}-07-15`),
                  amount: quarterAmount,
                },
                {
                  installmentNumber: 3,
                  dueMonth: 'October (Q3)',
                  dueDate: new Date(`${academicYear.split('-')[0]}-10-15`),
                  amount: quarterAmount,
                },
                {
                  installmentNumber: 4,
                  dueMonth: 'January (Q4)',
                  dueDate: new Date(`${Number(academicYear.split('-')[0]) + 1}-01-15`),
                  amount: fourthQuarterAmount,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      feeCategory: true,
      items: { include: { feeCategory: true } },
      paymentPlans: { include: { installments: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    entityType: 'FEE_STRUCTURE',
    entityId: structure.id,
    action: 'CREATE',
    userId: req.user?.userId,
    details: {
      name: structure.name,
      academicYear: structure.academicYear,
      gradeOrClass: structure.gradeOrClass,
      studentCategory: structure.studentCategory,
      totalAmount: totalAnnualAmount,
      itemCount: structureItems.length,
    },
  });

  res.status(201).json({
    structure,
    feeStructure: structure,
    message: 'Fee structure defined successfully with fee items and default payment plans',
  });
}

export async function updateFeeStructure(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    name,
    section,
    studentCategory,
    status,
    isActive,
    items,
    amount,
    currency,
    effectiveFrom,
    effectiveTo,
  } = req.body;

  const existing = await prisma.feeStructure.findUnique({
    where: { id },
    include: {
      items: true,
      paymentPlans: { include: { installments: true } },
      _count: { select: { feeAssignments: true } },
    },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Fee structure not found', code: 'NOT_FOUND' } });
    return;
  }

  // Version Protection / Historical Financial Immutability Rule:
  // If the fee structure already has student assignments and financial items/amounts are modified,
  // we archive the existing version and create a new version (version + 1)
  const isChangingFinancials = items !== undefined || amount !== undefined;
  const hasHistoricalAssignments = existing._count.feeAssignments > 0;

  if (hasHistoricalAssignments && isChangingFinancials) {
    // 1. Calculate new amounts and items
    let newItems = items as Array<{
      feeCategoryId: string;
      amount: number;
      frequency?: string;
      isMandatory?: boolean;
      discountAllowed?: boolean;
    }>;

    if (!newItems || newItems.length === 0) {
      newItems = existing.items.map((it) => ({
        feeCategoryId: it.feeCategoryId,
        amount: Number(it.amount),
        frequency: it.frequency,
        isMandatory: it.isMandatory,
        discountAllowed: it.discountAllowed,
      }));
    }

    const totalAnnualAmount = newItems.reduce((sum, it) => sum + Number(it.amount), 0);
    const numericTotalAmount = new Prisma.Decimal(totalAnnualAmount);

    // 2. Mark existing structure as ARCHIVED / superseded
    await prisma.feeStructure.update({
      where: { id: existing.id },
      data: {
        status: 'ARCHIVED',
        effectiveTo: new Date(),
        updatedById: req.user?.userId,
      },
    });

    // 3. Create new Version
    const quarterAmount = new Prisma.Decimal(Math.floor((totalAnnualAmount / 4) * 100) / 100);
    const fourthQuarterAmount = new Prisma.Decimal(
      Math.round((totalAnnualAmount - Number(quarterAmount) * 3) * 100) / 100
    );

    const newVersionStructure = await prisma.feeStructure.create({
      data: {
        name: name ? name.trim() : existing.name,
        academicYear: existing.academicYear,
        gradeOrClass: existing.gradeOrClass,
        section: section !== undefined ? section : existing.section,
        studentCategory: studentCategory || existing.studentCategory,
        status: 'ACTIVE',
        version: existing.version + 1,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        amount: numericTotalAmount,
        currency: currency || existing.currency,
        feeCategoryId: newItems[0]?.feeCategoryId || existing.feeCategoryId,
        createdById: req.user?.userId,
        items: {
          create: newItems.map((it) => ({
            feeCategoryId: it.feeCategoryId,
            amount: new Prisma.Decimal(it.amount),
            frequency: it.frequency || 'QUARTERLY',
            isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
            discountAllowed: it.discountAllowed !== undefined ? it.discountAllowed : true,
          })),
        },
        paymentPlans: {
          create: [
            {
              frequency: 'FULL_YEAR',
              numberOfInstallments: 1,
              installments: {
                create: [
                  {
                    installmentNumber: 1,
                    dueMonth: 'April',
                    dueDate: new Date(`${existing.academicYear.split('-')[0]}-04-15`),
                    amount: numericTotalAmount,
                  },
                ],
              },
            },
            {
              frequency: 'QUARTERLY',
              numberOfInstallments: 4,
              installments: {
                create: [
                  {
                    installmentNumber: 1,
                    dueMonth: 'April (Q1)',
                    amount: quarterAmount,
                  },
                  {
                    installmentNumber: 2,
                    dueMonth: 'July (Q2)',
                    amount: quarterAmount,
                  },
                  {
                    installmentNumber: 3,
                    dueMonth: 'October (Q3)',
                    amount: quarterAmount,
                  },
                  {
                    installmentNumber: 4,
                    dueMonth: 'January (Q4)',
                    amount: fourthQuarterAmount,
                  },
                ],
              },
            },
          ],
        },
      },
      include: {
        feeCategory: true,
        items: { include: { feeCategory: true } },
        paymentPlans: { include: { installments: true } },
      },
    });

    await logAudit({
      entityType: 'FEE_STRUCTURE',
      entityId: newVersionStructure.id,
      action: 'UPDATE',
      userId: req.user?.userId,
      details: {
        versionCreated: newVersionStructure.version,
        previousVersionId: existing.id,
        reason: 'Financial amounts updated for active fee structure with history',
      },
    });

    res.json({
      structure: newVersionStructure,
      feeStructure: newVersionStructure,
      message: `Fee structure updated. Created Version ${newVersionStructure.version} to preserve historical financial records.`,
    });
    return;
  }

  // Non-destructive in-place update (when no assignments exist or non-financial fields change)
  const updateData: any = {
    updatedById: req.user?.userId,
  };
  if (name !== undefined) updateData.name = name.trim();
  if (section !== undefined) updateData.section = section ? section.trim() : null;
  if (studentCategory !== undefined) updateData.studentCategory = studentCategory;
  if (status !== undefined) updateData.status = status;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (currency !== undefined) updateData.currency = currency;
  if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
  if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

  if (items && Array.isArray(items) && items.length > 0) {
    // Replace items and recompute amount
    const totalAmount = items.reduce((sum: number, it: any) => sum + Number(it.amount), 0);
    updateData.amount = new Prisma.Decimal(totalAmount);
    updateData.feeCategoryId = items[0].feeCategoryId;

    // Delete old items and insert new
    await prisma.feeStructureItem.deleteMany({ where: { feeStructureId: id } });
    await prisma.feeStructureItem.createMany({
      data: items.map((it: any) => ({
        feeStructureId: id,
        feeCategoryId: it.feeCategoryId,
        amount: new Prisma.Decimal(it.amount),
        frequency: it.frequency || 'QUARTERLY',
        isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
        discountAllowed: it.discountAllowed !== undefined ? it.discountAllowed : true,
      })),
    });
  } else if (amount !== undefined) {
    updateData.amount = new Prisma.Decimal(amount);
  }

  const structure = await prisma.feeStructure.update({
    where: { id },
    data: updateData,
    include: {
      feeCategory: true,
      items: { include: { feeCategory: true } },
      paymentPlans: { include: { installments: true } },
    },
  });

  await logFinanceAudit({
    entityType: 'FEE_STRUCTURE',
    entityId: structure.id,
    action: 'UPDATE',
    userId: req.user?.userId,
    oldValue: {
      name: existing.name,
      amount: Number(existing.amount),
      status: existing.status,
      isActive: existing.isActive,
    },
    newValue: {
      name: structure.name,
      amount: Number(structure.amount),
      status: structure.status,
      isActive: structure.isActive,
    },
    reason: req.body.reason || req.body.remarks || 'Updated fee structure configuration',
  });

  res.json({ structure, feeStructure: structure, message: 'Fee structure updated successfully' });
}

export async function deleteFeeStructure(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.feeStructure.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { message: 'Fee structure not found', code: 'NOT_FOUND' } });
    return;
  }

  const targetStatus = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !existing.isActive;

  const structure = await prisma.feeStructure.update({
    where: { id },
    data: {
      isActive: targetStatus,
      status: targetStatus ? 'ACTIVE' : 'INACTIVE',
      updatedById: req.user?.userId,
    },
  });

  await logAudit({
    entityType: 'FEE_STRUCTURE',
    entityId: structure.id,
    action: 'STATUS_CHANGE',
    userId: req.user?.userId,
    details: { isActive: targetStatus, status: structure.status, previousStatus: existing.status },
  });

  res.json({
    structure,
    feeStructure: structure,
    message: `Fee structure '${structure.name}' ${targetStatus ? 'activated' : 'deactivated'} successfully`,
  });
}

// ==========================================
// 3. PAYMENT PLANS
// ==========================================

export async function listAllPaymentPlans(req: AuthRequest, res: Response): Promise<void> {
  const { search, feeStructureId, frequency, status, isActive, includeInactive, page, limit } = req.query as any;

  const where: Prisma.PaymentPlanWhereInput = {};

  if (feeStructureId) {
    where.feeStructureId = String(feeStructureId);
  }

  if (frequency) {
    where.frequency = String(frequency);
  }

  if (status) {
    where.status = String(status);
  }

  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  } else if (includeInactive !== 'true') {
    where.isActive = true;
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { name: { contains: term } },
      { feeStructure: { name: { contains: term } } },
      { feeStructure: { gradeOrClass: { contains: term } } },
      { feeStructure: { academicYear: { contains: term } } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [paymentPlans, total] = await Promise.all([
    prisma.paymentPlan.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ feeStructure: { academicYear: 'desc' } }, { frequency: 'asc' }, { createdAt: 'desc' }],
      include: {
        feeStructure: {
          include: {
            items: { include: { feeCategory: true } },
          },
        },
        installments: {
          orderBy: { sequence: 'asc' },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
        _count: { select: { feeAssignments: true } },
      },
    }),
    prisma.paymentPlan.count({ where }),
  ]);

  res.json({
    paymentPlans,
    plans: paymentPlans, // alias
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function getPaymentPlanById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const plan = await prisma.paymentPlan.findUnique({
    where: { id },
    include: {
      feeStructure: {
        include: {
          items: { include: { feeCategory: true } },
        },
      },
      installments: {
        orderBy: { sequence: 'asc' },
      },
      createdBy: { select: { id: true, name: true, role: true } },
      updatedBy: { select: { id: true, name: true, role: true } },
      _count: { select: { feeAssignments: true } },
    },
  });

  if (!plan) {
    res.status(404).json({ error: { message: 'Payment plan not found', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ plan, paymentPlan: plan });
}

export async function getPaymentPlansByStructure(req: AuthRequest, res: Response): Promise<void> {
  const { feeStructureId } = req.params;

  const plans = await prisma.paymentPlan.findMany({
    where: { feeStructureId, isActive: true },
    include: {
      feeStructure: {
        include: {
          items: { include: { feeCategory: true } },
        },
      },
      installments: { orderBy: { sequence: 'asc' } },
      _count: { select: { feeAssignments: true } },
    },
  });

  res.json({ plans, paymentPlans: plans });
}

export async function createPaymentPlan(req: AuthRequest, res: Response): Promise<void> {
  const feeStructureId = req.params.feeStructureId || req.body.feeStructureId;
  const { name, frequency, installments, status } = req.body;

  if (!feeStructureId) {
    res.status(400).json({ error: { message: 'Fee structure ID is required', code: 'VALIDATION_ERROR' } });
    return;
  }

  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id: feeStructureId },
    include: { items: { include: { feeCategory: true } } },
  });

  if (!feeStructure) {
    res.status(404).json({ error: { message: 'Fee structure not found', code: 'NOT_FOUND' } });
    return;
  }

  const expectedInstallments = frequency === 'FULL_YEAR' ? 1 : 4;
  const totalStructureAmount = Number(feeStructure.amount);

  let installmentData: any[] = [];

  if (installments && Array.isArray(installments) && installments.length > 0) {
    if (frequency === 'QUARTERLY' && installments.length !== 4) {
      res.status(400).json({
        error: {
          message: `Quarterly payment plan must have exactly 4 installments (Q1, Q2, Q3, Q4). Received ${installments.length}.`,
          code: 'INVALID_INSTALLMENT_COUNT',
        },
      });
      return;
    }

    if (frequency === 'FULL_YEAR' && installments.length !== 1) {
      res.status(400).json({
        error: {
          message: `Full-Year payment plan must have exactly 1 installment. Received ${installments.length}.`,
          code: 'INVALID_INSTALLMENT_COUNT',
        },
      });
      return;
    }

    const defaultQuarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    const defaultDueMonths = ['April–June (Q1)', 'July–September (Q2)', 'October–December (Q3)', 'January–March (Q4)'];
    const defaultDueRules = [
      'Due on 15th April (Session Start)',
      'Due on 15th July',
      'Due on 15th October',
      'Due on 15th January',
    ];

    let sumInstallments = 0;
    installmentData = installments.map((inst: any, idx: number) => {
      const amt = Number(inst.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error(`Installment ${idx + 1} amount must be greater than 0`);
      }
      sumInstallments += amt;
      const seq = inst.sequence || inst.installmentNumber || idx + 1;
      return {
        sequence: seq,
        installmentNumber: seq,
        quarter: frequency === 'QUARTERLY' ? inst.quarter || defaultQuarterNames[idx] : null,
        dueMonth: inst.dueMonth || (frequency === 'QUARTERLY' ? defaultDueMonths[idx] : 'Full Year (Annual)'),
        dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
        dueDateRule: inst.dueDateRule || (frequency === 'QUARTERLY' ? defaultDueRules[idx] : 'Payable upfront on admission'),
        amount: new Prisma.Decimal(amt),
        status: inst.status || 'CONFIGURED',
      };
    });

    // Schedule consistency validation
    if (Math.abs(sumInstallments - totalStructureAmount) > 0.05) {
      res.status(400).json({
        error: {
          message: `Installment schedule sum (₹${sumInstallments.toLocaleString()}) does not match Fee Structure total amount (₹${totalStructureAmount.toLocaleString()}).`,
          code: 'SCHEDULE_AMOUNT_MISMATCH',
          expectedTotal: totalStructureAmount,
          configuredTotal: sumInstallments,
        },
      });
      return;
    }
  } else {
    // Generate default split based on head breakdown
    if (frequency === 'FULL_YEAR') {
      installmentData = [
        {
          sequence: 1,
          installmentNumber: 1,
          quarter: null,
          dueMonth: 'Full Year (Annual)',
          dueDate: new Date('2026-04-15'),
          dueDateRule: 'Payable upfront on or before 15th April',
          amount: new Prisma.Decimal(totalStructureAmount),
          status: 'CONFIGURED',
        },
      ];
    } else {
      // Calculate head-aware quarterly breakdown
      let q1 = 0;
      let q2 = 0;
      let q3 = 0;
      let q4 = 0;

      if (feeStructure.items && feeStructure.items.length > 0) {
        for (const item of feeStructure.items) {
          const itemAmt = Number(item.amount);
          if (item.frequency === 'FULL_YEAR' || item.frequency === 'ONE_TIME') {
            // Annual charges/one-time fees payable in Q1 by standard school convention
            q1 += itemAmt;
          } else {
            // Recurring quarterly fee split equally across 4 quarters
            const split = Math.floor((itemAmt / 4) * 100) / 100;
            const remainder = Math.round((itemAmt - split * 3) * 100) / 100;
            q1 += split;
            q2 += split;
            q3 += split;
            q4 += remainder;
          }
        }
      } else {
        const q = Math.floor((totalStructureAmount / 4) * 100) / 100;
        const lastQ = Math.round((totalStructureAmount - q * 3) * 100) / 100;
        q1 = q;
        q2 = q;
        q3 = q;
        q4 = lastQ;
      }

      installmentData = [
        {
          sequence: 1,
          installmentNumber: 1,
          quarter: 'Q1',
          dueMonth: 'April–June (Q1)',
          dueDate: new Date('2026-04-15'),
          dueDateRule: 'Due on 15th April (Session Start)',
          amount: new Prisma.Decimal(Math.round(q1 * 100) / 100),
          status: 'CONFIGURED',
        },
        {
          sequence: 2,
          installmentNumber: 2,
          quarter: 'Q2',
          dueMonth: 'July–September (Q2)',
          dueDate: new Date('2026-07-15'),
          dueDateRule: 'Due on 15th July',
          amount: new Prisma.Decimal(Math.round(q2 * 100) / 100),
          status: 'CONFIGURED',
        },
        {
          sequence: 3,
          installmentNumber: 3,
          quarter: 'Q3',
          dueMonth: 'October–December (Q3)',
          dueDate: new Date('2026-10-15'),
          dueDateRule: 'Due on 15th October',
          amount: new Prisma.Decimal(Math.round(q3 * 100) / 100),
          status: 'CONFIGURED',
        },
        {
          sequence: 4,
          installmentNumber: 4,
          quarter: 'Q4',
          dueMonth: 'January–March (Q4)',
          dueDate: new Date('2027-01-15'),
          dueDateRule: 'Due on 15th January',
          amount: new Prisma.Decimal(Math.round(q4 * 100) / 100),
          status: 'CONFIGURED',
        },
      ];
    }
  }

  const defaultPlanName =
    name || (frequency === 'FULL_YEAR' ? 'Full-Year Upfront Plan' : 'Quarterly Standard Plan');

  const plan = await prisma.paymentPlan.create({
    data: {
      feeStructureId,
      name: defaultPlanName,
      type: frequency,
      frequency,
      installmentCount: expectedInstallments,
      numberOfInstallments: expectedInstallments,
      status: status || 'ACTIVE',
      isActive: status !== 'INACTIVE',
      createdById: req.user?.userId,
      installments: {
        create: installmentData,
      },
    },
    include: {
      feeStructure: { include: { items: { include: { feeCategory: true } } } },
      installments: { orderBy: { sequence: 'asc' } },
    },
  });

  await logAudit({
    entityType: 'PAYMENT_PLAN',
    entityId: plan.id,
    action: 'CREATE',
    userId: req.user?.userId,
    details: {
      feeStructureId,
      planName: plan.name,
      frequency,
      installmentsCount: installmentData.length,
      totalAmount: totalStructureAmount,
    },
  });

  res.status(201).json({ plan, paymentPlan: plan, message: 'Payment plan configured successfully' });
}

export async function updatePaymentPlan(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, status, isActive, installments } = req.body;

  const existing = await prisma.paymentPlan.findUnique({
    where: { id },
    include: { feeStructure: true, installments: true },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Payment plan not found', code: 'NOT_FOUND' } });
    return;
  }

  if (installments && Array.isArray(installments)) {
    const totalStructureAmount = Number(existing.feeStructure.amount);
    const expectedCount = existing.frequency === 'FULL_YEAR' ? 1 : 4;

    if (installments.length !== expectedCount) {
      res.status(400).json({
        error: {
          message: `${existing.frequency} payment plan must have exactly ${expectedCount} installment(s). Received ${installments.length}.`,
          code: 'INVALID_INSTALLMENT_COUNT',
        },
      });
      return;
    }

    const defaultQuarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    let sumInstallments = 0;
    const formattedInstallments = installments.map((inst: any, idx: number) => {
      const amt = Number(inst.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error(`Installment ${idx + 1} amount must be greater than 0`);
      }
      sumInstallments += amt;
      const seq = inst.sequence || inst.installmentNumber || idx + 1;
      return {
        paymentPlanId: id,
        sequence: seq,
        installmentNumber: seq,
        quarter: existing.frequency === 'QUARTERLY' ? inst.quarter || defaultQuarterNames[idx] : null,
        dueMonth: inst.dueMonth || (existing.frequency === 'QUARTERLY' ? `Quarter ${idx + 1}` : 'Full Year'),
        dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
        dueDateRule: inst.dueDateRule || null,
        amount: new Prisma.Decimal(amt),
        status: inst.status || 'CONFIGURED',
      };
    });

    if (Math.abs(sumInstallments - totalStructureAmount) > 0.05) {
      res.status(400).json({
        error: {
          message: `Installment schedule sum (₹${sumInstallments.toLocaleString()}) does not match Fee Structure total amount (₹${totalStructureAmount.toLocaleString()}).`,
          code: 'SCHEDULE_AMOUNT_MISMATCH',
          expectedTotal: totalStructureAmount,
          configuredTotal: sumInstallments,
        },
      });
      return;
    }

    // Replace installments with verified schedule
    await prisma.paymentPlanInstallment.deleteMany({ where: { paymentPlanId: id } });
    await prisma.paymentPlanInstallment.createMany({
      data: formattedInstallments,
    });
  }

  const updateData: any = {
    updatedById: req.user?.userId,
  };
  if (name !== undefined) updateData.name = name.trim();
  if (status !== undefined) {
    updateData.status = status;
    updateData.isActive = status === 'ACTIVE';
  }
  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
    updateData.status = isActive ? 'ACTIVE' : 'INACTIVE';
  }

  const plan = await prisma.paymentPlan.update({
    where: { id },
    data: updateData,
    include: {
      feeStructure: { include: { items: { include: { feeCategory: true } } } },
      installments: { orderBy: { sequence: 'asc' } },
      createdBy: { select: { id: true, name: true, role: true } },
      updatedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await logAudit({
    entityType: 'PAYMENT_PLAN',
    entityId: plan.id,
    action: 'UPDATE',
    userId: req.user?.userId,
    details: { name: plan.name, status: plan.status, isActive: plan.isActive, installmentsUpdated: Boolean(installments) },
  });

  res.json({ plan, paymentPlan: plan, message: 'Payment plan updated successfully' });
}

export async function deletePaymentPlan(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.paymentPlan.findUnique({
    where: { id },
    include: { _count: { select: { feeAssignments: true } } },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Payment plan not found', code: 'NOT_FOUND' } });
    return;
  }

  const targetStatus = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !existing.isActive;

  const plan = await prisma.paymentPlan.update({
    where: { id },
    data: {
      isActive: targetStatus,
      status: targetStatus ? 'ACTIVE' : 'INACTIVE',
      updatedById: req.user?.userId,
    },
  });

  await logAudit({
    entityType: 'PAYMENT_PLAN',
    entityId: plan.id,
    action: 'STATUS_CHANGE',
    userId: req.user?.userId,
    details: { isActive: targetStatus, status: plan.status, previousStatus: existing.status },
  });

  res.json({
    plan,
    paymentPlan: plan,
    message: `Payment plan '${plan.name}' ${targetStatus ? 'activated' : 'deactivated'} successfully`,
  });
}

export async function calculateConfiguredSchedule(req: AuthRequest, res: Response): Promise<void> {
  const { feeStructureId } = req.params;
  const { frequency = 'QUARTERLY', headAllocations } = req.body;

  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id: feeStructureId },
    include: { items: { include: { feeCategory: true } } },
  });

  if (!feeStructure) {
    res.status(404).json({ error: { message: 'Fee structure not found', code: 'NOT_FOUND' } });
    return;
  }

  const totalAmount = Number(feeStructure.amount);

  if (frequency === 'FULL_YEAR') {
    res.json({
      frequency: 'FULL_YEAR',
      totalAmount,
      installments: [
        {
          sequence: 1,
          quarter: null,
          dueMonth: 'Full Year (Annual)',
          dueDateRule: 'Payable upfront on admission or session commencement',
          amount: totalAmount,
        },
      ],
    });
    return;
  }

  // Quarterly calculation
  let q1 = 0;
  let q2 = 0;
  let q3 = 0;
  let q4 = 0;

  if (headAllocations && Array.isArray(headAllocations) && headAllocations.length > 0) {
    // Custom allocation per head
    const allocMap = new Map<string, any>(headAllocations.map((a: any) => [a.feeCategoryId, a]));

    for (const item of feeStructure.items) {
      const custom = allocMap.get(item.feeCategoryId);
      if (custom) {
        q1 += Number(custom.q1Amount || 0);
        q2 += Number(custom.q2Amount || 0);
        q3 += Number(custom.q3Amount || 0);
        q4 += Number(custom.q4Amount || 0);
      } else {
        const itemAmt = Number(item.amount);
        const split = Math.floor((itemAmt / 4) * 100) / 100;
        const remainder = Math.round((itemAmt - split * 3) * 100) / 100;
        q1 += split;
        q2 += split;
        q3 += split;
        q4 += remainder;
      }
    }
  } else {
    // Intelligent standard school default:
    // Annual/one-time charges in Q1, Recurring tuition split into 4 quarters
    for (const item of feeStructure.items) {
      const itemAmt = Number(item.amount);
      if (item.frequency === 'FULL_YEAR' || item.frequency === 'ONE_TIME') {
        q1 += itemAmt;
      } else {
        const split = Math.floor((itemAmt / 4) * 100) / 100;
        const remainder = Math.round((itemAmt - split * 3) * 100) / 100;
        q1 += split;
        q2 += split;
        q3 += split;
        q4 += remainder;
      }
    }
  }

  res.json({
    frequency: 'QUARTERLY',
    totalAmount,
    sumConfigured: Math.round((q1 + q2 + q3 + q4) * 100) / 100,
    isConsistent: Math.abs(q1 + q2 + q3 + q4 - totalAmount) < 0.05,
    installments: [
      {
        sequence: 1,
        quarter: 'Q1',
        dueMonth: 'April–June (Q1)',
        dueDateRule: 'Due on 15th April (Session Start)',
        amount: Math.round(q1 * 100) / 100,
      },
      {
        sequence: 2,
        quarter: 'Q2',
        dueMonth: 'July–September (Q2)',
        dueDateRule: 'Due on 15th July',
        amount: Math.round(q2 * 100) / 100,
      },
      {
        sequence: 3,
        quarter: 'Q3',
        dueMonth: 'October–December (Q3)',
        dueDateRule: 'Due on 15th October',
        amount: Math.round(q3 * 100) / 100,
      },
      {
        sequence: 4,
        quarter: 'Q4',
        dueMonth: 'January–March (Q4)',
        dueDateRule: 'Due on 15th January',
        amount: Math.round(q4 * 100) / 100,
      },
    ],
  });
}

// ==========================================
// 4. DISCOUNT RULES & CONCESSIONS
// ==========================================

export async function listDiscountRules(req: AuthRequest, res: Response): Promise<void> {
  const {
    search,
    discountType,
    paymentOption,
    eligibilityType,
    approvalStatus,
    status,
    isActive,
    includeInactive,
    page,
    limit,
  } = req.query as any;

  const where: Prisma.DiscountRuleWhereInput = {};

  if (discountType) {
    where.discountType = String(discountType);
  }

  if (paymentOption) {
    where.paymentOption = String(paymentOption);
  }

  if (eligibilityType) {
    where.eligibilityType = String(eligibilityType);
  }

  if (approvalStatus) {
    where.approvalStatus = String(approvalStatus);
  }

  if (status) {
    where.status = String(status);
  }

  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  } else if (includeInactive !== 'true') {
    where.isActive = true;
  }

  if (search && String(search).trim()) {
    const term = String(search).trim();
    where.OR = [
      { name: { contains: term } },
      { code: { contains: term } },
      { description: { contains: term } },
      { eligibilityCriteria: { contains: term } },
    ];
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [discountRules, total] = await Promise.all([
    prisma.discountRule.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        feeHeads: {
          include: { feeCategory: true },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        _count: { select: { studentAssignments: true } },
      },
    }),
    prisma.discountRule.count({ where }),
  ]);

  res.json({
    discountRules,
    rules: discountRules, // alias
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function getDiscountRuleById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const discountRule = await prisma.discountRule.findUnique({
    where: { id },
    include: {
      feeHeads: {
        include: { feeCategory: true },
      },
      studentAssignments: {
        include: { student: true, approvedBy: true },
      },
      createdBy: { select: { id: true, name: true, role: true } },
      updatedBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true, role: true } },
      _count: { select: { studentAssignments: true } },
    },
  });

  if (!discountRule) {
    res.status(404).json({ error: { message: 'Discount rule not found', code: 'NOT_FOUND' } });
    return;
  }

  res.json({ discountRule, rule: discountRule });
}

export async function createDiscountRule(req: AuthRequest, res: Response): Promise<void> {
  const {
    name,
    code,
    description,
    discountType = 'PERCENTAGE',
    discountValue,
    value,
    paymentOption = 'ANY',
    eligibilityType = 'ALL',
    eligibilityCriteria,
    applicableClasses,
    applicableStudentCategories,
    applicableFeeCategoryIds,
    validFrom,
    validUntil,
    validTo,
    minimumAmount,
    maximumDiscount,
    approvalRequired = false,
    approvalStatus = 'APPROVED',
    status = 'ACTIVE',
    active = true,
  } = req.body;

  const rawVal = discountValue !== undefined ? discountValue : value;
  const numValue = Number(rawVal);

  // Generate unique code if not provided
  const generatedCode =
    code && String(code).trim()
      ? String(code).trim().toUpperCase()
      : name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 20) + `_${Math.floor(1000 + Math.random() * 9000)}`;

  // Check code uniqueness
  const existingCode = await prisma.discountRule.findUnique({
    where: { code: generatedCode },
  });

  if (existingCode) {
    res.status(409).json({
      error: {
        message: `Discount code '${generatedCode}' is already in use`,
        code: 'CONFLICT',
      },
    });
    return;
  }

  // Handle approval logic
  let initialApprovalStatus = approvalStatus;
  let initialActive = active;
  let initialStatus = status;

  if (approvalRequired && req.user?.role !== 'SUPER_ADMIN') {
    initialApprovalStatus = 'PENDING';
    initialActive = false;
    initialStatus = 'PENDING';
  }

  const effectiveValidFrom = validFrom ? new Date(validFrom) : new Date();
  const effectiveValidUntil = validUntil ? new Date(validUntil) : validTo ? new Date(validTo) : null;

  const categoriesJson = applicableFeeCategoryIds && Array.isArray(applicableFeeCategoryIds) && applicableFeeCategoryIds.length > 0
    ? JSON.stringify(applicableFeeCategoryIds)
    : null;

  const classesJson = applicableClasses && Array.isArray(applicableClasses) && applicableClasses.length > 0
    ? JSON.stringify(applicableClasses)
    : null;

  const studentCategoriesJson = applicableStudentCategories && Array.isArray(applicableStudentCategories) && applicableStudentCategories.length > 0
    ? JSON.stringify(applicableStudentCategories)
    : null;

  const rule = await prisma.discountRule.create({
    data: {
      name: name.trim(),
      code: generatedCode,
      description: description ? description.trim() : null,
      discountType,
      discountValue: new Prisma.Decimal(numValue),
      value: new Prisma.Decimal(numValue),
      paymentOption,
      eligibilityType,
      eligibilityCriteria: eligibilityCriteria ? eligibilityCriteria.trim() : null,
      applicableClasses: classesJson,
      applicableStudentCategories: studentCategoriesJson,
      applicableFeeCategoryIds: categoriesJson,
      validFrom: effectiveValidFrom,
      validUntil: effectiveValidUntil,
      validTo: effectiveValidUntil,
      minimumAmount: minimumAmount ? new Prisma.Decimal(minimumAmount) : null,
      maximumDiscount: maximumDiscount ? new Prisma.Decimal(maximumDiscount) : null,
      approvalRequired: Boolean(approvalRequired),
      approvalStatus: initialApprovalStatus,
      approvedById: initialApprovalStatus === 'APPROVED' ? req.user?.userId : null,
      status: initialStatus,
      active: initialActive,
      isActive: initialActive,
      createdById: req.user?.userId,
      feeHeads: applicableFeeCategoryIds && Array.isArray(applicableFeeCategoryIds)
        ? {
            create: applicableFeeCategoryIds.map((catId: string) => ({
              feeCategoryId: catId,
            })),
          }
        : undefined,
    },
    include: {
      feeHeads: { include: { feeCategory: true } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
  });

  await logAudit({
    entityType: 'DISCOUNT_RULE',
    entityId: rule.id,
    action: 'CREATE',
    userId: req.user?.userId,
    details: {
      name: rule.name,
      code: rule.code,
      discountType: rule.discountType,
      discountValue: numValue,
      paymentOption: rule.paymentOption,
      eligibilityType: rule.eligibilityType,
      approvalRequired: rule.approvalRequired,
      approvalStatus: rule.approvalStatus,
    },
  });

  res.status(201).json({
    discountRule: rule,
    rule,
    message: `Discount rule '${rule.name}' created successfully`,
  });
}

export async function updateDiscountRule(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    name,
    code,
    description,
    discountType,
    discountValue,
    value,
    paymentOption,
    eligibilityType,
    eligibilityCriteria,
    applicableClasses,
    applicableStudentCategories,
    applicableFeeCategoryIds,
    validFrom,
    validUntil,
    validTo,
    minimumAmount,
    maximumDiscount,
    approvalRequired,
    approvalStatus,
    status,
    active,
    isActive,
  } = req.body;

  const existing = await prisma.discountRule.findUnique({
    where: { id },
    include: { feeHeads: true },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Discount rule not found', code: 'NOT_FOUND' } });
    return;
  }

  if (code && code.trim().toUpperCase() !== existing.code) {
    const existingCode = await prisma.discountRule.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existingCode) {
      res.status(409).json({
        error: {
          message: `Discount code '${code.trim().toUpperCase()}' is already in use`,
          code: 'CONFLICT',
        },
      });
      return;
    }
  }

  const updateData: any = {
    updatedById: req.user?.userId,
  };

  if (name !== undefined) updateData.name = name.trim();
  if (code !== undefined) updateData.code = code.trim().toUpperCase();
  if (description !== undefined) updateData.description = description ? description.trim() : null;
  if (discountType !== undefined) updateData.discountType = discountType;

  const rawVal = discountValue !== undefined ? discountValue : value;
  if (rawVal !== undefined) {
    updateData.discountValue = new Prisma.Decimal(Number(rawVal));
    updateData.value = new Prisma.Decimal(Number(rawVal));
  }

  if (paymentOption !== undefined) updateData.paymentOption = paymentOption;
  if (eligibilityType !== undefined) updateData.eligibilityType = eligibilityType;
  if (eligibilityCriteria !== undefined) updateData.eligibilityCriteria = eligibilityCriteria ? eligibilityCriteria.trim() : null;

  if (applicableClasses !== undefined) {
    updateData.applicableClasses = applicableClasses && Array.isArray(applicableClasses) && applicableClasses.length > 0
      ? JSON.stringify(applicableClasses)
      : null;
  }

  if (applicableStudentCategories !== undefined) {
    updateData.applicableStudentCategories = applicableStudentCategories && Array.isArray(applicableStudentCategories) && applicableStudentCategories.length > 0
      ? JSON.stringify(applicableStudentCategories)
      : null;
  }

  if (applicableFeeCategoryIds !== undefined) {
    updateData.applicableFeeCategoryIds = applicableFeeCategoryIds && Array.isArray(applicableFeeCategoryIds) && applicableFeeCategoryIds.length > 0
      ? JSON.stringify(applicableFeeCategoryIds)
      : null;

    // Replace DiscountFeeHeads
    await prisma.discountFeeHead.deleteMany({ where: { discountRuleId: id } });
    if (Array.isArray(applicableFeeCategoryIds) && applicableFeeCategoryIds.length > 0) {
      await prisma.discountFeeHead.createMany({
        data: applicableFeeCategoryIds.map((catId: string) => ({
          discountRuleId: id,
          feeCategoryId: catId,
        })),
      });
    }
  }

  if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : new Date();
  if (validUntil !== undefined || validTo !== undefined) {
    const end = validUntil || validTo;
    updateData.validUntil = end ? new Date(end) : null;
    updateData.validTo = end ? new Date(end) : null;
  }

  if (minimumAmount !== undefined) {
    updateData.minimumAmount = minimumAmount ? new Prisma.Decimal(minimumAmount) : null;
  }

  if (maximumDiscount !== undefined) {
    updateData.maximumDiscount = maximumDiscount ? new Prisma.Decimal(maximumDiscount) : null;
  }

  if (approvalRequired !== undefined) updateData.approvalRequired = Boolean(approvalRequired);
  if (approvalStatus !== undefined) {
    updateData.approvalStatus = approvalStatus;
    if (approvalStatus === 'APPROVED') {
      updateData.approvedById = req.user?.userId;
    }
  }

  if (status !== undefined) {
    updateData.status = status;
    updateData.active = status === 'ACTIVE';
    updateData.isActive = status === 'ACTIVE';
  }

  if (active !== undefined || isActive !== undefined) {
    const flag = active !== undefined ? Boolean(active) : Boolean(isActive);
    updateData.active = flag;
    updateData.isActive = flag;
    if (!status) updateData.status = flag ? 'ACTIVE' : 'INACTIVE';
  }

  const rule = await prisma.discountRule.update({
    where: { id },
    data: updateData,
    include: {
      feeHeads: { include: { feeCategory: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      updatedBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await logAudit({
    entityType: 'DISCOUNT_RULE',
    entityId: rule.id,
    action: 'UPDATE',
    userId: req.user?.userId,
    details: {
      name: rule.name,
      code: rule.code,
      discountType: rule.discountType,
      discountValue: Number(rule.discountValue),
      approvalStatus: rule.approvalStatus,
      status: rule.status,
    },
  });

  res.json({
    discountRule: rule,
    rule,
    message: `Discount rule '${rule.name}' updated successfully`,
  });
}

export async function approveDiscountRule(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { status = 'APPROVED', remarks } = req.body;

  const existing = await prisma.discountRule.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { message: 'Discount rule not found', code: 'NOT_FOUND' } });
    return;
  }

  const isApproved = status === 'APPROVED';

  const rule = await prisma.discountRule.update({
    where: { id },
    data: {
      approvalStatus: isApproved ? 'APPROVED' : 'REJECTED',
      approvedById: req.user?.userId,
      status: isApproved ? 'ACTIVE' : 'REJECTED',
      active: isApproved,
      isActive: isApproved,
      updatedById: req.user?.userId,
    },
    include: {
      approvedBy: { select: { id: true, name: true, role: true } },
      feeHeads: { include: { feeCategory: true } },
    },
  });

  await logAudit({
    entityType: 'DISCOUNT_RULE',
    entityId: rule.id,
    action: isApproved ? 'APPROVE' : 'REJECT',
    userId: req.user?.userId,
    details: {
      name: rule.name,
      code: rule.code,
      decision: isApproved ? 'APPROVED' : 'REJECTED',
      remarks,
    },
  });

  res.json({
    discountRule: rule,
    rule,
    message: `Discount rule '${rule.name}' has been ${isApproved ? 'approved and activated' : 'rejected'}.`,
  });
}

export async function deleteDiscountRule(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.discountRule.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { message: 'Discount rule not found', code: 'NOT_FOUND' } });
    return;
  }

  const targetStatus = req.body?.isActive !== undefined
    ? Boolean(req.body.isActive)
    : req.body?.active !== undefined
    ? Boolean(req.body.active)
    : !existing.isActive;

  const rule = await prisma.discountRule.update({
    where: { id },
    data: {
      isActive: targetStatus,
      active: targetStatus,
      status: targetStatus ? 'ACTIVE' : 'INACTIVE',
      updatedById: req.user?.userId,
    },
  });

  await logAudit({
    entityType: 'DISCOUNT_RULE',
    entityId: rule.id,
    action: 'STATUS_CHANGE',
    userId: req.user?.userId,
    details: { isActive: targetStatus, status: rule.status, previousStatus: existing.status },
  });

  res.json({
    discountRule: rule,
    rule,
    message: `Discount rule '${rule.name}' ${targetStatus ? 'activated' : 'deactivated'} successfully`,
  });
}

// ==========================================
// 5. STUDENT DISCOUNT ASSIGNMENTS
// ==========================================

export async function assignStudentDiscount(req: AuthRequest, res: Response): Promise<void> {
  const { studentId } = req.params;
  const { discountRuleId, remarks, status } = req.body;

  // 1. Verify student exists
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    res.status(404).json({ error: { message: 'Student not found', code: 'NOT_FOUND' } });
    return;
  }

  // 2. Verify discount rule exists
  const discountRule = await prisma.discountRule.findUnique({ where: { id: discountRuleId } });
  if (!discountRule) {
    res.status(404).json({ error: { message: 'Discount rule not found', code: 'NOT_FOUND' } });
    return;
  }

  // 3. Check for existing assignment
  const existing = await prisma.studentDiscountAssignment.findUnique({
    where: {
      studentId_discountRuleId: {
        studentId,
        discountRuleId,
      },
    },
  });

  if (existing) {
    res.status(409).json({
      error: {
        message: `Student already has an assignment for '${discountRule.name}' with status: ${existing.status}`,
        code: 'CONFLICT',
      },
    });
    return;
  }

  // Default status: If caller is Finance or SuperAdmin and supplied status, use it; else default to APPROVED or PENDING
  const assignedStatus = status || (['FINANCE', 'SUPER_ADMIN'].includes(req.user?.role || '') ? 'APPROVED' : 'PENDING');
  const isApproved = assignedStatus === 'APPROVED';

  const assignment = await prisma.studentDiscountAssignment.create({
    data: {
      studentId,
      discountRuleId,
      remarks,
      status: assignedStatus,
      approvedById: isApproved ? req.user?.userId : null,
      approvalDate: isApproved ? new Date() : null,
    },
    include: {
      discountRule: true,
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    entityType: 'STUDENT_DISCOUNT',
    entityId: assignment.id,
    action: 'CREATE',
    userId: req.user?.userId,
    details: { studentId, discountRuleId, status: assignedStatus, remarks },
  });

  res.status(201).json({ assignment, message: 'Student discount assigned successfully' });
}

export async function listStudentDiscounts(req: AuthRequest, res: Response): Promise<void> {
  const { studentId } = req.params;

  const assignments = await prisma.studentDiscountAssignment.findMany({
    where: { studentId },
    include: {
      discountRule: true,
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ assignments });
}

export async function updateStudentDiscount(req: AuthRequest, res: Response): Promise<void> {
  const { studentId, assignmentId } = req.params;
  const { status, remarks } = req.body;

  const existing = await prisma.studentDiscountAssignment.findFirst({
    where: { id: assignmentId, studentId },
  });

  if (!existing) {
    res.status(404).json({ error: { message: 'Discount assignment not found', code: 'NOT_FOUND' } });
    return;
  }

  const isApproval = status === 'APPROVED';
  const assignment = await prisma.studentDiscountAssignment.update({
    where: { id: assignmentId },
    data: {
      status,
      remarks: remarks !== undefined ? remarks : existing.remarks,
      approvedById: isApproval ? req.user?.userId : existing.approvedById,
      approvalDate: isApproval ? new Date() : existing.approvalDate,
    },
    include: {
      discountRule: true,
      approvedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit({
    entityType: 'STUDENT_DISCOUNT',
    entityId: assignment.id,
    action: isApproval ? 'APPROVE' : 'UPDATE',
    userId: req.user?.userId,
    details: { status, remarks },
  });

  res.json({ assignment, message: `Discount assignment status updated to ${status}` });
}

// ==========================================
// 6. FEE ASSIGNMENT (CALCULATION & PERSISTENCE)
// ==========================================

export async function calculateFeePreview(req: AuthRequest, res: Response): Promise<void> {
  const { studentId, academicYear, paymentOption, quarter, feeStructureId, paymentPlanId } = req.body;

  try {
    const result = await calculateStudentFee({
      studentId,
      academicYear,
      paymentOption,
      quarter,
      feeStructureId,
      paymentPlanId,
    });
    res.json({
      calculation: result,
      studentId: result.studentId,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      academicYear: result.academicYear,
      gradeOrClass: result.gradeOrClass,
      studentCategory: result.studentCategory,
      paymentOption: result.paymentOption,
      grossAmount: result.grossAmount,
      originalAmount: result.grossAmount,
      discountAmount: result.discountAmount,
      discountApplied: result.discountAmount,
      finalPayable: result.finalPayable,
      finalPayableAmount: result.finalPayable,
      currency: result.currency,
      items: result.items,
      quarters: result.quarters,
      installments: result.installments,
      appliedDiscounts: result.appliedDiscounts,
      feeStructure: result.feeStructure,
      paymentPlan: result.paymentPlan,
    });
  } catch (err: any) {
    res.status(400).json({ error: { message: err.message, code: 'CALCULATION_ERROR' } });
  }
}

export async function createFeeAssignment(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.params.studentId || req.body.studentId;
  const { feeStructureId, paymentPlanId, paymentOption = 'FULL_YEAR', academicYear, status = 'ACTIVE' } = req.body;

  if (!studentId) {
    res.status(400).json({ error: { message: 'Student ID is required', code: 'VALIDATION_ERROR' } });
    return;
  }

  try {
    // 1. Run deterministic 16-step backend calculation
    const calcResult = await calculateStudentFee({
      studentId,
      academicYear,
      paymentOption,
      feeStructureId,
      paymentPlanId,
    });

    const targetStructureId = feeStructureId || calcResult.feeStructure.id;
    const targetPlanId = paymentPlanId || calcResult.paymentPlan.id;

    // 2. Mark any previous ACTIVE fee assignments for this student in the same academic year as SUPERSEDED
    await prisma.feeAssignment.updateMany({
      where: {
        studentId,
        academicYear: calcResult.academicYear,
        status: 'ACTIVE',
      },
      data: { status: 'SUPERSEDED' },
    });

    // 3. Persist calculation snapshot
    const feeAssignment = await prisma.feeAssignment.create({
      data: {
        studentId,
        academicYear: calcResult.academicYear,
        feeStructureId: targetStructureId,
        paymentPlanId: targetPlanId,
        paymentOption: calcResult.paymentOption,
        originalAmount: new Prisma.Decimal(calcResult.grossAmount),
        discountApplied: new Prisma.Decimal(calcResult.discountAmount),
        finalPayableAmount: new Prisma.Decimal(calcResult.finalPayable),
        currency: calcResult.currency,
        status,
        calculationDetails: JSON.stringify({
          grossAmount: calcResult.grossAmount,
          discountAmount: calcResult.discountAmount,
          finalPayable: calcResult.finalPayable,
          originalAmount: calcResult.grossAmount,
          discountApplied: calcResult.discountAmount,
          finalPayableAmount: calcResult.finalPayable,
          items: calcResult.items,
          quarters: calcResult.quarters,
          installments: calcResult.installments,
          appliedDiscounts: calcResult.appliedDiscounts,
          feeStructure: calcResult.feeStructure,
          paymentPlan: calcResult.paymentPlan,
          calculatedAt: new Date().toISOString(),
        }),
        createdById: req.user?.userId,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            currentGrade: true,
            status: true,
          },
        },
        feeStructure: {
          include: {
            feeCategory: true,
            items: { include: { feeCategory: true } },
          },
        },
        paymentPlan: {
          include: {
            installments: { orderBy: { sequence: 'asc' } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAudit({
      entityType: 'FEE_ASSIGNMENT',
      entityId: feeAssignment.id,
      action: 'CREATE',
      userId: req.user?.userId,
      details: {
        studentId,
        academicYear: calcResult.academicYear,
        originalAmount: calcResult.grossAmount,
        discountApplied: calcResult.discountAmount,
        finalPayableAmount: calcResult.finalPayable,
        paymentOption: calcResult.paymentOption,
      },
    });

    res.status(201).json({
      feeAssignment,
      calculation: calcResult,
      message: `Fee assignment successfully calculated and saved for ${calcResult.studentName}`,
    });
  } catch (err: any) {
    res.status(400).json({ error: { message: err.message, code: 'FEE_ASSIGNMENT_ERROR' } });
  }
}

export async function listStudentFeeAssignments(req: AuthRequest, res: Response): Promise<void> {
  const { studentId } = req.params;
  const {
    studentId: queryStudentId,
    academicYear,
    gradeOrClass,
    status,
    paymentOption,
    search,
    page = '1',
    limit = '50',
  } = req.query as any;

  const targetStudentId = studentId || queryStudentId;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * take;

  const where: Prisma.FeeAssignmentWhereInput = {};

  if (targetStudentId) {
    where.studentId = targetStudentId;
  }

  if (academicYear) {
    where.academicYear = academicYear;
  }

  if (status && status !== 'all') {
    where.status = status;
  }

  if (paymentOption && paymentOption !== 'all') {
    where.paymentOption = paymentOption;
  }

  if (gradeOrClass && gradeOrClass !== 'all') {
    where.student = { currentGrade: gradeOrClass };
  }

  if (search) {
    const q = String(search).trim();
    where.OR = [
      { student: { firstName: { contains: q } } },
      { student: { lastName: { contains: q } } },
      { student: { admissionNumber: { contains: q } } },
      { feeStructure: { name: { contains: q } } },
    ];
  }

  const [assignments, total] = await Promise.all([
    prisma.feeAssignment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            currentGrade: true,
            status: true,
          },
        },
        feeStructure: {
          include: {
            feeCategory: true,
            items: { include: { feeCategory: true } },
          },
        },
        paymentPlan: {
          include: {
            installments: { orderBy: { sequence: 'asc' } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
        updatedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.feeAssignment.count({ where }),
  ]);

  res.json({
    feeAssignments: assignments,
    assignments,
    total,
    page: pageNum,
    limit: take,
    totalPages: Math.ceil(total / take),
  });
}

export async function getFeeAssignmentById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const assignment = await prisma.feeAssignment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          currentGrade: true,
          address: true,
          phone: true,
          email: true,
          status: true,
        },
      },
      feeStructure: {
        include: {
          feeCategory: true,
          items: { include: { feeCategory: true } },
        },
      },
      paymentPlan: {
        include: {
          installments: { orderBy: { sequence: 'asc' } },
        },
      },
      createdBy: { select: { id: true, name: true, role: true } },
      updatedBy: { select: { id: true, name: true, role: true } },
    },
  });

  if (!assignment) {
    res.status(404).json({ error: { message: 'Fee assignment not found', code: 'NOT_FOUND' } });
    return;
  }

  let parsedDetails = null;
  if (assignment.calculationDetails) {
    try {
      parsedDetails = JSON.parse(assignment.calculationDetails);
    } catch {
      parsedDetails = null;
    }
  }

  res.json({
    feeAssignment: assignment,
    assignment,
    calculationDetails: parsedDetails,
  });
}

export async function updateFeeAssignment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { paymentPlanId, paymentOption, status } = req.body;

  const existing = await prisma.feeAssignment.findUnique({
    where: { id },
  });
  if (!existing) {
    res.status(404).json({ error: { message: 'Fee assignment not found', code: 'NOT_FOUND' } });
    return;
  }

  let updateData: any = {
    updatedById: req.user?.userId,
  };

  if (status) {
    updateData.status = status;
  }

  // If payment plan or payment option changed, recalculate
  let newCalculation = null;
  const needsRecalculation =
    (paymentPlanId && paymentPlanId !== existing.paymentPlanId) ||
    (paymentOption && paymentOption !== existing.paymentOption);

  if (needsRecalculation) {
    const calcResult = await calculateStudentFee({
      studentId: existing.studentId,
      academicYear: existing.academicYear || undefined,
      feeStructureId: existing.feeStructureId,
      paymentPlanId: paymentPlanId || existing.paymentPlanId,
      paymentOption: paymentOption || existing.paymentOption,
    });

    newCalculation = calcResult;
    if (paymentPlanId) updateData.paymentPlanId = paymentPlanId;
    if (paymentOption) updateData.paymentOption = paymentOption;
    updateData.originalAmount = new Prisma.Decimal(calcResult.grossAmount);
    updateData.discountApplied = new Prisma.Decimal(calcResult.discountAmount);
    updateData.finalPayableAmount = new Prisma.Decimal(calcResult.finalPayable);
    updateData.calculationDetails = JSON.stringify({
      grossAmount: calcResult.grossAmount,
      discountAmount: calcResult.discountAmount,
      finalPayable: calcResult.finalPayable,
      items: calcResult.items,
      quarters: calcResult.quarters,
      appliedDiscounts: calcResult.appliedDiscounts,
      recalculatedAt: new Date().toISOString(),
      previousSnapshot: {
        originalAmount: existing.originalAmount,
        discountApplied: existing.discountApplied,
        finalPayableAmount: existing.finalPayableAmount,
      },
    });
  }

  const updatedAssignment = await prisma.feeAssignment.update({
    where: { id },
    data: updateData,
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          currentGrade: true,
          status: true,
        },
      },
      feeStructure: {
        include: {
          feeCategory: true,
          items: { include: { feeCategory: true } },
        },
      },
      paymentPlan: {
        include: {
          installments: { orderBy: { sequence: 'asc' } },
        },
      },
      updatedBy: { select: { id: true, name: true, role: true } },
    },
  });

  await logAudit({
    entityType: 'FEE_ASSIGNMENT',
    entityId: id,
    action: 'UPDATE',
    userId: req.user?.userId,
    details: { paymentPlanId, paymentOption, status, recalculated: Boolean(newCalculation) },
  });

  res.json({
    feeAssignment: updatedAssignment,
    assignment: updatedAssignment,
    calculation: newCalculation,
    message: 'Fee assignment updated successfully',
  });
}

export async function getStudentFeeAssignment(req: AuthRequest, res: Response): Promise<void> {
  const { studentId } = req.params;

  const activeAssignment = await prisma.feeAssignment.findFirst({
    where: { studentId, status: 'ACTIVE' },
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          currentGrade: true,
          status: true,
        },
      },
      feeStructure: {
        include: {
          feeCategory: true,
          items: { include: { feeCategory: true } },
        },
      },
      paymentPlan: {
        include: {
          installments: { orderBy: { sequence: 'asc' } },
        },
      },
      createdBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeAssignment) {
    // Generate dynamic live calculation preview
    try {
      const calculation = await calculateStudentFee({ studentId });
      res.json({
        hasAssignment: false,
        feeAssignment: null,
        calculation,
      });
      return;
    } catch (err: any) {
      res.status(404).json({
        hasAssignment: false,
        feeAssignment: null,
        error: { message: err.message, code: 'NO_ACTIVE_ASSIGNMENT' },
      });
      return;
    }
  }

  let parsedDetails = null;
  if (activeAssignment.calculationDetails) {
    try {
      parsedDetails = JSON.parse(activeAssignment.calculationDetails);
    } catch {
      parsedDetails = null;
    }
  }

  res.json({
    hasAssignment: true,
    feeAssignment: activeAssignment,
    assignment: activeAssignment,
    calculationDetails: parsedDetails,
  });
}

// ==========================================
// 7. FINANCE AUDIT LOGS
// ==========================================

export async function listFinanceAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  const {
    entityType,
    action,
    userId,
    search,
    startDate,
    endDate,
    page = '1',
    limit = '50',
  } = req.query as any;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * take;

  const FINANCE_ENTITIES = [
    'FEE_CATEGORY',
    'FEE_STRUCTURE',
    'PAYMENT_PLAN',
    'DISCOUNT_RULE',
    'STUDENT_DISCOUNT',
    'FEE_ASSIGNMENT',
  ];

  const where: Prisma.AuditLogWhereInput = {
    entityType: entityType && entityType !== 'ALL'
      ? String(entityType)
      : { in: FINANCE_ENTITIES },
  };

  if (action && action !== 'ALL') {
    where.action = String(action);
  }

  if (userId) {
    where.userId = String(userId);
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) where.createdAt.lte = new Date(String(endDate));
  }

  if (search) {
    const q = String(search).trim();
    where.OR = [
      { entityId: { contains: q } },
      { details: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { email: { contains: q } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const formattedLogs = logs.map((log) => {
    let parsedDetails = null;
    if (log.details) {
      try {
        parsedDetails = JSON.parse(log.details);
      } catch {
        parsedDetails = log.details;
      }
    }
    return {
      id: log.id,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      userId: log.userId,
      user: log.user,
      details: parsedDetails,
      createdAt: log.createdAt,
    };
  });

  res.json({
    auditLogs: formattedLogs,
    logs: formattedLogs,
    total,
    page: pageNum,
    limit: take,
    totalPages: Math.ceil(total / take),
  });
}

export async function getFinanceAuditLogById(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!log) {
    res.status(404).json({ error: { message: 'Audit log entry not found', code: 'NOT_FOUND' } });
    return;
  }

  let parsedDetails = null;
  if (log.details) {
    try {
      parsedDetails = JSON.parse(log.details);
    } catch {
      parsedDetails = log.details;
    }
  }

  res.json({
    auditLog: {
      ...log,
      details: parsedDetails,
    },
  });
}
