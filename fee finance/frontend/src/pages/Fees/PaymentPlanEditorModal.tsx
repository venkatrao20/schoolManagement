import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, Sparkles, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import { FeeStructure, PaymentPlan, PaymentFrequency } from '../../types';
import api from '../../api/client';

const installmentFormSchema = z.object({
  sequence: z.number().int().min(1).max(4),
  quarter: z.string().optional().nullable(),
  dueMonth: z.string().min(1, 'Quarter / month label is required'),
  dueDate: z.string().optional().nullable(),
  dueDateRule: z.string().optional().nullable(),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
});

const paymentPlanFormSchema = z.object({
  feeStructureId: z.string().min(1, 'Please select a fee structure'),
  name: z.string().trim().min(1, 'Plan name is required').max(100),
  frequency: z.enum(['QUARTERLY', 'FULL_YEAR'] as const),
  installments: z.array(installmentFormSchema).min(1, 'At least 1 installment is required'),
});

export type PaymentPlanFormData = z.infer<typeof paymentPlanFormSchema>;

interface PaymentPlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentPlanFormData) => Promise<void>;
  initialData?: PaymentPlan | null;
  defaultStructureId?: string;
}

const DEFAULT_QUARTERS = [
  {
    sequence: 1,
    quarter: 'Q1',
    dueMonth: 'April–June (Q1)',
    dueDate: '2026-04-15',
    dueDateRule: 'Due on 15th April (Session Start)',
    amount: 15000,
  },
  {
    sequence: 2,
    quarter: 'Q2',
    dueMonth: 'July–September (Q2)',
    dueDate: '2026-07-15',
    dueDateRule: 'Due on 15th July',
    amount: 15000,
  },
  {
    sequence: 3,
    quarter: 'Q3',
    dueMonth: 'October–December (Q3)',
    dueDate: '2026-10-15',
    dueDateRule: 'Due on 15th October',
    amount: 15000,
  },
  {
    sequence: 4,
    quarter: 'Q4',
    dueMonth: 'January–March (Q4)',
    dueDate: '2027-01-15',
    dueDateRule: 'Due on 15th January',
    amount: 15000,
  },
];

