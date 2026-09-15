import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/students')) return 'Students & Enrolled Records';
    if (path.startsWith('/parents')) return 'Parents & Guardians Directory';
    if (path.startsWith('/admissions')) return 'Admissions & Enrollment Workflow';
    if (path.startsWith('/fees/structures')) return 'Fee Structures & Configurations';
    if (path.startsWith('/fees/plans')) return 'Payment Plans & Installment Schedules';
    if (path.startsWith('/fees/categories')) return 'Fee Categories & Heads';
    if (path.startsWith('/fees/discounts')) return 'Discount Rules & Concession Policies';
    if (path.startsWith('/users')) return 'Staff & Role Management';
    return 'Dashboard Overview';
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={getPageTitle()} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
