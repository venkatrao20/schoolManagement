import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { GraduationCap, Lock, Mail, ArrowRight, Shield, UserCheck, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please provide both email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back! Signed in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to sign in. Check credentials.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-500 text-white shadow-xl shadow-brand-500/25 mb-4">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">SchoolConnect</h1>
          <p className="text-sm text-slate-300 mt-2">
            Admissions, Student Records & Role-Based Access Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sign in to your account</h2>
          <p className="text-xs text-slate-500 mb-6">
            Enter your credentials or choose a quick demo role below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@schoolconnect.edu"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              Quick Demo Role Sign-In (1-Click)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@schoolconnect.edu', 'Admin@123')}
                className="p-2 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all"
              >
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-600" />
                  SuperAdmin
                </div>
                <div className="text-[9px] text-purple-700">Full System Control</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@schoolconnect.edu', 'Admin@123')}
                className="p-2 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
              >
                <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-blue-600" />
                  Admin
                </div>
                <div className="text-[9px] text-blue-700">School Admin CRUD</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@schoolconnect.edu', 'Staff@123')}
                className="p-2 text-left bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
              >
                <div className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-600" />
                  Staff
                </div>
                <div className="text-[9px] text-slate-600">Read-Only Access</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Protected by SchoolConnect JWT Auth & Role-Based Access Control
        </p>
      </div>
    </div>
  );
};
