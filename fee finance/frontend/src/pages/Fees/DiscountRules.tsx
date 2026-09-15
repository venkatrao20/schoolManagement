import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DiscountRuleModal } from './DiscountRuleModal';
import { DiscountRuleDetailModal } from './DiscountRuleDetailModal';
import { DiscountRule, FeeCategory } from '../../types';
import {
  Percent,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const DiscountRules: React.FC = () => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedPaymentOption, setSelectedPaymentOption] = useState('ALL');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [viewingRule, setViewingRule] = useState<DiscountRule | null>(null);
  const [toggleRule, setToggleRule] = useState<DiscountRule | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<{ rule: DiscountRule; action: 'APPROVE' | 'REJECT' } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, catRes] = await Promise.all([
        api.get('/fees/discount-rules?includeInactive=true'),
        api.get('/fees/categories'),
      ]);
      setRules(rulesRes.data.discountRules || rulesRes.data.rules || []);
      setCategories(catRes.data.categories || []);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load discount rules', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRule = async (data: any) => {
    try {
      if (editingRule) {
        const res = await api.patch(`/fees/discount-rules/${editingRule.id}`, data);
        showToast(res.data.message || 'Discount rule updated successfully', 'success');
      } else {
        const res = await api.post('/fees/discount-rules', data);
        showToast(res.data.message || 'Discount rule created successfully', 'success');
      }
      setIsCreateModalOpen(false);
      setEditingRule(null);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save discount rule', 'error');
    }
  };

  const handleToggleActive = async () => {
    if (!toggleRule) return;
    try {
      const res = await api.delete(`/fees/discount-rules/${toggleRule.id}`);
      showToast(res.data.message || 'Discount status updated successfully', 'success');
      setToggleRule(null);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update rule status', 'error');
    }
  };

  const handleApprovalConfirm = async () => {
    if (!approvalDecision) return;
    const { rule, action } = approvalDecision;
    try {
      const endpoint = action === 'APPROVE' ? `/fees/discount-rules/${rule.id}/approve` : `/fees/discount-rules/${rule.id}/reject`;
      const res = await api.post(endpoint, { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' });
      showToast(res.data.message || `Rule ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`, 'success');
      setApprovalDecision(null);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update approval status', 'error');
    }
  };

  const getCategoryNames = (rule: DiscountRule) => {
    if (rule.feeHeads && rule.feeHeads.length > 0) {
      return rule.feeHeads.map((fh) => fh.feeCategory?.name || fh.feeCategoryId).join(', ');
    }
    if (!rule.applicableFeeCategoryIds) return 'All Fee Heads';
    try {
      const ids: string[] = JSON.parse(rule.applicableFeeCategoryIds);
      if (!Array.isArray(ids) || ids.length === 0) return 'All Fee Heads';
      const names = ids
        .map((id) => categories.find((c) => c.id === id)?.name)
        .filter(Boolean);
      return names.join(', ') || 'All Fee Heads';
    } catch {
      return 'All Fee Heads';
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchesType =
        selectedType === 'ALL' ||
        r.discountType === selectedType ||
        (selectedType === 'FIXED_AMOUNT' && r.discountType === 'FLAT_AMOUNT');

      const matchesPaymentOption =
        selectedPaymentOption === 'ALL' || r.paymentOption === selectedPaymentOption;

      const matchesApproval =
        selectedApprovalStatus === 'ALL' || r.approvalStatus === selectedApprovalStatus;

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && r.isActive) ||
        (selectedStatus === 'INACTIVE' && !r.isActive);

      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.eligibilityCriteria && r.eligibilityCriteria.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesType && matchesPaymentOption && matchesApproval && matchesStatus && matchesSearch;
    });
  }, [rules, selectedType, selectedPaymentOption, selectedApprovalStatus, selectedStatus, searchTerm]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage) || 1;
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary KPI Metrics
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.isActive).length;
  const pendingApprovals = rules.filter((r) => r.approvalStatus === 'PENDING').length;
  const percentageRulesCount = rules.filter((r) => r.discountType === 'PERCENTAGE').length;

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200/60">
            <Percent className="w-3.5 h-3.5" />
            <span>Concessions, Scholarships & Waivers</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Discounts & Concessions
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure flexible concession policies (Percentage or Fixed Amount), map them to eligible fee heads, restrict by payment frequency, and govern approvals.
          </p>
        </div>

        {canMutateFees && (
          <button
            onClick={() => {
              setEditingRule(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount Policy</span>
          </button>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Policies</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalRules}</h4>
            <span className="text-[10px] text-indigo-600 font-bold">{activeRules} active rules</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Percentage Rules</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{percentageRulesCount}</h4>
            <span className="text-[10px] text-emerald-600 font-semibold">{totalRules - percentageRulesCount} Fixed Amount</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Approvals</p>
            <h4 className="text-xl font-extrabold text-amber-600 mt-0.5">{pendingApprovals}</h4>
            <span className="text-[10px] text-slate-500">Requires review</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved Policies</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{rules.filter((r) => r.approvalStatus === 'APPROVED').length}</h4>
            <span className="text-[10px] text-purple-600 font-bold">Ready for calculation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-5 h-5" />
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
            placeholder="Search name, code, criteria..."
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
          {/* Discount Type */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
          </select>

          {/* Payment Option */}
          <select
            value={selectedPaymentOption}
            onChange={(e) => {
              setSelectedPaymentOption(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Payment Options</option>
            <option value="ANY">Any Frequency</option>
            <option value="FULL_YEAR">Full-Year Advance Only</option>
            <option value="QUARTERLY">Quarterly Only</option>
          </select>

          {/* Approval Status */}
          <select
            value={selectedApprovalStatus}
            onChange={(e) => {
              setSelectedApprovalStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">All Approvals</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Active Status */}
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

          {/* Reset */}
          {(selectedType !== 'ALL' || selectedPaymentOption !== 'ALL' || selectedApprovalStatus !== 'ALL' || selectedStatus !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedPaymentOption('ALL');
                setSelectedApprovalStatus('ALL');
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
        ) : paginatedRules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Percent className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <div className="font-bold text-slate-700 text-sm">No discount rules match your criteria</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your filters or click "Create Discount Policy" to define a new rule.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Discount Policy</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4 font-black">Value</th>
                  <th className="py-4 px-4">Payment Option</th>
                  <th className="py-4 px-4">Eligible Fee Heads</th>
                  <th className="py-4 px-4">Validity</th>
                  <th className="py-4 px-4">Approval</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedRules.map((rule) => {
                  const isPercentage = rule.discountType === 'PERCENTAGE';
                  const valDisplay = isPercentage
                    ? `${rule.discountValue || rule.value}%`
                    : `₹${Number(rule.discountValue || rule.value).toLocaleString()}`;

                  return (
                    <tr
                      key={rule.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !rule.isActive ? 'bg-slate-50/30 opacity-70' : ''
                      }`}
                    >
                      {/* Name & Code */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-sm">{rule.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {rule.code}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-xs">
                            {rule.eligibilityType}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-4">
                        {isPercentage ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            Percentage
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Fixed Amount
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        {valDisplay}
                      </td>

                      {/* Payment Option */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold">
                          {rule.paymentOption || 'ANY'}
                        </span>
                      </td>

                      {/* Eligible Heads */}
                      <td className="py-4 px-4">
                        <span className="text-[11px] text-slate-600 line-clamp-1 max-w-[180px]" title={getCategoryNames(rule)}>
                          {getCategoryNames(rule)}
                        </span>
                      </td>

                      {/* Validity */}
                      <td className="py-4 px-4">
                        <div className="text-[11px] text-slate-700 font-semibold">
                          {new Date(rule.validFrom).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rule.validUntil || rule.validTo
                            ? `to ${new Date((rule.validUntil || rule.validTo)!).toLocaleDateString()}`
                            : 'No Expiry'}
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="py-4 px-4">
                        {rule.approvalStatus === 'APPROVED' ? (
                          <Badge variant="success" dot>Approved</Badge>
                        ) : rule.approvalStatus === 'PENDING' ? (
                          <Badge variant="warning" dot>Pending</Badge>
                        ) : (
                          <Badge variant="danger" dot>Rejected</Badge>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-4">
                        {rule.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Action */}
                          <button
                            onClick={() => setViewingRule(rule)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View full discount configuration"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve/Reject Action for SuperAdmin/Finance */}
                          {canMutateFees && rule.approvalStatus === 'PENDING' && (
                            <>
                              <button
                                onClick={() => setApprovalDecision({ rule, action: 'APPROVE' })}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Approve discount policy"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setApprovalDecision({ rule, action: 'REJECT' })}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Reject discount policy"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Edit Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => {
                                setEditingRule(rule);
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit discount policy"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Activate / Deactivate Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => setToggleRule(rule)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                rule.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={rule.isActive ? 'Deactivate policy' : 'Activate policy'}
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
            Showing <strong className="text-slate-700">{filteredRules.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-700">
              {Math.min(currentPage * itemsPerPage, filteredRules.length)}
            </strong>{' '}
            of <strong className="text-slate-700">{filteredRules.length}</strong> discount policies
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
      {isCreateModalOpen && (
        <DiscountRuleModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingRule(null);
          }}
          onSubmit={handleSaveRule}
          initialData={editingRule}
        />
      )}

      {/* Detail Slide-Over Modal */}
      {viewingRule && (
        <DiscountRuleDetailModal
          isOpen={Boolean(viewingRule)}
          onClose={() => setViewingRule(null)}
          rule={viewingRule}
        />
      )}

      {/* Confirmation Dialog for Status Change */}
      {toggleRule && (
        <ConfirmDialog
          isOpen={Boolean(toggleRule)}
          onClose={() => setToggleRule(null)}
          onConfirm={handleToggleActive}
          title={toggleRule.isActive ? 'Deactivate Discount Policy' : 'Activate Discount Policy'}
          message={
            toggleRule.isActive
              ? `Are you sure you want to deactivate "${toggleRule.name}" (${toggleRule.code})? Deactivated policies will not be calculated for future fee schedules.`
              : `Are you sure you want to reactivate "${toggleRule.name}" (${toggleRule.code})?`
          }
          confirmText={toggleRule.isActive ? 'Deactivate' : 'Activate'}
          isDanger={toggleRule.isActive}
        />
      )}

      {/* Approval Confirmation Dialog */}
      {approvalDecision && (
        <ConfirmDialog
          isOpen={Boolean(approvalDecision)}
          onClose={() => setApprovalDecision(null)}
          onConfirm={handleApprovalConfirm}
          title={approvalDecision.action === 'APPROVE' ? 'Approve Discount Policy' : 'Reject Discount Policy'}
          message={
            approvalDecision.action === 'APPROVE'
              ? `Are you sure you want to approve and activate "${approvalDecision.rule.name}" (${approvalDecision.rule.code})?`
              : `Are you sure you want to reject "${approvalDecision.rule.name}" (${approvalDecision.rule.code})? Rejected policies cannot be applied.`
          }
          confirmText={approvalDecision.action === 'APPROVE' ? 'Approve Policy' : 'Reject Policy'}
          isDanger={approvalDecision.action === 'REJECT'}
        />
      )}
    </div>
  );
};
