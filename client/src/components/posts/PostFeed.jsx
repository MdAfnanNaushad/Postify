import React, { useState, useEffect } from 'react';
import { PostCard } from './PostCard';
import { LoadingSkeleton, EmptyState, ErrorMessage } from '../common/Feedback';
import { checkBatchBookmarks } from '../../services/bookmarkService';
import { useAuth } from '../../context/AuthContext';

export const PostFeed = ({
  posts = [],
  loading = false,
  error = null,
  onLike,
  onEdit,
  onDelete,
  onPostCreated,
  currentUserId,
  onRetry,
  emptyTitle,
  emptyDescription
}) => {
  const { user } = useAuth();
  const [bookmarkedSet, setBookmarkedSet] = useState(new Set());

  const activeUserId = currentUserId || user?._id || user?.id;

  useEffect(() => {
    let isMounted = true;
    const fetchBookmarkStatuses = async () => {
      if (!activeUserId || !posts || posts.length === 0) {
        if (isMounted) setBookmarkedSet(new Set());
        return;
      }
      const ids = posts.map((p) => (p._id || p.id)?.toString()).filter(Boolean);
      if (ids.length === 0) return;
      try {
        const res = await checkBatchBookmarks(ids);
        if (isMounted && res.success && Array.isArray(res.bookmarkedPostIds)) {
          setBookmarkedSet(new Set(res.bookmarkedPostIds.map((id) => id.toString())));
        }
      } catch (err) {
        console.error('Failed to fetch batch bookmark statuses:', err);
      }
    };

    fetchBookmarkStatuses();
    return () => {
      isMounted = false;
    };
  }, [posts, activeUserId]);

  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || 'No stories yet'}
        description={
          emptyDescription ||
          'Check back later or be the first to share an inspiring thought.'
        }
      />
    );
  }

  return (
    <div className="space-y-5 w-full">
      {posts.map((post) => {
        const pid = (post._id || post.id)?.toString();
        const isBookmarked =
          post.isBookmarked !== undefined ? post.isBookmarked : bookmarkedSet.has(pid);
        return (
          <PostCard
            key={post._id || post.id}
            post={{ ...post, isBookmarked }}
            onLike={onLike}
            onEdit={onEdit}
            onDelete={onDelete}
            onPostCreated={onPostCreated}
            currentUserId={currentUserId}
          />
        );
      })}
    </div>
  );
};
