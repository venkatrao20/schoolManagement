import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PaymentPlanEditorModal, PaymentPlanFormData } from './PaymentPlanEditorModal';
import { PaymentPlanDetailModal } from './PaymentPlanDetailModal';
import { PaymentPlan, FeeStructure } from '../../types';
import {
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Layers,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
} from 'lucide-react';

export const PaymentPlans: React.FC = () => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedStructureId, setSelectedStructureId] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PaymentPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PaymentPlan | null>(null);
  const [togglePlan, setTogglePlan] = useState<PaymentPlan | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [plansRes, structRes] = await Promise.all([
        api.get('/fees/payment-plans?includeInactive=true'),
        api.get('/fees/structures?includeInactive=true'),
      ]);
      setPlans(plansRes.data.paymentPlans || plansRes.data.plans || []);
      setStructures(structRes.data.feeStructures || structRes.data.structures || []);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load payment plans', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSavePlan = async (data: PaymentPlanFormData) => {
    try {
      if (editingPlan) {
        const res = await api.patch(`/fees/payment-plans/${editingPlan.id}`, data);
        showToast(res.data.message || 'Payment plan updated successfully', 'success');
      } else {
        const res = await api.post(`/fees/structures/${data.feeStructureId}/payment-plans`, data);
        showToast(res.data.message || 'Payment plan configured successfully', 'success');
      }
      setIsEditorOpen(false);
      setEditingPlan(null);
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save payment plan', 'error');
    }
  };

  const handleToggleStatus = async () => {
    if (!togglePlan) return;
    try {
      const res = await api.delete(`/fees/payment-plans/${togglePlan.id}`);
      showToast(res.data.message || 'Payment plan status updated successfully', 'success');
      setTogglePlan(null);
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update plan status', 'error');
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesStructure =
        selectedStructureId === 'ALL' || p.feeStructureId === selectedStructureId;
      const matchesFreq = selectedFrequency === 'ALL' || p.frequency === selectedFrequency;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && p.isActive) ||
        (selectedStatus === 'INACTIVE' && !p.isActive);

      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.feeStructure?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.feeStructure?.gradeOrClass.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.feeStructure?.academicYear.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStructure && matchesFreq && matchesStatus && matchesSearch;
    });
  }, [plans, selectedStructureId, selectedFrequency, selectedStatus, searchTerm]);

  // Pagination slice
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage) || 1;
  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary KPI Metrics
  const totalPlans = plans.length;
  const activeQuarterlyPlans = plans.filter((p) => p.frequency === 'QUARTERLY' && p.isActive).length;
  const activeFullYearPlans = plans.filter((p) => p.frequency === 'FULL_YEAR' && p.isActive).length;
  const structuresWithPlansCount = new Set(plans.map((p) => p.feeStructureId)).size;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-3 border border-indigo-200/60">
            <Calendar className="w-3.5 h-3.5" />
            <span>Installment & Frequency Schedules</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Payment Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure flexible payment schedules for fee structures (Quarterly Q1–Q4 with custom head allocations, or Full-Year upfront) and due date rules.
          </p>
        </div>

        {canMutateFees && (
          <button
            onClick={() => {
              setEditingPlan(null);
              setIsEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Payment Plan</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Plans</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalPlans}</h4>
            <span className="text-[10px] text-indigo-600 font-bold">{plans.filter((p) => p.isActive).length} active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quarterly Schedules</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{activeQuarterlyPlans}</h4>
            <span className="text-[10px] text-indigo-600 font-semibold">4 Quarters (Q1–Q4)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Full-Year Plans</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{activeFullYearPlans}</h4>
            <span className="text-[10px] text-emerald-600 font-semibold">1 Upfront Payment</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Structures Covered</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{structuresWithPlansCount}</h4>
            <span className="text-[10px] text-purple-600 font-bold">Of {structures.length} structures</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search plan name, class or academic year..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
          {/* Fee Structure Filter */}
          <select
            value={selectedStructureId}
            onChange={(e) => {
              setSelectedStructureId(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-xs"
          >
            <option value="ALL">All Fee Structures</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.gradeOrClass} - {s.name} ({s.academicYear})
              </option>
            ))}
          </select>

          {/* Frequency Filter */}
          <select
            value={selectedFrequency}
            onChange={(e) => {
              setSelectedFrequency(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Frequencies</option>
            <option value="QUARTERLY">Quarterly (4 Quarters)</option>
            <option value="FULL_YEAR">Full Year (1 Payment)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Reset Filters */}
          {(selectedStructureId !== 'ALL' || selectedFrequency !== 'ALL' || selectedStatus !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedStructureId('ALL');
                setSelectedFrequency('ALL');
                setSelectedStatus('ALL');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              title="Reset all filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : paginatedPlans.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <div className="font-bold text-slate-700 text-sm">No payment plans match your criteria</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your filters or click "Configure Payment Plan" to define a new schedule.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Plan Name</th>
                  <th className="py-4 px-4">Fee Structure</th>
                  <th className="py-4 px-4">Frequency</th>
                  <th className="py-4 px-4">Configured Installments Breakdown</th>
                  <th className="py-4 px-4 text-right">Scheduled Total</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedPlans.map((plan) => {
                  const installments = plan.installments || [];
                  const planTotal = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);

                  return (
                    <tr
                      key={plan.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !plan.isActive ? 'bg-slate-50/30 opacity-70' : ''
                      }`}
                    >
                      {/* Plan Name */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-sm">{plan.name}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {installments.length} {installments.length === 1 ? 'installment' : 'installments'}
                        </span>
                      </td>

                      {/* Associated Fee Structure */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">
                          {plan.feeStructure?.gradeOrClass} - {plan.feeStructure?.name}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {plan.feeStructure?.academicYear} • ₹{Number(plan.feeStructure?.amount || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Frequency Badge */}
                      <td className="py-4 px-4">
                        {plan.frequency === 'FULL_YEAR' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Full Year
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            Quarterly (4Q)
                          </span>
                        )}
                      </td>

                      {/* Installments Breakdown Chips */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {installments.map((inst, idx) => (
                            <span
                              key={inst.id || idx}
                              className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold"
                            >
                              {inst.quarter || `P${inst.sequence || idx + 1}`}: ₹{Number(inst.amount).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total Scheduled Amount */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-900 text-sm">
                        ₹{planTotal.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {plan.isActive ? (
                          <Badge variant="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Detail Action */}
                          <button
                            onClick={() => setViewingPlan(plan)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View complete payment plan schedule"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => {
                                setEditingPlan(plan);
                                setIsEditorOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit payment schedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Activate / Deactivate Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => setTogglePlan(plan)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                plan.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={plan.isActive ? 'Deactivate payment plan' : 'Activate payment plan'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-700">{filteredPlans.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-700">
              {Math.min(currentPage * itemsPerPage, filteredPlans.length)}
            </strong>{' '}
            of <strong className="text-slate-700">{filteredPlans.length}</strong> payment plans
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <div className="px-2 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isEditorOpen && (
        <PaymentPlanEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingPlan(null);
          }}
          onSubmit={handleSavePlan}
          initialData={editingPlan}
        />
      )}

      {/* Detail Slide-Over Modal */}
      {viewingPlan && (
        <PaymentPlanDetailModal
          isOpen={Boolean(viewingPlan)}
          onClose={() => setViewingPlan(null)}
          plan={viewingPlan}
        />
      )}

      {/* Confirmation Dialog for Status Change */}
      {togglePlan && (
        <ConfirmDialog
          isOpen={Boolean(togglePlan)}
          onClose={() => setTogglePlan(null)}
          onConfirm={handleToggleStatus}
          title={togglePlan.isActive ? 'Deactivate Payment Plan' : 'Activate Payment Plan'}
          message={
            togglePlan.isActive
              ? `Are you sure you want to deactivate "${togglePlan.name}" for ${togglePlan.feeStructure?.gradeOrClass}? Existing student fee assignments will remain intact, but new assignments will not default to this plan.`
              : `Are you sure you want to reactivate "${togglePlan.name}" for ${togglePlan.feeStructure?.gradeOrClass}?`
          }
          confirmText={togglePlan.isActive ? 'Deactivate' : 'Activate'}
          isDanger={togglePlan.isActive}
        />
      )}
    </div>
  );
};
