import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CategoryModal, CategoryFormData } from './CategoryModal';
import { FeeCategory, FeeType, FeeFrequency } from '../../types';
import {
  Tags,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Layers,
  Calendar,
  Percent,
  AlertCircle,
} from 'lucide-react';

export const FeeCategories: React.FC = () => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeeCategory | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [toggleCategory, setToggleCategory] = useState<FeeCategory | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/fees/categories?includeInactive=true');
      setCategories(res.data.categories || []);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load fee categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateOrUpdate = async (data: CategoryFormData) => {
    try {
      if (selectedCategory && !isViewOnly) {
        await api.patch(`/fees/categories/${selectedCategory.id}`, data);
        showToast(`Fee head '${data.name}' updated successfully`, 'success');
      } else {
        await api.post('/fees/categories', data);
        showToast(`Fee head '${data.name}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save fee head', 'error');
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleCategory) return;
    try {
      const willBeActive = !toggleCategory.isActive;
      await api.delete(`/fees/categories/${toggleCategory.id}`);
      showToast(
        `Fee head '${toggleCategory.name}' ${willBeActive ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
      setToggleCategory(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update status', 'error');
    }
  };

  // Filter and search logic
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || c.feeType === typeFilter;
      const matchesFrequency = frequencyFilter === 'ALL' || c.defaultFrequency === frequencyFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.isActive) ||
        (statusFilter === 'INACTIVE' && !c.isActive);

      return matchesSearch && matchesType && matchesFrequency && matchesStatus;
    });
  }, [categories, searchTerm, typeFilter, frequencyFilter, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary Metrics
  const totalHeads = categories.length;
  const activeHeads = categories.filter((c) => c.isActive).length;
  const mandatoryHeads = categories.filter((c) => c.isMandatory && c.isActive).length;
  const recurringHeads = categories.filter((c) => c.feeType === 'RECURRING' && c.isActive).length;
  const discountAllowedHeads = categories.filter((c) => c.discountAllowed && c.isActive).length;

  const getFeeTypeBadge = (type: FeeType) => {
    switch (type) {
      case 'RECURRING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">Recurring</span>;
      case 'ONE_TIME':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">One-Time</span>;
      case 'ANNUAL':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">Annual</span>;
      case 'SERVICE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">Service</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Other</span>;
    }
  };

  const getFrequencyBadge = (freq: FeeFrequency) => {
    switch (freq) {
      case 'QUARTERLY':
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Quarterly</span>;
      case 'FULL_YEAR':
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Full Year</span>;
      case 'ONE_TIME':
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">One Time</span>;
      case 'MONTHLY':
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Monthly</span>;
      case 'HALF_YEARLY':
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">Half Yearly</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{freq}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200/60">
            <Tags className="w-3.5 h-3.5" />
            <span>Finance & Billing Head Definitions</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Fee Categories / Fee Heads
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Manage standard Indian school fee heads (Tuition, Admission, Annual, Lab, Transport, Sports, etc.) including billing frequencies, mandatory rules, and discount eligibility.
          </p>
        </div>

        {canMutateFees && (
          <button
            onClick={() => {
              setSelectedCategory(null);
              setIsViewOnly(false);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee Head</span>
          </button>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Heads</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalHeads}</h4>
            <span className="text-[10px] text-emerald-600 font-bold">{activeHeads} active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mandatory Heads</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{mandatoryHeads}</h4>
            <span className="text-[10px] text-slate-500 font-semibold">Required tuition/intake</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recurring Heads</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{recurringHeads}</h4>
            <span className="text-[10px] text-slate-500 font-semibold">Quarterly / Term splits</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Discount Eligible</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{discountAllowedHeads}</h4>
            <span className="text-[10px] text-purple-600 font-bold">Waiver allowed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code or description..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Fee Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Types</option>
            <option value="RECURRING">Recurring</option>
            <option value="ONE_TIME">One-Time</option>
            <option value="ANNUAL">Annual</option>
            <option value="SERVICE">Service</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Frequency Filter */}
          <select
            value={frequencyFilter}
            onChange={(e) => {
              setFrequencyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Frequencies</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="FULL_YEAR">Full Year</option>
            <option value="ONE_TIME">One Time</option>
            <option value="MONTHLY">Monthly</option>
            <option value="HALF_YEARLY">Half Yearly</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Reset Filters */}
          {(searchTerm || typeFilter !== 'ALL' || frequencyFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('ALL');
                setFrequencyFilter('ALL');
                setStatusFilter('ALL');
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

      {/* Categories Table View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : paginatedCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tags className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <div className="font-bold text-slate-700 text-sm">No fee heads match your criteria</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords or clear the active type/status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Fee Name & Description</th>
                  <th className="py-4 px-4">Code</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Frequency</th>
                  <th className="py-4 px-4 text-center">Mandatory</th>
                  <th className="py-4 px-4 text-center">Discount</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      !cat.isActive ? 'bg-slate-50/30 opacity-70' : ''
                    }`}
                  >
                    {/* Name & Description */}
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span>{cat.name}</span>
                        {cat._count && cat._count.feeStructures > 0 && (
                          <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {cat._count.feeStructures} structure{cat._count.feeStructures === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs">
                        {cat.description || 'No description provided.'}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-1 rounded-md text-[11px]">
                        {cat.code}
                      </span>
                    </td>

                    {/* Fee Type */}
                    <td className="py-4 px-4">{getFeeTypeBadge(cat.feeType)}</td>

                    {/* Frequency */}
                    <td className="py-4 px-4">{getFrequencyBadge(cat.defaultFrequency)}</td>

                    {/* Mandatory */}
                    <td className="py-4 px-4 text-center">
                      {cat.isMandatory ? (
                        <span className="inline-flex items-center text-emerald-600 font-bold gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Yes</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 font-medium gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>Optional</span>
                        </span>
                      )}
                    </td>

                    {/* Discount Applicable */}
                    <td className="py-4 px-4 text-center">
                      {cat.discountAllowed ? (
                        <span className="inline-flex items-center text-purple-600 font-bold gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Allowed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 font-medium gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>No</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {cat.isActive ? (
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
                        {/* View Action */}
                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsViewOnly(true);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View configuration"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Action */}
                        {canMutateFees && (
                          <button
                            onClick={() => {
                              setSelectedCategory(cat);
                              setIsViewOnly(false);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit fee head"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Activate / Deactivate Action */}
                        {canMutateFees && (
                          <button
                            onClick={() => setToggleCategory(cat)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              cat.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={cat.isActive ? 'Deactivate fee head' : 'Activate fee head'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer & Pagination */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-700">{filteredCategories.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-700">
              {Math.min(currentPage * itemsPerPage, filteredCategories.length)}
            </strong>{' '}
            of <strong className="text-slate-700">{filteredCategories.length}</strong> fee heads
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

      {/* Create / Edit / View Modal */}
      {isModalOpen && (
        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCategory(null);
            setIsViewOnly(false);
          }}
          onSubmit={handleCreateOrUpdate}
          initialData={selectedCategory}
          isViewOnly={isViewOnly}
        />
      )}

      {/* Confirmation Dialog for Activation / Deactivation */}
      {toggleCategory && (
        <ConfirmDialog
          isOpen={Boolean(toggleCategory)}
          onClose={() => setToggleCategory(null)}
          onConfirm={handleToggleStatus}
          title={toggleCategory.isActive ? 'Deactivate Fee Head' : 'Activate Fee Head'}
          message={
            toggleCategory.isActive
              ? `Are you sure you want to deactivate "${toggleCategory.name}" (${toggleCategory.code})? Existing historical fee structures and student assignments will remain intact, but new fee structures cannot assign this fee head.`
              : `Are you sure you want to reactivate "${toggleCategory.name}" (${toggleCategory.code})? It will become available for new fee structures.`
          }
          confirmText={toggleCategory.isActive ? 'Deactivate Head' : 'Activate Head'}
          isDanger={toggleCategory.isActive}
        />
      )}
    </div>
  );
};
