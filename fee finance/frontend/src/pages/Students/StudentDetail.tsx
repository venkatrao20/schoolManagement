import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { StatusBadge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { StudentFormModal } from './StudentFormModal';
import { LinkParentModal } from './LinkParentModal';
import { StudentFeeTab } from './StudentFeeTab';
import { Student } from '../../types';
import {
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Unlink,
  CheckCircle2,
  Receipt,
} from 'lucide-react';

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canMutate, canViewFees } = useAuth();
  const { showToast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'parents' | 'admissions' | 'fees'>('details');
  const [isLoading, setIsLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [unlinkParentId, setUnlinkParentId] = useState<string | null>(null);

  const fetchStudent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/students/${id}`);
      setStudent(res.data.student);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to load student record', 'error');
      navigate('/students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchStudent();
  }, [id]);

  const handleUpdateStudent = async (data: any) => {
    try {
      const res = await api.patch(`/students/${id}`, data);
      setStudent(res.data.student);
      showToast('Student profile updated successfully!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await api.delete(`/students/${id}`);
      showToast('Student record soft-deleted successfully');
      navigate('/students');
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to delete student', 'error');
    }
  };

  const handleUnlinkParent = async () => {
    if (!unlinkParentId) return;
    try {
      await api.delete(`/students/${id}/parents/${unlinkParentId}`);
      showToast('Parent/Guardian unlinked successfully');
      setUnlinkParentId(null);
      fetchStudent();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to unlink parent', 'error');
    }
  };

  const handleToggleContactFlag = async (parentGuardianId: string, isPrimary: boolean, isEmergency: boolean) => {
    try {
      await api.patch(`/students/${id}/parents/${parentGuardianId}`, {
        isPrimaryContact: isPrimary,
        isEmergencyContact: isEmergency,
      });
      showToast('Contact flags updated successfully');
      fetchStudent();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to update contact flags', 'error');
    }
  };

  if (isLoading || !student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students List</span>
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
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl md:text-3xl shadow-lg shadow-brand-500/20">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                  {student.firstName} {student.lastName}
                </h1>
                <StatusBadge status={student.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  {student.admissionNumber}
                </span>
                <span>•</span>
                <span className="font-bold text-brand-600">{student.currentGrade}</span>
                <span>•</span>
                <span>Gender: {student.gender}</span>
                <span>•</span>
                <span>Blood Group: {student.bloodGroup || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canMutate && (
              <button
                onClick={() => setIsLinkModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>Link Parent / Guardian</span>
              </button>
            )}
          </div>
        </div>

        {/* Audit Meta Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>Created: {new Date(student.createdAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>Updated: {new Date(student.updatedAt).toLocaleDateString()}</span>
            {student.createdBy && (
              <>
                <span>•</span>
                <span>Created by: {student.createdBy.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Demographics & Profile
        </button>
        <button
          onClick={() => setActiveTab('parents')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'parents'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Linked Parents & Guardians</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {student.parents?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('admissions')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'admissions'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Admission History Timeline</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {student.admissions?.length || 0}
          </span>
        </button>
        {canViewFees && (
          <button
            onClick={() => setActiveTab('fees')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'fees'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Fee Structure & Discounts</span>
          </button>
        )}
      </div>

      {/* Tab Content: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-bold text-slate-800">
                  {new Date(student.dateOfBirth).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nationality</span>
                <span className="font-bold text-slate-800">{student.nationality}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Gender</span>
                <span className="font-bold text-slate-800">{student.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Blood Group</span>
                <span className="font-bold text-slate-800">{student.bloodGroup || 'Not specified'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Contact & Address</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-800">{student.phone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-800">{student.email || 'No email provided'}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-relaxed">{student.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Linked Parents (AC3, AC7) */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Parents & Guardians</h3>
              <p className="text-xs text-slate-500">
                Primary contact receives billing and official school notices; emergency contacts are notified in urgent events.
              </p>
            </div>
            {canMutate && (
              <button
                onClick={() => setIsLinkModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Link Parent</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {student.parents && student.parents.length > 0 ? (
              student.parents.map((link) => {
                const parent = link.parentGuardian;
                if (!parent) return null;
                return (
                  <div
                    key={link.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3 relative hover:border-slate-300 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/parents/${parent.id}`}
                            className="font-bold text-slate-900 text-sm hover:text-brand-600 hover:underline"
                          >
                            {parent.firstName} {parent.lastName}
                          </Link>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {parent.relationship}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {parent.occupation || 'Occupation not listed'}
                        </div>
                      </div>

                      {canMutate && (
                        <button
                          onClick={() => setUnlinkParentId(parent.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Unlink this parent from student"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{parent.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{parent.email}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{parent.address}</span>
                      </div>
                    </div>

                    {link.relationshipNotes && (
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                        "{link.relationshipNotes}"
                      </div>
                    )}

                    {/* Flags & Toggles */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {link.isPrimaryContact && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold text-[10px] border border-brand-200">
                            ★ Primary Contact
                          </span>
                        )}
                        {link.isEmergencyContact && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                            🚨 Emergency
                          </span>
                        )}
                      </div>

                      {canMutate && (
                        <button
                          onClick={() =>
                            handleToggleContactFlag(
                              parent.id,
                              !link.isPrimaryContact,
                              link.isEmergencyContact
                            )
                          }
                          className="text-[11px] font-bold text-brand-600 hover:underline"
                        >
                          {link.isPrimaryContact ? 'Set Non-Primary' : 'Make Primary'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                No parents or guardians linked yet. Click "Link Parent" to attach or create a guardian.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Admission History Timeline (AC4, AC7) */}
      {activeTab === 'admissions' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Admission Applications History</h3>
              <p className="text-xs text-slate-500">
                Track full lifecycle history across academic years and grade applications.
              </p>
            </div>
            <Link
              to="/admissions"
              className="px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 text-xs font-bold hover:bg-brand-100 transition-colors"
            >
              Open Admissions Module
            </Link>
          </div>

          <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pl-6">
            {student.admissions && student.admissions.length > 0 ? (
              student.admissions.map((adm) => {
                let parsedDocs = [];
                try {
                  parsedDocs = adm.documentsSubmitted ? JSON.parse(adm.documentsSubmitted) : [];
                } catch {
                  parsedDocs = [];
                }

                return (
                  <div key={adm.id} className="relative text-xs">
                    {/* Timeline Node Dot */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-brand-600" />

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {adm.gradeAppliedFor} — Session {adm.academicYear}
                          </span>
                          <StatusBadge status={adm.admissionStatus} />
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          Applied on: {new Date(adm.applicationDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                        {adm.admissionDate && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">Admission Date Confirmed</span>
                            <span className="font-bold text-emerald-700">
                              {new Date(adm.admissionDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {adm.previousSchool && (
                          <div>
                            <span className="text-slate-400 block text-[10px]">Previous School</span>
                            <span className="font-semibold text-slate-800">{adm.previousSchool}</span>
                          </div>
                        )}
                      </div>

                      {parsedDocs.length > 0 && (
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-1">Documents Verified</span>
                          <div className="flex flex-wrap gap-1.5">
                            {parsedDocs.map((doc: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[10px] flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {adm.remarks && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px]">
                          <strong className="text-slate-900 block mb-0.5">Admin Remarks:</strong>
                          {adm.remarks}
                        </div>
                      )}

                      {adm.decidedBy && (
                        <div className="text-[11px] text-slate-400">
                          Decision recorded by: <strong className="text-slate-700">{adm.decidedBy.name}</strong> ({adm.decidedBy.role})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-400 text-xs">No admission records found for this student.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Fees & Discounts (AC6, AC7, AC8, AC9, AC14) */}
      {activeTab === 'fees' && canViewFees && (
        <StudentFeeTab student={student} onRefresh={fetchStudent} />
      )}

      {/* Edit Student Modal */}
      {isEditModalOpen && (
        <StudentFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateStudent}
          initialData={student}
        />
      )}

      {/* Link Parent Modal (AC3) */}
      {isLinkModalOpen && (
        <LinkParentModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          onSuccess={fetchStudent}
        />
      )}

      {/* Soft Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Soft Delete Student"
        message={`Are you sure you want to soft-delete ${student.firstName} ${student.lastName}? The student record will be archived while preserving historical admission records.`}
        confirmText="Soft Delete"
      />

      {/* Unlink Parent Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(unlinkParentId)}
        onClose={() => setUnlinkParentId(null)}
        onConfirm={handleUnlinkParent}
        title="Unlink Parent / Guardian"
        message="Are you sure you want to disconnect this parent from the student? The parent profile itself will remain in the directory."
        confirmText="Unlink Parent"
        isDanger={true}
      />
    </div>
  );
};
