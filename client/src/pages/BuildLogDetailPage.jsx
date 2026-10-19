import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { MarkdownContent } from '../components/common/MarkdownContent';
import { getBuildLog } from '../services/projectService';
import {
  FolderGit2,
  Calendar,
  BookOpen,
  ArrowLeft,
  Share2,
  Check,
  Tag,
  Lock,
  Pin
} from 'lucide-react';

const ENTRY_TYPE_BADGES = {
  milestone: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  feature: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  fix: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  refactor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  research: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  release: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  note: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
};

export const BuildLogDetailPage = () => {
  const { idOrSlug, username, slug, logId } = useParams();
  const projectParam = (username && slug) ? { username, slug } : idOrSlug;
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getBuildLog(projectParam, logId);
      if (res.success && res.log) {
        setLog(res.log);
      } else {
        throw new Error('Build log not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load build log entry.');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug, username, slug, logId]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-3xl">
          <div className="space-y-6 animate-pulse">
            <div className="w-1/4 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="w-3/4 h-8 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="w-full h-64 bg-black/10 dark:bg-white/10 rounded-2xl" />
          </div>
        </PageContainer>
      </Layout>
    );
  }

  if (error || !log) {
    return (
      <Layout>
        <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-3xl text-center">
          <div className="portal-card p-12 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)]">
            <Lock size={36} className="mx-auto text-amber-500 mb-3" />
            <h2 className="editorial-h2 text-2xl font-semibold text-[var(--portal-heading)] mb-2">
              Log Entry Unavailable
            </h2>
            <p className="text-sm text-[var(--portal-meta)] max-w-md mx-auto mb-6">
              {error || 'This build log is private or does not exist.'}
            </p>
            <Link
              to={`/projects/${idOrSlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back to Project</span>
            </Link>
          </div>
        </PageContainer>
      </Layout>
    );
  }

  const project = log.project || {};
  const author = log.author || {};
  const badgeClass = ENTRY_TYPE_BADGES[log.entryType] || ENTRY_TYPE_BADGES.feature;
  const dateStr = new Date(log.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Layout>
      <Helmet>
        <title>{`${log.title} — Build Log | ${project.name || 'Postify'}`}</title>
        <meta
          name="description"
          content={log.title}
        />
        <meta property="og:title" content={`${log.title} — ${project.name || 'Postify'} Build Log`} />
      </Helmet>

      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-3xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to={`/projects/${idOrSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to {project.name || 'Project'}</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:border-[#007aff]/30 transition-all cursor-pointer shadow-2xs"
          >
            {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
            <span>{copiedLink ? 'Copied URL!' : 'Share'}</span>
          </button>
        </div>

        {/* Build Log Article Card */}
        <article className="portal-card p-6 sm:p-10 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] shadow-xs">
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${badgeClass}`}>
              {log.entryType}
            </span>

            {log.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Pin size={10} />
                <span>Pinned</span>
              </span>
            )}

            <span className="text-xs text-[var(--portal-meta)] flex items-center gap-1">
              <Calendar size={12} />
              <span>{dateStr}</span>
            </span>
          </div>

          {/* Title */}
          <h1 className="editorial-h1 text-2xl sm:text-4xl text-[var(--portal-heading)] mb-6 font-normal tracking-tight">
            {log.title}
          </h1>

          {/* Author Box */}
          {author && author.username && (
            <div className="flex items-center gap-3 pb-6 mb-8 border-b border-[var(--portal-card-border)]">
              <Avatar
                src={author.Profilepic || author.profilePic}
                username={author.username}
                size="md"
              />
              <div>
                <div className="flex items-center gap-1 font-bold text-sm text-[var(--portal-heading)]">
                  <span>{author.name || author.username}</span>
                  {author.isVerified && <VerificationBadge size={14} />}
                </div>
                <span className="text-xs text-[var(--portal-meta)]">@{author.username}</span>
              </div>
            </div>
          )}

          {/* Full Markdown Content */}
          <div className="prose dark:prose-invert max-w-none mb-8">
            <MarkdownContent content={log.content} />
          </div>

          {/* Tags */}
          {log.tags && log.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-6 border-t border-[var(--portal-card-border)]">
              {log.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono text-[var(--portal-meta)] bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)]"
                >
                  <Tag size={11} />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </article>
      </PageContainer>
    </Layout>
  );
};

export default BuildLogDetailPage;