export const PaymentPlanEditorModal: React.FC<PaymentPlanEditorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultStructureId,
}) => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentPlanFormData>({
    resolver: zodResolver(paymentPlanFormSchema),
    defaultValues: {
      feeStructureId: defaultStructureId || '',
      name: 'Quarterly Standard Plan',
      frequency: 'QUARTERLY',
      installments: DEFAULT_QUARTERS,
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'installments',
  });

  const watchedStructureId = watch('feeStructureId');
  const watchedFrequency = watch('frequency');
  const watchedInstallments = watch('installments');

  const selectedStructure = structures.find((s) => s.id === watchedStructureId);
  const targetTotalAmount = selectedStructure ? Number(selectedStructure.amount) : 0;

  // Live sum calculation
  const totalConfiguredAmount = (watchedInstallments || []).reduce((sum, inst) => {
    const amt = Number(inst?.amount);
    return sum + (isNaN(amt) || amt < 0 ? 0 : amt);
  }, 0);

  const amountDifference = Math.round((totalConfiguredAmount - targetTotalAmount) * 100) / 100;
  const isScheduleConsistent = targetTotalAmount > 0 && Math.abs(amountDifference) < 0.05;

  useEffect(() => {
    async function loadStructures() {
      try {
        setLoadingStructures(true);
        const res = await api.get('/fees/structures?includeInactive=true');
        setStructures(res.data.feeStructures || res.data.structures || []);
      } catch (err) {
        console.error('Failed to load structures', err);
      } finally {
        setLoadingStructures(false);
      }
    }
    if (isOpen) {
      loadStructures();
    }
  }, [isOpen]);

  // Frequency switcher handler
  const handleFrequencyChange = (freq: PaymentFrequency) => {
    setValue('frequency', freq);
    const struct = structures.find((s) => s.id === watchedStructureId);
    const total = struct ? Number(struct.amount) : 60000;

    if (freq === 'FULL_YEAR') {
      setValue('name', 'Full-Year Upfront Plan');
      replace([
        {
          sequence: 1,
          quarter: null,
          dueMonth: 'Full Year (Annual)',
          dueDate: '2026-04-15',
          dueDateRule: 'Payable upfront on or before 15th April',
          amount: total,
        },
      ]);
    } else {
      setValue('name', 'Quarterly Standard Plan');
      const q = Math.floor((total / 4) * 100) / 100;
      const lastQ = Math.round((total - q * 3) * 100) / 100;
      replace([
        {
          sequence: 1,
          quarter: 'Q1',
          dueMonth: 'April–June (Q1)',
          dueDate: '2026-04-15',
          dueDateRule: 'Due on 15th April (Session Start)',
          amount: q,
        },
        {
          sequence: 2,
          quarter: 'Q2',
          dueMonth: 'July–September (Q2)',
          dueDate: '2026-07-15',
          dueDateRule: 'Due on 15th July',
          amount: q,
        },
        {
          sequence: 3,
          quarter: 'Q3',
          dueMonth: 'October–December (Q3)',
          dueDate: '2026-10-15',
          dueDateRule: 'Due on 15th October',
          amount: q,
        },
        {
          sequence: 4,
          quarter: 'Q4',
          dueMonth: 'January–March (Q4)',
          dueDate: '2027-01-15',
          dueDateRule: 'Due on 15th January',
          amount: lastQ,
        },
      ]);
    }
  };

  // Auto-calculate schedule via backend
  const handleAutoCalculate = async () => {
    if (!watchedStructureId) return;
    try {
      const res = await api.post(`/fees/structures/${watchedStructureId}/calculate-schedule`, {
        frequency: watchedFrequency,
      });
      if (res.data.installments) {
        replace(
          res.data.installments.map((inst: any, idx: number) => ({
            sequence: inst.sequence || idx + 1,
            quarter: inst.quarter,
            dueMonth: inst.dueMonth,
            dueDate: watchedFrequency === 'QUARTERLY' ? DEFAULT_QUARTERS[idx]?.dueDate : '2026-04-15',
            dueDateRule: inst.dueDateRule,
            amount: Number(inst.amount),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to auto-compute schedule', err);
    }
  };

  useEffect(() => {
    if (initialData) {
      const formattedInst =
        initialData.installments && initialData.installments.length > 0
          ? initialData.installments.map((inst, idx) => ({
              sequence: inst.sequence || inst.installmentNumber || idx + 1,
              quarter: inst.quarter || (initialData.frequency === 'QUARTERLY' ? `Q${idx + 1}` : null),
              dueMonth: inst.dueMonth || (initialData.frequency === 'QUARTERLY' ? `Quarter ${idx + 1}` : 'Full Year'),
              dueDate: inst.dueDate ? inst.dueDate.substring(0, 10) : '',
              dueDateRule: inst.dueDateRule || '',
              amount: Number(inst.amount),
            }))
          : initialData.frequency === 'FULL_YEAR'
          ? [
              {
                sequence: 1,
                quarter: null,
                dueMonth: 'Full Year (Annual)',
                dueDate: '2026-04-15',
                dueDateRule: 'Payable upfront on admission',
                amount: Number(initialData.feeStructure?.amount || 0),
              },
            ]
          : DEFAULT_QUARTERS;

      reset({
        feeStructureId: initialData.feeStructureId,
        name: initialData.name || 'Payment Plan',
        frequency: initialData.frequency,
        installments: formattedInst,
      });
    } else if (defaultStructureId) {
      setValue('feeStructureId', defaultStructureId);
    }
  }, [initialData, defaultStructureId, reset, setValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {initialData ? `Edit Payment Plan (${initialData.name})` : 'Configure Payment Plan'}
              </h2>
              <p className="text-xs text-slate-400">
                Define configurable quarter amounts, due dates, and payment rules
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
          {/* Top Row: Fee Structure & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Structure <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('feeStructureId')}
                disabled={Boolean(initialData) || loadingStructures}
                onChange={(e) => {
                  setValue('feeStructureId', e.target.value);
                  const struct = structures.find((s) => s.id === e.target.value);
                  if (struct) {
                    const total = Number(struct.amount);
                    if (watchedFrequency === 'FULL_YEAR') {
                      replace([
                        {
                          sequence: 1,
                          quarter: null,
                          dueMonth: 'Full Year (Annual)',
                          dueDate: '2026-04-15',
                          dueDateRule: 'Payable upfront on admission',
                          amount: total,
                        },
                      ]);
                    } else {
                      const q = Math.floor((total / 4) * 100) / 100;
                      const lastQ = Math.round((total - q * 3) * 100) / 100;
                      replace([
                        {
                          sequence: 1,
                          quarter: 'Q1',
                          dueMonth: 'April–June (Q1)',
                          dueDate: '2026-04-15',
                          dueDateRule: 'Due on 15th April (Session Start)',
                          amount: q,
                        },
                        {
                          sequence: 2,
                          quarter: 'Q2',
                          dueMonth: 'July–September (Q2)',
                          dueDate: '2026-07-15',
                          dueDateRule: 'Due on 15th July',
                          amount: q,
                        },
                        {
                          sequence: 3,
                          quarter: 'Q3',
                          dueMonth: 'October–December (Q3)',
                          dueDate: '2026-10-15',
                          dueDateRule: 'Due on 15th October',
                          amount: q,
                        },
                        {
                          sequence: 4,
                          quarter: 'Q4',
                          dueMonth: 'January–March (Q4)',
                          dueDate: '2027-01-15',
                          dueDateRule: 'Due on 15th January',
                          amount: lastQ,
                        },
                      ]);
                    }
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="">-- Select Target Fee Structure --</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.gradeOrClass} - {s.name} ({s.academicYear}) • ₹{Number(s.amount).toLocaleString()}
                  </option>
                ))}
              </select>
              {errors.feeStructureId && (
                <p className="text-rose-500 text-[11px] mt-1 font-medium">
                  {errors.feeStructureId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Plan Frequency <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={Boolean(initialData)}
                  onClick={() => handleFrequencyChange('QUARTERLY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    watchedFrequency === 'QUARTERLY'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Quarterly (4 Quarters)
                </button>

                <button
                  type="button"
                  disabled={Boolean(initialData)}
                  onClick={() => handleFrequencyChange('FULL_YEAR')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    watchedFrequency === 'FULL_YEAR'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Full Year (1 Payment)
                </button>
              </div>
            </div>
          </div>

          {/* Plan Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Payment Plan Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Quarterly Standard Schedule, Early Bird Full-Year"
              {...register('name')}
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
            />
            {errors.name && (
              <p className="text-rose-500 text-[11px] mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Installment Breakdown Editor */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Configured Installments Schedule ({fields.length} {fields.length === 1 ? 'Installment' : 'Quarters'})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Customize quarter amounts and due date rules
                </p>
              </div>

              {selectedStructure && (
                <button
                  type="button"
                  onClick={handleAutoCalculate}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors"
                  title="Auto-calculate standard head allocation"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Compute Heads</span>
                </button>
              )}
            </div>

            {errors.installments?.message && (
              <p className="text-rose-500 text-[11px] mb-2 font-semibold">{errors.installments.message}</p>
            )}

            <div className="space-y-2.5">
              {fields.map((field, index) => {
                return (
                  <div
                    key={field.id}
                    className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Quarter / Label */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Quarter / Period
                        </label>
                        <input
                          type="text"
                          {...register(`installments.${index}.dueMonth` as const)}
                          placeholder="e.g. April–June (Q1)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* Amount Input */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Installment Amount (₹) *
                        </label>
                        <div className="relative">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="number"
                            step="10"
                            min="1"
                            placeholder="e.g. 15000"
                            {...register(`installments.${index}.amount` as const, { valueAsNumber: true })}
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Due Date Picker */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                          Target Due Date
                        </label>
                        <input
                          type="date"
                          {...register(`installments.${index}.dueDate` as const)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Due Date Rule */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                        Due Date Rule / Memo
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Due on 15th April before late fee penalty"
                        {...register(`installments.${index}.dueDateRule` as const)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule Reconciliation Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Schedule Reconciliation
              </span>
              <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Fee Structure Target: <strong>₹{targetTotalAmount.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Sum Configured: <strong className="text-indigo-300">₹{totalConfiguredAmount.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isScheduleConsistent ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Schedule Balanced (100%)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {amountDifference > 0
                      ? `Over by ₹${amountDifference.toLocaleString()}`
                      : `Under by ₹${Math.abs(amountDifference).toLocaleString()}`}
                  </span>
                </div>
              )}
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
              disabled={isSubmitting || !isScheduleConsistent}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Plan' : 'Save Payment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
