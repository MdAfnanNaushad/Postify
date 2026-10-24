import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Users,
  Shield,
  UserX,
  UserCheck,
  Eye,
  Filter,
  AlertCircle,
  FolderGit2,
  FileText,
  Clock,
  Mail,
  Calendar,
  Award,
  Check,
  X,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminUsersPage = () => {
  const { admin } = useAdminAuth();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal & Drawer State
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState(null);

  const [suspendDialog, setSuspendDialog] = useState({ open: false, user: null, isSuspending: true });
  const [roleDialog, setRoleDialog] = useState({ open: false, user: null, newRole: 'user' });
  const [badgeDialog, setBadgeDialog] = useState({ open: false, user: null, isVerified: false, badgeTitle: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        role: roleFilter,
        status: statusFilter,
        search
      });
      const res = await adminApi.get(`/users?${params.toString()}`);
      if (res.data?.success) {
        setUsers(res.data.users);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetail = async (user) => {
    setSelectedUser(user);
    setDrawerOpen(true);
    setUserDetailLoading(true);
    try {
      const res = await adminApi.get(`/users/${user._id}`);
      if (res.data?.success) {
        setUserDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleConfirmSuspension = async (reason) => {
    if (!suspendDialog.user) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/users/${suspendDialog.user._id}/suspend`, {
        isSuspended: suspendDialog.isSuspending,
        reason
      });
      setFeedback({
        text: `User @${suspendDialog.user.username} was successfully ${suspendDialog.isSuspending ? 'suspended' : 'reinstated'}.`,
        type: 'success'
      });
      setSuspendDialog({ open: false, user: null, isSuspending: true });
      fetchUsers();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRole = async (reason) => {
    if (!roleDialog.user) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/users/${roleDialog.user._id}/role`, {
        role: roleDialog.newRole,
        reason
      });
      setFeedback({
        text: `Role for @${roleDialog.user.username} changed to ${roleDialog.newRole}.`,
        type: 'success'
      });
      setRoleDialog({ open: false, user: null, newRole: 'user' });
      fetchUsers();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBadgeModal = (user) => {
    setBadgeDialog({
      open: true,
      user,
      isVerified: Boolean(user.isVerified),
      badgeTitle: user.badgeTitle || user.badge || '',
      reason: ''
    });
  };

  const handleConfirmBadge = async (e) => {
    e.preventDefault();
    if (!badgeDialog.user) return;
    try {
      setActionLoading(true);
      const res = await adminApi.patch(`/users/${badgeDialog.user._id}/badge`, {
        isVerified: badgeDialog.isVerified,
        badgeTitle: badgeDialog.badgeTitle.trim(),
        badge: badgeDialog.badgeTitle.trim(),
        reason: badgeDialog.reason.trim()
      });
      setFeedback({
        text: `Badges for @${badgeDialog.user.username} successfully updated.`,
        type: 'success'
      });
      setBadgeDialog({ open: false, user: null, isVerified: false, badgeTitle: '', reason: '' });
      fetchUsers();
      if (selectedUser && selectedUser._id === badgeDialog.user._id) {
        handleOpenDetail(badgeDialog.user);
      }
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const BADGE_PRESETS = [
    'Verified Developer',
    'Core Contributor',
    'Postify Staff',
    'Founding Creator',
    'Top Writer',
    'Community Mentor'
  ];

  const columns = [
    {
      header: 'Developer',
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
            {u.name?.charAt(0) || u.username?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--portal-heading)] text-xs flex items-center gap-1.5 truncate">
              <span>{u.name || u.username}</span>
              {u.isVerified && (
                <img
                  src="/verification.png"
                  alt="Verified"
                  title="Official Verification Badge"
                  className="w-3.5 h-3.5 object-contain shrink-0"
                />
              )}
            </div>
            <div className="text-[11px] text-[var(--portal-subtle)] font-mono truncate">
              @{u.username}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      className: 'hidden md:table-cell font-mono text-[11px] text-[var(--portal-meta)]'
    },
    {
      header: 'Badges',
      render: (u) => {
        const hasVerified = Boolean(u.isVerified);
        const customTitle = u.badgeTitle || u.badge;

        if (!hasVerified && !customTitle) {
          return <span className="text-[var(--portal-subtle)] text-xs">—</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-1">
            {hasVerified && (
              <span
                style={{ borderRadius: '4px' }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-blue-500/10 border border-blue-500/20 text-[#007aff] text-[10px] font-semibold"
              >
                <img src="/verification.png" alt="" className="w-3 h-3 object-contain" />
                <span>Verified</span>
              </span>
            )}
            {customTitle && (
              <span
                style={{ borderRadius: '4px' }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-semibold"
              >
                <Award className="w-3 h-3" />
                <span>{customTitle}</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Role',
      render: (u) => {
        const roleColors = {
          admin: 'bg-[#007aff]/10 text-[#007aff] border-[#007aff]/20',
          moderator: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          user: 'bg-zinc-500/10 text-[var(--portal-meta)] border-[var(--portal-card-border)]'
        };
        return (
          <span
            style={{ borderRadius: '4px' }}
            className={`px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider border ${roleColors[u.role] || roleColors.user}`}
          >
            {u.role}
          </span>
        );
      }
    },
    {
      header: 'Status',
      render: (u) => (
        <span
          style={{ borderRadius: '4px' }}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${
            u.isSuspended
              ? 'bg-rose-500/10 text-rose-500'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${u.isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {u.isSuspended ? 'Suspended' : 'Active'}
        </span>
      )
    },
    {
      header: 'Joined',
      className: 'hidden lg:table-cell text-[11px] text-[var(--portal-meta)]',
      render: (u) => new Date(u.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (u) => {
        const isSelf = admin && admin.id === u._id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenDetail(u)}
              style={{ borderRadius: '6px' }}
              className="p-1.5 rounded-[6px] border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
              title="Inspect developer record"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Grant / Edit Badge Button */}
            <button
              onClick={() => handleOpenBadgeModal(u)}
              style={{ borderRadius: '6px' }}
              className="p-1.5 rounded-[6px] border border-[var(--portal-card-border)] text-purple-500 hover:bg-purple-500/10 transition-colors"
              title="Explicitly assign badge"
            >
              <Award className="w-3.5 h-3.5" />
            </button>

            {!isSelf && (
              <>
                <button
                  onClick={() =>
                    setSuspendDialog({
                      open: true,
                      user: u,
                      isSuspending: !u.isSuspended
                    })
                  }
                  style={{ borderRadius: '6px' }}
                  className={`p-1.5 rounded-[6px] border border-[var(--portal-card-border)] transition-colors ${
                    u.isSuspended
                      ? 'text-emerald-500 hover:bg-emerald-500/10'
                      : 'text-rose-500 hover:bg-rose-500/10'
                  }`}
                  title={u.isSuspended ? 'Reinstate user' : 'Suspend user'}
                >
                  {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                </button>

                <select
                  value={u.role}
                  onChange={(e) =>
                    setRoleDialog({
                      open: true,
                      user: u,
                      newRole: e.target.value
                    })
                  }
                  style={{ borderRadius: '6px' }}
                  className="text-[11px] p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-[6px] text-[var(--portal-text)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)]"
                  title="Change role"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <>
      <Helmet>
        <title>User Management & Moderation — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Page Header & Global Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              Developer Directory & Access
            </h2>
            <p className="text-xs text-[var(--portal-meta)] mt-0.5">
              Inspect user records, grant verified badges, assign privileges, and execute security actions.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{ borderRadius: '6px' }}
              className="text-xs px-2.5 py-2 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-[6px] text-[var(--portal-text)] font-semibold shadow-xs"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Administrators</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ borderRadius: '6px' }}
              className="text-xs px-2.5 py-2 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-[6px] text-[var(--portal-text)] font-semibold shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {feedback.text && (
          <div
            style={{ borderRadius: '6px' }}
            className={`p-3.5 rounded-[6px] text-xs flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              onClick={() => setFeedback({ text: '', type: 'success' })}
              className="text-[11px] font-bold hover:underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Users Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
          searchPlaceholder="Search by username, real name, or email..."
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          emptyMessage="No developers found matching current filters."
        />

        {/* User Detail Drawer */}
        <DetailDrawer
          isOpen={drawerOpen}
          title={selectedUser ? `@${selectedUser.username}` : 'User Profile'}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedUser(null);
            setUserDetail(null);
          }}
        >
          {userDetailLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-[var(--portal-meta)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--portal-accent)]" />
              <span>Querying database records...</span>
            </div>
          ) : userDetail ? (
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div
                style={{ borderRadius: '6px' }}
                className="portal-card rounded-[6px] p-5 space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center text-xl font-bold shadow-md">
                    {userDetail.user.name?.charAt(0) || userDetail.user.username?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--portal-heading)] flex items-center gap-1.5">
                      <span>{userDetail.user.name || userDetail.user.username}</span>
                      {userDetail.user.isVerified && (
                        <img src="/verification.png" alt="Verified" className="w-4 h-4 object-contain inline" />
                      )}
                    </h3>
                    <p className="text-xs text-[var(--portal-subtle)] font-mono">@{userDetail.user.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        style={{ borderRadius: '4px' }}
                        className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#007aff]/10 text-[#007aff]"
                      >
                        {userDetail.user.role}
                      </span>
                      {userDetail.user.badgeTitle && (
                        <span
                          style={{ borderRadius: '4px' }}
                          className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        >
                          {userDetail.user.badgeTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {userDetail.user.bio && (
                  <p className="text-xs text-[var(--portal-text)] italic border-t border-[var(--portal-card-border)] pt-3 leading-relaxed">
                    "{userDetail.user.bio}"
                  </p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenBadgeModal(userDetail.user)}
                    style={{ borderRadius: '6px' }}
                    className="px-3 py-1.5 rounded-[6px] bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Manage Badges</span>
                  </button>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div style={{ borderRadius: '6px' }} className="portal-card rounded-[6px] p-3 text-center">
                  <span className="text-[10px] uppercase text-[var(--portal-subtle)] font-semibold">Posts</span>
                  <div className="text-lg font-bold text-[var(--portal-heading)]">{userDetail.stats.postsCount}</div>
                </div>
                <div style={{ borderRadius: '6px' }} className="portal-card rounded-[6px] p-3 text-center">
                  <span className="text-[10px] uppercase text-[var(--portal-subtle)] font-semibold">Projects</span>
                  <div className="text-lg font-bold text-[var(--portal-heading)]">{userDetail.stats.projectsCount}</div>
                </div>
                <div style={{ borderRadius: '6px' }} className="portal-card rounded-[6px] p-3 text-center">
                  <span className="text-[10px] uppercase text-[var(--portal-subtle)] font-semibold">Reports</span>
                  <div className="text-lg font-bold text-rose-500">{userDetail.stats.reportsCount}</div>
                </div>
              </div>

              {/* Administrative History */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--portal-heading)] uppercase tracking-wider">
                  Administrative History
                </h4>
                <div style={{ borderRadius: '6px' }} className="portal-card rounded-[6px] divide-y divide-[var(--portal-card-border)]">
                  {userDetail.auditHistory.length > 0 ? (
                    userDetail.auditHistory.map((item) => (
                      <div key={item._id} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--portal-heading)] capitalize">{item.action.replace('_', ' ')}</span>
                          <span className="text-[10px] text-[var(--portal-subtle)]">{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-[var(--portal-meta)]">{item.reason || 'No reason provided'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-[var(--portal-subtle)]">
                      No administrative actions recorded against this account.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DetailDrawer>

        {/* Manual Badge Assignment Modal (Explicit Admin Capability) */}
        {badgeDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => !actionLoading && setBadgeDialog({ open: false, user: null, isVerified: false, badgeTitle: '', reason: '' })}
            />
            <div
              style={{ borderRadius: '6px' }}
              className="relative w-full max-w-md bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-[6px] shadow-2xl p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ borderRadius: '6px' }}
                    className="w-10 h-10 rounded-[6px] bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--portal-heading)]">
                      Assign Badge
                    </h3>
                    <p className="text-xs text-[var(--portal-subtle)] font-mono">
                      @{badgeDialog.user?.username}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setBadgeDialog({ open: false, user: null, isVerified: false, badgeTitle: '', reason: '' })}
                  disabled={actionLoading}
                  style={{ borderRadius: '6px' }}
                  className="p-1 rounded-[6px] text-[var(--portal-subtle)] hover:text-[var(--portal-text)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmBadge} className="space-y-4 pt-1">
                {/* Official Verification Checkmark Toggle */}
                <div
                  style={{ borderRadius: '6px' }}
                  className="p-3.5 rounded-[6px] bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] flex items-center justify-between cursor-pointer"
                  onClick={() => setBadgeDialog(prev => ({ ...prev, isVerified: !prev.isVerified }))}
                >
                  <div className="flex items-center gap-2.5">
                    <img src="/verification.png" alt="" className="w-4 h-4 object-contain" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--portal-heading)]">
                        Postify Official Verification
                      </div>
                      <div className="text-[10px] text-[var(--portal-meta)]">
                        Display blue verification checkmark badge next to name
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={badgeDialog.isVerified}
                    onChange={(e) => setBadgeDialog(prev => ({ ...prev, isVerified: e.target.checked }))}
                    className="w-4 h-4 accent-[#007aff] cursor-pointer"
                  />
                </div>

                {/* Predefined Badge Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--portal-text)]">
                    Quick Title Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BADGE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBadgeDialog(prev => ({ ...prev, badgeTitle: p }))}
                        style={{ borderRadius: '4px' }}
                        className={`px-2 py-1 rounded-[4px] text-[10px] font-semibold transition-all border ${
                          badgeDialog.badgeTitle === p
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-[var(--portal-canvas)] border-[var(--portal-card-border)] text-[var(--portal-text)] hover:border-purple-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    {badgeDialog.badgeTitle && (
                      <button
                        type="button"
                        onClick={() => setBadgeDialog(prev => ({ ...prev, badgeTitle: '' }))}
                        style={{ borderRadius: '4px' }}
                        className="px-2 py-1 rounded-[4px] text-[10px] font-medium text-rose-500 hover:underline"
                      >
                        Clear Title
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Badge Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--portal-text)]">
                    Custom Badge Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={badgeDialog.badgeTitle}
                    onChange={(e) => setBadgeDialog(prev => ({ ...prev, badgeTitle: e.target.value }))}
                    placeholder="e.g. Core Contributor, Top Creator, Staff..."
                    style={{ borderRadius: '6px' }}
                    className="w-full px-3 py-2 rounded-[6px] text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)]"
                  />
                </div>

                {/* Administrative Note */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--portal-text)]">
                    Audit Note / Rationale
                  </label>
                  <input
                    type="text"
                    value={badgeDialog.reason}
                    onChange={(e) => setBadgeDialog(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Document reason for manual badge award..."
                    style={{ borderRadius: '6px' }}
                    className="w-full px-3 py-2 rounded-[6px] text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBadgeDialog({ open: false, user: null, isVerified: false, badgeTitle: '', reason: '' })}
                    disabled={actionLoading}
                    style={{ borderRadius: '6px' }}
                    className="px-4 py-2 rounded-[6px] text-xs font-semibold border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{ borderRadius: '6px' }}
                    className="px-4 py-2 rounded-[6px] text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm flex items-center gap-2 transition-all"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save & Apply Badge</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Suspension Confirmation Dialog */}
        <ConfirmDialog
          isOpen={suspendDialog.open}
          title={suspendDialog.isSuspending ? `Suspend @${suspendDialog.user?.username}` : `Reinstate @${suspendDialog.user?.username}`}
          message={
            suspendDialog.isSuspending
              ? 'Suspending this user will immediately revoke their access to Postify, hide their profile from public searches, and reject authenticated requests.'
              : 'Reinstating this user will restore their account access and allow them to interact with the community.'
          }
          isDestructive={suspendDialog.isSuspending}
          requireReason={suspendDialog.isSuspending}
          confirmText={suspendDialog.isSuspending ? 'Suspend Account' : 'Reinstate Account'}
          loading={actionLoading}
          onConfirm={handleConfirmSuspension}
          onCancel={() => setSuspendDialog({ open: false, user: null, isSuspending: true })}
        />

        {/* Role Change Confirmation Dialog */}
        <ConfirmDialog
          isOpen={roleDialog.open}
          title={`Assign Role to @${roleDialog.user?.username}`}
          message={`Are you sure you want to change this user's role to ${roleDialog.newRole}? Administrators and moderators have privileged access.`}
          confirmText={`Promote to ${roleDialog.newRole}`}
          requireReason={true}
          reasonPlaceholder="Document rationale for role update (audit log requirement)..."
          loading={actionLoading}
          onConfirm={handleConfirmRole}
          onCancel={() => setRoleDialog({ open: false, user: null, newRole: 'user' })}
        />
      </div>
    </>
  );
};
