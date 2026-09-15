import React from 'react';
import { X, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { PaymentPlan } from '../../types';
import { Badge } from '../../components/Badge';

interface PaymentPlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PaymentPlan | null;
}

export const PaymentPlanDetailModal: React.FC<PaymentPlanDetailModalProps> = ({
  isOpen,
  onClose,
  plan,
}) => {
  if (!isOpen || !plan) return null;

  const installments = plan.installments || [];
  const totalPlanAmount = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);

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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">{plan.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-indigo-400 font-mono font-bold border border-slate-700">
                  {plan.frequency}
                </span>
                {plan.isActive ? (
                  <Badge variant="success" dot>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="default">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Structure: {plan.feeStructure?.gradeOrClass} - {plan.feeStructure?.name} ({plan.feeStructure?.academicYear})
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

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Class & Session</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {plan.feeStructure?.gradeOrClass}
              </strong>
              <span className="text-[10px] text-slate-500">{plan.feeStructure?.academicYear}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan Type</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {plan.frequency === 'FULL_YEAR' ? 'Full-Year Upfront' : 'Quarterly Split'}
              </strong>
              <span className="text-[10px] text-indigo-600 font-semibold">
                {installments.length} {installments.length === 1 ? 'Installment' : 'Quarters'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Structure Annual Fee</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                ₹{Number(plan.feeStructure?.amount || totalPlanAmount).toLocaleString()}
              </strong>
              <span className="text-[10px] text-slate-500">{plan.feeStructure?.currency || 'INR'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Scheduled</span>
              <strong className="text-sm font-black text-indigo-400 mt-0.5 block">
                ₹{totalPlanAmount.toLocaleString()}
              </strong>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>100% Reconciled</span>
              </span>
            </div>
          </div>

          {/* Configured Installment Quarters */}
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Configured Installment Breakdown ({installments.length} {installments.length === 1 ? 'Payment' : 'Quarters'})</span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4"># / Period</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Due Date Rule / Memo</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {installments.map((inst, idx) => (
                    <tr key={inst.id || idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">
                          {inst.dueMonth || `Quarter ${inst.sequence || idx + 1}`}
                        </div>
                        {inst.quarter && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            {inst.quarter}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {inst.dueDate ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(inst.dueDate).toLocaleDateString()}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">As per session start</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {inst.dueDateRule || 'Standard quarterly due date'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ₹{Number(inst.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 font-extrabold text-slate-900 border-t border-slate-200">
                    <td colSpan={3} className="py-3 px-4 text-right uppercase text-[11px] text-slate-500">
                      Total Scheduled Amount
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-700 text-sm">
                      ₹{totalPlanAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Audit Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Configured by:</span>
              <strong className="text-slate-700">{plan.createdBy?.name || 'Finance Administrator'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Last updated:</span>
              <strong className="text-slate-700">{new Date(plan.updatedAt).toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Assigned students:</span>
              <strong className="text-slate-700">{plan._count?.feeAssignments || 0} students assigned</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
