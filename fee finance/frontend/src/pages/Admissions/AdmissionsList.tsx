import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/Badge';
import { CreateAdmissionModal } from './CreateAdmissionModal';
import { ReviewAdmissionModal } from './ReviewAdmissionModal';
import { Admission, Pagination } from '../../types';
import {
  Plus,
  Search,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const AdmissionsList: React.FC = () => {
  const { canMutate } = useAuth();
  const { showToast } = useToast();

  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewingAdmission, setReviewingAdmission] = useState<Admission | null>(null);

  const fetchAdmissions = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (yearFilter !== 'ALL') params.append('academicYear', yearFilter);
      if (gradeFilter !== 'ALL') params.append('grade', gradeFilter);

      const res = await api.get(`/admissions?${params.toString()}`);
      setAdmissions(res.data.admissions || []);
      setPagination(res.data.pagination);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load admissions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdmissions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, yearFilter, gradeFilter]);

  const handleCreateAdmission = async (data: any) => {
    try {
      await api.post('/admissions', data);
      showToast('Admission application submitted successfully!');
      setIsCreateModalOpen(false);
      fetchAdmissions(1);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create admission', 'error');
    }
  };

  const handleReviewAdmission = async (id: string, data: any) => {
    try {
      await api.patch(`/admissions/${id}`, data);
      showToast('Admission status updated successfully!');
      setReviewingAdmission(null);
      fetchAdmissions(pagination.page);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update admission', 'error');
    }
  };

  const statusTabs = [
    { key: 'ALL', label: 'All Applications' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'UNDER_REVIEW', label: 'Under Review' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'ENROLLED', label: 'Enrolled' },
    { key: 'WAITLISTED', label: 'Waitlisted' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Admissions & Enrollment Workflow
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process candidate applications, track verification documents, and record admission decisions.
          </p>
        </div>

        {canMutate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Admission Application</span>
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-slate-100 rounded-2xl">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or admission number..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-semibold text-slate-700 w-full sm:w-auto"
          >
            <option value="ALL">All Academic Years</option>
            <option value="2026-2027">2026-2027</option>
            <option value="2027-2028">2027-2028</option>
            <option value="2025-2026">2025-2026</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-semibold text-slate-700 w-full sm:w-auto"
          >
            <option value="ALL">All Grades</option>
            <option value="Kindergarten">Kindergarten</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Grade 6">Grade 6</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Student Candidate</th>
                <th className="py-3 px-4">Grade Applied</th>
                <th className="py-3 px-4">Session Year</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Application Date</th>
                <th className="py-3 px-4">Decision Maker</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
                    <div>Loading admissions board...</div>
                  </td>
                </tr>
              ) : admissions.length > 0 ? (
                admissions.map((admission) => (
                  <tr key={admission.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                          {admission.student?.firstName ? admission.student.firstName[0] : 'S'}
                          {admission.student?.lastName ? admission.student.lastName[0] : 'C'}
                        </div>
                        <div>
                          <Link
                            to={`/students/${admission.student?.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 hover:underline"
                          >
                            {admission.student?.firstName} {admission.student?.lastName}
                          </Link>
                          <div className="text-[11px] text-slate-400">
                            {admission.student?.admissionNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {admission.gradeAppliedFor}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {admission.academicYear}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={admission.admissionStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {new Date(admission.applicationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {admission.decidedBy ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{admission.decidedBy.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending Committee</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canMutate ? (
                        <button
                          onClick={() => setReviewingAdmission(admission)}
                          className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors border border-brand-200 shadow-sm"
                        >
                          Review Decision
                        </button>
                      ) : (
                        <Link
                          to={`/students/${admission.student?.id}`}
                          className="text-xs font-bold text-brand-600 hover:underline"
                        >
                          View Details
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No admission records found</p>
                    <p className="text-[11px] text-slate-400">Try changing the status tab or search query.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{admissions.length}</strong> of{' '}
            <strong className="text-slate-900">{pagination.total}</strong> applications
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAdmissions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchAdmissions(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <CreateAdmissionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAdmission}
        />
      )}

      {/* Review Decision Modal */}
      {reviewingAdmission && (
        <ReviewAdmissionModal
          isOpen={Boolean(reviewingAdmission)}
          onClose={() => setReviewingAdmission(null)}
          admission={reviewingAdmission}
          onSubmit={handleReviewAdmission}
        />
      )}
    </div>
  );
};
