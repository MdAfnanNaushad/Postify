import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, MessageSquare, FolderGit2, BookOpen, Loader2 } from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminHiddenContentPage = () => {
  const [data, setData] = useState({ hiddenPosts: [], hiddenReplies: [], hiddenProjects: [], hiddenLogs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const fetchHidden = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/hidden-content');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load hidden content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHidden();
  }, []);

  const handleRestore = async (type, id) => {
    try {
      let endpoint = '';
      if (type === 'post') endpoint = `/posts/${id}/visibility`;
      else if (type === 'reply') endpoint = `/replies/${id}/visibility`;
      else if (type === 'project') endpoint = `/projects/${id}/visibility`;
      else if (type === 'buildLog') endpoint = `/build-logs/${id}/visibility`;

      await adminApi.patch(endpoint, {
        isHidden: false,
        reason: 'Restored from Hidden Content directory'
      });

      setFeedback({ text: 'Content restored to public visibility successfully.', type: 'success' });
      fetchHidden();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    }
  };

  const tabs = [
    { id: 'posts', label: 'Hidden Posts', count: data.hiddenPosts?.length || 0, icon: FileText },
    { id: 'replies', label: 'Hidden Replies', count: data.hiddenReplies?.length || 0, icon: MessageSquare },
    { id: 'projects', label: 'Hidden Projects', count: data.hiddenProjects?.length || 0, icon: FolderGit2 },
    { id: 'buildLogs', label: 'Hidden Build Logs', count: data.hiddenLogs?.length || 0, icon: BookOpen }
  ];

  return (
    <>
      <Helmet>
        <title>Hidden Content Directory — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Soft-Hidden Content Inventory
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Audit and restore content items suppressed from public view by moderation actions.
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

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'bg-[var(--portal-card)] text-[var(--portal-meta)] border border-[var(--portal-card-border)] hover:text-[var(--portal-text)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--portal-canvas)] text-[var(--portal-subtle)]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Content */}
        <div className="portal-card divide-y divide-[var(--portal-card-border)] overflow-hidden">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[var(--portal-meta)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--portal-accent)]" />
              <span>Loading suppressed items...</span>
            </div>
          ) : (
            <>
              {activeTab === 'posts' && (
            data.hiddenPosts.length > 0 ? (
              data.hiddenPosts.map((p) => (
                <div key={p._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="text-xs font-semibold text-[var(--portal-heading)]">@{p.user?.username || 'user'}</div>
                    <p className="text-xs text-[var(--portal-text)] leading-relaxed italic">"{p.content}"</p>
                    {p.moderationReason && (
                      <span className="text-[11px] text-amber-500 block">Reason: {p.moderationReason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore('post', p._id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto"
                  >
                    Restore Post
                  </button>
                </div>
              ))
            ) : <div className="py-12 text-center text-xs text-[var(--portal-meta)]">No hidden posts.</div>
          )}

          {activeTab === 'replies' && (
            data.hiddenReplies.length > 0 ? (
              data.hiddenReplies.map((r) => (
                <div key={r._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="text-xs font-semibold text-[var(--portal-heading)]">@{r.user?.username || 'user'}</div>
                    <p className="text-xs text-[var(--portal-text)] leading-relaxed italic">"{r.content}"</p>
                    {r.moderationReason && (
                      <span className="text-[11px] text-amber-500 block">Reason: {r.moderationReason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore('reply', r._id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto"
                  >
                    Restore Reply
                  </button>
                </div>
              ))
            ) : <div className="py-12 text-center text-xs text-[var(--portal-meta)]">No hidden replies.</div>
          )}

          {activeTab === 'projects' && (
            data.hiddenProjects.length > 0 ? (
              data.hiddenProjects.map((proj) => (
                <div key={proj._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="text-xs font-bold text-[var(--portal-heading)]">{proj.name} (@{proj.owner?.username})</div>
                    <p className="text-xs text-[var(--portal-text)]">{proj.shortDescription || proj.description}</p>
                    {proj.moderationReason && (
                      <span className="text-[11px] text-amber-500 block">Reason: {proj.moderationReason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore('project', proj._id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto"
                  >
                    Restore Project
                  </button>
                </div>
              ))
            ) : <div className="py-12 text-center text-xs text-[var(--portal-meta)]">No hidden projects.</div>
          )}

          {activeTab === 'buildLogs' && (
            data.hiddenLogs.length > 0 ? (
              data.hiddenLogs.map((l) => (
                <div key={l._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="text-xs font-bold text-[var(--portal-heading)]">{l.title} (@{l.author?.username})</div>
                    <p className="text-xs text-[var(--portal-text)] line-clamp-1">{l.content}</p>
                    {l.moderationReason && (
                      <span className="text-[11px] text-amber-500 block">Reason: {l.moderationReason}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore('buildLog', l._id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 transition-opacity self-start sm:self-auto"
                  >
                    Restore Log
                  </button>
                </div>
              ))
            ) : <div className="py-12 text-center text-xs text-[var(--portal-meta)]">No hidden build logs.</div>
          )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
