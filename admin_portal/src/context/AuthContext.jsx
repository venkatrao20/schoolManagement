import { createContext, useContext, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingUser = authService.getCurrentUser();
    if (existingUser && authService.isAuthenticated()) {
      setUser(existingUser);
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { user: loggedInUser } = await authService.login(username, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const loginWithClassKey = async (classKey) => {
    const { user: loggedInUser } = await authService.loginWithClassKey(classKey);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    loginWithClassKey,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Wrap protected routes with this. Optionally restrict by role.
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ textAlign: "center", marginTop: "60px" }}>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
