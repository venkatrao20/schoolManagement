import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Layers, Sparkles, Eye } from 'lucide-react';
import { FeeCategory } from '../../types';

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  code: z
    .string()
    .trim()
    .min(1, 'Fee head code is required')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code must contain only letters, numbers, hyphens or underscores'),
  description: z.string().max(500).optional().nullable(),
  feeType: z.enum(['RECURRING', 'ONE_TIME', 'ANNUAL', 'SERVICE', 'OTHER'] as const),
  defaultFrequency: z.enum(['QUARTERLY', 'FULL_YEAR', 'ONE_TIME', 'MONTHLY', 'HALF_YEARLY'] as const),
  isMandatory: z.boolean().default(true),
  discountAllowed: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialData?: FeeCategory | null;
  isViewOnly?: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isViewOnly = false,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      feeType: 'RECURRING',
      defaultFrequency: 'QUARTERLY',
      isMandatory: true,
      discountAllowed: true,
      isActive: true,
    },
  });

  const currentName = watch('name');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        code: initialData.code || '',
        description: initialData.description || '',
        feeType: initialData.feeType || 'RECURRING',
        defaultFrequency: initialData.defaultFrequency || 'QUARTERLY',
        isMandatory: initialData.isMandatory !== undefined ? initialData.isMandatory : true,
        discountAllowed: initialData.discountAllowed !== undefined ? initialData.discountAllowed : true,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        feeType: 'RECURRING',
        defaultFrequency: 'QUARTERLY',
        isMandatory: true,
        discountAllowed: true,
        isActive: true,
      });
    }
  }, [initialData, reset]);

  // Helper to suggest standard uppercase code from name when creating new head
  const handleGenerateCode = () => {
    if (!currentName || initialData) return;
    const words = currentName.trim().toUpperCase().split(/\s+/);
    let generated = '';
    if (words.length === 1) {
      generated = words[0].slice(0, 4);
    } else {
      generated = words.map((w) => w[0]).join('').slice(0, 5);
    }
    setValue('code', generated.replace(/[^A-Z0-9_-]/g, ''));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              {isViewOnly ? <Eye className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {isViewOnly
                  ? 'Fee Head Details'
                  : initialData
                  ? 'Edit Fee Head / Category'
                  : 'Create New Fee Head'}
              </h2>
              <p className="text-xs text-slate-400">
                {isViewOnly
                  ? `Viewing configuration for ${initialData?.name}`
                  : 'Configure standard fee head definitions, billing frequency & discount eligibility'}
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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fee Name */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Head Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={isViewOnly}
                placeholder="e.g. Tuition Fee, Transport Fee"
                {...register('name')}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                  errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                } ${isViewOnly ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''}`}
              />
              {errors.name && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Fee Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Fee Code <span className="text-rose-500">*</span>
                </label>
                {!isViewOnly && !initialData && (
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                    title="Auto-generate code from name"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                disabled={isViewOnly}
                placeholder="e.g. TUI, TRANS, ADM"
                {...register('code')}
                onChange={(e) => {
                  setValue('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                  errors.code ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                } ${isViewOnly ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''}`}
              />
              {errors.code && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fee Type */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Type <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isViewOnly}
                {...register('feeType')}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all border-slate-200 ${
                  isViewOnly ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''
                }`}
              >
                <option value="RECURRING">RECURRING (Periodic Academic)</option>
                <option value="ONE_TIME">ONE_TIME (Admission / Intake)</option>
                <option value="ANNUAL">ANNUAL (Session Maintenance)</option>
                <option value="SERVICE">SERVICE (Transport / Hostel / Canteen)</option>
                <option value="OTHER">OTHER (Miscellaneous)</option>
              </select>
              {errors.feeType && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.feeType.message}</p>
              )}
            </div>

            {/* Default Frequency */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Default Frequency <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isViewOnly}
                {...register('defaultFrequency')}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all border-slate-200 ${
                  isViewOnly ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''
                }`}
              >
                <option value="QUARTERLY">Quarterly (4 Splits / Year)</option>
                <option value="FULL_YEAR">Full Year (Single Upfront)</option>
                <option value="ONE_TIME">One Time (Single Due)</option>
                <option value="MONTHLY">Monthly (12 Splits / Year)</option>
                <option value="HALF_YEARLY">Half Yearly (2 Splits / Year)</option>
              </select>
              {errors.defaultFrequency && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">
                  {errors.defaultFrequency.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              disabled={isViewOnly}
              placeholder="Brief explanation of what this fee head covers..."
              {...register('description')}
              className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                isViewOnly ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''
              }`}
            />
            {errors.description && (
              <p className="text-rose-500 text-[11px] mt-1 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Toggles / Flags */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="font-bold text-slate-800">Mandatory Fee Head</span>
                <p className="text-[11px] text-slate-500">
                  Required for all enrolled students in assigned grades (e.g. Tuition vs optional Transport)
                </p>
              </div>
              <input
                type="checkbox"
                disabled={isViewOnly}
                {...register('isMandatory')}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="font-bold text-slate-800">Discount Applicable</span>
                <p className="text-[11px] text-slate-500">
                  Allow scholarships, sibling concessions, or staff waivers to apply to this fee head
                </p>
              </div>
              <input
                type="checkbox"
                disabled={isViewOnly}
                {...register('discountAllowed')}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="font-bold text-slate-800">Active Status</span>
                <p className="text-[11px] text-slate-500">
                  Active heads can be linked to new academic year fee structures
                </p>
              </div>
              <input
                type="checkbox"
                disabled={isViewOnly}
                {...register('isActive')}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Saving...'
                  : initialData
                  ? 'Update Fee Head'
                  : 'Save Fee Head'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
