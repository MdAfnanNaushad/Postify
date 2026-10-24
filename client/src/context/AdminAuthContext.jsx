import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import adminApi from '../services/adminApi';

const AdminAuthContext = createContext(null);

// Safe access to configured admin route injected at build/runtime
const configuredAdminRoute = typeof __ADMIN_ROUTE__ !== 'undefined' ? __ADMIN_ROUTE__ : '/admin-portal';
const configuredLoginRoute = typeof __ADMIN_LOGIN_ROUTE__ !== 'undefined' ? __ADMIN_LOGIN_ROUTE__ : `${configuredAdminRoute}/login`;

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminRoute] = useState(configuredAdminRoute);
  const [loginPath] = useState(configuredLoginRoute);

  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/auth/session');
      if (res.data?.success && res.data?.admin) {
        setAdmin(res.data.admin);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    const res = await adminApi.post('/auth/login', { email, password });
    if (res.data?.success && res.data?.admin) {
      setAdmin(res.data.admin);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed.');
  };

  const logout = async () => {
    try {
      await adminApi.post('/auth/logout');
    } finally {
      setAdmin(null);
    }
  };

  const value = {
    admin,
    isAuthenticated: Boolean(admin && admin.role === 'admin'),
    loading,
    adminRoute,
    loginPath,
    login,
    logout,
    refreshSession: checkSession
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
