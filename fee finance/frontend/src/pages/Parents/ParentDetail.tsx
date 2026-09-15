import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ParentFormModal } from './ParentFormModal';
import { ParentGuardian } from '../../types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

export const ParentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canMutate } = useAuth();
  const { showToast } = useToast();

  const [parent, setParent] = useState<ParentGuardian | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchParent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/parents/${id}`);
      setParent(res.data.parent);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load parent record', 'error');
      navigate('/parents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchParent();
  }, [id]);

  const handleUpdateParent = async (data: any) => {
    try {
      const res = await api.patch(`/parents/${id}`, data);
      setParent(res.data.parent);
      showToast('Parent profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update parent', 'error');
    }
  };

  const handleDeleteParent = async () => {
    try {
      await api.delete(`/parents/${id}`);
      showToast('Parent record soft-deleted successfully');
      navigate('/parents');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete parent', 'error');
    }
  };

  if (isLoading || !parent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/parents')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Parents Directory</span>
        </button>

        {canMutate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Soft Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-extrabold text-2xl md:text-3xl shadow-lg shadow-indigo-500/20">
              {parent.firstName[0]}
              {parent.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                  {parent.firstName} {parent.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  {parent.relationship}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{parent.occupation || 'Occupation not specified'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Phone className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Phone</span>
              <span className="font-semibold text-slate-900">{parent.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Email</span>
              <span className="font-semibold text-slate-900 truncate">{parent.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <CreditCard className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">ID Verification</span>
              <span className="font-semibold text-slate-900">
                {parent.idProofType ? `${parent.idProofType}: ${parent.idProofNumber || 'Verified'}` : 'No ID Proof Recorded'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Residential Address</span>
            <span className="text-slate-800">{parent.address}</span>
          </div>
        </div>
      </div>

      {/* Linked Children / Students (AC2, AC7) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Linked Students & Dependents</h2>
          <p className="text-xs text-slate-500">
            All students associated with this parent or legal guardian across classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parent.students && parent.students.length > 0 ? (
            parent.students.map((link) => {
              const student = link.student;
              if (!student) return null;
              return (
                <div
                  key={link.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 hover:border-slate-300 transition-all text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <Link
                          to={`/students/${student.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <span>{student.firstName} {student.lastName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                        <div className="text-slate-500 text-[11px]">
                          Adm No: <strong className="text-slate-700">{student.admissionNumber}</strong> • Grade: <strong className="text-brand-600">{student.currentGrade}</strong>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>

                  {link.relationshipNotes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{link.relationshipNotes}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      {link.isPrimaryContact && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-[10px] border border-brand-200">
                          ★ Primary Contact
                        </span>
                      )}
                      {link.isEmergencyContact && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                          🚨 Emergency Contact
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/students/${student.id}`}
                      className="font-bold text-brand-600 hover:underline"
                    >
                      View Student →
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              No students currently linked to this guardian.
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <ParentFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateParent}
          initialData={parent}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteParent}
        title="Soft Delete Parent Record"
        message={`Are you sure you want to soft-delete ${parent.firstName} ${parent.lastName}? The contact record will be archived.`}
        confirmText="Soft Delete"
      />
    </div>
  );
};
