import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Receipt, Plus, Trash2, HelpCircle, Layers } from 'lucide-react';
import { FeeCategory, FeeStructure, StudentCategory } from '../../types';
import api from '../../api/client';

const itemSchema = z.object({
  feeCategoryId: z.string().min(1, 'Please select a fee head'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  frequency: z.enum(['QUARTERLY', 'FULL_YEAR', 'ONE_TIME', 'MONTHLY', 'HALF_YEARLY'] as const),
  isMandatory: z.boolean().default(true),
  discountAllowed: z.boolean().default(true),
});

const structureFormSchema = z.object({
  name: z.string().trim().min(1, 'Structure name is required').max(150),
  academicYear: z.string().trim().min(1, 'Academic Year is required'),
  gradeOrClass: z.string().trim().min(1, 'Class / Grade is required'),
  section: z.string().trim().max(50).optional().nullable(),
  studentCategory: z.enum([
    'REGULAR',
    'RTE',
    'SIBLING',
    'STAFF_CHILD',
    'DAY_SCHOLAR',
    'BOARDER',
    'MANAGEMENT_QUOTA',
  ] as const),
  items: z.array(itemSchema).min(1, 'Please add at least one fee head'),
});

export type StructureFormData = z.infer<typeof structureFormSchema>;

interface FeeStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StructureFormData) => Promise<void>;
  initialData?: FeeStructure | null;
}

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

const ACADEMIC_YEARS = ['2026-2027', '2027-2028', '2028-2029', '2025-2026'];

const STUDENT_CATEGORIES: { label: string; value: StudentCategory }[] = [
  { label: 'Regular (General)', value: 'REGULAR' },
  { label: 'RTE Concession', value: 'RTE' },
  { label: 'Sibling Concession', value: 'SIBLING' },
  { label: 'Staff Child Concession', value: 'STAFF_CHILD' },
  { label: 'Day Scholar', value: 'DAY_SCHOLAR' },
  { label: 'Hostel / Boarder', value: 'BOARDER' },
  { label: 'Management Quota', value: 'MANAGEMENT_QUOTA' },
];

