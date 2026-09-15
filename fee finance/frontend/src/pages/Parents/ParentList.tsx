import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { ParentFormModal } from './ParentFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ParentGuardian, Pagination } from '../../types';
import {
  Plus,
  Search,
  Users2,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

export const ParentList: React.FC = () => {
  const { canMutate } = useAuth();
  const { showToast } = useToast();

  const [parents, setParents] = useState<ParentGuardian[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentGuardian | null>(null);
  const [deletingParentId, setDeletingParentId] = useState<string | null>(null);

  const fetchParents = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (relationshipFilter !== 'ALL') params.append('relationship', relationshipFilter);

      const res = await api.get(`/parents?${params.toString()}`);
      setParents(res.data.parents || []);
      setPagination(res.data.pagination);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load parents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParents(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, relationshipFilter]);

  const handleCreateParent = async (data: any) => {
    try {
      await api.post('/parents', data);
      showToast('Parent / Guardian registered successfully!');
      setIsCreateModalOpen(false);
      fetchParents(1);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to create parent', 'error');
    }
  };

  const handleUpdateParent = async (data: any) => {
    if (!editingParent) return;
    try {
      await api.patch(`/parents/${editingParent.id}`, data);
      showToast('Parent profile updated successfully!');
      setEditingParent(null);
      fetchParents(pagination.page);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update parent', 'error');
    }
  };

  const handleDeleteParent = async () => {
    if (!deletingParentId) return;
    try {
      await api.delete(`/parents/${deletingParentId}`);
      showToast('Parent record soft-deleted successfully');
      setDeletingParentId(null);
      fetchParents(pagination.page);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete parent', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Parents & Guardians Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage legal guardians, emergency contacts, and sibling family linkages.
          </p>
        </div>

        {canMutate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parent / Guardian</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent name, phone, email, or occupation..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <select
          value={relationshipFilter}
          onChange={(e) => setRelationshipFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-semibold text-slate-700 w-full sm:w-auto"
        >
          <option value="ALL">All Relationships</option>
          <option value="FATHER">Father</option>
          <option value="MOTHER">Mother</option>
          <option value="GUARDIAN">Guardian</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Parent / Guardian</th>
                <th className="py-3 px-4">Relationship</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Occupation</th>
                <th className="py-3 px-4">Linked Students</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-2" />
                    <div>Loading parent directory...</div>
                  </td>
                </tr>
              ) : parents.length > 0 ? (
                parents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {parent.firstName[0]}
                          {parent.lastName[0]}
                        </div>
                        <div>
                          <Link
                            to={`/parents/${parent.id}`}
                            className="font-bold text-slate-900 hover:text-brand-600 hover:underline"
                          >
                            {parent.firstName} {parent.lastName}
                          </Link>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{parent.address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {parent.relationship}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-slate-700">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{parent.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{parent.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {parent.occupation || <span className="text-slate-400 italic">Not listed</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {parent.students && parent.students.length > 0 ? (
                        <div className="flex items-center gap-1 text-slate-700 font-semibold">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {parent.students.length} {parent.students.length === 1 ? 'Student' : 'Students'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None linked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/parents/${parent.id}`}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Parent Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canMutate && (
                          <>
                            <button
                              onClick={() => setEditingParent(parent)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingParentId(parent.id)}
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
                    <Users2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No parent records found</p>
                    <p className="text-[11px] text-slate-400">Try searching with a different name or phone number.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{parents.length}</strong> of{' '}
            <strong className="text-slate-900">{pagination.total}</strong> guardians
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchParents(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchParents(pagination.page + 1)}
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
        <ParentFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateParent}
        />
      )}

      {/* Edit Modal */}
      {editingParent && (
        <ParentFormModal
          isOpen={Boolean(editingParent)}
          onClose={() => setEditingParent(null)}
          onSubmit={handleUpdateParent}
          initialData={editingParent}
        />
      )}

      {/* Soft Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingParentId)}
        onClose={() => setDeletingParentId(null)}
        onConfirm={handleDeleteParent}
        title="Soft Delete Parent Record"
        message="Are you sure you want to soft-delete this parent contact? Associated links will be retained for historical context."
        confirmText="Soft Delete"
      />
    </div>
  );
};
