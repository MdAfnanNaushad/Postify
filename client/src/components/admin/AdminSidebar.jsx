import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  Activity,
  Users,
  FileText,
  MessageSquare,
  FolderGit2,
  BookOpen,
  Hash,
  UserPlus,
  Sparkles,
  Mail,
  ShieldAlert,
  UserX,
  EyeOff,
  ScrollText,
  HeartPulse,
  Cpu,
  Clock,
  Send,
  Sliders,
  UserCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminSidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { adminRoute, loginPath, logout, admin } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(loginPath || `${adminRoute}/login`);
  };

  const navGroups = [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, path: `${adminRoute}/dashboard`, iconColor: 'text-blue-500 dark:text-blue-400', iconBg: 'bg-blue-500/15' },
        { label: 'Analytics', icon: LineChart, path: `${adminRoute}/analytics`, iconColor: 'text-purple-500 dark:text-purple-400', iconBg: 'bg-purple-500/15' },
        { label: 'Live Activity', icon: Activity, path: `${adminRoute}/activity`, iconColor: 'text-emerald-500 dark:text-emerald-400', iconBg: 'bg-emerald-500/15' }
      ]
    },
    {
      group: 'Community & Content',
      items: [
        { label: 'Users', icon: Users, path: `${adminRoute}/users`, iconColor: 'text-sky-500 dark:text-sky-400', iconBg: 'bg-sky-500/15' },
        { label: 'Posts', icon: FileText, path: `${adminRoute}/posts`, iconColor: 'text-amber-500 dark:text-amber-400', iconBg: 'bg-amber-500/15' },
        { label: 'Replies', icon: MessageSquare, path: `${adminRoute}/replies`, iconColor: 'text-cyan-500 dark:text-cyan-400', iconBg: 'bg-cyan-500/15' },
        { label: 'Projects', icon: FolderGit2, path: `${adminRoute}/projects`, iconColor: 'text-emerald-500 dark:text-emerald-400', iconBg: 'bg-emerald-500/15' },
        { label: 'Build Logs', icon: BookOpen, path: `${adminRoute}/build-logs`, iconColor: 'text-violet-500 dark:text-violet-400', iconBg: 'bg-violet-500/15' },
        { label: 'Hashtags', icon: Hash, path: `${adminRoute}/hashtags`, iconColor: 'text-pink-500 dark:text-pink-400', iconBg: 'bg-pink-500/15' },
        { label: 'Follows', icon: UserPlus, path: `${adminRoute}/follows`, iconColor: 'text-indigo-500 dark:text-indigo-400', iconBg: 'bg-indigo-500/15' }
      ]
    },
    {
      group: 'Engagement & Digest',
      items: [
        { label: 'Engagement', icon: Sparkles, path: `${adminRoute}/engagement`, iconColor: 'text-rose-500 dark:text-rose-400', iconBg: 'bg-rose-500/15' },
        { label: 'Weekly Digest', icon: Mail, path: `${adminRoute}/digest`, iconColor: 'text-yellow-500 dark:text-yellow-400', iconBg: 'bg-yellow-500/15' }
      ]
    },
    {
      group: 'Trust & Moderation',
      items: [
        { label: 'Moderation Queue', icon: ShieldAlert, path: `${adminRoute}/moderation`, iconColor: 'text-red-500 dark:text-red-400', iconBg: 'bg-red-500/15' },
        { label: 'Suspended Users', icon: UserX, path: `${adminRoute}/suspended-users`, iconColor: 'text-orange-500 dark:text-orange-400', iconBg: 'bg-orange-500/15' },
        { label: 'Hidden Content', icon: EyeOff, path: `${adminRoute}/hidden-content`, iconColor: 'text-fuchsia-500 dark:text-fuchsia-400', iconBg: 'bg-fuchsia-500/15' },
        { label: 'Audit Logs', icon: ScrollText, path: `${adminRoute}/audit-logs`, iconColor: 'text-amber-500 dark:text-amber-400', iconBg: 'bg-amber-500/15' }
      ]
    },
    {
      group: 'System & Infra',
      items: [
        { label: 'System Health', icon: HeartPulse, path: `${adminRoute}/system/health`, iconColor: 'text-emerald-500 dark:text-emerald-400', iconBg: 'bg-emerald-500/15' },
        { label: 'API & Traffic', icon: Cpu, path: `${adminRoute}/system/traffic`, iconColor: 'text-blue-500 dark:text-blue-400', iconBg: 'bg-blue-500/15' },
        { label: 'Background Jobs', icon: Clock, path: `${adminRoute}/system/jobs`, iconColor: 'text-purple-500 dark:text-purple-400', iconBg: 'bg-purple-500/15' },
        { label: 'Email Delivery', icon: Send, path: `${adminRoute}/system/email`, iconColor: 'text-teal-500 dark:text-teal-400', iconBg: 'bg-teal-500/15' },
        { label: 'Configuration', icon: Sliders, path: `${adminRoute}/system/config`, iconColor: 'text-indigo-500 dark:text-indigo-400', iconBg: 'bg-indigo-500/15' }
      ]
    },
    {
      group: 'Security',
      items: [
        { label: 'Admin Profile', icon: UserCheck, path: `${adminRoute}/profile`, iconColor: 'text-cyan-500 dark:text-cyan-400', iconBg: 'bg-cyan-500/15' }
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--portal-canvas-secondary)] border-r border-[var(--portal-card-border)] select-none">
      {/* Brand Header with Authentic Postify Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--portal-card-border)]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/postifylogo2.png"
            alt="Postify Logo"
            className="w-8 h-8 object-contain shrink-0 drop-shadow-xs"
          />
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-base tracking-tight text-[var(--portal-heading)]">
                Postify
              </span>
              <span
                style={{ borderRadius: '4px' }}
                className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-[4px] bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30"
              >
                Admin
              </span>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-[6px] text-[var(--portal-meta)] hover:text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
            aria-label="Close mobile navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ borderRadius: '6px' }}
          className="hidden lg:flex p-1.5 rounded-[6px] text-[var(--portal-meta)] hover:text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed ? (
              <h4 className="px-3 text-[10px] font-bold tracking-widest uppercase text-[var(--portal-subtle)]">
                {group.group}
              </h4>
            ) : (
              <div className="h-1.5" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                    style={{ borderRadius: '6px' }}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-xs font-medium transition-all duration-200 border ${
                        isActive
                          ? 'bg-gradient-to-r from-[var(--portal-accent)]/15 via-[var(--portal-accent)]/8 to-transparent text-white font-semibold border-[var(--portal-accent)]/30 shadow-xs'
                          : 'text-[var(--portal-meta)] border-transparent hover:text-[var(--portal-heading)] hover:bg-white/[0.05] dark:hover:bg-white/[0.06] hover:border-white/10 hover:translate-x-1 hover:shadow-xs'
                      } ${isCollapsed ? 'justify-center px-0 hover:translate-x-0' : ''}`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !isCollapsed && (
                          <span className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[var(--portal-accent)] shadow-[0_0_8px_rgba(0,122,255,0.7)]" />
                        )}
                        <div
                          style={{ borderRadius: '5px' }}
                          className={`w-6 h-6 rounded-[5px] flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor} transition-all duration-200 group-hover:scale-110 shadow-xs ${
                            isActive ? 'ring-1 ring-white/15' : ''
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isCollapsed && (
                          <span className="truncate flex-1 tracking-tight">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Admin User & Logout Footer */}
      <div className="p-3 border-t border-[var(--portal-card-border)] space-y-2">
        {!isCollapsed && admin && (
          <div className="px-2 py-1 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {admin.name?.[0] || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[var(--portal-heading)] truncate">
                {admin.name || 'System Admin'}
              </div>
              <div className="text-[10px] text-[var(--portal-subtle)] truncate">
                @{admin.username}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{ borderRadius: '6px' }}
          className={`w-full group flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-xs font-medium text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 hover:translate-x-1 transition-all duration-200 ${
            isCollapsed ? 'justify-center px-0 hover:translate-x-0' : ''
          }`}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <div
            style={{ borderRadius: '5px' }}
            className="w-6 h-6 rounded-[5px] bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
          </div>
          {!isCollapsed && <span>End Admin Session</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 transition-all duration-200 z-30" style={{ width: isCollapsed ? 72 : 250 }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile / Tablet Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-[270px] max-w-[85vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
