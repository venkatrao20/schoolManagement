import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Percent, Layers, CheckCircle2 } from 'lucide-react';
import { DiscountRule, FeeCategory } from '../../types';
import api from '../../api/client';

const GRADES = [
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

const STUDENT_CATEGORIES = [
  'REGULAR',
  'SIBLING',
  'SCHOLARSHIP',
  'RTE',
  'STAFF_CHILD',
  'DAY_SCHOLAR',
  'BOARDER',
];

const discountRuleFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Rule name is required').max(150),
    code: z.string().trim().min(1, 'Discount code is required').max(50),
    description: z.string().max(500).optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z
      .number({ invalid_type_error: 'Discount value must be a valid number' })
      .positive('Discount value must be greater than 0'),
    paymentOption: z.enum(['ANY', 'FULL_YEAR', 'QUARTERLY']).default('ANY'),
    eligibilityType: z
      .enum(['ALL', 'STUDENT_CATEGORY', 'CLASS', 'SIBLING', 'SCHOLARSHIP', 'SPECIFIC_STUDENT', 'CUSTOM'])
      .default('ALL'),
    eligibilityCriteria: z.string().max(1000).optional(),
    appliesToAllCategories: z.boolean().default(true),
    categoryIds: z.array(z.string()).optional(),
    appliesToAllClasses: z.boolean().default(true),
    classes: z.array(z.string()).optional(),
    appliesToAllStudentCategories: z.boolean().default(true),
    studentCategories: z.array(z.string()).optional(),
    minimumAmount: z.number().positive().optional().nullable(),
    maximumDiscount: z.number().positive().optional().nullable(),
    validFrom: z.string().min(1, 'Valid from date is required'),
    validUntil: z.string().optional().nullable(),
    approvalRequired: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'PERCENTAGE' && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100%',
        path: ['value'],
      });
    }
  });

export type DiscountRuleFormData = z.infer<typeof discountRuleFormSchema>;

interface DiscountRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: DiscountRule | null;
}

