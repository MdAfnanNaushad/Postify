import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePostRealTime } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';
import { VerificationBadge } from '../common/VerificationBadge';
import { MarkdownContent } from '../common/MarkdownContent';
import { Button } from '../common/Button';
import { ConfirmationDialog, LoadingSkeleton, EmptyState } from '../common/Feedback';
import {
  MessageSquare,
  CornerDownRight,
  Heart,
  Edit3,
  Trash2,
  Check,
  Send,
  X,
  Bold,
  Italic,
  Code
} from 'lucide-react';

export const ThreadedReplies = ({ postId, postAuthorId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Main reply composer state
  const [newReplyContent, setNewReplyContent] = useState('');

  // Inline replying state (which parent reply ID is currently being replied to)
  const [activeReplyToId, setActiveReplyToId] = useState(null);
  const [nestedContent, setNestedContent] = useState('');

  // Inline editing state
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Deletion state
  const [deletingReplyId, setDeletingReplyId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch initial replies
  const fetchReplies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/posts/${postId}/replies`);
      setReplies(res.data.replies || []);
    } catch (err) {
      setError(err.message || 'Failed to load discussion replies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [postId]);

  // Real-time synchronization for new, updated, and deleted replies
  usePostRealTime(postId, {
    onNewReply: (newReply) => {
      setReplies((prev) => {
        // Prevent duplicate append if this client already added it
        const exists = prev.some((r) => r._id === newReply._id);
        if (exists) return prev;
        return [...prev, newReply];
      });
    },
    onUpdateReply: (updatedReply) => {
      setReplies((prev) =>
        prev.map((r) => (r._id === updatedReply._id ? updatedReply : r))
      );
    },
    onDeleteReply: (deletedId) => {
      setReplies((prev) => {
        const idsToRemove = new Set([deletedId.toString()]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const r of prev) {
            const parentId = (r.parentReply?._id || r.parentReply)?.toString();
            if (parentId && idsToRemove.has(parentId) && !idsToRemove.has(r._id.toString())) {
              idsToRemove.add(r._id.toString());
              changed = true;
            }
          }
        }
        return prev.filter((r) => !idsToRemove.has(r._id.toString()));
      });
    }
  });

  // Handle submitting top-level reply
  const handleCreateTopLevel = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!newReplyContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/posts/${postId}/replies`, {
        content: newReplyContent.trim()
      });

      // Optimistic append if not already pushed via socket
      setReplies((prev) => {
        const exists = prev.some((r) => r._id === res.data.reply._id);
        if (exists) return prev;
        return [...prev, res.data.reply];
      });

      setNewReplyContent('');
    } catch (err) {
      setError(err.message || 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle submitting nested reply
  const handleCreateNested = async (parentReplyId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!nestedContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/posts/${postId}/replies`, {
        content: nestedContent.trim(),
        parentReply: parentReplyId
      });

      setReplies((prev) => {
        const exists = prev.some((r) => r._id === res.data.reply._id);
        if (exists) return prev;
        return [...prev, res.data.reply];
      });

      setNestedContent('');
      setActiveReplyToId(null);
    } catch (err) {
      setError(err.message || 'Failed to submit nested reply.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle updating reply
  const handleUpdate = async (replyId) => {
    if (!editingContent.trim()) return;

    try {
      setSubmitting(true);
      const res = await api.patch(`/replies/${replyId}`, {
        content: editingContent.trim()
      });

      setReplies((prev) =>
        prev.map((r) => (r._id === replyId ? res.data.reply : r))
      );
      setEditingReplyId(null);
      setEditingContent('');
    } catch (err) {
      setError(err.message || 'Failed to update reply.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting reply
  const handleDeleteConfirm = async () => {
    if (!deletingReplyId) return;

    try {
      await api.delete(`/replies/${deletingReplyId}`);
      setReplies((prev) =>
        prev.filter((r) => r._id !== deletingReplyId && r.parentReply !== deletingReplyId)
      );
      setShowDeleteConfirm(false);
      setDeletingReplyId(null);
    } catch (err) {
      setError(err.message || 'Failed to delete reply.');
    }
  };

  // Handle liking a reply
  const handleLikeReply = async (replyId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const currentUserId = user._id || user.id;

    setReplies((prev) =>
      prev.map((r) => {
        if (r._id !== replyId) return r;
        const alreadyLiked = r.likes && r.likes.some((id) => (id?._id || id).toString() === currentUserId.toString());
        const newLikes = alreadyLiked
          ? r.likes.filter((id) => (id?._id || id).toString() !== currentUserId.toString())
          : [...(r.likes || []), currentUserId];
        return { ...r, likes: newLikes };
      })
    );

    try {
      const targetReply = replies.find((r) => r._id === replyId);
      const isCurrentlyLiked =
        targetReply?.likes &&
        targetReply.likes.some((id) => (id?._id || id).toString() === currentUserId.toString());

      if (isCurrentlyLiked) {
        await api.delete(`/replies/${replyId}/like`);
      } else {
        await api.put(`/replies/${replyId}/like`);
      }
    } catch (err) {
      fetchReplies(); // Re-sync on failure
    }
  };

  // Organize replies into a shallow hierarchy (root replies and their children)
  const rootReplies = replies.filter((r) => !r.parentReply);
  const getChildrenOf = (parentId) =>
    replies.filter((r) => r.parentReply && (r.parentReply._id || r.parentReply) === parentId);

  return (
    <section className="mt-12 pt-10 border-t border-[var(--portal-card-border)]">
      {/* Discussion Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#007aff]/10 text-[#007aff] flex items-center justify-center">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="editorial-h2 text-xl sm:text-2xl text-[var(--portal-heading)]">
              Discussion &amp; Perspectives
            </h3>
            <span className="text-xs text-[var(--portal-meta)]">
              {replies.length} {replies.length === 1 ? 'thought' : 'thoughts'} shared
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="p-1 hover:text-red-800 dark:hover:text-red-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Top-Level Reply Composer */}
      {user ? (
        <form
          onSubmit={handleCreateTopLevel}
          className="portal-card p-5 sm:p-6 bg-[var(--portal-card)] border border-[var(--portal-card-border)] mb-10 shadow-sm"
        >
          <div className="flex gap-3 sm:gap-4 items-start">
            <Avatar
              src={user.Profilepic || user.profilePic}
              username={user.username}
              size="md"
              className="ring-2 ring-black/5 dark:ring-white/10 shrink-0 hidden sm:block mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <label htmlFor="main-reply-textarea" className="sr-only">
                Add to discussion
              </label>
              <textarea
                id="main-reply-textarea"
                rows={3}
                value={newReplyContent}
                onChange={(e) => setNewReplyContent(e.target.value)}
                maxLength={1500}
                placeholder="Join the discussion... Share a perspective, code suggestion, or technical question (Markdown supported)"
                className="w-full bg-transparent text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] outline-none resize-none text-sm leading-relaxed p-1 focus:ring-0"
              />

              <div className="flex items-center justify-between pt-3 border-t border-[var(--portal-card-border)] mt-2">
                <span className="text-[11px] text-[var(--portal-meta)]">
                  {1500 - newReplyContent.length} chars remaining
                </span>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  disabled={!newReplyContent.trim() || submitting}
                >
                  <Send size={13} className="mr-1.5" />
                  <span>Reply</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="portal-card p-6 bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-center mb-10 shadow-sm">
          <p className="text-sm text-[var(--portal-meta)] mb-3">
            Sign in to participate in this discussion and share your perspectives.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-2 rounded-[50px] bg-[#007aff] text-white text-xs font-semibold hover:bg-[#0069dc] transition-all shadow-sm"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 rounded-[50px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] text-xs font-semibold hover:bg-[var(--portal-canvas-secondary)] transition-all shadow-sm"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* Discussion List */}
      {loading && <LoadingSkeleton count={2} />}

      {!loading && replies.length === 0 && (
        <EmptyState
          title="No replies yet"
          description="Be the first to share your thoughts, ask questions, or provide feedback on this story."
        />
      )}

      {!loading && replies.length > 0 && (
        <div className="space-y-6">
          {rootReplies.map((reply) => {
            const children = getChildrenOf(reply._id);
            return (
              <div key={reply._id} className="space-y-4">
                {/* Root Reply Card */}
                <ReplyCard
                  reply={reply}
                  user={user}
                  postAuthorId={postAuthorId}
                  isNested={false}
                  onReplyClick={() => {
                    setActiveReplyToId(activeReplyToId === reply._id ? null : reply._id);
                    setNestedContent('');
                  }}
                  onEditClick={() => {
                    setEditingReplyId(reply._id);
                    setEditingContent(reply.content);
                  }}
                  onDeleteClick={() => {
                    setDeletingReplyId(reply._id);
                    setShowDeleteConfirm(true);
                  }}
                  onLikeClick={() => handleLikeReply(reply._id)}
                  isEditing={editingReplyId === reply._id}
                  editingContent={editingContent}
                  setEditingContent={setEditingContent}
                  onSaveEdit={() => handleUpdate(reply._id)}
                  onCancelEdit={() => setEditingReplyId(null)}
                  submitting={submitting}
                />

                {/* Inline Composer for nested reply */}
                {activeReplyToId === reply._id && user && (
                  <div className="ml-6 sm:ml-12 pl-4 border-l-2 border-[#007aff]/30 animate-fade-in">
                    <div className="portal-card p-4 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
                      <div className="flex items-center gap-2 mb-2 text-xs text-[var(--portal-meta)] font-medium">
                        <CornerDownRight size={14} className="text-[#007aff]" />
                        <span>Replying to @{reply.user?.username || 'user'}</span>
                      </div>
                      <textarea
                        rows={2}
                        value={nestedContent}
                        onChange={(e) => setNestedContent(e.target.value)}
                        maxLength={1500}
                        placeholder="Write a direct reply..."
                        className="w-full bg-transparent text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] outline-none resize-none text-xs sm:text-sm leading-relaxed p-1"
                        autoFocus
                      />
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--portal-card-border)] mt-2">
                        <span className="text-[10px] text-[var(--portal-meta)]">
                          {1500 - nestedContent.length} chars left
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveReplyToId(null)}
                            className="px-3 py-1 rounded-full text-xs text-[var(--portal-meta)] hover:text-[var(--portal-heading)]"
                          >
                            Cancel
                          </button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            loading={submitting}
                            disabled={!nestedContent.trim() || submitting}
                            onClick={() => handleCreateNested(reply._id)}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nested Child Replies */}
                {children.length > 0 && (
                  <div className="ml-5 sm:ml-10 pl-3 sm:pl-4 border-l-2 border-black/5 dark:border-white/10 space-y-3">
                    {children.map((childReply) => (
                      <ReplyCard
                        key={childReply._id}
                        reply={childReply}
                        user={user}
                        postAuthorId={postAuthorId}
                        isNested={true}
                        onReplyClick={() => {
                          // In shallow nesting, replying to a child replies to the root thread parent
                          setActiveReplyToId(activeReplyToId === reply._id ? null : reply._id);
                          setNestedContent(`@${childReply.user?.username || 'user'} `);
                        }}
                        onEditClick={() => {
                          setEditingReplyId(childReply._id);
                          setEditingContent(childReply.content);
                        }}
                        onDeleteClick={() => {
                          setDeletingReplyId(childReply._id);
                          setShowDeleteConfirm(true);
                        }}
                        onLikeClick={() => handleLikeReply(childReply._id)}
                        isEditing={editingReplyId === childReply._id}
                        editingContent={editingContent}
                        setEditingContent={setEditingContent}
                        onSaveEdit={() => handleUpdate(childReply._id)}
                        onCancelEdit={() => setEditingReplyId(null)}
                        submitting={submitting}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Reply Deletion */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? Any nested direct replies will also be removed."
        confirmText="Delete Reply"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingReplyId(null);
        }}
      />
    </section>
  );
};

/**
 * Individual Reply Card Subcomponent
 */
const ReplyCard = ({
  reply,
  user,
  postAuthorId,
  isNested = false,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  onLikeClick,
  isEditing = false,
  editingContent = '',
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  submitting = false
}) => {
  const author = reply.user || {};
  const authorId = author._id || author.id;
  const currentUserId = user?._id || user?.id;

  const isOwner = currentUserId && authorId && currentUserId.toString() === authorId.toString();
  const isPostAuthor = currentUserId && postAuthorId && currentUserId.toString() === postAuthorId.toString();
  const canDelete = isOwner || isPostAuthor;

  const isLiked =
    reply.likes &&
    currentUserId &&
    reply.likes.some((id) => (id?._id || id).toString() === currentUserId.toString());

  const likeCount = reply.likes ? reply.likes.length : 0;

  const formattedDate = reply.createdAt
    ? new Date(reply.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recently';

  return (
    <div
      className={`portal-card ${
        isNested ? 'p-4 sm:p-5 bg-[var(--portal-canvas-secondary)]' : 'p-5 sm:p-6 bg-[var(--portal-card)]'
      } border border-[var(--portal-card-border)] rounded-2xl transition-all duration-200`}
    >
      {/* Author Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link
          to={authorId ? `/user/${authorId}` : '#'}
          className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none min-w-0"
        >
          <Avatar
            src={author.Profilepic || author.profilePic}
            username={author.username || 'Anonymous'}
            size="sm"
            className="ring-1 ring-black/5 dark:ring-white/10 shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors truncate flex items-center gap-1.5">
              <span className="truncate">{author.name || author.username || 'Anonymous'}</span>
              <VerificationBadge user={author} size="sm" />
            </span>
            <span className="text-[11px] text-[var(--portal-meta)]">
              @{author.username || 'user'} · {formattedDate}
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-[var(--portal-meta)]">
          {isOwner && !isEditing && (
            <button
              type="button"
              onClick={onEditClick}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#007aff] transition-colors"
              title="Edit reply"
              aria-label="Edit reply"
            >
              <Edit3 size={14} />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={onDeleteClick}
              className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors"
              title="Delete reply"
              aria-label="Delete reply"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Reply Body: Edit Mode vs Rendered Content */}
      {isEditing ? (
        <div className="my-2">
          <textarea
            rows={3}
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            maxLength={1500}
            className="w-full bg-[var(--portal-input)] text-[var(--portal-heading)] border border-[var(--portal-input-border)] rounded-xl p-3 text-xs sm:text-sm outline-none resize-none focus:border-[#007aff]"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3 py-1 rounded-full text-xs text-[var(--portal-meta)] hover:text-[var(--portal-heading)]"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={submitting}
              onClick={onSaveEdit}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="my-3 text-xs sm:text-sm leading-relaxed overflow-hidden">
          <MarkdownContent content={reply.content} />
        </div>
      )}

      {/* Reply Card Footer: Likes & Reply Action */}
      {!isEditing && (
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--portal-card-border)] text-xs text-[var(--portal-meta)]">
          <button
            type="button"
            onClick={onLikeClick}
            className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all cursor-pointer ${
              isLiked
                ? 'bg-red-50 dark:bg-red-950/40 text-red-500 font-semibold'
                : 'hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            aria-label={isLiked ? 'Unlike reply' : 'Like reply'}
          >
            <Heart
              size={13}
              className={isLiked ? 'fill-red-500 text-red-500' : 'text-current'}
            />
            <span>{likeCount}</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={onReplyClick}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-full hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <CornerDownRight size={13} />
              <span>Reply</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadedReplies;
