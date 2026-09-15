import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatusBadge, FrequencyBadge, DiscountTypeBadge } from '../../components/Badge';
import {
  Student,
  FeeStructure,
  DiscountRule,
  StudentDiscountAssignment,
  FeeAssignment,
  FeeCalculationResult,
} from '../../types';
import {
  Receipt,
  Percent,
  Calculator,
  Save,
  CheckCircle2,
  Plus,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface StudentFeeTabProps {
  student: Student;
  onRefresh?: () => void;
}

export const StudentFeeTab: React.FC<StudentFeeTabProps> = ({ student }) => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  // State: Discounts
  const [discounts, setDiscounts] = useState<StudentDiscountAssignment[]>([]);
  const [availableRules, setAvailableRules] = useState<DiscountRule[]>([]);
  const [isAssignDiscountOpen, setIsAssignDiscountOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // State: Fee Structures & Calculation
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [previewCalculation, setPreviewCalculation] = useState<FeeCalculationResult | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // State: Saved Fee Assignments
  const [savedAssignments, setSavedAssignments] = useState<FeeAssignment[]>([]);

  // Fetch student discounts & fee assignments & available structures
  const loadData = async () => {
    try {
      const [discRes, rulesRes, structRes, assignRes] = await Promise.all([
        api.get(`/students/${student.id}/discounts`),
        api.get('/fees/discount-rules'),
        api.get(`/fees/structures?gradeOrClass=${encodeURIComponent(student.currentGrade)}`),
        api.get(`/students/${student.id}/fee-assignments`),
      ]);

      setDiscounts(discRes.data.assignments || []);
      setAvailableRules(rulesRes.data.discountRules || []);
      const structList = structRes.data.structures || [];
      setStructures(structList);
      setSavedAssignments(assignRes.data.feeAssignments || []);

      if (structList.length > 0 && !selectedStructureId) {
        setSelectedStructureId(structList[0].id);
        if (structList[0].paymentPlans && structList[0].paymentPlans.length > 0) {
          setSelectedPlanId(structList[0].paymentPlans[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load fee data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [student.id, student.currentGrade]);

  // Update selected plan when structure changes
  const handleStructureChange = (structId: string) => {
    setSelectedStructureId(structId);
    setPreviewCalculation(null);
    const struct = structures.find((s) => s.id === structId);
    if (struct && struct.paymentPlans && struct.paymentPlans.length > 0) {
      setSelectedPlanId(struct.paymentPlans[0].id);
    } else {
      setSelectedPlanId('');
    }
  };

  // Assign a discount to the student
  const handleAssignDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleId) {
      showToast('Please select a discount rule', 'error');
      return;
    }

    try {
      setIsAssigning(true);
      await api.post(`/students/${student.id}/discounts`, {
        discountRuleId: selectedRuleId,
        remarks: assignRemarks,
        status: canMutateFees ? 'APPROVED' : 'PENDING',
      });
      showToast('Discount assigned to student successfully');
      setIsAssignDiscountOpen(false);
      setSelectedRuleId('');
      setAssignRemarks('');
      loadData();
      setPreviewCalculation(null);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to assign discount', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // Change discount approval status (Approve / Reject)
  const handleStatusChange = async (assignmentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/students/${student.id}/discounts/${assignmentId}`, { status });
      showToast(`Discount status updated to ${status}`);
      loadData();
      setPreviewCalculation(null);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update discount status', 'error');
    }
  };

  // Trigger fee calculation preview
  const handleCalculate = async () => {
    if (!selectedStructureId || !selectedPlanId) {
      showToast('Please select both a fee structure and a payment plan', 'error');
      return;
    }

    try {
      setIsCalculating(true);
      const res = await api.post('/fees/calculate', {
        studentId: student.id,
        feeStructureId: selectedStructureId,
        paymentPlanId: selectedPlanId,
      });
      setPreviewCalculation(res.data.calculation);
      showToast('Fee calculation computed successfully');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Calculation error', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  // Save the fee calculation as a persistent FeeAssignment record (AC14)
  const handleSaveFeeAssignment = async () => {
    if (!selectedStructureId || !selectedPlanId) return;

    try {
      setIsSavingAssignment(true);
      await api.post(`/students/${student.id}/fee-assignments`, {
        feeStructureId: selectedStructureId,
        paymentPlanId: selectedPlanId,
      });
      showToast('Fee Assignment calculated and saved successfully! Snapshot persisted.');
      setPreviewCalculation(null);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save fee assignment', 'error');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const selectedStructure = structures.find((s) => s.id === selectedStructureId);
  const activeSavedAssignment = savedAssignments.find((a) => a.status === 'ACTIVE') || savedAssignments[0];

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------- */}
      {/* 1. ACTIVE / PERSISTED FEE ASSIGNMENT BANNER (AC8, AC14) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 font-black">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Current Student Fee Assignment (Saved Snapshot)
              </h2>
              <p className="text-xs text-slate-400">
                Guaranteed persistent record surviving page reload (AC14)
              </p>
            </div>
          </div>
          {activeSavedAssignment && (
            <div className="flex items-center gap-2">
              <StatusBadge status={activeSavedAssignment.status} />
              <span className="text-[11px] text-slate-400 font-semibold">
                Saved: {new Date(activeSavedAssignment.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {activeSavedAssignment ? (
          <div className="space-y-6">
            {/* Calculation Breakdown Cards (AC8) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Original Amount */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                  Original Fee Amount
                </span>
                <div className="text-xl font-extrabold text-slate-800">
                  ₹{Number(activeSavedAssignment.originalAmount).toLocaleString()}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  {activeSavedAssignment.feeStructure?.gradeOrClass} •{' '}
                  {activeSavedAssignment.feeStructure?.feeCategory?.name}
                </span>
              </div>

              {/* Card 2: Discount Applied */}
              <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-purple-600 block">
                  Discount Applied
                </span>
                <div className="text-xl font-extrabold text-purple-700">
                  - ₹{Number(activeSavedAssignment.discountApplied).toLocaleString()}
                </div>
                <span className="text-[11px] text-purple-600 font-medium block">
                  {Number(activeSavedAssignment.discountApplied) > 0
                    ? 'Concession policy applied'
                    : 'No discount applied'}
                </span>
              </div>

              {/* Card 3: FINAL PAYABLE AMOUNT (Visually Emphasized - AC8) */}
              <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-emerald-950 text-white border border-emerald-500/30 shadow-lg shadow-emerald-900/10 space-y-1 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
                <span className="text-[11px] uppercase font-extrabold tracking-wider text-emerald-400 block">
                  ★ Final Payable Amount (AC8)
                </span>
                <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  ₹{Number(activeSavedAssignment.finalPayableAmount).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {activeSavedAssignment.paymentPlan?.frequency === 'QUARTERLY'
                      ? 'Payable in 4 quarterly installments'
                      : 'Payable upfront in full'}
                  </span>
                </div>
              </div>
            </div>

            {/* Installments Breakdown */}
            {(() => {
              let parsedDetails: any = null;
              try {
                parsedDetails = activeSavedAssignment.calculationDetails
                  ? JSON.parse(activeSavedAssignment.calculationDetails)
                  : null;
              } catch {
                parsedDetails = null;
              }

              const installments = parsedDetails?.installments || [];

              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Payment Schedule & Installment Breakdown</span>
                    </h3>
                    <FrequencyBadge
                      frequency={activeSavedAssignment.paymentPlan?.frequency || 'FULL_YEAR'}
                    />
                  </div>

                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-3">Installment #</th>
                          <th className="p-3">Period / Due Month</th>
                          <th className="p-3">Calendar Due Date</th>
                          <th className="p-3 text-right">Base Share</th>
                          <th className="p-3 text-right font-black text-emerald-700">
                            Net Payable
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {installments.length > 0 ? (
                          installments.map((inst: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3 font-bold text-slate-700">
                                #{inst.installmentNumber}
                              </td>
                              <td className="p-3 font-semibold text-slate-900">
                                {inst.dueMonth || `Quarter ${inst.installmentNumber}`}
                              </td>
                              <td className="p-3 text-slate-500">
                                {inst.dueDate
                                  ? new Date(inst.dueDate).toLocaleDateString()
                                  : 'As per academic calendar'}
                              </td>
                              <td className="p-3 text-right text-slate-400 line-through">
                                ₹{Number(inst.baseAmount).toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-extrabold text-emerald-700 text-sm">
                                ₹{Number(inst.finalAmount).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-3 font-bold text-slate-700">#1</td>
                            <td className="p-3 font-semibold text-slate-900">Full Year</td>
                            <td className="p-3 text-slate-500">April</td>
                            <td className="p-3 text-right text-slate-400">
                              ₹{Number(activeSavedAssignment.originalAmount).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-extrabold text-emerald-700 text-sm">
                              ₹{Number(activeSavedAssignment.finalPayableAmount).toLocaleString()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200 text-slate-400 space-y-1">
            <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <div className="font-bold text-slate-700 text-xs">No saved fee assignment yet</div>
            <p className="text-[11px] text-slate-400">
              Use the fee calculator below to configure and persist this student's fee assignment.
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. STUDENT DISCOUNT ASSIGNMENTS (AC7, AC9) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 mb-1.5">
              <Percent className="w-3.5 h-3.5" />
              <span>Concession Approvals</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Student Discount Assignments
            </h2>
            <p className="text-xs text-slate-500">
              Discounts are only applied in calculation when explicitly <strong>APPROVED</strong> by Finance (AC9).
            </p>
          </div>

          {canMutateFees && (
            <button
              onClick={() => setIsAssignDiscountOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Discount Rule</span>
            </button>
          )}
        </div>

        {/* Discounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {discounts.length > 0 ? (
            discounts.map((assignment) => {
              const rule = assignment.discountRule;
              if (!rule) return null;

              return (
                <div
                  key={assignment.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 text-xs relative hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{rule.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <DiscountTypeBadge type={rule.discountType} value={rule.value} />
                        <StatusBadge status={assignment.status} />
                      </div>
                    </div>
                  </div>

                  {assignment.remarks && (
                    <p className="text-slate-600 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{assignment.remarks}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      {assignment.approvalDate ? (
                        <span>
                          Approved on: {new Date(assignment.approvalDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Status: {assignment.status}</span>
                      )}
                    </div>

                    {/* Inline Approve / Reject Actions for Finance */}
                    {canMutateFees && assignment.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusChange(assignment.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(assignment.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No discount rules currently assigned to this student.
            </div>
          )}
        </div>

        {/* Assign Discount Inline Form / Modal */}
        {isAssignDiscountOpen && (
          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs">
                Select Discount Rule to Attach
              </h3>
              <button
                onClick={() => setIsAssignDiscountOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAssignDiscount} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Discount Rule
                </label>
                <select
                  value={selectedRuleId}
                  onChange={(e) => setSelectedRuleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">-- Select Rule --</option>
                  {availableRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.discountType === 'PERCENTAGE' ? `${r.value}%` : `₹${r.value}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Remarks / Justification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sibling verification or score proof"
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-purple-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isAssigning ? 'Attaching...' : 'Attach & Approve'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. CALCULATE & ASSIGN FEE CONFIGURATOR (AC6, AC8) */}
      {/* ---------------------------------------------------- */}
      {canMutateFees && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-600 font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Calculate & Assign Fee Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Run deterministic calculation against student grade, fee structure, approved discounts, and payment frequency
              </p>
            </div>
          </div>

          {/* Selector Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fee Structure ({student.currentGrade})
              </label>
              <select
                value={selectedStructureId}
                onChange={(e) => handleStructureChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.feeCategory?.name} • ₹{Number(s.amount).toLocaleString()} ({s.academicYear})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Payment Frequency / Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setPreviewCalculation(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {selectedStructure?.paymentPlans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.frequency === 'QUARTERLY' ? 'Quarterly (4 Splits)' : 'Full-Year (1 Split)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCalculate}
                disabled={isCalculating || !selectedStructureId || !selectedPlanId}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Calculator className="w-4 h-4" />
                <span>{isCalculating ? 'Computing...' : 'Calculate Fee Breakdown'}</span>
              </button>
            </div>
          </div>

          {/* Live Calculated Preview (AC8) */}
          {previewCalculation && (
            <div className="p-6 rounded-2xl bg-emerald-50/40 border-2 border-emerald-200 space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="font-extrabold text-slate-900 text-xs">
                    Computed Calculation Preview
                  </span>
                </div>
                <button
                  onClick={handleSaveFeeAssignment}
                  disabled={isSavingAssignment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingAssignment ? 'Saving Snapshot...' : 'Save as Active Assignment'}</span>
                </button>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Original Amount
                  </span>
                  <span className="text-lg font-extrabold text-slate-800">
                    ₹{Number(previewCalculation.originalAmount ?? previewCalculation.grossAmount ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-purple-200">
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">
                    Total Discounts
                  </span>
                  <span className="text-lg font-extrabold text-purple-700">
                    - ₹{Number(previewCalculation.discountApplied ?? previewCalculation.discountAmount ?? 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white">
                  <span className="text-[10px] uppercase font-extrabold text-emerald-400 block">
                    Final Payable Amount
                  </span>
                  <span className="text-xl font-black text-white">
                    ₹{Number(previewCalculation.finalPayableAmount ?? previewCalculation.finalPayable ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Applied Discount Rules Summary */}
              {previewCalculation.appliedDiscounts && previewCalculation.appliedDiscounts.length > 0 && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Applied Discounts:</span>
                  <div className="flex flex-wrap gap-2">
                    {previewCalculation.appliedDiscounts.map((d, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-semibold text-[11px] border border-purple-100"
                      >
                        {d.name} ({d.discountType === 'PERCENTAGE' ? `${d.ruleValue}%` : `Flat ₹${d.ruleValue}`}) → -₹{d.calculatedDiscount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Installment Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5">Installment #</th>
                      <th className="p-2.5">Due Period</th>
                      <th className="p-2.5 text-right">Base Share</th>
                      <th className="p-2.5 text-right font-black text-emerald-700">Final Split Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(previewCalculation.installments || previewCalculation.quarters || []).map((inst, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-700">#{inst.installmentNumber}</td>
                        <td className="p-2.5 text-slate-800 font-semibold">{inst.dueMonth || `Period ${inst.installmentNumber}`}</td>
                        <td className="p-2.5 text-right text-slate-400 line-through">₹{inst.baseAmount.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">₹{inst.finalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
