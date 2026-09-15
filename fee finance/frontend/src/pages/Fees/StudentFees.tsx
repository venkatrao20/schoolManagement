import React, { useEffect, useState, useCallback } from 'react';
import {
  Calculator,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Student,
  FeeStructure,
  FeeAssignment,
  FeeCalculationResult,
} from '../../types';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../api/client';
import { FeeAssignmentDetailModal } from './FeeAssignmentDetailModal';

const ACADEMIC_YEARS = ['2026-2027', '2025-2026', '2024-2025'];
const GRADES = [
  'Pre-K',
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

export const StudentFees: React.FC = () => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  // Directory state
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('2026-2027');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentOptionFilter, setPaymentOptionFilter] = useState('all');

  // Calculator Workbench state
  const [students, setStudents] = useState<Student[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [calcAcademicYear, setCalcAcademicYear] = useState('2026-2027');
  const [calcPaymentOption, setCalcPaymentOption] = useState<'FULL_YEAR' | 'QUARTERLY'>('FULL_YEAR');
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');
  const [calculationResult, setCalculationResult] = useState<FeeCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Detail Modal state
  const [viewingAssignment, setViewingAssignment] = useState<FeeAssignment | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsRes, studentsRes, structuresRes] = await Promise.all([
        api.get('/fees/assignments', {
          params: {
            academicYear: academicYearFilter !== 'all' ? academicYearFilter : undefined,
            gradeOrClass: gradeFilter !== 'all' ? gradeFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            paymentOption: paymentOptionFilter !== 'all' ? paymentOptionFilter : undefined,
            search: search || undefined,
          },
        }),
        api.get('/students', { params: { limit: 100 } }),
        api.get('/fees/structures', { params: { isActive: 'true', academicYear: calcAcademicYear } }),
      ]);

      setAssignments(assignmentsRes.data.feeAssignments || assignmentsRes.data.assignments || []);
      const fetchedStudents = studentsRes.data.students || [];
      setStudents(fetchedStudents);
      setStructures(structuresRes.data.feeStructures || structuresRes.data.structures || []);

      if (fetchedStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(fetchedStudents[0].id);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to fetch student fee data', 'error');
    } finally {
      setLoading(false);
    }
  }, [academicYearFilter, gradeFilter, statusFilter, paymentOptionFilter, search, calcAcademicYear, showToast, selectedStudentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recalculate whenever calculator inputs change
  const runLiveCalculation = useCallback(async () => {
    if (!selectedStudentId) return;
    setCalculating(true);
    try {
      const res = await api.post('/fees/calculate', {
        studentId: selectedStudentId,
        academicYear: calcAcademicYear,
        paymentOption: calcPaymentOption,
        feeStructureId: selectedStructureId || undefined,
      });

      const calc = res.data.calculation || res.data;
      setCalculationResult(calc);

      if (!selectedStructureId && calc.feeStructure?.id) {
        setSelectedStructureId(calc.feeStructure.id);
      }
    } catch (err: any) {
      setCalculationResult(null);
      // Soft notice for missing structures
    } finally {
      setCalculating(false);
    }
  }, [selectedStudentId, calcAcademicYear, calcPaymentOption, selectedStructureId]);

  useEffect(() => {
    if (selectedStudentId) {
      runLiveCalculation();
    }
  }, [selectedStudentId, calcAcademicYear, calcPaymentOption, selectedStructureId, runLiveCalculation]);

  // Handle assigning calculated fee to student
  const handleAssignFee = async () => {
    if (!selectedStudentId || !calculationResult) return;

    setAssigning(true);
    try {
      const res = await api.post('/fees/assignments', {
        studentId: selectedStudentId,
        academicYear: calcAcademicYear,
        paymentOption: calcPaymentOption,
        feeStructureId: calculationResult.feeStructure?.id || selectedStructureId,
        paymentPlanId: calculationResult.paymentPlan?.id,
      });

      showToast(res.data.message || 'Fee successfully assigned to student!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to assign fee', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Metrics
  const totalAssignedCount = assignments.filter((a) => a.status === 'ACTIVE').length;
  const totalGrossAmount = assignments
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + Number(a.originalAmount || 0), 0);
  const totalDiscountsGranted = assignments
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + Number(a.discountApplied || 0), 0);
  const totalNetReceivable = assignments
    .filter((a) => a.status === 'ACTIVE')
    .reduce((sum, a) => sum + Number(a.finalPayableAmount || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Fee Management</h1>
            <Badge variant="info" size="sm">Module 5</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Calculate, assess, and assign customized fee schedules with automated discount & concession evaluation.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Assignments</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAssignedCount}</h3>
            <p className="text-xs text-emerald-600 mt-0.5 font-medium">Assigned students</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Gross Assessed</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{totalGrossAmount.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Base scheduled amount</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Concessions Granted</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{totalDiscountsGranted.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-emerald-600 mt-0.5">Approved policy waivers</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-5 rounded-xl border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-teal-300 uppercase tracking-wider">Net Fee Receivable</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">₹{totalNetReceivable.toLocaleString('en-IN')}</h3>
            <p className="text-xs text-teal-200 mt-0.5">Total payable balance</p>
          </div>
          <div className="p-3 bg-white/10 text-teal-300 rounded-xl backdrop-blur-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Interactive Central Fee Calculation Workbench */}
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Central Fee Calculation Workbench</h2>
              <p className="text-xs text-emerald-100/90">
                16-step backend deterministic calculation engine evaluating structure, plan, options, and concessions
              </p>
            </div>
          </div>
          {calculating && (
            <div className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
              <span>Calculating backend truth...</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Top Inputs: Student, Academic Year, Payment Option, Structure */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 1. Student Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Student *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setSelectedStructureId('');
                }}
                className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm font-medium"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber} - {s.currentGrade})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Academic Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Academic Year *
              </label>
              <select
                value={calcAcademicYear}
                onChange={(e) => setCalcAcademicYear(e.target.value)}
                className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm"
              >
                {ACADEMIC_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Payment Option Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Option *
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCalcPaymentOption('FULL_YEAR')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    calcPaymentOption === 'FULL_YEAR'
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full Year Upfront
                </button>
                <button
                  type="button"
                  onClick={() => setCalcPaymentOption('QUARTERLY')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    calcPaymentOption === 'QUARTERLY'
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Quarterly (4 Quarters)
                </button>
              </div>
            </div>

            {/* 4. Fee Structure (Auto-selected or override) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fee Structure (Auto/Manual)
              </label>
              <select
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                className="w-full text-sm border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm"
              >
                <option value="">Auto-matched for Student Class</option>
                {structures.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.gradeOrClass} - ₹{Number(st.amount).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Profile Ribbon */}
          {selectedStudent && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-500">Student:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Admission No:</span>{' '}
                  <span className="font-mono font-bold text-slate-800">{selectedStudent.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500">Class:</span>{' '}
                  <Badge variant="info" size="sm">{selectedStudent.currentGrade}</Badge>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <Badge variant="success" size="sm">{selectedStudent.status}</Badge>
                </div>
              </div>

              {canMutateFees && calculationResult && (
                <button
                  type="button"
                  onClick={handleAssignFee}
                  disabled={assigning}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold rounded-lg shadow-sm hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {assigning ? 'Assigning Fee...' : 'Commit & Assign Fee to Student'}
                </button>
              )}
            </div>
          )}

          {/* Live Calculation Output Display */}
          {calculationResult ? (
            <div className="space-y-6">
              {/* Financial Totals Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Applicable Fee</span>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    ₹{Number(calculationResult.grossAmount || calculationResult.originalAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Full fee before concessions</div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Eligible Concessions</span>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    - ₹{Number(calculationResult.discountAmount || calculationResult.discountApplied || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    {calculationResult.appliedDiscounts?.length || 0} active discount policy applied
                  </div>
                </div>

                <div className="p-4 bg-teal-900 text-white rounded-xl shadow-md border border-teal-800">
                  <span className="text-xs font-bold text-teal-200 uppercase tracking-wider">Final Net Payable</span>
                  <div className="text-2xl font-black text-white mt-1">
                    ₹{Number(calculationResult.finalPayable || calculationResult.finalPayableAmount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-teal-200 mt-0.5">
                    Option: {calcPaymentOption === 'FULL_YEAR' ? 'Full-Year Lump Sum' : '4 Scheduled Quarters'}
                  </div>
                </div>
              </div>

              {/* Itemized Fee Breakdown Table */}
              {calculationResult.items && calculationResult.items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Itemized Fee Category Breakdown
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Fee Structure: {calculationResult.feeStructure?.name || 'Standard'}
                    </span>
                  </div>

                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-4 text-left">Fee Head</th>
                        <th className="py-2.5 px-4 text-left">Type</th>
                        <th className="py-2.5 px-4 text-right">Original Amount (₹)</th>
                        <th className="py-2.5 px-4 text-right">Eligible Discount (₹)</th>
                        <th className="py-2.5 px-4 text-right">Final Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {calculationResult.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {item.feeCategoryName}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <Badge variant="default" size="sm">{item.feeType}</Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-700">
                            ₹{Number(item.originalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            {item.discountAmount > 0 ? `- ₹${Number(item.discountAmount).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                            ₹{Number(item.payableAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Quarterly Payment Schedule Breakdown Cards */}
              {calcPaymentOption === 'QUARTERLY' && calculationResult.quarters && calculationResult.quarters.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Quarterly Installment Schedule (Q1–Q4)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {calculationResult.quarters.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-900 text-sm">{q.quarter || `Q${idx + 1}`}</span>
                            <Badge variant="info" size="sm">{q.dueMonth}</Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {q.dueDateRule || 'Quarterly scheduled dues'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Payable:</span>
                          <span className="text-base font-extrabold text-slate-900">
                            ₹{Number(q.payableAmount || q.finalAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applied Discount Details */}
              {calculationResult.appliedDiscounts && calculationResult.appliedDiscounts.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Active Concessions Evaluated for Student
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {calculationResult.appliedDiscounts.map((disc, idx) => (
                      <div key={idx} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-emerald-950">{disc.name}</div>
                          <div className="text-[11px] text-emerald-800 mt-0.5">
                            Code: <span className="font-mono font-semibold">{disc.code || 'N/A'}</span> • Type: {disc.discountType} ({disc.ruleValue}{disc.discountType === 'PERCENTAGE' ? '%' : ' INR'})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-emerald-700 text-sm">
                            - ₹{Number(disc.calculatedDiscount).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-emerald-600">Saved</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Calculator className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No active fee structure found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Ensure an active Fee Structure exists for the student's current grade ({selectedStudent?.currentGrade || 'Class'}) in Academic Year {calcAcademicYear}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Student Fee Assignments Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Student Fee Assignments Directory</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical ledger of assigned fee schedules and payment options
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or admission #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Academic Year Filter */}
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="text-xs border-slate-300 rounded-lg py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="all">All Years</option>
              {ACADEMIC_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="text-xs border-slate-300 rounded-lg py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="all">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Payment Option Filter */}
            <select
              value={paymentOptionFilter}
              onChange={(e) => setPaymentOptionFilter(e.target.value)}
              className="text-xs border-slate-300 rounded-lg py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="all">All Options</option>
              <option value="FULL_YEAR">Full Year</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border-slate-300 rounded-lg py-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUPERSEDED">Superseded</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Student & Admission</th>
                <th className="py-3 px-4">Grade / Year</th>
                <th className="py-3 px-4">Option / Plan</th>
                <th className="py-3 px-4 text-right">Gross (₹)</th>
                <th className="py-3 px-4 text-right">Concession (₹)</th>
                <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                <th className="py-3 px-4">Assigned On</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading fee assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No student fee assignments found matching filter criteria.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const studentName = assignment.student
                    ? `${assignment.student.firstName} ${assignment.student.lastName}`
                    : 'Unknown Student';

                  return (
                    <tr key={assignment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{studentName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {assignment.student?.admissionNumber || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {assignment.student?.currentGrade || assignment.feeStructure?.gradeOrClass || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {assignment.academicYear || '2026-2027'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={assignment.paymentOption === 'QUARTERLY' ? 'warning' : 'info'}
                          size="sm"
                        >
                          {assignment.paymentOption || 'FULL_YEAR'}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹{Number(assignment.originalAmount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-emerald-600">
                        {Number(assignment.discountApplied) > 0
                          ? `- ₹${Number(assignment.discountApplied).toLocaleString('en-IN')}`
                          : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ₹{Number(assignment.finalPayableAmount).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {new Date(assignment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            assignment.status === 'ACTIVE'
                              ? 'success'
                              : assignment.status === 'SUPERSEDED'
                              ? 'default'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {assignment.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewingAssignment(assignment)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Breakdown Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Modal */}
      {viewingAssignment && (
        <FeeAssignmentDetailModal
          assignment={viewingAssignment}
          onClose={() => setViewingAssignment(null)}
        />
      )}
    </div>
  );
};
