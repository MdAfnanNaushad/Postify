import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { LottieLoader } from '../components/common';
import { PostCard } from '../components/posts/PostCard';
import { useAuth } from '../context/AuthContext';
import { useFeedRealTime } from '../context/SocketContext';
import { Hash, ArrowLeft, Layers, Sparkles } from 'lucide-react';

export const TopicDetailPage = () => {
  const { tag } = useParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cleanTag = (tag || '').toLowerCase().replace(/^#+/, '').trim();

  const fetchTopicPosts = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!cleanTag) return;
      try {
        if (!append) setLoading(true);
        const res = await api.get(`/topics/${encodeURIComponent(cleanTag)}?page=${pageToLoad}&limit=15`);
        if (res.data?.success) {
          const fetched = res.data.posts || [];
          setPosts((prev) => (append ? [...prev, ...fetched] : fetched));
          setTotal(res.data.total || 0);
          setPage(res.data.page || 1);
          setPages(res.data.pages || 1);
        }
      } catch (err) {
        setError(err.message || 'Failed to load posts for this topic.');
      } finally {
        setLoading(false);
      }
    },
    [cleanTag]
  );

  useEffect(() => {
    fetchTopicPosts(1, false);
  }, [fetchTopicPosts]);

  // Real-time synchronization of like counts across posts in the topic feed
  useFeedRealTime({
    onLikeUpdate: (payload) => {
      if (!payload || !payload.postId) return;
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p._id.toString() === payload.postId.toString()) {
            let updatedLikes = [...(p.likes || [])];
            if (payload.action === 'like') {
              if (!updatedLikes.some((id) => (id._id || id).toString() === payload.likedUserId.toString())) {
                updatedLikes.push(payload.likedUserId);
              }
            } else if (payload.action === 'unlike') {
              updatedLikes = updatedLikes.filter(
                (id) => (id._id || id).toString() !== payload.likedUserId.toString()
              );
            }
            return { ...p, likes: updatedLikes };
          }
          return p;
        })
      );
    }
  });

  const handleLike = async (postId, currentlyLiked) => {
    try {
      if (currentlyLiked) {
        await api.delete(`/posts/${postId}/like`);
      } else {
        await api.put(`/posts/${postId}/like`);
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <Layout>
      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-3xl mx-auto">
        {/* Navigation & Topic Header */}
        <div className="mb-6">
          <Link
            to="/topics"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--portal-meta)] hover:text-[#007aff] transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            <span>All Topics</span>
          </Link>

          <div className="portal-card p-6 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
                <Hash size={24} />
              </div>
              <div>
                <h1 className="editorial-h2 text-2xl sm:text-3xl font-semibold text-[var(--portal-heading)]">
                  #{cleanTag}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--portal-meta)]">
                  Technical publications & discussions tagged with #{cleanTag}
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-center self-start sm:self-auto">
              <span className="block text-lg font-bold text-[var(--portal-heading)]">
                {total}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--portal-meta)]">
                {total === 1 ? 'Publication' : 'Publications'}
              </span>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <LottieLoader size={110} />
            <span className="text-xs text-[var(--portal-meta)] font-medium">Fetching publications...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm mb-6">
            {error}
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUserId={user?._id || user?.id}
              onLike={handleLike}
              onDelete={handleDelete}
              onPostCreated={() => fetchTopicPosts(1, false)}
            />
          ))}
        </div>

        {/* Empty state */}
        {!loading && posts.length === 0 && !error && (
          <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
            <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-[var(--portal-meta)]">
              <Layers size={24} className="text-[#007aff]" />
            </div>
            <h3 className="editorial-h2 text-xl font-medium text-[var(--portal-heading)] mb-1">
              No publications in #{cleanTag} yet
            </h3>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto">
              Be the first writer to publish an essay or share technical code about #{cleanTag}.
            </p>
            <Link
              to="/feed"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-sm"
            >
              Write a Post in Feed
            </Link>
          </div>
        )}

        {/* Load More Pagination */}
        {page < pages && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => fetchTopicPosts(page + 1, true)}
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-all cursor-pointer shadow-xs"
            >
              Load More Publications
            </button>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
};

export default TopicDetailPage;
