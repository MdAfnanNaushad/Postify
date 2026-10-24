import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, loginPath, adminRoute } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--portal-canvas)] text-[var(--portal-text)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--portal-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--portal-meta)]">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath || `${adminRoute}/login`} state={{ from: location }} replace />;
  }

  return children;
};

export const AdminPublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, adminRoute } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--portal-canvas)] text-[var(--portal-text)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--portal-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[var(--portal-meta)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={`${adminRoute}/dashboard`} replace />;
  }

  return children;
};
