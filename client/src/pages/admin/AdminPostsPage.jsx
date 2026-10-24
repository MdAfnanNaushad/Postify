import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, Eye, EyeOff, Heart, MessageSquare, Repeat } from 'lucide-react';
import { DataTable } from '../../components/admin/DataTable';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import adminApi from '../../services/adminApi';

export const AdminPostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [hiddenFilter, setHiddenFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [visibilityDialog, setVisibilityDialog] = useState({ open: false, post: null, isHiding: true });
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
        hidden: hiddenFilter,
        search
      });
      const res = await adminApi.get(`/posts?${params.toString()}`);
      if (res.data?.success) {
        setPosts(res.data.posts);
        setTotal(res.data.total);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, hiddenFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleConfirmVisibility = async (reason) => {
    if (!visibilityDialog.post) return;
    try {
      setActionLoading(true);
      await adminApi.patch(`/posts/${visibilityDialog.post._id}/visibility`, {
        isHidden: visibilityDialog.isHiding,
        reason
      });
      setFeedback({
        text: `Post was successfully ${visibilityDialog.isHiding ? 'hidden from public view' : 'restored to feed'}.`,
        type: 'success'
      });
      setVisibilityDialog({ open: false, post: null, isHiding: true });
      fetchPosts();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Author',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs shrink-0">
            {p.user?.name?.charAt(0) || p.user?.username?.charAt(0) || 'D'}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-[var(--portal-heading)] block truncate">
              {p.user?.name || p.user?.username || 'Unknown'}
            </span>
            <span className="text-[10px] text-[var(--portal-subtle)] font-mono block truncate">
              @{p.user?.username || 'user'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Post Content',
      render: (p) => (
        <div className="space-y-1 max-w-md">
          <p className="text-xs text-[var(--portal-text)] line-clamp-2 leading-relaxed">
            {p.content}
          </p>
          {p.tags && p.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {p.tags.map(t => (
                <span key={t} className="text-[10px] font-mono text-[var(--portal-accent)]">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Engagement',
      className: 'hidden sm:table-cell',
      render: (p) => (
        <div className="flex items-center gap-3 text-[11px] text-[var(--portal-meta)]">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-500" /> {p.likeCount || 0}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-blue-500" /> {p.replyCount || 0}</span>
          <span className="flex items-center gap-1"><Repeat className="w-3 h-3 text-emerald-500" /> {p.repostCount || 0}</span>
        </div>
      )
    },
    {
      header: 'Visibility',
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
      header: 'Published',
      className: 'hidden md:table-cell text-[11px] text-[var(--portal-subtle)]',
      render: (p) => new Date(p.createdAt).toLocaleDateString()
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (p) => (
        <button
          onClick={() => setVisibilityDialog({ open: true, post: p, isHiding: !p.isHidden })}
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
        <title>Posts Management — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Posts Moderation & Management
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Search developer posts, review engagement counters, and perform soft-hiding enforcement actions.
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
          data={posts}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
          searchPlaceholder="Search post contents..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
        />

        <ConfirmDialog
          isOpen={visibilityDialog.open}
          title={visibilityDialog.isHiding ? 'Hide Post from Feed' : 'Restore Post to Feed'}
          message={
            visibilityDialog.isHiding
              ? 'Hiding this post will soft-hide it from public discovery, feeds, and profiles without permanently deleting user content.'
              : 'Restoring this post will unhide it and make it discoverable again across Postify.'
          }
          isDestructive={visibilityDialog.isHiding}
          requireReason={true}
          confirmText={visibilityDialog.isHiding ? 'Soft-Hide Post' : 'Restore Post'}
          loading={actionLoading}
          onConfirm={handleConfirmVisibility}
          onCancel={() => setVisibilityDialog({ open: false, post: null, isHiding: true })}
        />
      </div>
    </>
  );
};
