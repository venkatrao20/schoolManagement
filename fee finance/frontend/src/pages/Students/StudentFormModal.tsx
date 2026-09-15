import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { Student } from '../../types';

const studentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.string().optional().nullable(),
  nationality: z.string().min(1, 'Nationality is required').default('Indian'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  status: z.enum(['ENQUIRY', 'APPLIED', 'ADMITTED', 'ENROLLED', 'ALUMNI', 'WITHDRAWN']),
  currentGrade: z.string().min(1, 'Current grade is required'),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentFormData) => Promise<void>;
  initialData?: Student | null;
  isLoading?: boolean;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      admissionNumber: initialData?.admissionNumber || `SC-2026-${Math.floor(100 + Math.random() * 900)}`,
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      dateOfBirth: initialData?.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '2016-01-01',
      gender: initialData?.gender || 'MALE',
      bloodGroup: initialData?.bloodGroup || 'O+',
      nationality: initialData?.nationality || 'Indian',
      address: initialData?.address || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      status: initialData?.status || 'APPLIED',
      currentGrade: initialData?.currentGrade || 'Grade 1',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        admissionNumber: initialData.admissionNumber,
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : '',
        gender: initialData.gender,
        bloodGroup: initialData.bloodGroup || '',
        nationality: initialData.nationality || 'Indian',
        address: initialData.address,
        phone: initialData.phone || '',
        email: initialData.email || '',
        status: initialData.status,
        currentGrade: initialData.currentGrade,
      });
    } else {
      reset({
        admissionNumber: `SC-2026-${Math.floor(100 + Math.random() * 900)}`,
        firstName: '',
        lastName: '',
        dateOfBirth: '2016-01-01',
        gender: 'MALE',
        bloodGroup: 'O+',
        nationality: 'Indian',
        address: '',
        phone: '',
        email: '',
        status: 'APPLIED',
        currentGrade: 'Grade 1',
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: StudentFormData) => {
    await onSubmit(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Student Details' : 'Register New Student'}
      subtitle={isEditing ? `Editing record for ${initialData?.firstName} ${initialData?.lastName}` : 'Fill in student demographic and enrollment information'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Admission Number *</label>
            <input
              {...register('admissionNumber')}
              placeholder="e.g. SC-2026-101"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.admissionNumber && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.admissionNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Current Grade / Class *</label>
            <select
              {...register('currentGrade')}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name *</label>
            <input
              {...register('firstName')}
              placeholder="e.g. Aarav"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.firstName && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
            <input
              {...register('lastName')}
              placeholder="e.g. Sharma"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.lastName && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              {...register('dateOfBirth')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.dateOfBirth && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.dateOfBirth.message}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Gender *</label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
            <select
              {...register('bloodGroup')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
            <input
              {...register('phone')}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address (Optional)</label>
            <input
              type="email"
              {...register('email')}
              placeholder="student@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.email && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Lifecycle Status *</label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="ENQUIRY">Enquiry</option>
              <option value="APPLIED">Applied</option>
              <option value="ADMITTED">Admitted</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="ALUMNI">Alumni</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nationality</label>
            <input
              {...register('nationality')}
              placeholder="Indian"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Residential Address *</label>
          <textarea
            {...register('address')}
            rows={2}
            placeholder="Complete postal address..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
          {errors.address && (
            <p className="text-rose-500 text-[11px] mt-1">{errors.address.message}</p>
          )}
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
            disabled={isLoading}
            className="px-5 py-2 font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/30 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
