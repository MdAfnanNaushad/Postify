import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Shield, Key, LogOut, Lock } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminProfilePage = () => {
  const { admin, adminRoute, loginPath, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(loginPath || `${adminRoute}/login`);
  };

  return (
    <>
      <Helmet>
        <title>Administrator Profile & Security — Postify Admin</title>
      </Helmet>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Administrator Profile & Security
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Active session context, identity metadata, and privilege level.
          </p>
        </div>

        {/* Identity Card */}
        <div className="portal-card p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xl shadow-md">
              {admin?.name?.charAt(0) || admin?.username?.charAt(0) || 'A'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--portal-heading)]">
                {admin?.name || 'Administrator'}
              </h3>
              <p className="text-xs text-[var(--portal-subtle)] font-mono">
                @{admin?.username || 'admin'}
              </p>
              <div className="mt-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20">
                  {admin?.role || 'admin'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--portal-card-border)] text-xs">
            <div>
              <span className="text-[var(--portal-subtle)] block">Account Email</span>
              <span className="font-mono font-medium text-[var(--portal-heading)]">{admin?.email}</span>
            </div>
            <div>
              <span className="text-[var(--portal-subtle)] block">Administrator ID</span>
              <span className="font-mono font-medium text-[var(--portal-heading)]">{admin?.id}</span>
            </div>
          </div>
        </div>

        {/* Security Overview */}
        <div className="portal-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#007aff]" />
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Session & Authorization Architecture
            </h3>
          </div>

          <div className="space-y-3 text-xs text-[var(--portal-meta)] leading-relaxed">
            <p>
              Your administrative session is protected with cryptographically signed JSON Web Tokens transmitted over HTTP-only, SameSite-isolated cookies.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)]">
                <span className="font-bold text-[var(--portal-heading)] block mb-0.5">Authorization Boundary</span>
                <span>Server-side verification on all <code>/api/admin/*</code> routes.</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)]">
                <span className="font-bold text-[var(--portal-heading)] block mb-0.5">Audit Compliance</span>
                <span>All destructive and moderation actions are logged immutably.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--portal-card-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--portal-subtle)]">
              Terminate active session and clear authentication cookies
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Administrator</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
