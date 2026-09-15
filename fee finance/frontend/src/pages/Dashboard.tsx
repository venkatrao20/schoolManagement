import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/Badge';
import {
  GraduationCap,
  Users,
  FileCheck2,
  Clock,
  CheckCircle,
  PlusCircle,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, canMutate } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const metrics = stats?.metrics || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950 to-indigo-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>Academic Session 2026–2027</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-xl">
            You are logged in as <strong className="text-white">{user?.role}</strong>. Monitor real-time admissions, manage student lifecycles, and coordinate parent links.
          </p>
        </div>

        {canMutate && (
          <div className="flex flex-wrap gap-3 relative z-10">
            <Link
              to="/students"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Student</span>
            </Link>
            <Link
              to="/admissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md transition-all border border-white/10"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Admissions Portal</span>
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalStudents || 0}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">{metrics.enrolledStudents || 0} currently enrolled</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parents & Guardians</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalParents || 0}</h3>
            <span className="text-[11px] text-slate-500 font-semibold">Active contacts</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Admissions</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.pendingAdmissions || 0}</h3>
            <span className="text-[11px] text-amber-700 font-semibold">Needs review</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Admissions</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.approvedAdmissions || 0}</h3>
            <span className="text-[11px] text-emerald-700 font-semibold">Ready for enrollment</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Admissions & Grade Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Admissions Feed */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Admission Applications</h3>
            </div>
            <Link to="/admissions" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Student Name</th>
                  <th className="py-2.5 px-3 font-semibold">Grade</th>
                  <th className="py-2.5 px-3 font-semibold">Year</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentAdmissions?.length > 0 ? (
                  stats.recentAdmissions.map((adm: any) => (
                    <tr key={adm.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900">
                          {adm.student?.firstName} {adm.student?.lastName}
                        </span>
                        <div className="text-[10px] text-slate-400">{adm.student?.admissionNumber}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{adm.gradeAppliedFor}</td>
                      <td className="py-3 px-3 text-slate-600">{adm.academicYear}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={adm.admissionStatus} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/admissions`}
                          className="text-xs font-bold text-brand-600 hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No recent admission applications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Class & Grade Breakdown</h3>
          </div>

          <div className="space-y-3 pt-2">
            {stats?.charts?.gradeDistribution?.length > 0 ? (
              stats.charts.gradeDistribution.map((item: any) => {
                const total = metrics.totalStudents || 1;
                const percentage = Math.round((item.count / total) * 100);
                return (
                  <div key={item.grade} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{item.grade}</span>
                      <span>{item.count} students ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">No student distribution data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
