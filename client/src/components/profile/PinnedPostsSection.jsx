import React from 'react';
import { PostCard } from '../posts/PostCard';
import { Pin, Sparkles } from 'lucide-react';

export const PinnedPostsSection = ({
  pinnedPosts = [],
  isOwner = false,
  currentUserId,
  onLike,
  onDelete,
  onUnpin,
  onPostCreated
}) => {
  if (!pinnedPosts || pinnedPosts.length === 0) return null;

  return (
    <div className="mb-10 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--portal-card-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500">
            <Pin size={16} className="rotate-45" />
          </div>
          <div>
            <h2 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)] flex items-center gap-2">
              <span>Pinned Publications</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                Featured
              </span>
            </h2>
            <span className="text-[11px] text-[var(--portal-meta)]">
              Highlighted stories and architecture logs selected by the author
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {pinnedPosts.map((post) => (
          <div key={post._id} className="relative">
            {isOwner && onUnpin && (
              <button
                type="button"
                onClick={() => onUnpin(post._id)}
                className="absolute top-4 right-14 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 text-[var(--portal-meta)] transition-all cursor-pointer"
                title="Unpin from profile"
              >
                <Pin size={11} className="line-through" />
                <span>Unpin</span>
              </button>
            )}
            <PostCard
              post={post}
              currentUserId={currentUserId}
              onLike={onLike}
              onDelete={onDelete}
              onPostCreated={onPostCreated}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinnedPostsSection;
