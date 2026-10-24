import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminRepliesPage = () => {
  const [replies, setReplies] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [hiddenFilter, setHiddenFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [visibilityDialog, setVisibilityDialog] = useState({ open: false, reply: null, isHiding: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchReplies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        hidden: hiddenFilter,
        search
      });
      const res = await adminApi.get(`/replies?${params.toString()}`);
      if (res.data?.success) {
        setReplies(res.data.replies);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    } finally {
      setLoading(false);
    }
  }, [page, hiddenFilter, search]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleConfirmVisibility = async (reason) => {
    if (!visibilityDialog.reply) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/replies/${visibilityDialog.reply._id}/visibility`, {
        isHidden: visibilityDialog.isHiding,
        reason
      });
      setFeedback({
        text: `Reply was successfully ${visibilityDialog.isHiding ? 'hidden' : 'restored'}.`,
        type: 'success'
      });
      setVisibilityDialog({ open: false, reply: null, isHiding: true });
      fetchReplies();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Author',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {r.user?.name?.charAt(0) || 'D'}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-[var(--portal-heading)] block truncate">
              {r.user?.name || r.user?.username || 'Unknown'}
            </span>
            <span className="text-[10px] text-[var(--portal-subtle)] font-mono block truncate">
              @{r.user?.username}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Reply Content',
      render: (r) => (
        <p className="text-xs text-[var(--portal-text)] line-clamp-2 max-w-sm">
          {r.content}
        </p>
      )
    },
    {
      header: 'Parent Post',
      className: 'hidden md:table-cell text-xs text-[var(--portal-meta)] max-w-xs',
      render: (r) => (
        <span className="italic line-clamp-1">
          "{r.post?.content || 'Parent post reference'}"
        </span>
      )
    },
    {
      header: 'Depth',
      className: 'hidden sm:table-cell',
      render: (r) => (
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--portal-canvas)] border border-[var(--portal-card-border)]">
          L{r.depth || 0}
        </span>
      )
    },
    {
      header: 'Visibility',
      render: (r) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
          r.isHidden ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}>
          {r.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {r.isHidden ? 'Hidden' : 'Visible'}
        </span>
      )
    },
    {
      header: 'Date',
      className: 'hidden lg:table-cell text-[11px] text-[var(--portal-subtle)]',
      render: (r) => new Date(r.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={() => setVisibilityDialog({ open: true, reply: r, isHiding: !r.isHidden })}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--portal-card-border)] transition-colors ${
            r.isHidden ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'
          }`}
        >
          {r.isHidden ? 'Restore' : 'Hide'}
        </button>
      )
    }
  ];

  return (
    <>
      <Helmet>
        <title>Replies & Discussions — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Replies & Threaded Discussions
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Audit threaded replies, inspect parent post contexts, and soft-hide abusive comments.
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

        {/* Filter Bar */}
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
          data={replies}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
          searchPlaceholder="Search reply messages..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
        />

        <ConfirmDialog
          isOpen={visibilityDialog.open}
          title={visibilityDialog.isHiding ? 'Hide Reply' : 'Restore Reply'}
          message={
            visibilityDialog.isHiding
              ? 'Soft-hiding this reply will remove it from the comment thread for regular users.'
              : 'Restoring this reply will unhide it in the threaded discussion.'
          }
          isDestructive={visibilityDialog.isHiding}
          requireReason={true}
          confirmText={visibilityDialog.isHiding ? 'Soft-Hide Reply' : 'Restore Reply'}
          loading={actionLoading}
          onConfirm={handleConfirmVisibility}
          onCancel={() => setVisibilityDialog({ open: false, reply: null, isHiding: true })}
        />
      </div>
    </>
  );
};
