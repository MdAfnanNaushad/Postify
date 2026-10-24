import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ShieldAlert,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  EyeOff,
  Clock,
  ShieldCheck,
  User
} from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { DetailDrawer } from '../../components/admin/DetailDrawer';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminModerationPage = () => {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Inspection Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [targetContent, setTargetContent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action Dialog
  const [actionDialog, setActionDialog] = useState({ open: false, report: null, action: 'hide_content' });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        status: statusFilter,
        targetType: targetTypeFilter !== 'all' ? targetTypeFilter : ''
      });
      const res = await adminApi.get(`/reports?${params.toString()}`);
      if (res.data?.success) {
        setReports(res.data.reports);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, targetTypeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenDetail = async (report) => {
    setSelectedReport(report);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const res = await adminApi.get(`/reports/${report._id}`);
      if (res.data?.success) {
        setTargetContent(res.data.targetContent);
      }
    } catch (err) {
      console.error('Failed to resolve target content:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExecuteAction = async (notes) => {
    if (!actionDialog.report) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/reports/${actionDialog.report._id}/action`, {
        action: actionDialog.action,
        notes
      });
      setFeedback({
        text: `Moderation action "${actionDialog.action.replace('_', ' ')}" executed successfully.`,
        type: 'success'
      });
      setActionDialog({ open: false, report: null, action: 'hide_content' });
      setDrawerOpen(false);
      fetchReports();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Reported Entity',
      render: (r) => (
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-accent)]">
            {r.targetType}
          </span>
          <div className="text-[11px] font-mono text-[var(--portal-subtle)] truncate max-w-[140px]">
            ID: {r.targetId}
          </div>
        </div>
      )
    },
    {
      header: 'Reason',
      render: (r) => (
        <div className="space-y-0.5 max-w-xs">
          <span className="font-bold text-xs text-rose-500 capitalize block">
            {r.reason?.replace('_', ' ')}
          </span>
          <p className="text-[11px] text-[var(--portal-meta)] line-clamp-1 italic">
            "{r.description || 'No additional comment'}"
          </p>
        </div>
      )
    },
    {
      header: 'Reporter',
      render: (r) => (
        <span className="text-xs text-[var(--portal-text)] font-mono">
          @{r.reporter?.username || 'user'}
        </span>
      )
    },
    {
      header: 'Status',
      render: (r) => {
        const statusColors = {
          pending: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          reviewed: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          actioned: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dismissed: 'bg-zinc-500/10 text-[var(--portal-meta)] border-[var(--portal-card-border)]'
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[r.status] || statusColors.pending}`}>
            {r.status}
          </span>
        );
      }
    },
    {
      header: 'Date',
      className: 'hidden md:table-cell text-[11px] text-[var(--portal-subtle)]',
      render: (r) => new Date(r.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDetail(r)}
            className="p-1.5 rounded-lg border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
            title="Inspect report and target content"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {r.status === 'pending' && (
            <button
              onClick={() => setActionDialog({ open: true, report: r, action: 'hide_content' })}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-600 text-white hover:opacity-90 transition-opacity"
            >
              Action
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <Helmet>
        <title>Moderation Queue — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Trust & Safety Moderation Queue
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Triage abuse reports, inspect context safely, and enforce platform standards with immutable audit logging.
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs">
            <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)]">Status:</span>
            {['pending', 'reviewed', 'actioned', 'dismissed', 'all'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                  statusFilter === s
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl text-xs">
            <span className="px-2 text-[11px] font-semibold text-[var(--portal-subtle)]">Target:</span>
            {['all', 'post', 'reply', 'project', 'buildLog', 'user'].map((t) => (
              <button
                key={t}
                onClick={() => { setTargetTypeFilter(t); setPage(1); }}
                className={`px-2 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                  targetTypeFilter === t
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Table */}
        <DataTable
          columns={columns}
          data={reports}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
        />

        {/* Report Inspection Drawer */}
        <DetailDrawer
          isOpen={drawerOpen}
          title="Report & Target Content Inspection"
          onClose={() => setDrawerOpen(false)}
        >
          {selectedReport && (
            <div className="space-y-5">
              {/* Report Metadata */}
              <div className="portal-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    Reason: {selectedReport.reason}
                  </span>
                  <span className="text-xs text-[var(--portal-subtle)]">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[var(--portal-text)] leading-relaxed">
                  <strong>Reporter Note:</strong> {selectedReport.description || 'No descriptive context provided.'}
                </p>
                <div className="text-[11px] text-[var(--portal-subtle)] pt-1 border-t border-[var(--portal-card-border)]">
                  Reported by @{selectedReport.reporter?.username} • Current Status: <strong>{selectedReport.status}</strong>
                </div>
              </div>

              {/* Resolved Target Content Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--portal-heading)] uppercase tracking-wider">
                  Target Content Preview ({selectedReport.targetType})
                </h4>
                <div className="portal-card p-4 space-y-3">
                  {detailLoading ? (
                    <div className="py-6 text-center text-xs text-[var(--portal-subtle)]">
                      Resolving target database entity...
                    </div>
                  ) : targetContent ? (
                    <div className="space-y-2 text-xs">
                      {selectedReport.targetType === 'post' && (
                        <>
                          <div className="font-semibold text-[var(--portal-subtle)]">Author: @{targetContent.user?.username}</div>
                          <p className="text-[var(--portal-heading)] leading-relaxed bg-[var(--portal-canvas)] p-3 rounded-xl border border-[var(--portal-card-border)]">
                            {targetContent.content}
                          </p>
                        </>
                      )}
                      {selectedReport.targetType === 'reply' && (
                        <>
                          <div className="font-semibold text-[var(--portal-subtle)]">Reply by @{targetContent.user?.username}</div>
                          <p className="text-[var(--portal-heading)] leading-relaxed bg-[var(--portal-canvas)] p-3 rounded-xl border border-[var(--portal-card-border)]">
                            {targetContent.content}
                          </p>
                        </>
                      )}
                      {selectedReport.targetType === 'project' && (
                        <>
                          <div className="font-bold text-sm text-[var(--portal-heading)]">{targetContent.name}</div>
                          <p className="text-[var(--portal-meta)]">{targetContent.shortDescription || targetContent.description}</p>
                        </>
                      )}
                      {selectedReport.targetType === 'buildLog' && (
                        <>
                          <div className="font-bold text-sm text-[var(--portal-heading)]">{targetContent.title}</div>
                          <p className="text-[var(--portal-text)] bg-[var(--portal-canvas)] p-3 rounded-xl leading-relaxed">{targetContent.content}</p>
                        </>
                      )}
                      {selectedReport.targetType === 'user' && (
                        <>
                          <div className="font-bold text-sm text-[var(--portal-heading)]">{targetContent.name} (@{targetContent.username})</div>
                          <p className="text-[var(--portal-text)]">{targetContent.bio}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-rose-500">
                      Target content was not found or has already been removed.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[var(--portal-card-border)] flex flex-wrap gap-2">
                <button
                  onClick={() => setActionDialog({ open: true, report: selectedReport, action: 'hide_content' })}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Hide Content
                </button>
                <button
                  onClick={() => setActionDialog({ open: true, report: selectedReport, action: 'suspend_user' })}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Suspend Author
                </button>
                <button
                  onClick={() => setActionDialog({ open: true, report: selectedReport, action: 'dismiss' })}
                  className="px-3 py-1.5 rounded-xl border border-[var(--portal-card-border)] text-[var(--portal-meta)] text-xs font-semibold hover:bg-[var(--portal-canvas)] transition-colors"
                >
                  Dismiss Report
                </button>
              </div>
            </div>
          )}
        </DetailDrawer>

        {/* Action Confirmation Modal */}
        <ConfirmDialog
          isOpen={actionDialog.open}
          title={`Execute Moderation: ${actionDialog.action.replace('_', ' ').toUpperCase()}`}
          message="Confirm this moderation action. Your decision and explanatory notes will be immutably recorded in the audit trail."
          isDestructive={actionDialog.action.includes('suspend') || actionDialog.action.includes('hide')}
          requireReason={true}
          reasonPlaceholder="Enter detailed resolution notes for this decision..."
          confirmText="Confirm & Execute Action"
          loading={actionLoading}
          onConfirm={handleExecuteAction}
          onCancel={() => setActionDialog({ open: false, report: null, action: 'hide_content' })}
        />
      </div>
    </>
  );
};
