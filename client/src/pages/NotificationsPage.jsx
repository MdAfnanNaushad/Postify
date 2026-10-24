import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { LottieLoader } from '../components/common';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  Heart,
  MessageSquare,
  MessageCircleReply,
  UserPlus,
  AtSign,
  Repeat,
  Quote,
  CheckCheck,
  Trash2,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    nextCursor,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'mentions'

  useEffect(() => {
    fetchNotifications({ refresh: true });
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif) => {
    if (!notif.readAt) {
      await markAsRead(notif._id);
    }

    if (notif.type === 'follow' && notif.actor?._id) {
      navigate(`/user/${notif.actor._id}`);
    } else if (notif.post && (notif.post._id || typeof notif.post === 'string')) {
      const postId = notif.post._id || notif.post;
      navigate(`/post/${postId}`);
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'like':
        return {
          icon: <Heart size={14} className="text-rose-500 fill-rose-500" />,
          label: 'liked your post',
          color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
      case 'reply':
        return {
          icon: <MessageSquare size={14} className="text-[#007aff]" />,
          label: 'replied to your post',
          color: 'bg-[#007aff]/10 text-[#007aff] border-[#007aff]/20'
        };
      case 'reply_interaction':
        return {
          icon: <MessageCircleReply size={14} className="text-indigo-500" />,
          label: 'replied to your comment',
          color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
        };
      case 'follow':
        return {
          icon: <UserPlus size={14} className="text-purple-500" />,
          label: 'started following you',
          color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        };
      case 'mention':
        return {
          icon: <AtSign size={14} className="text-cyan-500" />,
          label: 'mentioned you',
          color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
        };
      case 'repost':
        return {
          icon: <Repeat size={14} className="text-emerald-500" />,
          label: 'reposted your post',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        };
      case 'quote':
        return {
          icon: <Quote size={14} className="text-amber-500" />,
          label: 'quoted your post',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        };
      default:
        return {
          icon: <Bell size={14} className="text-blue-500" />,
          label: 'interacted with your content',
          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        };
    }
  };

  // Filter list by tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.readAt;
    if (activeTab === 'mentions') return n.type === 'mention';
    return true;
  });

  return (
    <Layout>
      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--portal-card-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
              <Bell size={20} />
            </div>
            <div>
              <h1 className="editorial-h2 text-2xl sm:text-3xl font-semibold text-[var(--portal-heading)]">
                Notifications
              </h1>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)]">
                Stay updated with community responses, interactions, and followers
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <CheckCheck size={14} className="text-[#007aff]" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#007aff] text-white shadow-xs'
                : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
            }`}
          >
            All Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-[#007aff] text-white shadow-xs'
                : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mentions')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'mentions'
                ? 'bg-[#007aff] text-white shadow-xs'
                : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
            }`}
          >
            Mentions (@)
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const badge = getEventBadge(notif.type);
            const isUnread = !notif.readAt;

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative portal-card p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-[#007aff]/[0.03] dark:bg-[#007aff]/[0.05] border-[#007aff]/30 shadow-xs'
                    : 'bg-[var(--portal-card)] border-[var(--portal-card-border)] hover:border-black/15 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Actor Avatar with event badge overlay */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={notif.actor?.Profilepic}
                      username={notif.actor?.username || 'User'}
                      size="md"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--portal-card)] ${badge.color}`}
                    >
                      {badge.icon}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
                      <span className="font-semibold text-[var(--portal-heading)]">
                        {notif.actor?.name || notif.actor?.username || 'Deleted User'}
                      </span>
                      {notif.actor?.username && (
                        <span className="text-[var(--portal-meta)] text-xs">
                          @{notif.actor.username}
                        </span>
                      )}
                      <span className="text-[var(--portal-meta)] text-xs sm:text-sm">
                        {badge.label}
                      </span>
                    </div>

                    {/* Post / Reply snippet preview or deleted state */}
                    {notif.post?.content && (
                      <p className="mt-1.5 text-xs sm:text-sm text-[var(--portal-text)] line-clamp-2 italic bg-black/[0.02] dark:bg-white/[0.02] px-3 py-1.5 rounded-lg border-l-2 border-[#007aff]/40">
                        "{notif.post.content.replace(/[#*`_~\[\]]/g, '').trim()}"
                      </p>
                    )}

                    {!notif.post && !notif.reply && notif.type !== 'follow' && (
                      <p className="mt-1.5 text-xs text-[var(--portal-meta)] italic">
                        [Referenced content is no longer available]
                      </p>
                    )}

                    {notif.reply?.content && (
                      <p className="mt-1.5 text-xs sm:text-sm text-[var(--portal-text)] line-clamp-2 italic bg-black/[0.02] dark:bg-white/[0.02] px-3 py-1.5 rounded-lg border-l-2 border-indigo-500/40">
                        "{notif.reply.content.replace(/[#*`_~\[\]]/g, '').trim()}"
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--portal-meta)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Unread Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUnread && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-[#007aff] shrink-0"
                        title="Unread notification"
                      />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--portal-meta)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!loading && filteredNotifications.length === 0 && (
          <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] mt-4">
            <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-[var(--portal-meta)]">
              <Sparkles size={24} className="text-[#007aff]" />
            </div>
            <h3 className="editorial-h2 text-xl font-medium text-[var(--portal-heading)] mb-1">
              {activeTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto">
              {activeTab === 'unread'
                ? "You don't have any unread notifications. Check back when writers interact with your work."
                : 'When other developers like your posts, reply to your discussions, mention you, or follow your profile, you will see it here.'}
            </p>
            <Link
              to="/feed"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-sm"
            >
              Explore Community Feed
            </Link>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <LottieLoader size={96} />
            <span className="text-xs text-[var(--portal-meta)] font-medium">Fetching notifications...</span>
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => fetchNotifications({ cursor: nextCursor, type: activeTab })}
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-all cursor-pointer shadow-xs"
            >
              Load Older Notifications
            </button>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
};

export default NotificationsPage;
