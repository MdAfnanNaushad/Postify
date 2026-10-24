import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { ScrollText, Shield, Clock } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import adminApi from '../../services/adminApi';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        action: actionFilter !== 'all' ? actionFilter : ''
      });
      const res = await adminApi.get(`/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      header: 'Actor',
      render: (l) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            {l.actor?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-[var(--portal-heading)] block truncate">
              {l.actor?.name || l.actor?.username || 'System Admin'}
            </span>
            <span className="text-[10px] text-[var(--portal-subtle)] font-mono block truncate">
              @{l.actor?.username || 'system'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Action',
      render: (l) => {
        const actionStyles = {
          suspend_user: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          unsuspend_user: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          hide_content: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          restore_content: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          assign_role: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
          dismiss_report: 'bg-zinc-500/10 text-[var(--portal-meta)] border-[var(--portal-card-border)]'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${actionStyles[l.action] || 'bg-zinc-500/10 text-[var(--portal-meta)]'}`}>
            {l.action?.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      header: 'Target',
      render: (l) => (
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold uppercase text-[var(--portal-subtle)]">
            {l.targetType}
          </span>
          <div className="text-[11px] font-mono text-[var(--portal-meta)] truncate max-w-[120px]">
            {l.targetId}
          </div>
        </div>
      )
    },
    {
      header: 'Reason & Rationale',
      render: (l) => (
        <p className="text-xs text-[var(--portal-text)] line-clamp-2 max-w-sm leading-relaxed">
          {l.reason || 'No explanatory reason recorded'}
        </p>
      )
    },
    {
      header: 'Timestamp',
      className: 'text-right text-[11px] text-[var(--portal-subtle)] font-mono',
      render: (l) => new Date(l.createdAt).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ];

  return (
    <>
      <Helmet>
        <title>Audit Logs — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Immutable Audit Trail
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Complete compliance log of all administrative actions, role modifications, and moderation decisions.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs self-start overflow-x-auto max-w-full">
          <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)] shrink-0">Action:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'suspend_user', label: 'Suspend' },
            { id: 'unsuspend_user', label: 'Reinstate' },
            { id: 'hide_content', label: 'Hide' },
            { id: 'restore_content', label: 'Restore' },
            { id: 'assign_role', label: 'Role' },
            { id: 'dismiss_report', label: 'Dismiss' }
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => { setActionFilter(a.id); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all whitespace-nowrap ${
                actionFilter === a.id
                  ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                  : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)]'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />
      </div>
    </>
  );
};