export const FeeStructureModal: React.FC<FeeStructureModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [categories, setCategories] = useState<FeeCategory[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StructureFormData>({
    resolver: zodResolver(structureFormSchema),
    defaultValues: {
      name: '',
      academicYear: '2026-2027',
      gradeOrClass: 'Grade 6',
      section: '',
      studentCategory: 'REGULAR',
      items: [
        {
          feeCategoryId: '',
          amount: 48000,
          frequency: 'QUARTERLY',
          isMandatory: true,
          discountAllowed: true,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedGrade = watch('gradeOrClass');
  const watchedCategory = watch('studentCategory');

  // Compute live total annual amount
  const totalAnnualAmount = (watchedItems || []).reduce((sum, it) => {
    const val = Number(it?.amount);
    return sum + (isNaN(val) || val < 0 ? 0 : val);
  }, 0);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/fees/categories');
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const itemsList =
        initialData.items && initialData.items.length > 0
          ? initialData.items.map((it) => ({
              feeCategoryId: it.feeCategoryId,
              amount: Number(it.amount),
              frequency: it.frequency || 'QUARTERLY',
              isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
              discountAllowed: it.discountAllowed !== undefined ? it.discountAllowed : true,
            }))
          : initialData.feeCategoryId
          ? [
              {
                feeCategoryId: initialData.feeCategoryId,
                amount: Number(initialData.amount),
                frequency: 'QUARTERLY' as const,
                isMandatory: true,
                discountAllowed: true,
              },
            ]
          : [];

      reset({
        name: initialData.name || '',
        academicYear: initialData.academicYear,
        gradeOrClass: initialData.gradeOrClass,
        section: initialData.section || '',
        studentCategory: initialData.studentCategory || 'REGULAR',
        items: itemsList.length > 0 ? itemsList : [{ feeCategoryId: '', amount: 50000, frequency: 'QUARTERLY', isMandatory: true, discountAllowed: true }],
      });
    } else {
      reset({
        name: `${watchedGrade || 'Grade 6'} ${watchedCategory || 'REGULAR'} Structure`,
        academicYear: '2026-2027',
        gradeOrClass: 'Grade 6',
        section: '',
        studentCategory: 'REGULAR',
        items: [
          {
            feeCategoryId: categories[0]?.id || '',
            amount: 48000,
            frequency: 'QUARTERLY',
            isMandatory: true,
            discountAllowed: true,
          },
        ],
      });
    }
  }, [initialData, reset, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {initialData ? `Edit Fee Structure (${initialData.name})` : 'Define Fee Structure'}
              </h2>
              <p className="text-xs text-slate-400">
                Configure class, student category, multi-head fee breakdown, and payment schedules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {/* Top Row: Academic Year, Class, Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('academicYear')}
                disabled={Boolean(initialData)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60"
              >
                {ACADEMIC_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              {errors.academicYear && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">
                  {errors.academicYear.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('gradeOrClass')}
                disabled={Boolean(initialData)}
                onChange={(e) => {
                  setValue('gradeOrClass', e.target.value);
                  if (!initialData) {
                    setValue('name', `${e.target.value} ${watchedCategory} Structure`);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.gradeOrClass && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">
                  {errors.gradeOrClass.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Section (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Section A (or blank for All)"
                {...register('section')}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Second Row: Student Category & Structure Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Student Category <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('studentCategory')}
                onChange={(e) => {
                  setValue('studentCategory', e.target.value as StudentCategory);
                  if (!initialData) {
                    setValue('name', `${watchedGrade} ${e.target.value} Structure`);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {STUDENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.studentCategory && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">
                  {errors.studentCategory.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Structure Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Middle School Regular, Grade 6 Baseline"
                {...register('name')}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
              {errors.name && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Fee Heads Breakdown */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fee Heads Breakdown</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Add all applicable fee heads (Tuition, Annual, Lab, Development, etc.)
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  append({
                    feeCategoryId: categories[0]?.id || '',
                    amount: 5000,
                    frequency: 'QUARTERLY',
                    isMandatory: true,
                    discountAllowed: true,
                  })
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fee Head</span>
              </button>
            </div>

            {errors.items?.message && (
              <p className="text-rose-500 text-[11px] mb-2 font-semibold">{errors.items.message}</p>
            )}

            <div className="space-y-2.5">
              {fields.map((field, index) => {
                return (
                  <div
                    key={field.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Fee Category Select */}
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Fee Head *
                        </label>
                        <select
                          {...register(`items.${index}.feeCategoryId` as const)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          <option value="">-- Select Fee Head --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Amount Input */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="1"
                          placeholder="e.g. 48000"
                          {...register(`items.${index}.amount` as const, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      {/* Frequency Select */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Frequency *
                        </label>
                        <select
                          {...register(`items.${index}.frequency` as const)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          <option value="QUARTERLY">Quarterly</option>
                          <option value="FULL_YEAR">Full Year</option>
                          <option value="ONE_TIME">One Time</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="HALF_YEARLY">Half Yearly</option>
                        </select>
                      </div>

                      {/* Remove Button */}
                      <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove this fee head"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Flags / Checkboxes for Mandatory & Discount */}
                    <div className="flex items-center gap-6 pt-1 border-t border-slate-200/50 text-[11px] text-slate-600">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register(`items.${index}.isMandatory` as const)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="font-semibold">Mandatory</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register(`items.${index}.discountAllowed` as const)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className="font-semibold">Discount Applicable</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Annual Total Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                Computed Annual Total Fee
              </span>
              <span className="text-xs text-slate-300">
                Sum of {watchedItems?.length || 0} configured fee heads
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-400">
              ₹{totalAnnualAmount.toLocaleString()}
            </div>
          </div>

          {/* Payment Options Callout */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-start gap-2.5 text-[11px] text-emerald-800">
            <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Automated Payment Options Generated:</strong>
              <p className="mt-0.5 text-slate-600">
                Saving will automatically configure <strong>Quarterly (4 Quarters)</strong> and <strong>Full-Year (1 Upfront)</strong> installment payment plans for assigned students.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Structure' : 'Save Structure'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
