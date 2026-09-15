import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users2,
  FileCheck2,
  ShieldAlert,
  LogOut,
  Receipt,
  Tags,
  Percent,
  CalendarDays,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';

export const Sidebar: React.FC = () => {
  const { user, logout, isSuperAdmin, canViewFees } = useAuth();

  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: GraduationCap },
    { label: 'Parents & Guardians', path: '/parents', icon: Users2 },
    { label: 'Admissions', path: '/admissions', icon: FileCheck2 },
  ];

  const feeNavItems = [
    { label: 'Student Fees', path: '/fees/student-assignments', icon: Calculator },
    { label: 'Fee Structures', path: '/fees/structures', icon: Receipt },
    { label: 'Payment Plans', path: '/fees/plans', icon: CalendarDays },
    { label: 'Fee Categories', path: '/fees/categories', icon: Tags },
    { label: 'Discount Rules', path: '/fees/discounts', icon: Percent },
    { label: 'Audit Trail', path: '/fees/audit-logs', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shadow-xl flex-shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-black text-xl">
            SC
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              SchoolConnect
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-brand-400 font-bold">
              Admin Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1.5">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 opacity-80" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Fees & Billing Section (Finance, SuperAdmin, Admin) */}
        {canViewFees && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Fee Management</span>
              <span className="text-[9px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">
                Finance
              </span>
            </div>
            {feeNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 opacity-80" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Administration Section */}
        {isSuperAdmin && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-400">
              System Admin
            </div>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <ShieldAlert className="w-5 h-5 opacity-80" />
              <span>User Management</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Info & Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-200 truncate">{user?.name}</div>
            <RoleBadge role={user?.role || 'STAFF'} />
          </div>
          <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
