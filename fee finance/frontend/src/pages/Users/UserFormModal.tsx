import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/Modal';

const userSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF']),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        email: '',
        password: '',
        role: 'STAFF',
      });
    }
  }, [isOpen, reset]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Administrator / Staff User Account"
      subtitle="Register an authorized account with role-based permissions"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
          <input
            {...register('name')}
            placeholder="e.g. Margaret Taylor"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
          {errors.name && (
            <p className="text-rose-500 text-[11px] mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
          <input
            type="email"
            {...register('email')}
            placeholder="margaret.taylor@schoolconnect.edu"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
          {errors.email && (
            <p className="text-rose-500 text-[11px] mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Password *</label>
          <input
            type="password"
            {...register('password')}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />
          {errors.password && (
            <p className="text-rose-500 text-[11px] mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">System Role & Permissions *</label>
          <select
            {...register('role')}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 font-medium"
          >
            <option value="STAFF">Staff (View Only — Records inspection)</option>
            <option value="ADMIN">Admin (Full Admissions, Student & Parent CRUD)</option>
            <option value="SUPER_ADMIN">SuperAdmin (Complete System & User Control)</option>
          </select>
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
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
