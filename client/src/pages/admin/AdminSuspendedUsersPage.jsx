import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { UserX, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminSuspendedUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchSuspendedUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/suspended-users');
      if (res.data?.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load suspended users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspendedUsers();
  }, []);

  const handleReinstate = async (reason) => {
    if (!dialog.user) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/users/${dialog.user._id}/suspend`, {
        isSuspended: false,
        reason: reason || 'Reinstated by administrator'
      });
      setFeedback({
        text: `User @${dialog.user.username} was reinstated successfully.`,
        type: 'success'
      });
      setDialog({ open: false, user: null });
      fetchSuspendedUsers();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Suspended Users — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Suspended Accounts Directory
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Overview of all accounts currently restricted from accessing Postify.
          </p>
        </div>

        {feedback.text && (
          <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback({ text: '', type: 'success' })} className="text-xs font-bold hover:underline">Dismiss</button>
          </div>
        )}

        <div className="portal-card divide-y divide-[var(--portal-card-border)] overflow-hidden">
          {users.length > 0 ? (
            users.map((u) => (
              <div key={u._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-sm shrink-0">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--portal-heading)]">{u.name}</span>
                      <span className="text-xs text-[var(--portal-subtle)] font-mono">@{u.username}</span>
                    </div>
                    <p className="text-xs text-rose-500 font-medium">
                      Reason: {u.suspendedReason || 'Violated community guidelines'}
                    </p>
                    <div className="text-[10px] text-[var(--portal-subtle)]">
                      Suspended on: {u.suspendedAt ? new Date(u.suspendedAt).toLocaleDateString() : 'N/A'} • Email: {u.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDialog({ open: true, user: u })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto flex items-center gap-1.5 shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Reinstate Account</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-[var(--portal-meta)]">
              {loading ? 'Loading suspended accounts...' : 'No accounts are currently suspended.'}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={dialog.open}
          title={`Reinstate Account: @${dialog.user?.username}`}
          message="Reinstating this developer will restore their login access and public profile visibility immediately."
          confirmText="Confirm Reinstatement"
          loading={actionLoading}
          onConfirm={handleReinstate}
          onCancel={() => setDialog({ open: false, user: null })}
        />
      </div>
    </>
  );
};
