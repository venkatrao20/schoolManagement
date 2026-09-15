import React from 'react';
import { X, User, Calendar, Award, FileText, Layers } from 'lucide-react';
import { FeeAssignment } from '../../types';
import { Badge } from '../../components/Badge';

interface FeeAssignmentDetailModalProps {
  assignment: FeeAssignment | null;
  onClose: () => void;
}

export const FeeAssignmentDetailModal: React.FC<FeeAssignmentDetailModalProps> = ({
  assignment,
  onClose,
}) => {
  if (!assignment) return null;

  let calculationDetails: any = null;
  if (assignment.calculationDetails) {
    try {
      calculationDetails = JSON.parse(assignment.calculationDetails);
    } catch {
      calculationDetails = null;
    }
  }

  const items = calculationDetails?.items || [];
  const quarters = calculationDetails?.quarters || calculationDetails?.installments || [];
  const appliedDiscounts = calculationDetails?.appliedDiscounts || [];

  const grossAmount = Number(assignment.originalAmount || calculationDetails?.grossAmount || 0);
  const discountAmount = Number(assignment.discountApplied || calculationDetails?.discountAmount || 0);
  const finalPayable = Number(assignment.finalPayableAmount || calculationDetails?.finalPayable || 0);

  const studentName = assignment.student
    ? `${assignment.student.firstName} ${assignment.student.lastName}`
    : 'Student';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-3xl bg-white min-h-screen shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-all duration-300">
        <div>
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white p-6 sticky top-0 z-10 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20">
                <FileText className="w-6 h-6 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">Student Fee Breakdown & Schedule</h2>
                  <Badge variant="info" size="sm">
                    {assignment.academicYear || '2026-2027'}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  Official fee schedule and immutable calculation breakdown snapshot
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Student & Structure Profile Card */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-xl p-5 border border-emerald-100/80 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{studentName}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pl-6">
                    <p>Admission No: <span className="font-mono font-medium text-slate-900">{assignment.student?.admissionNumber || 'N/A'}</span></p>
                    <p>Current Grade / Class: <span className="font-medium text-slate-900">{assignment.student?.currentGrade || assignment.feeStructure?.gradeOrClass || 'N/A'}</span></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>{assignment.feeStructure?.name || 'Academic Fee Structure'}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pl-6">
                    <p>Payment Option: <Badge variant="default" size="sm">{assignment.paymentOption || assignment.paymentPlan?.frequency || 'FULL_YEAR'}</Badge></p>
                    <p>Assigned Date: <span className="font-medium text-slate-900">{new Date(assignment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Fee</div>
                <div className="text-xl font-bold text-slate-800 mt-1">
                  ₹{grossAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Annual base fee</div>
              </div>

              <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 text-center">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Concessions</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  - ₹{discountAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Applied discount</div>
              </div>

              <div className="bg-teal-900 text-white rounded-xl p-4 border border-teal-800 text-center shadow-md">
                <div className="text-xs font-semibold text-teal-200 uppercase tracking-wider">Net Payable</div>
                <div className="text-xl font-extrabold text-white mt-1">
                  ₹{finalPayable.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-teal-200 mt-0.5">Total payable amount</div>
              </div>
            </div>

            {/* Itemized Fee Heads Table */}
            {items.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Itemized Fee Category Heads
                </h3>
                <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5">Fee Head</th>
                        <th className="py-2.5 px-3.5">Type</th>
                        <th className="py-2.5 px-3.5 text-right">Original (₹)</th>
                        <th className="py-2.5 px-3.5 text-right">Concession (₹)</th>
                        <th className="py-2.5 px-3.5 text-right">Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 font-medium text-slate-800">
                            {item.feeCategoryName || item.feeHead || 'General Fee'}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500">
                            <Badge variant="default" size="sm">{item.feeType || 'RECURRING'}</Badge>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-slate-700">
                            ₹{Number(item.originalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-emerald-600">
                            {Number(item.discountAmount || 0) > 0 ? `- ₹${Number(item.discountAmount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                            ₹{Number(item.payableAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Applied Discounts Section */}
            {appliedDiscounts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Applied Discounts & Concessions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {appliedDiscounts.map((disc: any, idx: number) => (
                    <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-emerald-900">{disc.name}</div>
                        <div className="text-[11px] text-emerald-700 font-mono">
                          {disc.code || disc.discountType} • {disc.discountType === 'PERCENTAGE' ? `${disc.ruleValue}%` : `₹${disc.ruleValue}`}
                        </div>
                      </div>
                      <div className="font-bold text-emerald-800 text-sm">
                        - ₹{Number(disc.calculatedDiscount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quarter / Installment Schedule */}
            {quarters.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Quarterly Payment Schedule & Due Dates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quarters.map((q: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">
                            {q.quarter ? `${q.quarter} Installment` : `Installment #${q.installmentNumber || idx + 1}`}
                          </span>
                          <Badge variant="info" size="sm">
                            {q.dueMonth || 'Due Period'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {q.dueDateRule || (q.dueDate ? `Due on ${new Date(q.dueDate).toLocaleDateString('en-IN')}` : 'Scheduled due date')}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Scheduled Amount:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{Number(q.payableAmount || q.finalAmount || q.baseAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Metadata */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Assignment Status:</span>
                <Badge variant={assignment.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                  {assignment.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Created By:</span>
                <span className="font-medium text-slate-700">{assignment.createdBy?.name || 'System / Finance Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span>Assignment ID:</span>
                <span className="font-mono text-[11px] text-slate-600">{assignment.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
