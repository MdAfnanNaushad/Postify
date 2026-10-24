import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FolderGit2, Eye, EyeOff, Lock, Globe } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [hiddenFilter, setHiddenFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({ open: false, project: null, isHiding: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        visibility: visibilityFilter,
        hidden: hiddenFilter,
        search
      });
      const res = await adminApi.get(`/projects?${params.toString()}`);
      if (res.data?.success) {
        setProjects(res.data.projects);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [page, visibilityFilter, hiddenFilter, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleConfirmVisibility = async (reason) => {
    if (!dialog.project) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/projects/${dialog.project._id}/visibility`, {
        isHidden: dialog.isHiding,
        reason
      });
      setFeedback({
        text: `Project was successfully ${dialog.isHiding ? 'hidden' : 'restored'}.`,
        type: 'success'
      });
      setDialog({ open: false, project: null, isHiding: true });
      fetchProjects();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Project',
      render: (p) => (
        <div className="space-y-0.5 max-w-xs">
          <div className="font-bold text-xs text-[var(--portal-heading)] truncate">
            {p.name}
          </div>
          <div className="text-[10px] text-[var(--portal-subtle)] font-mono truncate">
            /{p.slug}
          </div>
        </div>
      )
    },
    {
      header: 'Owner',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            {p.owner?.name?.charAt(0) || 'D'}
          </div>
          <span className="text-xs text-[var(--portal-meta)] font-mono truncate">
            @{p.owner?.username || 'user'}
          </span>
        </div>
      )
    },
    {
      header: 'Visibility',
      render: (p) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          p.visibility === 'private'
            ? 'bg-zinc-500/10 text-[var(--portal-meta)] border border-[var(--portal-card-border)]'
            : 'bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20'
        }`}>
          {p.visibility === 'private' ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {p.visibility}
        </span>
      )
    },
    {
      header: 'Build Logs',
      className: 'hidden sm:table-cell text-center',
      render: (p) => (
        <span className="font-bold text-xs text-[var(--portal-heading)]">
          {p.buildLogCount || 0}
        </span>
      )
    },
    {
      header: 'Status',
      className: 'hidden md:table-cell',
      render: (p) => (
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--portal-canvas)] text-[var(--portal-meta)]">
          {p.status?.replace('_', ' ') || 'in progress'}
        </span>
      )
    },
    {
      header: 'Moderation',
      render: (p) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          p.isHidden ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}>
          {p.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {p.isHidden ? 'Hidden' : 'Visible'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (p) => (
        <button
          onClick={() => setDialog({ open: true, project: p, isHiding: !p.isHidden })}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--portal-card-border)] transition-colors ${
            p.isHidden ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'
          }`}
        >
          {p.isHidden ? 'Restore' : 'Hide'}
        </button>
      )
    }
  ];

  return (
    <>
      <Helmet>
        <title>Projects Management — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Developer Projects
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Audit public and private developer portfolios, track build logs counts, and perform moderation actions.
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs">
            <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)]">Visibility:</span>
            {['all', 'public', 'private'].map((v) => (
              <button
                key={v}
                onClick={() => { setVisibilityFilter(v); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                  visibilityFilter === v
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs">
            <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)]">Moderation:</span>
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
        </div>

        <DataTable
          columns={columns}
          data={projects}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
          searchPlaceholder="Search projects by name or description..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
        />

        <ConfirmDialog
          isOpen={dialog.open}
          title={dialog.isHiding ? 'Hide Project' : 'Restore Project'}
          message={
            dialog.isHiding
              ? 'Hiding this project removes it from public discovery while preserving its build logs.'
              : 'Restoring this project makes it visible to authorized visitors again.'
          }
          isDestructive={dialog.isHiding}
          requireReason={true}
          confirmText={dialog.isHiding ? 'Soft-Hide Project' : 'Restore Project'}
          loading={actionLoading}
          onConfirm={handleConfirmVisibility}
          onCancel={() => setDialog({ open: false, project: null, isHiding: true })}
        />
      </div>
    </>
  );
};
