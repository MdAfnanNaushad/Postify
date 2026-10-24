import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminBuildLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [hiddenFilter, setHiddenFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({ open: false, log: null, isHiding: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        hidden: hiddenFilter,
        search
      });
      const res = await adminApi.get(`/build-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.buildLogs);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch build logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, hiddenFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleConfirmVisibility = async (reason) => {
    if (!dialog.log) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/build-logs/${dialog.log._id}/visibility`, {
        isHidden: dialog.isHiding,
        reason
      });
      setFeedback({
        text: `Build log was successfully ${dialog.isHiding ? 'hidden' : 'restored'}.`,
        type: 'success'
      });
      setDialog({ open: false, log: null, isHiding: true });
      fetchLogs();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Log Title',
      render: (l) => (
        <div className="space-y-0.5 max-w-sm">
          <div className="font-bold text-xs text-[var(--portal-heading)] truncate">
            {l.title}
          </div>
          <span className="text-[10px] text-[var(--portal-subtle)] font-mono">
            ID: {l._id}
          </span>
        </div>
      )
    },
    {
      header: 'Project',
      render: (l) => (
        <span className="text-xs font-semibold text-[var(--portal-accent)] truncate block max-w-xs">
          {l.project?.name || 'Project reference'}
        </span>
      )
    },
    {
      header: 'Author',
      render: (l) => (
        <div className="text-xs text-[var(--portal-meta)] font-mono">
          @{l.author?.username || 'user'}
        </div>
      )
    },
    {
      header: 'Type',
      render: (l) => (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-meta)]">
          {l.entryType || 'feature'}
        </span>
      )
    },
    {
      header: 'Visibility',
      render: (l) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          l.isHidden ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}>
          {l.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {l.isHidden ? 'Hidden' : 'Visible'}
        </span>
      )
    },
    {
      header: 'Date',
      className: 'hidden md:table-cell text-[11px] text-[var(--portal-subtle)]',
      render: (l) => new Date(l.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (l) => (
        <button
          onClick={() => setDialog({ open: true, log: l, isHiding: !l.isHidden })}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--portal-card-border)] transition-colors ${
            l.isHidden ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'
          }`}
        >
          {l.isHidden ? 'Restore' : 'Hide'}
        </button>
      )
    }
  ];

  return (
    <>
      <Helmet>
        <title>Build Logs Management — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Build Logs & Project Journals
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Inspect technical journal entries, review entry types, and moderate published technical milestones.
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

        <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs self-start w-fit">
          <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)]">Visibility:</span>
          {['all', 'visible', 'hidden'].map((s) => (
            <button
              key={s}
              onClick={() => { setHiddenFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                hiddenFilter === s
                  ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                  : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)]'
              }`}
            >
              {s}
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
          searchPlaceholder="Search build log titles..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
        />

        <ConfirmDialog
          isOpen={dialog.open}
          title={dialog.isHiding ? 'Hide Build Log' : 'Restore Build Log'}
          message={
            dialog.isHiding
              ? 'Hiding this build log will remove it from the public project timeline.'
              : 'Restoring this build log will unhide it on the project journal page.'
          }
          isDestructive={dialog.isHiding}
          requireReason={true}
          confirmText={dialog.isHiding ? 'Soft-Hide Log' : 'Restore Log'}
          loading={actionLoading}
          onConfirm={handleConfirmVisibility}
          onCancel={() => setDialog({ open: false, log: null, isHiding: true })}
        />
      </div>
    </>
  );
};