export const DiscountRuleModal: React.FC<DiscountRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  // Fee categories parsing
  let initialCategoryIds: string[] = [];
  let initialAllCategories = true;
  if (initialData?.feeHeads && initialData.feeHeads.length > 0) {
    initialCategoryIds = initialData.feeHeads.map((fh) => fh.feeCategoryId);
    initialAllCategories = false;
  } else if (initialData?.applicableFeeCategoryIds) {
    try {
      initialCategoryIds = JSON.parse(initialData.applicableFeeCategoryIds);
      initialAllCategories = !Array.isArray(initialCategoryIds) || initialCategoryIds.length === 0;
    } catch {
      initialCategoryIds = [];
      initialAllCategories = true;
    }
  }

  // Classes parsing
  let initialClasses: string[] = [];
  let initialAllClasses = true;
  if (initialData?.applicableClasses) {
    try {
      initialClasses = JSON.parse(initialData.applicableClasses);
      initialAllClasses = !Array.isArray(initialClasses) || initialClasses.length === 0;
    } catch {
      initialClasses = [];
      initialAllClasses = true;
    }
  }

  // Student Categories parsing
  let initialStudentCats: string[] = [];
  let initialAllStudentCats = true;
  if (initialData?.applicableStudentCategories) {
    try {
      initialStudentCats = JSON.parse(initialData.applicableStudentCategories);
      initialAllStudentCats = !Array.isArray(initialStudentCats) || initialStudentCats.length === 0;
    } catch {
      initialStudentCats = [];
      initialAllStudentCats = true;
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DiscountRuleFormData>({
    resolver: zodResolver(discountRuleFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      description: initialData?.description || '',
      discountType:
        initialData?.discountType === 'FLAT_AMOUNT' || initialData?.discountType === 'FIXED_AMOUNT'
          ? 'FIXED_AMOUNT'
          : 'PERCENTAGE',
      value: initialData ? Number(initialData.discountValue || initialData.value) : 10,
      paymentOption: (initialData?.paymentOption as any) || 'ANY',
      eligibilityType: (initialData?.eligibilityType as any) || 'ALL',
      eligibilityCriteria: initialData?.eligibilityCriteria || '',
      appliesToAllCategories: initialAllCategories,
      categoryIds: initialCategoryIds,
      appliesToAllClasses: initialAllClasses,
      classes: initialClasses,
      appliesToAllStudentCategories: initialAllStudentCats,
      studentCategories: initialStudentCats,
      minimumAmount: initialData?.minimumAmount ? Number(initialData.minimumAmount) : null,
      maximumDiscount: initialData?.maximumDiscount ? Number(initialData.maximumDiscount) : null,
      validFrom: initialData?.validFrom
        ? initialData.validFrom.split('T')[0]
        : new Date().toISOString().split('T')[0],
      validUntil: initialData?.validUntil
        ? initialData.validUntil.split('T')[0]
        : initialData?.validTo
        ? initialData.validTo.split('T')[0]
        : '',
      approvalRequired: initialData?.approvalRequired ?? false,
      active: initialData?.active ?? initialData?.isActive ?? true,
    },
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/fees/categories');
        setCategories(res.data.categories || []);
      } catch {
        // Handled silently
      }
    };
    if (isOpen) fetchCats();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        code: initialData.code,
        description: initialData.description || '',
        discountType:
          initialData.discountType === 'FLAT_AMOUNT' || initialData.discountType === 'FIXED_AMOUNT'
            ? 'FIXED_AMOUNT'
            : 'PERCENTAGE',
        value: Number(initialData.discountValue || initialData.value),
        paymentOption: initialData.paymentOption || 'ANY',
        eligibilityType: initialData.eligibilityType || 'ALL',
        eligibilityCriteria: initialData.eligibilityCriteria || '',
        appliesToAllCategories: initialAllCategories,
        categoryIds: initialCategoryIds,
        appliesToAllClasses: initialAllClasses,
        classes: initialClasses,
        appliesToAllStudentCategories: initialAllStudentCats,
        studentCategories: initialStudentCats,
        minimumAmount: initialData.minimumAmount ? Number(initialData.minimumAmount) : null,
        maximumDiscount: initialData.maximumDiscount ? Number(initialData.maximumDiscount) : null,
        validFrom: initialData.validFrom
          ? initialData.validFrom.split('T')[0]
          : new Date().toISOString().split('T')[0],
        validUntil: initialData.validUntil
          ? initialData.validUntil.split('T')[0]
          : initialData.validTo
          ? initialData.validTo.split('T')[0]
          : '',
        approvalRequired: initialData.approvalRequired ?? false,
        active: initialData.active ?? initialData.isActive ?? true,
      });
    }
  }, [initialData, reset]);

  const discountType = watch('discountType');
  const appliesToAllCategories = watch('appliesToAllCategories');
  const selectedCategoryIds = watch('categoryIds') || [];
  const appliesToAllClasses = watch('appliesToAllClasses');
  const selectedClasses = watch('classes') || [];
  const appliesToAllStudentCategories = watch('appliesToAllStudentCategories');
  const selectedStudentCategories = watch('studentCategories') || [];

  const handleCategoryToggle = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setValue(
        'categoryIds',
        selectedCategoryIds.filter((catId) => catId !== id)
      );
    } else {
      setValue('categoryIds', [...selectedCategoryIds, id]);
    }
  };

  const handleClassToggle = (cls: string) => {
    if (selectedClasses.includes(cls)) {
      setValue(
        'classes',
        selectedClasses.filter((c) => c !== cls)
      );
    } else {
      setValue('classes', [...selectedClasses, cls]);
    }
  };

  const handleCategoryTypeToggle = (cat: string) => {
    if (selectedStudentCategories.includes(cat)) {
      setValue(
        'studentCategories',
        selectedStudentCategories.filter((c) => c !== cat)
      );
    } else {
      setValue('studentCategories', [...selectedStudentCategories, cat]);
    }
  };

  const handleFormSubmit = async (data: DiscountRuleFormData) => {
    const payload = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description ? data.description.trim() : null,
      discountType: data.discountType,
      discountValue: data.value,
      value: data.value,
      paymentOption: data.paymentOption,
      eligibilityType: data.eligibilityType,
      eligibilityCriteria: data.eligibilityCriteria ? data.eligibilityCriteria.trim() : null,
      applicableFeeCategoryIds: data.appliesToAllCategories ? null : data.categoryIds,
      applicableClasses: data.appliesToAllClasses ? null : data.classes,
      applicableStudentCategories: data.appliesToAllStudentCategories ? null : data.studentCategories,
      minimumAmount: data.minimumAmount || null,
      maximumDiscount: data.maximumDiscount || null,
      validFrom: data.validFrom,
      validUntil: data.validUntil || null,
      validTo: data.validUntil || null,
      approvalRequired: data.approvalRequired,
      active: data.active,
      isActive: data.active,
    };
    await onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Percent className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold">
                {initialData ? 'Edit Discount Policy Rule' : 'Configure New Discount & Concession'}
              </h3>
              <p className="text-xs text-slate-300">
                Define percentage or fixed concessions, eligible fee heads, payment options, and criteria.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Basic Identifiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Discount / Concession Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Sibling Concession, Early Full-Year Discount"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {errors.name && <p className="text-[11px] text-rose-500 font-semibold">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('code')}
                placeholder="e.g. SIBLING_10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {errors.code && <p className="text-[11px] text-rose-500 font-semibold">{errors.code.message}</p>}
            </div>
          </div>

          {/* Section 2: Type, Value & Payment Option */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Discount Type <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('discountType')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Discount Value <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  {...register('value', { valueAsNumber: true })}
                  placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5000'}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {discountType === 'PERCENTAGE' ? '%' : '₹'}
                </span>
              </div>
              {errors.value && <p className="text-[11px] text-rose-500 font-semibold">{errors.value.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Payment Option</label>
              <select
                {...register('paymentOption')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ANY">Any Payment Plan</option>
                <option value="FULL_YEAR">Full Year Upfront Only</option>
                <option value="QUARTERLY">Quarterly Only</option>
              </select>
            </div>
          </div>

          {/* Section 3: Fee Head Restrictions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <label className="text-xs font-bold text-slate-800">Eligible Fee Heads / Categories</label>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('appliesToAllCategories')}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Apply to All Categories</span>
              </label>
            </div>

            {!appliesToAllCategories && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p className="text-[11px] text-slate-500">
                  Select which fee heads can receive this discount (e.g. Tuition Fee only):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {categories.map((cat) => {
                    const isChecked = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{cat.name}</span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Eligibility Criteria & Multi-Class / Multi-Category */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Eligibility Type</label>
                <select
                  {...register('eligibilityType')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="ALL">All Eligible Students</option>
                  <option value="SIBLING">Sibling Concession</option>
                  <option value="SCHOLARSHIP">Merit / Talent Scholarship</option>
                  <option value="STUDENT_CATEGORY">Student Category Based</option>
                  <option value="CLASS">Class / Grade Based</option>
                  <option value="CUSTOM">Custom Policy</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Policy Notes / Criteria Memo</label>
                <input
                  type="text"
                  {...register('eligibilityCriteria')}
                  placeholder="e.g. Enrolled elder sibling in active academic standing"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Applicable Classes Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Applicable Classes / Grades</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('appliesToAllClasses')}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>All Classes</span>
                </label>
              </div>
              {!appliesToAllClasses && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1.5">
                  {GRADES.map((g) => {
                    const isChecked = selectedClasses.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => handleClassToggle(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Applicable Student Categories Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Applicable Student Categories</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('appliesToAllStudentCategories')}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>All Categories</span>
                </label>
              </div>
              {!appliesToAllStudentCategories && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-1.5">
                  {STUDENT_CATEGORIES.map((cat) => {
                    const isChecked = selectedStudentCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => handleCategoryTypeToggle(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Limits & Validity Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Valid From <span className="text-rose-500">*</span></label>
              <input
                type="date"
                {...register('validFrom')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Valid Until (Optional)</label>
              <input
                type="date"
                {...register('validUntil')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Minimum Fee Required (₹)</label>
              <input
                type="number"
                step="any"
                {...register('minimumAmount', { valueAsNumber: true })}
                placeholder="e.g. 30000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Max Discount Cap (₹)</label>
              <input
                type="number"
                step="any"
                {...register('maximumDiscount', { valueAsNumber: true })}
                placeholder="e.g. 10000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 6: Governance Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                {...register('approvalRequired')}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Approval Required before applying</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                {...register('active')}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>Active and available for assignment</span>
            </label>
          </div>

          {/* Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Discount Policy' : 'Save Discount Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
