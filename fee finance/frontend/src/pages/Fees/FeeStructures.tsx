import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FeeStructureModal, StructureFormData } from './FeeStructureModal';
import { FeeStructureDetailModal } from './FeeStructureDetailModal';
import { PaymentPlanEditorModal } from './PaymentPlanEditorModal';
import { FeeStructure } from '../../types';
import {
  Receipt,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Layers,
  GraduationCap,
  Calendar,
  IndianRupee,
} from 'lucide-react';

const GRADES = [
  'All Grades',
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

const ACADEMIC_YEARS = ['All Years', '2026-2027', '2027-2028', '2028-2029', '2025-2026'];

const STUDENT_CATEGORIES = [
  'All Categories',
  'REGULAR',
  'RTE',
  'SIBLING',
  'STAFF_CHILD',
  'DAY_SCHOLAR',
  'BOARDER',
  'MANAGEMENT_QUOTA',
];

export const FeeStructures: React.FC = () => {
  const { canMutateFees } = useAuth();
  const { showToast } = useToast();

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedGrade, setSelectedGrade] = useState('All Grades');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [viewingStructure, setViewingStructure] = useState<FeeStructure | null>(null);
  const [toggleStructure, setToggleStructure] = useState<FeeStructure | null>(null);
  const [planModalStructure, setPlanModalStructure] = useState<FeeStructure | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/fees/structures?includeInactive=true');
      setStructures(res.data.feeStructures || res.data.structures || []);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load fee structures', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSaveStructure = async (data: StructureFormData) => {
    try {
      if (editingStructure) {
        const res = await api.patch(`/fees/structures/${editingStructure.id}`, data);
        showToast(res.data.message || 'Fee structure updated successfully', 'success');
      } else {
        const res = await api.post('/fees/structures', data);
        showToast(res.data.message || 'Fee structure defined successfully with default payment plans', 'success');
      }
      setIsCreateModalOpen(false);
      setEditingStructure(null);
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to save fee structure', 'error');
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleStructure) return;
    try {
      const res = await api.delete(`/fees/structures/${toggleStructure.id}`);
      showToast(res.data.message || 'Fee structure status updated successfully', 'success');
      setToggleStructure(null);
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update structure status', 'error');
    }
  };

  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      const matchesYear = selectedYear === 'All Years' || s.academicYear === selectedYear;
      const matchesGrade = selectedGrade === 'All Grades' || s.gradeOrClass === selectedGrade;
      const matchesCategory = selectedCategory === 'All Categories' || s.studentCategory === selectedCategory;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && s.isActive) ||
        (selectedStatus === 'INACTIVE' && !s.isActive);

      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.gradeOrClass.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.academicYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.items && s.items.some((it) => it.feeCategory?.name.toLowerCase().includes(searchTerm.toLowerCase())));

      return matchesYear && matchesGrade && matchesCategory && matchesStatus && matchesSearch;
    });
  }, [structures, selectedYear, selectedGrade, selectedCategory, selectedStatus, searchTerm]);

  // Pagination slice
  const totalPages = Math.ceil(filteredStructures.length / itemsPerPage) || 1;
  const paginatedStructures = filteredStructures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary KPI Metrics
  const totalStructures = structures.length;
  const activeStructures = structures.filter((s) => s.isActive).length;
  const uniqueGradesCount = new Set(structures.map((s) => s.gradeOrClass)).size;
  const avgAnnualAmount =
    structures.length > 0
      ? Math.round(structures.reduce((sum, s) => sum + Number(s.amount), 0) / structures.length)
      : 0;

  const getStudentCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'REGULAR':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">Regular</span>;
      case 'RTE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">RTE</span>;
      case 'SIBLING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">Sibling</span>;
      case 'STAFF_CHILD':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">Staff Child</span>;
      case 'BOARDER':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">Boarder</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200/60">
            <Receipt className="w-3.5 h-3.5" />
            <span>Academic Session Fee Schedules</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Fee Structures
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure multi-head annual fee structures (Tuition, Annual, Lab, Development, Transport) per class, section, and student category with automatic payment splits.
          </p>
        </div>

        {canMutateFees && (
          <button
            onClick={() => {
              setEditingStructure(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Define Fee Structure</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Structures</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{totalStructures}</h4>
            <span className="text-[10px] text-emerald-600 font-bold">{activeStructures} active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Classes Covered</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{uniqueGradesCount}</h4>
            <span className="text-[10px] text-slate-500 font-semibold">Grades & streams</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Annual Fee</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">₹{avgAnnualAmount.toLocaleString()}</h4>
            <span className="text-[10px] text-slate-500 font-semibold">Across baseline grades</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Academic Session</p>
            <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">2026-2027</h4>
            <span className="text-[10px] text-purple-600 font-bold">Standard Year</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Calendar className="w-5 h-5" />
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
            placeholder="Search structure name, class or fee head..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs">
          {/* Academic Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            {ACADEMIC_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Student Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            {STUDENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Reset Filters */}
          {(selectedYear !== 'All Years' || selectedGrade !== 'All Grades' || selectedCategory !== 'All Categories' || selectedStatus !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedYear('All Years');
                setSelectedGrade('All Grades');
                setSelectedCategory('All Categories');
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : paginatedStructures.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <div className="font-bold text-slate-700 text-sm">No fee structures match your filter criteria</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your filter parameters or click "Define Fee Structure" to create a new one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-4">Academic Year</th>
                  <th className="py-4 px-4">Structure</th>
                  <th className="py-4 px-4">Student Category</th>
                  <th className="py-4 px-4">Fee Heads</th>
                  <th className="py-4 px-4 text-right">Annual Amount</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Updated</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedStructures.map((struct) => {
                  return (
                    <tr
                      key={struct.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !struct.isActive ? 'bg-slate-50/30 opacity-70' : ''
                      }`}
                    >
                      {/* Class & Section */}
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {struct.gradeOrClass}
                        </div>
                        {struct.section ? (
                          <span className="text-[11px] text-slate-400">{struct.section}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">All Sections</span>
                        )}
                      </td>

                      {/* Academic Year */}
                      <td className="py-4 px-4 font-bold text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 text-[11px]">
                          {struct.academicYear}
                        </span>
                      </td>

                      {/* Structure Name */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{struct.name}</div>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold">
                          v{struct.version}
                        </span>
                      </td>

                      {/* Student Category */}
                      <td className="py-4 px-4">{getStudentCategoryBadge(struct.studentCategory)}</td>

                      {/* Fee Heads Breakdown / Chips */}
                      <td className="py-4 px-4">
                        {struct.items && struct.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {struct.items.slice(0, 2).map((it) => (
                              <span
                                key={it.id}
                                className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                              >
                                {it.feeCategory?.name || 'Head'}: ₹{Number(it.amount).toLocaleString()}
                              </span>
                            ))}
                            {struct.items.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-bold self-center">
                                +{struct.items.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {struct.feeCategory?.name || 'Standard Tuition'}
                          </span>
                        )}
                      </td>

                      {/* Annual Amount */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-extrabold text-slate-900 text-sm">
                          ₹{Number(struct.amount).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {struct.isActive ? (
                          <Badge variant="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="py-4 px-4 text-[11px] text-slate-400">
                        {new Date(struct.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Detail Action */}
                          <button
                            onClick={() => setViewingStructure(struct)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View full fee structure details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => {
                                setEditingStructure(struct);
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit fee structure"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Activate / Deactivate Action */}
                          {canMutateFees && (
                            <button
                              onClick={() => setToggleStructure(struct)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                struct.isActive
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={struct.isActive ? 'Deactivate structure' : 'Activate structure'}
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
            Showing <strong className="text-slate-700">{filteredStructures.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong className="text-slate-700">
              {Math.min(currentPage * itemsPerPage, filteredStructures.length)}
            </strong>{' '}
            of <strong className="text-slate-700">{filteredStructures.length}</strong> fee structures
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
        <FeeStructureModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingStructure(null);
          }}
          onSubmit={handleSaveStructure}
          initialData={editingStructure}
        />
      )}

      {/* Detail Slide-Over Modal */}
      {viewingStructure && (
        <FeeStructureDetailModal
          isOpen={Boolean(viewingStructure)}
          onClose={() => setViewingStructure(null)}
          structure={viewingStructure}
        />
      )}

      {/* Payment Plan Schedule Modal */}
      {planModalStructure && (
        <PaymentPlanEditorModal
          isOpen={Boolean(planModalStructure)}
          onClose={() => setPlanModalStructure(null)}
          defaultStructureId={planModalStructure.id}
          onSubmit={async (data) => {
            try {
              const res = await api.post(`/fees/structures/${planModalStructure.id}/payment-plans`, data);
              showToast(res.data.message || 'Payment plan configured successfully', 'success');
              setPlanModalStructure(null);
              fetchInitialData();
            } catch (err: any) {
              showToast(err.response?.data?.error?.message || 'Failed to save payment plan', 'error');
            }
          }}
        />
      )}

      {/* Confirmation Dialog for Status Change */}
      {toggleStructure && (
        <ConfirmDialog
          isOpen={Boolean(toggleStructure)}
          onClose={() => setToggleStructure(null)}
          onConfirm={handleToggleStatus}
          title={toggleStructure.isActive ? 'Deactivate Fee Structure' : 'Activate Fee Structure'}
          message={
            toggleStructure.isActive
              ? `Are you sure you want to deactivate "${toggleStructure.name}" for ${toggleStructure.gradeOrClass} (${toggleStructure.academicYear})? Historical student assignments will remain intact, but new assignments cannot select this structure.`
              : `Are you sure you want to reactivate "${toggleStructure.name}" for ${toggleStructure.gradeOrClass} (${toggleStructure.academicYear})?`
          }
          confirmText={toggleStructure.isActive ? 'Deactivate' : 'Activate'}
          isDanger={toggleStructure.isActive}
        />
      )}
    </div>
  );
};
