import React from 'react';
import { X, Receipt, CheckCircle2, XCircle, Calendar, Layers } from 'lucide-react';
import { FeeStructure, FeeFrequency } from '../../types';
import { Badge } from '../../components/Badge';

interface FeeStructureDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: FeeStructure | null;
}

export const FeeStructureDetailModal: React.FC<FeeStructureDetailModalProps> = ({
  isOpen,
  onClose,
  structure,
}) => {
  if (!isOpen || !structure) return null;

  const totalAmount = Number(structure.amount);

  const getFrequencyBadge = (freq: FeeFrequency | string) => {
    return (
      <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
        {freq}
      </span>
    );
  };

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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">{structure.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono font-bold border border-slate-700">
                  v{structure.version}
                </span>
                {structure.isActive ? (
                  <Badge variant="success" dot>
                    Active
                  </Badge>
                ) : (
                  <Badge variant="default">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {structure.gradeOrClass} {structure.section ? `(${structure.section})` : ''} • Academic Year {structure.academicYear} • Category: {structure.studentCategory}
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
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Class</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {structure.gradeOrClass}
              </strong>
              <span className="text-[10px] text-slate-500">{structure.section || 'All Sections'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Year</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {structure.academicYear}
              </strong>
              <span className="text-[10px] text-emerald-600 font-semibold">Standard Session</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Category</span>
              <strong className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                {structure.studentCategory}
              </strong>
              <span className="text-[10px] text-slate-500">Target Group</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Annual Total</span>
              <strong className="text-sm font-black text-emerald-400 mt-0.5 block">
                ₹{totalAmount.toLocaleString()}
              </strong>
              <span className="text-[10px] text-slate-400">{structure.currency}</span>
            </div>
          </div>

          {/* Fee Heads Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Fee Heads Breakdown ({structure.items?.length || 1} Heads)
              </h3>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Fee Head</th>
                    <th className="py-2.5 px-4">Frequency</th>
                    <th className="py-2.5 px-3 text-center">Mandatory</th>
                    <th className="py-2.5 px-3 text-center">Discount</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {structure.items && structure.items.length > 0 ? (
                    structure.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.feeCategory?.name || 'Fee Head'}
                          </div>
                          {item.feeCategory?.code && (
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.feeCategory.code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{getFrequencyBadge(item.frequency)}</td>
                        <td className="py-3 px-3 text-center">
                          {item.isMandatory ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold gap-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Yes</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-400 font-medium gap-0.5">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Optional</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.discountAllowed ? (
                            <span className="inline-flex items-center text-purple-600 font-bold gap-0.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Allowed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-400 font-medium gap-0.5">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>No</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          ₹{Number(item.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {structure.feeCategory?.name || 'Base Tuition'}
                      </td>
                      <td className="py-3 px-4">{getFrequencyBadge('QUARTERLY')}</td>
                      <td className="py-3 px-3 text-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 inline" />
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ₹{totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 font-extrabold text-slate-900 border-t border-slate-200">
                    <td colSpan={4} className="py-3 px-4 text-right uppercase text-[11px] text-slate-500">
                      Total Annual Amount
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 text-sm">
                      ₹{totalAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Options Preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                Configured Payment Options
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <strong className="font-bold text-slate-900">Full-Year Plan</strong>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    1 Installment
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Single upfront payment of ₹{totalAmount.toLocaleString()} due at session start (April).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <strong className="font-bold text-slate-900">Quarterly Plan</strong>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    4 Installments
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Split into Q1 (April), Q2 (July), Q3 (October), Q4 (January) of ~₹{Math.round(totalAmount / 4).toLocaleString()} each.
                </p>
              </div>
            </div>
          </div>

          {/* Audit Trail Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Created by:</span>
              <strong className="text-slate-700">{structure.createdBy?.name || 'Finance Administrator'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Last updated:</span>
              <strong className="text-slate-700">{new Date(structure.updatedAt).toLocaleString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Active student assignments:</span>
              <strong className="text-slate-700">{structure._count?.feeAssignments || 0} students assigned</strong>
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
