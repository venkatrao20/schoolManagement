import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Admission, AdmissionStatus } from '../../types';
import { StatusBadge } from '../../components/Badge';
import { Users } from 'lucide-react';

interface ReviewAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: Admission | null;
  onSubmit: (id: string, data: any) => Promise<void>;
  isLoading?: boolean;
}

export const ReviewAdmissionModal: React.FC<ReviewAdmissionModalProps> = ({
  isOpen,
  onClose,
  admission,
  onSubmit,
  isLoading = false,
}) => {
  if (!admission) return null;

  const [status, setStatus] = useState<AdmissionStatus>(admission.admissionStatus);
  const [admissionDate, setAdmissionDate] = useState(
    admission.admissionDate ? admission.admissionDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState(admission.remarks || '');
  const [updateStudentStatus, setUpdateStudentStatus] = useState(true);

  const student = admission.student;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(admission.id, {
      admissionStatus: status,
      admissionDate: status === 'APPROVED' || status === 'ENROLLED' ? admissionDate : null,
      remarks,
      updateStudentStatus,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Admission Decision"
      subtitle={`Application for ${student?.firstName} ${student?.lastName} (${admission.academicYear})`}
      maxWidth="lg"
    >
      <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
        {/* Candidate Info Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">
              {student?.firstName} {student?.lastName}
            </span>
            <StatusBadge status={admission.admissionStatus} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
            <div>Adm No: <strong className="text-slate-800">{student?.admissionNumber}</strong></div>
            <div>Grade Applied: <strong className="text-brand-600">{admission.gradeAppliedFor}</strong></div>
            <div>Session: <strong className="text-slate-800">{admission.academicYear}</strong></div>
            <div>Previous School: {admission.previousSchool || 'N/A'}</div>
          </div>
        </div>

        {/* Linked Parents Info (AC7) */}
        {student?.parents && student.parents.length > 0 && (
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Parent / Guardian Contacts</span>
            </div>
            <div className="space-y-1">
              {student.parents.map((link) => (
                <div key={link.id} className="text-[11px] text-slate-700">
                  • <strong>{link.parentGuardian?.firstName} {link.parentGuardian?.lastName}</strong> ({link.parentGuardian?.relationship}): {link.parentGuardian?.phone} {link.isPrimaryContact && '★ (Primary)'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Selection */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Update Admission Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'PENDING', label: 'Pending' },
              { val: 'UNDER_REVIEW', label: 'Under Review' },
              { val: 'APPROVED', label: 'Approved' },
              { val: 'ENROLLED', label: 'Enrolled' },
              { val: 'WAITLISTED', label: 'Waitlisted' },
              { val: 'REJECTED', label: 'Rejected' },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setStatus(item.val as AdmissionStatus)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  status === item.val
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Admission Date (if approved/enrolled) */}
        {(status === 'APPROVED' || status === 'ENROLLED') && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Confirmation / Admission Date</label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
            />
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Decision Remarks / Notes</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Document interview findings, committee decision, fee instructions..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50"
          />
        </div>

        {/* Sync Student Status Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-700">
          <input
            type="checkbox"
            checked={updateStudentStatus}
            onChange={(e) => setUpdateStudentStatus(e.target.checked)}
            className="rounded text-brand-600 focus:ring-brand-500"
          />
          <span className="font-semibold text-[11px]">
            Automatically update student lifecycle status ({status === 'ENROLLED' ? 'ENROLLED' : status === 'APPROVED' ? 'ADMITTED' : 'Keep current'})
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50"
          >
            {isLoading ? 'Saving Decision...' : 'Save Decision'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
