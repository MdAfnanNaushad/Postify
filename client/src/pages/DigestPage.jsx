import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { DigestSettingsModal } from '../components/digest/DigestSettingsModal';
import {
  getCurrentDigest,
  getDigestHistory,
  getDigestByPeriod,
  markDigestAsRead,
  generateDigestManually
} from '../services/digestService';
import {
  Sparkles,
  Calendar,
  Settings,
  RefreshCw,
  MessageSquare,
  Heart,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Bell,
  Code2,
  CheckCircle2,
  Layers,
  ChevronDown
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

export const DigestPage = () => {
  const [digest, setDigest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateRangeLabel, setDateRangeLabel] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchCurrentDigest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCurrentDigest();
      if (res.success && res.digest) {
        setDigest(res.digest);
        setDateRangeLabel(res.dateRangeLabel || res.periodKey);
        setSelectedPeriod(res.periodKey);

        // Mark as read if unread
        if (!res.digest.isRead && res.digest._id) {
          markDigestAsRead(res.digest._id).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load digest.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getDigestHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch {
      // Non-blocking history
    }
  }, []);

  useEffect(() => {
    fetchCurrentDigest();
    fetchHistory();
  }, [fetchCurrentDigest, fetchHistory]);

  const handlePeriodChange = async (e) => {
    const period = e.target.value;
    setSelectedPeriod(period);
    try {
      setLoading(true);
      const res = await getDigestByPeriod(period);
      if (res.success && res.digest) {
        setDigest(res.digest);
        setDateRangeLabel(res.dateRangeLabel || period);
      }
    } catch (err) {
      setError(err.message || 'Failed to switch digest period.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await generateDigestManually({ periodKey: selectedPeriod, force: true });
      if (res.success && res.digest) {
        setDigest(res.digest);
      }
    } catch (err) {
      alert(err.message || 'Failed to refresh digest.');
    } finally {
      setRefreshing(false);
    }
  };

  const sections = digest?.sections || {};
  const hasFollowedPosts = sections.followedPosts && sections.followedPosts.length > 0;
  const hasInteractions =
    sections.postActivity &&
    (sections.postActivity.totalNewReplies > 0 ||
      (sections.postActivity.interactions && sections.postActivity.interactions.length > 0));
  const hasBuildLogs = sections.followedBuildLogs && sections.followedBuildLogs.length > 0;
  const hasNotifications = sections.unreadNotifications && sections.unreadNotifications.length > 0;
  const hasHighlights = sections.publicHighlights && sections.publicHighlights.length > 0;

  const isCompletelyEmpty =
    !hasFollowedPosts && !hasInteractions && !hasBuildLogs && !hasNotifications && !hasHighlights;

  return (
    <Layout>
      <Helmet>
        <title>Weekly Developer Digest — Postify</title>
        <meta
          name="description"
          content="Your personalized engineering digest: updates from developers you follow, project journals, and discussions."
        />
      </Helmet>

      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl">
        {/* Page Top Navigation / Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20">
              <Sparkles size={13} />
              <span>Weekly Engineering Radar</span>
            </span>

            {digest?.periodKey && (
              <span className="text-xs font-mono text-[var(--portal-meta)] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                {digest.periodKey}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* History Switcher */}
            {history.length > 1 && (
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  className="pl-3 pr-8 py-1.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-[var(--portal-heading)] appearance-none cursor-pointer focus:outline-hidden"
                >
                  {history.map((h) => (
                    <option key={h.periodKey} value={h.periodKey}>
                      {h.periodKey}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-2.5 pointer-events-none text-[var(--portal-meta)]" />
              </div>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:border-[#007aff]/40 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Refresh digest activity"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:border-[#007aff]/40 transition-all cursor-pointer shadow-2xs"
            >
              <Settings size={13} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="portal-card p-6 sm:p-8 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] mb-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#007aff]/10 to-transparent pointer-events-none rounded-full blur-2xl" />

          <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--portal-meta)] font-medium mb-2">
            <Calendar size={15} className="text-[#007aff]" />
            <span>{dateRangeLabel || 'Current Weekly Period'}</span>
          </div>

          <h1 className="editorial-h1 text-2xl sm:text-4xl text-[var(--portal-heading)] font-normal tracking-tight mb-2.5">
            Your Weekly Developer Digest
          </h1>

          <p className="text-sm sm:text-base text-[var(--portal-text)] leading-relaxed max-w-2xl">
            {digest?.summary ||
              'A curated summary of developer updates, engineering logs, and community interactions.'}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-40 rounded-3xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)]" />
            <div className="h-40 rounded-3xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)]" />
            <div className="h-40 rounded-3xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)]" />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="portal-card p-8 rounded-3xl border border-red-500/20 bg-red-500/5 text-center">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchCurrentDigest}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Digest Content Sections */}
        {!loading && !error && digest && (
          <div className="space-y-8">
            {/* 1. From Developers You Follow */}
            {hasFollowedPosts && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="editorial-h2 text-lg sm:text-xl font-bold text-[var(--portal-heading)] flex items-center gap-2">
                    <Code2 size={20} className="text-[#007aff]" />
                    <span>From Developers You Follow</span>
                  </h2>
                  <span className="text-xs text-[var(--portal-meta)] font-medium">
                    {sections.followedPosts.length} update{sections.followedPosts.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {sections.followedPosts.map((post) => (
                    <Link
                      key={post._id}
                      to={`/post/${post._id}`}
                      className="portal-card p-4 sm:p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 transition-all flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <Avatar
                            src={post.author?.Profilepic}
                            name={post.author?.name || post.author?.username}
                            size="sm"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-[var(--portal-heading)]">
                                {post.author?.name || post.author?.username}
                              </span>
                              {post.author?.isVerified && <VerificationBadge size={12} />}
                            </div>
                            <span className="text-[11px] text-[var(--portal-meta)] font-mono">
                              @{post.author?.username}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-[var(--portal-text)] line-clamp-3 leading-relaxed mb-3">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--portal-meta)] pt-2 border-t border-[var(--portal-card-border)]">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={13} />
                            <span>{post.replyCount}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart size={13} />
                            <span>{post.likesCount}</span>
                          </span>
                        </div>
                        <span className="text-[11px] group-hover:text-[#007aff] transition-colors flex items-center gap-1">
                          <span>Read full</span>
                          <ArrowRight size={11} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Post Interactions & Activity */}
            {hasInteractions && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="editorial-h2 text-lg sm:text-xl font-bold text-[var(--portal-heading)] flex items-center gap-2">
                    <MessageSquare size={20} className="text-emerald-500" />
                    <span>Activity on Your Posts</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-3">
                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)]">
                    <div className="text-xs text-[var(--portal-meta)] font-medium mb-1">New Replies</div>
                    <div className="text-2xl font-bold text-[var(--portal-heading)]">
                      {sections.postActivity.totalNewReplies}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)]">
                    <div className="text-xs text-[var(--portal-meta)] font-medium mb-1">Post Likes</div>
                    <div className="text-2xl font-bold text-[var(--portal-heading)]">
                      {sections.postActivity.totalNewLikes}
                    </div>
                  </div>
                </div>

                {sections.postActivity.interactions && sections.postActivity.interactions.length > 0 && (
                  <div className="space-y-2">
                    {sections.postActivity.interactions.map((interaction, idx) => (
                      <Link
                        key={idx}
                        to={`/post/${interaction.postId}`}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-emerald-500/40 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={interaction.actor?.Profilepic}
                            name={interaction.actor?.name || interaction.actor?.username}
                            size="xs"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-[var(--portal-heading)]">
                              {interaction.actor?.name || interaction.actor?.username}
                            </span>
                            <span className="text-[var(--portal-meta)] ml-1">replied to your post:</span>
                            <span className="italic text-[var(--portal-text)] ml-1 truncate">
                              "{interaction.postExcerpt}..."
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-[var(--portal-meta)] shrink-0 ml-2" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 3. Followed Engineering Logs */}
            {hasBuildLogs && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="editorial-h2 text-lg sm:text-xl font-bold text-[var(--portal-heading)] flex items-center gap-2">
                    <Layers size={20} className="text-purple-500" />
                    <span>Followed Project Build Logs</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sections.followedBuildLogs.map((log) => {
                    const badgeClass = ENTRY_TYPE_BADGES[log.entryType] || ENTRY_TYPE_BADGES.feature;
                    const logUrl = `/projects/${log.project?.ownerUsername}/${log.project?.slug}/logs/${log._id}`;
                    return (
                      <Link
                        key={log._id}
                        to={logUrl}
                        className="portal-card p-4 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${badgeClass}`}>
                              {log.entryType}
                            </span>
                            <span className="text-xs font-mono text-[var(--portal-meta)] truncate">
                              {log.project?.name}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-[var(--portal-heading)] group-hover:text-purple-500 transition-colors line-clamp-2 mb-2">
                            {log.title}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--portal-meta)] pt-2 border-t border-[var(--portal-card-border)]">
                          <span>by @{log.project?.ownerUsername}</span>
                          <span className="flex items-center gap-1 group-hover:text-purple-500">
                            <span>Read entry</span>
                            <ArrowRight size={11} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 4. Unread Notifications Highlight */}
            {hasNotifications && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="editorial-h2 text-sm sm:text-base font-bold text-[var(--portal-heading)] flex items-center gap-2">
                    <Bell size={16} className="text-amber-500" />
                    <span>Unread Alerts & Activity</span>
                  </h2>
                  <Link
                    to="/notifications"
                    className="text-xs text-[#007aff] hover:underline font-medium"
                  >
                    View all notifications &rarr;
                  </Link>
                </div>

                <div className="space-y-2">
                  {sections.unreadNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      className="p-3 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={notif.sender?.Profilepic}
                          name={notif.sender?.name || notif.sender?.username}
                          size="xs"
                        />
                        <span className="text-[var(--portal-text)]">{notif.message}</span>
                      </div>
                      <span className="text-[10px] text-[var(--portal-meta)] font-mono">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Platform Highlights & Discovery */}
            {hasHighlights && (
              <section className="space-y-4 pt-4 border-t border-[var(--portal-card-border)]">
                <div className="flex items-center justify-between">
                  <h2 className="editorial-h2 text-lg sm:text-xl font-bold text-[var(--portal-heading)] flex items-center gap-2">
                    <BookOpen size={20} className="text-[#007aff]" />
                    <span>Platform Highlights & Public Journals</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sections.publicHighlights.map((item, idx) => {
                    const itemUrl =
                      item.type === 'project'
                        ? `/projects/${item.authorUsername}/${item.slug}`
                        : `/post/${item._id}`;

                    return (
                      <Link
                        key={idx}
                        to={itemUrl}
                        className="portal-card p-4 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 transition-all flex flex-col justify-between group shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 uppercase">
                              {item.type}
                            </span>
                            <span className="text-xs font-mono text-[var(--portal-meta)] truncate">
                              @{item.authorUsername}
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors line-clamp-1 mb-1">
                            {item.title || item.description}
                          </h3>

                          {item.type === 'project' && item.techStack && item.techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.techStack.slice(0, 3).map((tech, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--portal-meta)]"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end text-[11px] text-[#007aff] pt-3 mt-2 border-t border-[var(--portal-card-border)]">
                          <span className="flex items-center gap-1">
                            <span>Explore</span>
                            <ArrowRight size={11} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Completely Empty State */}
            {isCompletelyEmpty && (
              <div className="portal-card p-12 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-center">
                <CheckCircle2 size={36} className="mx-auto text-[#007aff] mb-3" />
                <h3 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)] mb-2">
                  Your Engineering Radar is Clear
                </h3>
                <p className="text-sm text-[var(--portal-meta)] max-w-md mx-auto mb-6 leading-relaxed">
                  No new updates in your followed network this week. Follow more engineers, discover open source projects, or publish your next build log!
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    to="/projects"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-xs"
                  >
                    <span>Browse Projects</span>
                    <ExternalLink size={13} />
                  </Link>
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-2xs"
                  >
                    <span>Discover Feed</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences Modal */}
        <DigestSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => {
            fetchCurrentDigest();
          }}
        />
      </PageContainer>
    </Layout>
  );
};
