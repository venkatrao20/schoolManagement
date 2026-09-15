import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { StudentList } from './pages/Students/StudentList';
import { StudentDetail } from './pages/Students/StudentDetail';
import { ParentList } from './pages/Parents/ParentList';
import { ParentDetail } from './pages/Parents/ParentDetail';
import { AdmissionsList } from './pages/Admissions/AdmissionsList';
import { UserList } from './pages/Users/UserList';
import { FeeStructures } from './pages/Fees/FeeStructures';
import { PaymentPlans } from './pages/Fees/PaymentPlans';
import { FeeCategories } from './pages/Fees/FeeCategories';
import { DiscountRules } from './pages/Fees/DiscountRules';
import { StudentFees } from './pages/Fees/StudentFees';
import { FinanceAuditLogs } from './pages/Fees/FinanceAuditLogs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const FeeModuleRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, canViewFees, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canViewFees) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="students" element={<StudentList />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="parents" element={<ParentList />} />
                <Route path="parents/:id" element={<ParentDetail />} />
                <Route path="admissions" element={<AdmissionsList />} />

                {/* Fee Management Module Routes */}
                <Route
                  path="fees/student-assignments"
                  element={
                    <FeeModuleRoute>
                      <StudentFees />
                    </FeeModuleRoute>
                  }
                />
                <Route
                  path="fees/structures"
                  element={
                    <FeeModuleRoute>
                      <FeeStructures />
                    </FeeModuleRoute>
                  }
                />
                <Route
                  path="fees/plans"
                  element={
                    <FeeModuleRoute>
                      <PaymentPlans />
                    </FeeModuleRoute>
                  }
                />
                <Route
                  path="fees/categories"
                  element={
                    <FeeModuleRoute>
                      <FeeCategories />
                    </FeeModuleRoute>
                  }
                />
                <Route
                  path="fees/discounts"
                  element={
                    <FeeModuleRoute>
                      <DiscountRules />
                    </FeeModuleRoute>
                  }
                />
                <Route
                  path="fees/audit-logs"
                  element={
                    <FeeModuleRoute>
                      <FinanceAuditLogs />
                    </FeeModuleRoute>
                  }
                />

                <Route
                  path="users"
                  element={
                    <SuperAdminRoute>
                      <UserList />
                    </SuperAdminRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
