import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePostRealTime } from '../context/SocketContext';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { MarkdownContent } from '../components/common/MarkdownContent';
import { PostForm } from '../components/posts/PostForm';
import { ThreadedReplies } from '../components/posts/ThreadedReplies';
import { QuotedPostCard } from '../components/posts/QuotedPostCard';
import { QuoteModal } from '../components/posts/QuoteModal';
import { DropdownMenu } from '../components/common/DropdownMenu';
import { SaveToCollectionModal } from '../components/saved/SaveToCollectionModal';
import { checkBookmark, bookmarkPost, unbookmarkPost } from '../services/bookmarkService';
import { LoadingSkeleton, EmptyState, ConfirmationDialog } from '../components/common/Feedback';
import {
  Heart,
  Share2,
  ArrowLeft,
  Edit3,
  Trash2,
  Check,
  Calendar,
  Repeat,
  Quote,
  Bookmark,
  FolderPlus
} from 'lucide-react';

export const PostDetailPage = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [repostLoading, setRepostLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/posts/${postId}`);
      if (res.data && res.data.post) {
        setPost(res.data.post);
        setIsReposted(Boolean(res.data.post.isReposted));
        setRepostsCount(res.data.post.repostsCount || 0);
      } else {
        setError('Post not found');
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve this post.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (user && postId) {
      checkBookmark(postId)
        .then((res) => {
          if (res.success) {
            setIsBookmarked(Boolean(res.isBookmarked));
          }
        })
        .catch(() => {});
    }
  }, [user, postId]);

  // Synchronize real-time like count changes from other clients/tabs
  usePostRealTime(postId, {
    onLikeUpdate: (payload) => {
      setPost((prev) => {
        if (!prev) return prev;
        let updatedLikes = [...(prev.likes || [])];
        if (payload.action === 'like') {
          if (payload.likedUserId && !updatedLikes.some((id) => (id?._id || id).toString() === payload.likedUserId.toString())) {
            updatedLikes.push(payload.likedUserId);
          }
        } else if (payload.action === 'unlike') {
          if (payload.likedUserId) {
            updatedLikes = updatedLikes.filter((id) => (id?._id || id).toString() !== payload.likedUserId.toString());
          }
        }
        return { ...prev, likes: updatedLikes };
      });
    }
  });

  const author = post?.user || {};
  const authorId = author._id || author.id;
  const isOwner = user && authorId && (user._id === authorId || user.id === authorId);

  const isLiked =
    post?.likes &&
    user &&
    post.likes.some((id) => (typeof id === 'string' ? id : id?._id || id) === (user._id || user.id));

  const handleLike = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const previousPost = { ...post };
    const userId = user._id || user.id;

    // Optimistic UI update
    setPost((prev) => {
      const alreadyLiked = prev.likes.some((id) => (typeof id === 'string' ? id : id?._id || id) === userId);
      const newLikes = alreadyLiked
        ? prev.likes.filter((id) => (typeof id === 'string' ? id : id?._id || id) !== userId)
        : [...prev.likes, userId];
      return { ...prev, likes: newLikes };
    });

    try {
      if (isLiked) {
        await api.delete(`/posts/${post._id}/like`);
      } else {
        await api.put(`/posts/${post._id}/like`);
      }
    } catch (err) {
      // Rollback on error
      setPost(previousPost);
    }
  };

  const handleToggleRepost = async () => {
    if (!user) {
      navigate('/login');
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
          navigate('/login');
          return;
        }
        setShowQuoteModal(true);
      }
    }
  ];

  const handleToggleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const prev = isBookmarked;
    try {
      setIsBookmarked(!prev);
      setBookmarkLoading(true);
      if (prev) {
        await unbookmarkPost(postId);
      } else {
        await bookmarkPost(postId);
      }
    } catch (err) {
      setIsBookmarked(prev);
      console.error('Bookmark toggle error:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleEditSubmit = async (newContent) => {
    try {
      const res = await api.patch(`/posts/${post._id}`, { content: newContent });
      setPost(res.data.post);
      setIsEditing(false);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/posts/${post._id}`);
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Failed to delete post.');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleShare = async () => {
    const postUrl = window.location.href;
    const authorName = author.name || author.username || 'Author';
    const cleanText = post?.content ? post.content.slice(0, 100) : 'Check out this post on Postify';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} on Postify`,
          text: cleanText,
          url: postUrl
        });
        setShareFeedback('Shared successfully!');
        setTimeout(() => setShareFeedback(''), 2500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setShareFeedback('Link copied to clipboard!');
      setTimeout(() => {
        setCopied(false);
        setShareFeedback('');
      }, 2500);
    } catch (err) {
      setShareFeedback('Could not copy URL.');
      setTimeout(() => setShareFeedback(''), 2500);
    }
  };

  const cleanDescription = post?.content
    ? post.content.replace(/[#*`_~\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160)
    : 'Read technical reflections and developer insights on Postify.';

  const formattedDate = post?.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  return (
    <Layout>
      <Helmet>
        <title>{post ? `${author.name || author.username || 'Post'} | Postify` : 'Post | Postify'}</title>
        <meta name="description" content={cleanDescription} />
        <link rel="canonical" href={`http://localhost:5173/post/${postId}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${author.name || author.username || 'Post'} on Postify`} />
        <meta property="og:description" content={cleanDescription} />
        <meta property="og:url" content={`http://localhost:5173/post/${postId}`} />
        <meta
          property="og:image"
          content={
            author.Profilepic
              ? (author.Profilepic.startsWith('http://') || author.Profilepic.startsWith('https://')
                  ? author.Profilepic
                  : `http://localhost:5173/uploads/${author.Profilepic}`)
              : 'http://localhost:5173/uploads/Profilepic.jpg'
          }
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${author.name || author.username || 'Post'} on Postify`} />
        <meta name="twitter:description" content={cleanDescription} />
      </Helmet>

      <PageContainer size="md" className="pt-36 sm:pt-44 pb-28 sm:pb-36">
        {/* Navigation Breadcrumb */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[var(--portal-meta)] hover:text-[#007aff] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Stories</span>
          </Link>

          {shareFeedback && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-fade-in flex items-center gap-1.5">
              <Check size={14} />
              <span>{shareFeedback}</span>
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && <LoadingSkeleton count={1} />}

        {/* Error / Not Found State */}
        {!loading && error && (
          <EmptyState
            title="Post not found"
            description="The post you are looking for may have been removed, deleted, or does not exist."
            action={
              <Link
                to="/feed"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-[50px] bg-[#007aff] text-white text-xs font-semibold hover:bg-[#0069dc] transition-all"
              >
                Return to Feed
              </Link>
            }
          />
        )}

        {/* Post Detail Card */}
        {!loading && post && (
          <article className="portal-card p-7 sm:p-10 md:p-12 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-md">
            <h1 className="sr-only">
              {author.name || author.username ? `${author.name || author.username}'s Story` : 'Post Details'}
            </h1>
            {/* Header: Author Details & Ownership Actions */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--portal-card-border)] mb-8">
              <Link
                to={authorId ? `/user/${authorId}` : '#'}
                className="flex items-center gap-4 group focus:outline-none min-w-0"
              >
                <Avatar
                  src={author.Profilepic || author.profilePic}
                  username={author.username || 'Anonymous'}
                  size="lg"
                  className="ring-2 ring-black/5 dark:ring-white/10 shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-lg sm:text-xl font-bold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors truncate flex items-center gap-2">
                    <span className="truncate">{author.name || author.username || 'Anonymous'}</span>
                    <VerificationBadge user={author} posts={[post]} size="sm" />
                  </span>
                  <span className="text-xs sm:text-sm text-[var(--portal-meta)] flex items-center gap-2 mt-0.5">
                    <span>@{author.username || 'user'}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="inline opacity-70" />
                      <span>{formattedDate}</span>
                    </span>
                  </span>
                </div>
              </Link>

              {/* Owner Edit / Delete Controls */}
              {isOwner && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#007aff] transition-colors cursor-pointer text-xs font-medium text-[var(--portal-meta)] flex items-center gap-1.5"
                    title="Edit story"
                    aria-label="Edit story"
                  >
                    <Edit3 size={16} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors cursor-pointer text-xs font-medium text-[var(--portal-meta)] flex items-center gap-1.5"
                    title="Delete story"
                    aria-label="Delete story"
                  >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editing Form vs Rendered Markdown Content */}
            {isEditing ? (
              <div className="mb-8">
                <PostForm
                  isEditing={true}
                  initialContent={post.content}
                  onSubmit={handleEditSubmit}
                  onCancel={() => setIsEditing(false)}
                  buttonText="Update Story"
                />
              </div>
            ) : (
              <div className="mb-10 min-w-0 overflow-hidden">
                <MarkdownContent content={post.content} className="text-base sm:text-lg" />
                {post.quotedPost && (
                  <QuotedPostCard quotedPost={post.quotedPost} />
                )}
              </div>
            )}

            {/* Engagement and Interaction Bar */}
            <div className="pt-6 border-t border-[var(--portal-card-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-2 text-xs sm:text-sm font-semibold py-2 px-4 rounded-full transition-all cursor-pointer ${
                    isLiked
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-500 shadow-xs'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  aria-label={isLiked ? 'Unlike story' : 'Like story'}
                >
                  <Heart
                    size={18}
                    className={isLiked ? 'fill-red-500 text-red-500' : 'text-current'}
                  />
                  <span>
                    {post.likes?.length || 0} {(post.likes?.length || 0) === 1 ? 'like' : 'likes'}
                  </span>
                </button>

                {/* Repost / Quote Menu Dropdown */}
                <DropdownMenu
                  align="left"
                  trigger={
                    <button
                      type="button"
                      disabled={repostLoading}
                      className={`flex items-center gap-2 text-xs sm:text-sm font-semibold py-2 px-4 rounded-full transition-all cursor-pointer ${
                        isReposted
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 shadow-xs'
                          : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      aria-label="Repost options"
                    >
                      <Repeat
                        size={17}
                        className={isReposted ? 'text-emerald-500' : 'text-current'}
                      />
                      <span>
                        {repostsCount > 0 ? `${repostsCount} ${repostsCount === 1 ? 'repost' : 'reposts'}` : 'Repost'}
                      </span>
                    </button>
                  }
                  items={repostMenuItems}
                />

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-2 text-xs sm:text-sm font-semibold py-2 px-4 rounded-full text-[var(--portal-meta)] hover:text-[#007aff] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                  aria-label="Share story"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                  <span>{copied ? 'Copied' : 'Share'}</span>
                </button>

                {/* Bookmark Action */}
                <div className="flex items-center">
                  <button
                    type="button"
                    data-testid="bookmark-button"
                    disabled={bookmarkLoading}
                    onClick={handleToggleBookmark}
                    className={`flex items-center gap-2 text-xs sm:text-sm font-semibold py-2 px-4 rounded-full transition-all cursor-pointer ${
                      isBookmarked
                        ? 'bg-[#007aff]/10 text-[#007aff]'
                        : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
                  >
                    <Bookmark
                      size={17}
                      className={isBookmarked ? 'fill-[#007aff] text-[#007aff]' : 'text-current'}
                    />
                    <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  {isBookmarked && (
                    <button
                      type="button"
                      onClick={() => setShowSaveModal(true)}
                      className="p-2 text-[var(--portal-meta)] hover:text-[#007aff] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all cursor-pointer ml-1"
                      title="Add to collection"
                      aria-label="Add to collection"
                    >
                      <FolderPlus size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--portal-subtle)] font-medium">
                Postify Editorial Haven
              </div>
            </div>
          </article>
        )}

        {/* Threaded Discussion Section */}
        {!loading && post && (
          <ThreadedReplies postId={post._id} postAuthorId={authorId} />
        )}
      </PageContainer>

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        postToQuote={post}
        onPostCreated={(newQuote) => {
          navigate(`/post/${newQuote._id}`);
        }}
      />

      <SaveToCollectionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        postId={postId}
        onUpdated={() => setIsBookmarked(true)}
      />

      <ConfirmationDialog
        isOpen={showConfirm}
        title="Delete Story"
        message="Are you sure you want to delete this story? It will be permanently removed from Postify."
        confirmText="Delete Story"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </Layout>
  );
};

export default PostDetailPage;
