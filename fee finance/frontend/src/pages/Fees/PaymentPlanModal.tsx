import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { FeeStructure } from '../../types';
import { FrequencyBadge } from '../../components/Badge';

interface PaymentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeStructure: FeeStructure | null;
  onUpdated: () => void;
  canEdit: boolean;
}

export const PaymentPlanModal: React.FC<PaymentPlanModalProps> = ({
  isOpen,
  onClose,
  feeStructure,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  if (!isOpen || !feeStructure) return null;

  const plans = feeStructure.paymentPlans || [];
  const activePlan = plans.find((p) => (selectedPlanId ? p.id === selectedPlanId : true)) || plans[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Payment Frequency & Installment Plans
              </h2>
              <p className="text-xs text-slate-400">
                {feeStructure.gradeOrClass} • {feeStructure.feeCategory?.name} • Session {feeStructure.academicYear}
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

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Base Fee Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[11px]">Approved Annual Base Amount</span>
              <span className="text-xl font-extrabold text-slate-900">
                ₹{Number(feeStructure.amount).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Available Payment Modes</span>
              <span className="font-bold text-slate-700">{plans.length} configured plans</span>
            </div>
          </div>

          {/* Plan Selector Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            {plans.map((plan) => {
              const isSelected = activePlan?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{plan.frequency === 'QUARTERLY' ? 'Quarterly Schedule (4 Splits)' : 'Full-Year Payment (1 Split)'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-slate-700'}`}>
                    {plan.numberOfInstallments} part{plan.numberOfInstallments > 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Plan Breakdown Table */}
          {activePlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {activePlan.frequency === 'QUARTERLY'
                      ? 'Quarterly Split Schedule (AC4, AC6)'
                      : 'Full-Year Single Installment Schedule (AC5)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activePlan.frequency === 'QUARTERLY'
                      ? 'Installments are distributed equally by default; any applied discount is proportionally adjusted.'
                      : 'Full annual tuition is payable upfront in a single installment.'}
                  </p>
                </div>
                <FrequencyBadge frequency={activePlan.frequency} />
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-3">#</th>
                      <th className="p-3">Due Period / Month</th>
                      <th className="p-3">Calendar Due Date</th>
                      <th className="p-3 text-right">Base Share (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePlan.installments && activePlan.installments.length > 0 ? (
                      activePlan.installments.map((inst, index) => (
                        <tr key={inst.id || index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-bold text-slate-700">
                            {inst.installmentNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {inst.dueMonth || `Installment ${inst.installmentNumber}`}
                          </td>
                          <td className="p-3 text-slate-500">
                            {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : 'Set by term'}
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900">
                            ₹{Number(inst.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          No installment records available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Check */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Sum of Installments:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ₹
                  {activePlan.installments
                    ?.reduce((sum, i) => sum + Number(i.amount), 0)
                    .toLocaleString() || Number(feeStructure.amount).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
