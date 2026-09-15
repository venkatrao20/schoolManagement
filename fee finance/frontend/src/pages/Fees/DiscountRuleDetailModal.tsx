import React from 'react';
import { X, Percent, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';
import { DiscountRule } from '../../types';
import { Badge } from '../../components/Badge';

interface DiscountRuleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: DiscountRule | null;
}

export const DiscountRuleDetailModal: React.FC<DiscountRuleDetailModalProps> = ({
  isOpen,
  onClose,
  rule,
}) => {
  if (!isOpen || !rule) return null;

  const getApplicableClasses = () => {
    if (!rule.applicableClasses) return ['All Classes / Grades'];
    try {
      const parsed = JSON.parse(rule.applicableClasses);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['All Classes / Grades'];
    } catch {
      return ['All Classes / Grades'];
    }
  };

  const getApplicableStudentCategories = () => {
    if (!rule.applicableStudentCategories) return ['All Student Categories'];
    try {
      const parsed = JSON.parse(rule.applicableStudentCategories);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['All Student Categories'];
    } catch {
      return ['All Student Categories'];
    }
  };

  const isPercentage = rule.discountType === 'PERCENTAGE';
  const valDisplay = isPercentage
    ? `${rule.discountValue || rule.value}%`
    : `₹${Number(rule.discountValue || rule.value).toLocaleString()}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Percent className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold">{rule.name}</h3>
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-xs font-mono font-bold">
                  {rule.code}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {rule.description || 'Configurable discount & concession policy rule'}
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

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Discount Value</span>
              <p className="text-lg font-black text-indigo-900 mt-0.5">{valDisplay}</p>
              <span className="text-[10px] text-indigo-600 font-semibold">{rule.discountType}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Option</span>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{rule.paymentOption || 'ANY'}</p>
              <span className="text-[10px] text-slate-500">Frequency restriction</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approval Status</span>
              <div className="mt-1">
                {rule.approvalStatus === 'APPROVED' ? (
                  <Badge variant="success" dot>Approved</Badge>
                ) : rule.approvalStatus === 'PENDING' ? (
                  <Badge variant="warning" dot>Pending</Badge>
                ) : (
                  <Badge variant="danger" dot>Rejected</Badge>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {rule.approvalRequired ? 'Approval enforced' : 'Auto-approved'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Status</span>
              <div className="mt-1">
                {rule.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{rule.status}</span>
            </div>
          </div>

          {/* Fee Heads Restrictions */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Eligible Fee Heads / Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {rule.feeHeads && rule.feeHeads.length > 0 ? (
                rule.feeHeads.map((fh) => (
                  <span
                    key={fh.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-100/80 text-indigo-800 text-xs font-bold border border-indigo-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    {fh.feeCategory?.name || fh.feeCategoryId}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-200/80 text-slate-700 text-xs font-semibold">
                  Applies to All Fee Categories
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              When calculating student fees, discount will apply only on eligible fee items.
            </p>
          </div>

          {/* Eligibility Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Applicable Classes */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Applicable Classes</span>
              <div className="flex flex-wrap gap-1">
                {getApplicableClasses().map((cls, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            {/* Applicable Student Categories */}
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student Categories</span>
              <div className="flex flex-wrap gap-1">
                {getApplicableStudentCategories().map((cat, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Criteria & Limits */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Eligibility Rules & Limits
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block">Eligibility Type:</span>
                <strong className="text-slate-800 font-bold">{rule.eligibilityType}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Min Amount Required:</span>
                <strong className="text-slate-800 font-bold">
                  {rule.minimumAmount ? `₹${Number(rule.minimumAmount).toLocaleString()}` : 'None'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Max Discount Cap:</span>
                <strong className="text-slate-800 font-bold">
                  {rule.maximumDiscount ? `₹${Number(rule.maximumDiscount).toLocaleString()}` : 'No Cap'}
                </strong>
              </div>
            </div>

            {rule.eligibilityCriteria && (
              <div className="p-3 bg-slate-50 rounded-xl text-slate-600 font-medium">
                <strong>Policy Memo:</strong> {rule.eligibilityCriteria}
              </div>
            )}
          </div>

          {/* Validity & Audit Meta */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 text-slate-500">
            <div className="flex items-center justify-between">
              <span>Valid From:</span>
              <strong className="text-slate-800">{new Date(rule.validFrom).toLocaleDateString()}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Valid Until:</span>
              <strong className="text-slate-800">
                {rule.validUntil || rule.validTo
                  ? new Date((rule.validUntil || rule.validTo)!).toLocaleDateString()
                  : 'Open-ended (No expiry)'}
              </strong>
            </div>
            {rule.approvedBy && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Approved By:
                </span>
                <strong className="text-slate-800">{rule.approvedBy.name} ({rule.approvedBy.role})</strong>
              </div>
            )}
            {rule.createdBy && (
              <div className="flex items-center justify-between">
                <span>Created By:</span>
                <strong className="text-slate-800">{rule.createdBy.name} ({rule.createdBy.role})</strong>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
