import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { VerificationBadge } from '../common/VerificationBadge';
import { MarkdownContent } from '../common/MarkdownContent';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const QuotedPostCard = ({ quotedPost, compact = false }) => {
  if (!quotedPost || !quotedPost._id || !quotedPost.user) {
    return (
      <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-dashed border-[var(--portal-card-border)] text-xs text-[var(--portal-subtle)] italic flex items-center gap-2.5 my-3">
        <AlertCircle size={15} className="shrink-0 text-amber-500/70" />
        <span>This quoted story is unavailable or was deleted by its author.</span>
      </div>
    );
  }

  const author = quotedPost.user;
  const authorId = author._id || author.id;
  const formattedDate = quotedPost.date
    ? new Date(quotedPost.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    : '';

  return (
    <div
      onClick={(e) => {
        // Prevent click if user clicked an author link or interactive element
        if (e.target.closest('a') || e.target.closest('button')) return;
        window.location.href = `/post/${quotedPost._id}`;
      }}
      className={`group/quote block my-3.5 p-4 sm:p-5 rounded-2xl bg-[var(--portal-canvas-secondary)]/60 hover:bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] transition-all cursor-pointer relative overflow-hidden ${
        compact ? 'text-xs' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <Link
          to={authorId ? `/user/${authorId}` : '#'}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2.5 min-w-0 group/author"
        >
          <Avatar
            src={author.Profilepic || author.profilePic}
            username={author.username || 'Anonymous'}
            size="sm"
            className="ring-1 ring-black/5 dark:ring-white/10 shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-[var(--portal-heading)] group-hover/author:text-[#007aff] transition-colors truncate">
              {author.name || author.username || 'Anonymous'}
            </span>
            <VerificationBadge user={author} size="sm" />
            <span className="text-xs text-[var(--portal-meta)] truncate">
              @{author.username || 'user'}
            </span>
            {formattedDate && (
              <span className="text-xs text-[var(--portal-subtle)] shrink-0 hidden sm:inline">
                · {formattedDate}
              </span>
            )}
          </div>
        </Link>

        <span className="text-[11px] font-medium text-[var(--portal-subtle)] group-hover/quote:text-[#007aff] transition-colors flex items-center gap-1 shrink-0">
          <span className="hidden sm:inline">Original Story</span>
          <ExternalLink size={12} />
        </span>
      </div>

      {/* Content Preview */}
      <div className="text-xs sm:text-sm text-[var(--portal-text)] line-clamp-4 leading-relaxed">
        <MarkdownContent
          content={
            quotedPost.content?.length > 300
              ? `${quotedPost.content.slice(0, 300)}...`
              : quotedPost.content
          }
        />
      </div>
    </div>
  );
};

export default QuotedPostCard;
