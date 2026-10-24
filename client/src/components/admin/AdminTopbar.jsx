import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminTopbar = ({ onToggleMobile, isLive = true }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { admin, adminRoute } = useAdminAuth();
  const location = useLocation();

  // Compute clean breadcrumbs from pathname
  const relativePath = location.pathname.replace(adminRoute, '').replace(/^\//, '');
  const pathSegments = relativePath ? relativePath.split('/') : ['dashboard'];
  const pageTitle = pathSegments[pathSegments.length - 1]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return (
    <header className="sticky top-0 z-20 h-16 bg-[var(--portal-canvas-secondary)]/90 backdrop-blur-md border-b border-[var(--portal-card-border)] px-4 sm:px-6 flex items-center justify-between select-none">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          style={{ borderRadius: '6px' }}
          className="lg:hidden p-2 rounded-[6px] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors border border-[var(--portal-card-border)]"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand mark on mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <img
            src="/postifylogo2.png"
            alt="Postify"
            className="w-7 h-7 object-contain drop-shadow-xs"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-[var(--portal-subtle)] font-medium">
            <span>Admin</span>
            <span>/</span>
            <span className="capitalize text-[var(--portal-meta)]">{pathSegments[0]}</span>
            {pathSegments.length > 1 && (
              <>
                <span>/</span>
                <span className="capitalize text-[var(--portal-text)] font-semibold">{pageTitle}</span>
              </>
            )}
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[var(--portal-heading)] tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Live Status, Theme Toggle, Admin User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-time Event Indicator */}
        <div
          style={{ borderRadius: '6px' }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium border ${
            isLive
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}
          title={isLive ? 'Real-time WebSocket connected' : 'Fallback polling active'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="hidden sm:inline">{isLive ? 'Live Stream' : 'Polling'}</span>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          style={{ borderRadius: '6px' }}
          className="p-2 rounded-[6px] border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Administrator Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--portal-card-border)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {admin?.name?.charAt(0) || admin?.username?.charAt(0) || 'A'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-[var(--portal-heading)] leading-tight">
              {admin?.name || admin?.username || 'Administrator'}
            </span>
            <span className="text-[10px] text-[var(--portal-subtle)] font-mono">
              @{admin?.username || 'admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
