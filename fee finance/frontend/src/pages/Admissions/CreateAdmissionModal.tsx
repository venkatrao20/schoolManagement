import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Student } from '../../types';
import api from '../../api/client';
import { Search, FilePlus } from 'lucide-react';

const admissionSchema = z.object({
  studentId: z.string().min(1, 'Student selection is required'),
  academicYear: z.string().min(1, 'Academic year is required'),
  gradeAppliedFor: z.string().min(1, 'Grade applied for is required'),
  previousSchool: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

type AdmissionFormData = z.infer<typeof admissionSchema>;

interface CreateAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export const CreateAdmissionModal: React.FC<CreateAdmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    'Birth Certificate',
    'Transfer Certificate',
  ]);

  const docOptions = [
    'Birth Certificate',
    'Transfer Certificate',
    'Previous Year Mark Sheet',
    'Immunization / Medical Records',
    'Aadhaar / ID Proof',
    'Passport Photographs',
    'Address Proof',
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdmissionFormData>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      academicYear: '2026-2027',
      gradeAppliedFor: 'Grade 1',
      previousSchool: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (studentSearch.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.get(`/students?search=${encodeURIComponent(studentSearch)}`);
          setStudentResults(res.data.students || []);
        } catch {
          // ignore
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setStudentResults([]);
    }
  }, [studentSearch]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setValue('studentId', student.id);
    setValue('gradeAppliedFor', student.currentGrade);
    setStudentResults([]);
  };

  const toggleDoc = (doc: string) => {
    if (selectedDocs.includes(doc)) {
      setSelectedDocs(selectedDocs.filter((d) => d !== doc));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const handleFormSubmit = async (data: AdmissionFormData) => {
    await onSubmit({
      ...data,
      documentsSubmitted: selectedDocs,
      admissionStatus: 'PENDING',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Admission Application"
      subtitle="Register an application for incoming or transitioning student"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        {/* Student Selector */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
          {selectedStudent ? (
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </div>
                <div className="text-[11px] text-slate-500">
                  Adm No: {selectedStudent.admissionNumber} • Grade: {selectedStudent.currentGrade}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setValue('studentId', '');
                }}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student by name or admission number..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              {studentResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-1 bg-white shadow-lg space-y-1">
                  {studentResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-800">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className="text-slate-400">{s.admissionNumber} ({s.currentGrade})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {errors.studentId && (
            <p className="text-rose-500 text-[11px] mt-1">{errors.studentId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Academic Year *</label>
            <select
              {...register('academicYear')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Grade Applied For *</label>
            <select
              {...register('gradeAppliedFor')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
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
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Previous School (Optional)</label>
          <input
            {...register('previousSchool')}
            placeholder="e.g. St. Xavier's International School"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        {/* Documents checklist */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Documents Received / Checklist</label>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {docOptions.map((doc) => (
              <label key={doc} className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc)}
                  onChange={() => toggleDoc(doc)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="text-[11px] font-medium">{doc}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Admission Notes / Remarks</label>
          <textarea
            {...register('remarks')}
            rows={2}
            placeholder="Additional details regarding application, interview schedule..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !selectedStudent}
            className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <FilePlus className="w-4 h-4" />
            <span>{isLoading ? 'Creating...' : 'Submit Application'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
