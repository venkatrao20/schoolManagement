import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { ParentGuardian } from '../../types';

const parentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']),
  phone: z.string().min(6, 'Valid phone is required'),
  email: z.string().email('Valid email is required'),
  occupation: z.string().optional().nullable(),
  address: z.string().min(1, 'Address is required'),
  idProofType: z.string().optional().nullable(),
  idProofNumber: z.string().optional().nullable(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface ParentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ParentFormData) => Promise<void>;
  initialData?: ParentGuardian | null;
  isLoading?: boolean;
}

export const ParentFormModal: React.FC<ParentFormModalProps> = ({
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
  } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      relationship: initialData?.relationship || 'GUARDIAN',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      occupation: initialData?.occupation || '',
      address: initialData?.address || '',
      idProofType: initialData?.idProofType || 'AADHAAR',
      idProofNumber: initialData?.idProofNumber || '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        relationship: initialData.relationship,
        phone: initialData.phone,
        email: initialData.email,
        occupation: initialData.occupation || '',
        address: initialData.address,
        idProofType: initialData.idProofType || 'AADHAAR',
        idProofNumber: initialData.idProofNumber || '',
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        relationship: 'GUARDIAN',
        phone: '',
        email: '',
        occupation: '',
        address: '',
        idProofType: 'AADHAAR',
        idProofNumber: '',
      });
    }
  }, [initialData, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Parent / Guardian Record' : 'Register New Parent / Guardian'}
      subtitle={isEditing ? `Editing record for ${initialData?.firstName} ${initialData?.lastName}` : 'Add contact and legal guardian profile'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">First Name *</label>
            <input
              {...register('firstName')}
              placeholder="e.g. Rajesh"
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Relationship Type *</label>
            <select
              {...register('relationship')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="FATHER">Father</option>
              <option value="MOTHER">Mother</option>
              <option value="GUARDIAN">Guardian</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Occupation</label>
            <input
              {...register('occupation')}
              placeholder="e.g. Software Engineer"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
            <input
              {...register('phone')}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.phone && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              {...register('email')}
              placeholder="parent@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
            {errors.email && (
              <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ID Proof Type</label>
            <select
              {...register('idProofType')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            >
              <option value="AADHAAR">Aadhaar Card</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENSE">Driving License</option>
              <option value="VOTER_ID">Voter ID</option>
              <option value="OTHER">Other Official ID</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ID Proof Number</label>
            <input
              {...register('idProofNumber')}
              placeholder="e.g. XXXX-XXXX-4819"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Residential Address *</label>
          <textarea
            {...register('address')}
            rows={2}
            placeholder="Full postal address..."
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
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Guardian Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
