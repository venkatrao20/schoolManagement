import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/Badge';
import { StudentFormModal } from './StudentFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Student, Pagination } from '../../types';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

export const StudentList: React.FC = () => {
  const { canMutate } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  const fetchStudents = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (gradeFilter !== 'ALL') params.append('grade', gradeFilter);

      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data.students || []);
      setPagination(res.data.pagination);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load students', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, gradeFilter]);

  const handleCreateStudent = async (data: any) => {
    try {
      await api.post('/students', data);
      showToast('Student registered successfully!');
      setIsCreateModalOpen(false);
      fetchStudents(1);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create student', 'error');
    }
  };

  const handleUpdateStudent = async (data: any) => {
    if (!editingStudent) return;
    try {
      await api.patch(`/students/${editingStudent.id}`, data);
      showToast('Student updated successfully!');
      setEditingStudent(null);
      fetchStudents(pagination.page);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudentId) return;
    try {
      await api.delete(`/students/${deletingStudentId}`);
      showToast('Student soft-deleted successfully');
      setDeletingStudentId(null);
      fetchStudents(pagination.page);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete student', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Records
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse and manage registered students, academic grades, and parent links.
          </p>
        </div>

        {canMutate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Student</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, admission number, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-semibold text-slate-700 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="ENROLLED">Enrolled</option>
            <option value="ADMITTED">Admitted</option>
            <option value="APPLIED">Applied</option>
            <option value="ENQUIRY">Enquiry</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="ALUMNI">Alumni</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission No.</th>
                <th className="py-3 px-4">Class / Grade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Linked Parents</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
                    <div>Loading student directory...</div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                          {student.firstName[0]}
                          {student.lastName[0]}
                        </div>
                        <div>
                          <Link
                            to={`/students/${student.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 hover:underline"
                          >
                            {student.firstName} {student.lastName}
                          </Link>
                          <div className="text-[11px] text-slate-400">{student.gender} • DOB: {new Date(student.dateOfBirth).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {student.admissionNumber}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {student.currentGrade}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {student.parents && student.parents.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-brand-600" />
                          <span>
                            {student.parents[0].parentGuardian?.firstName}{' '}
                            {student.parents[0].parentGuardian?.lastName}
                            {student.parents.length > 1 && ` (+${student.parents.length - 1})`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No parent linked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/students/${student.id}`}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Student Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canMutate && (
                          <>
                            <button
                              onClick={() => setEditingStudent(student)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Student"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingStudentId(student.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Soft Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No student records found</p>
                    <p className="text-[11px] text-slate-400">Try adjusting your search terms or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{students.length}</strong> of{' '}
            <strong className="text-slate-900">{pagination.total}</strong> students
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStudents(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchStudents(pagination.page + 1)}
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
        <StudentFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateStudent}
        />
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <StudentFormModal
          isOpen={Boolean(editingStudent)}
          onClose={() => setEditingStudent(null)}
          onSubmit={handleUpdateStudent}
          initialData={editingStudent}
        />
      )}

      {/* Soft Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingStudentId)}
        onClose={() => setDeletingStudentId(null)}
        onConfirm={handleDeleteStudent}
        title="Soft Delete Student"
        message="Are you sure you want to soft-delete this student? This preserves historical data while removing them from active listings."
        confirmText="Soft Delete"
      />
    </div>
  );
};
