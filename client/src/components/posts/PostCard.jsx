import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { MarkdownContent } from '../common/MarkdownContent';
import { QuotedPostCard } from './QuotedPostCard';
import { QuoteModal } from './QuoteModal';
import {
  Heart,
  Edit3,
  Trash2,
  Share2,
  Check,
  MoreHorizontal,
  ExternalLink,
  Link2,
  Repeat,
  Quote,
  Bookmark,
  FolderPlus,
  Flag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ConfirmationDialog } from '../common/Feedback';
import { VerificationBadge } from '../common/VerificationBadge';
import { DropdownMenu } from '../common/DropdownMenu';
import { SaveToCollectionModal } from '../saved/SaveToCollectionModal';
import { ReportModal } from '../common/ReportModal';
import api from '../../services/api';

export const PostCard = ({
  post,
  onLike,
  onEdit,
  onDelete,
  onPostCreated,
  currentUserId
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReposted, setIsReposted] = useState(Boolean(post.isReposted));
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);
  const [repostLoading, setRepostLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (post.isBookmarked !== undefined) {
      setIsBookmarked(Boolean(post.isBookmarked));
    }
  }, [post.isBookmarked]);

  const author = post.user || {};
  const authorId = author._id || author.id;
  const isOwner = currentUserId && authorId && currentUserId.toString() === authorId.toString();

  const activeUserId = currentUserId || user?._id || user?.id;
  const isLiked =
    post.likes &&
    activeUserId &&
    post.likes.some((id) => (typeof id === 'string' ? id : id?._id || id) === activeUserId.toString());

  const likeCount = post.likes ? post.likes.length : 0;

  // Format date cleanly
  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recently';

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    await onDelete(post._id);
    setIsDeleting(false);
    setShowConfirm(false);
  };

  const handleShare = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${post._id}`;
    const authorName = author.name || author.username || 'Postify Author';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} on Postify`,
          text: post.content?.slice(0, 80) || 'Check out this post on Postify',
          url: postUrl
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const menuItems = [
    {
      label: copied ? 'Link Copied!' : 'Copy Permanent Link',
      icon: copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />,
      onClick: handleShare
    },
    {
      label: 'Open Story Page',
      icon: <ExternalLink size={14} />,
      onClick: () => {
        window.location.href = `/post/${post._id}`;
      }
    }
  ];

  if (isOwner) {
    if (onEdit) {
      menuItems.push({
        label: 'Edit Story',
        icon: <Edit3 size={14} />,
        onClick: () => onEdit(post)
      });
    }
    if (onDelete) {
      menuItems.push({ divider: true });
      menuItems.push({
        label: 'Delete Story',
        icon: <Trash2 size={14} />,
        danger: true,
        onClick: () => setShowConfirm(true)
      });
    }
  } else if (user) {
    menuItems.push({ divider: true });
    menuItems.push({
      label: 'Report Story',
      icon: <Flag size={14} className="text-rose-500" />,
      danger: true,
      onClick: () => setShowReportModal(true)
    });
  }

  const handleToggleRepost = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      setRepostLoading(true);
      if (isReposted) {
        const res = await api.delete(`/posts/${post._id}/repost`);
        if (res.data?.success) {
          setIsReposted(false);
          setRepostsCount(res.data.repostsCount ?? Math.max(0, repostsCount - 1));
        }
      } else {
        const res = await api.post(`/posts/${post._id}/repost`);
        if (res.data?.success) {
          setIsReposted(true);
          setRepostsCount(res.data.repostsCount ?? (repostsCount + 1));
        }
      }
    } catch (err) {
      console.error('Repost error:', err);
    } finally {
      setRepostLoading(false);
    }
  };

  const repostMenuItems = [
    {
      label: isReposted ? 'Undo Repost' : 'Repost Story',
      icon: <Repeat size={14} className={isReposted ? 'text-emerald-500' : 'text-[#007aff]'} />,
      onClick: handleToggleRepost
    },
    {
      label: 'Quote Story',
      icon: <Quote size={14} className="text-[#007aff]" />,
      onClick: () => {
        if (!user) {
          window.location.href = '/login';
          return;
        }
        setShowQuoteModal(true);
      }
    }
  ];

  const handleToggleBookmark = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const previousState = isBookmarked;
    try {
      setIsBookmarked(!previousState);
      setBookmarkLoading(true);
      if (previousState) {
        await api.delete(`/bookmarks/${post._id}`);
      } else {
        await api.post('/bookmarks', { postId: post._id });
      }
    } catch (err) {
      setIsBookmarked(previousState);
      console.error('Bookmark toggle error:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <article className="portal-card p-6 sm:p-8 md:p-9 bg-[var(--portal-card)] border border-[var(--portal-card-border)] flex flex-col justify-between transition-all duration-200">
      {/* Top Header: Optional Reposter Capsule & Author Info */}
      <div>
        {post.isRepost && post.reposter && (
          <div className="flex items-center gap-2 mb-3.5 px-3 py-1 rounded-full bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/60 dark:border-blue-900/30 text-xs font-semibold text-[#007aff] self-start inline-flex">
            <Repeat size={13} className="shrink-0" />
            <Link
              to={`/user/${post.reposter._id || post.reposter.id}`}
              className="hover:underline truncate"
            >
              @{post.reposter.username || 'user'} reposted
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-5">
          <Link
            to={authorId ? `/user/${authorId}` : '#'}
            className="flex items-center gap-3.5 group focus:outline-none min-w-0"
          >
            <Avatar
              src={author.Profilepic || author.profilePic}
              username={author.username || 'Anonymous'}
              size="md"
              className="ring-2 ring-black/5 dark:ring-white/10 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-base font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors truncate flex items-center gap-1.5">
                <span className="truncate">{author.name || author.username || 'Anonymous'}</span>
                <VerificationBadge user={author} posts={[post]} size="sm" />
              </span>
              <span className="text-xs text-[var(--portal-meta)]">
                @{author.username || 'user'} · {formattedDate}
              </span>
            </div>
          </Link>

          {/* Contextual Actions Menu */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--portal-meta)] hover:text-[#007aff] transition-colors cursor-pointer"
              title={copied ? 'Link Copied!' : 'Share story'}
              aria-label="Share story"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
            </button>

            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
                  aria-label="More post options"
                >
                  <MoreHorizontal size={18} />
                </button>
              }
              items={menuItems}
            />
          </div>
        </div>

        {/* Post Content: Rendered with MarkdownContent */}
        <div className="mb-4 min-w-0 overflow-hidden">
          <MarkdownContent content={post.content} />
        </div>

        {/* Embedded Quoted Post (if present) */}
        {post.quotedPost && (
          <QuotedPostCard quotedPost={post.quotedPost} />
        )}
      </div>

      {/* Footer / Interaction Bar */}
      <div className="pt-4 border-t border-[var(--portal-card-border)] flex items-center justify-between text-xs mt-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            data-testid="like-button"
            onClick={() => onLike(post._id)}
            className={`flex items-center gap-1.5 font-medium py-1.5 px-3 rounded-full transition-all cursor-pointer ${
              isLiked
                ? 'bg-red-50 dark:bg-red-950/40 text-red-500 font-semibold'
                : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            aria-label={isLiked ? 'Unlike story' : 'Like story'}
          >
            <Heart
              size={16}
              className={isLiked ? 'fill-red-500 text-red-500' : 'text-current'}
            />
            <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
          </button>

          {/* Repost / Quote Menu Dropdown */}
          <DropdownMenu
            align="left"
            trigger={
              <button
                type="button"
                disabled={repostLoading}
                className={`flex items-center gap-1.5 font-medium py-1.5 px-3 rounded-full transition-all cursor-pointer ${
                  isReposted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 font-semibold'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                aria-label="Repost story or quote"
              >
                <Repeat
                  size={15}
                  className={isReposted ? 'text-emerald-500' : 'text-current'}
                />
                <span>{repostsCount > 0 ? `${repostsCount} ${repostsCount === 1 ? 'repost' : 'reposts'}` : 'Repost'}</span>
              </button>
            }
            items={repostMenuItems}
          />

          {/* Bookmark Button */}
          <div className="flex items-center">
            <button
              type="button"
              data-testid="bookmark-button"
              disabled={bookmarkLoading}
              onClick={handleToggleBookmark}
              className={`flex items-center gap-1.5 font-medium py-1.5 px-3 rounded-full transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-[#007aff]/10 text-[#007aff] font-semibold'
                  : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
              title={isBookmarked ? 'Saved to bookmarks' : 'Save post'}
            >
              <Bookmark
                size={15}
                className={isBookmarked ? 'fill-[#007aff] text-[#007aff]' : 'text-current'}
              />
              <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
            {isBookmarked && (
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                className="p-1.5 text-[var(--portal-meta)] hover:text-[#007aff] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all cursor-pointer ml-0.5"
                title="Add to collection"
                aria-label="Add to collection"
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>
        </div>

        <Link
          to={`/post/${post._id}`}
          className="text-[var(--portal-subtle)] hover:text-[#007aff] transition-colors font-medium flex items-center gap-1"
        >
          <span>Permalink</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        postToQuote={post}
        onPostCreated={onPostCreated}
      />

      <SaveToCollectionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        postId={post._id}
        onUpdated={() => setIsBookmarked(true)}
      />

      {/* Confirmation Dialog for Deletion */}
      <ConfirmationDialog
        isOpen={showConfirm}
        title="Delete Story"
        message="Are you sure you want to permanently delete this story? This action cannot be undone."
        confirmText="Delete Story"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Report Story Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="post"
        targetId={post._id}
        targetTitle={post.content?.slice(0, 60)}
      />
    </article>
  );
};

export default PostCard;
