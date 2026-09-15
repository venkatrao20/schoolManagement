import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

interface NavbarProps {
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user, isSuperAdmin, isAdmin } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title || 'Dashboard'}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Tag Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>
            Mode:{' '}
            {isSuperAdmin
              ? 'Super Admin (Full Access)'
              : isAdmin
              ? 'Admin (Manage Records)'
              : 'Staff (View Only)'}
          </span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-[10px] text-slate-500">{user?.role}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
