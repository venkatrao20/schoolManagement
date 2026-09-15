import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import api from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  canMutate: boolean; // SuperAdmin or Admin
  canMutateFees: boolean; // SuperAdmin or Finance
  canViewFees: boolean; // SuperAdmin, Finance, or Admin
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('schoolconnect_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('schoolconnect_token');
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('schoolconnect_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('schoolconnect_user', JSON.stringify(res.data.user));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = res.data;

    localStorage.setItem('schoolconnect_token', accessToken);
    localStorage.setItem('schoolconnect_refresh_token', refreshToken);
    localStorage.setItem('schoolconnect_user', JSON.stringify(userData));

    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('schoolconnect_token');
    localStorage.removeItem('schoolconnect_refresh_token');
    localStorage.removeItem('schoolconnect_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isFinance = user?.role === 'FINANCE';
  const isStaff = user?.role === 'STAFF';

  const canMutate = isSuperAdmin || isAdmin;
  const canMutateFees = isSuperAdmin || isFinance;
  const canViewFees = isSuperAdmin || isFinance || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasRole,
        canMutate,
        canMutateFees,
        canViewFees,
        isSuperAdmin,
        isAdmin,
        isFinance,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
