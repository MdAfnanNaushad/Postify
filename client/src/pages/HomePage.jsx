import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PostFeed } from '../components/posts/PostFeed';
import { PostForm } from '../components/posts/PostForm';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { useAuth } from '../context/AuthContext';
import { useFeedRealTime } from '../context/SocketContext';
import api from '../services/api';
import {
  Search,
  Sparkles,
  Compass,
  Feather,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Tag,
  X,
  User,
  CheckSquare,
  BookOpen,
  Award
} from 'lucide-react';

export const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState({});

  // Phase 4: Personalized Following Feed state
  const [feedMode, setFeedMode] = useState('discovery'); // 'discovery' | 'following'
  const [followingPosts, setFollowingPosts] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoadingMore, setFollowingLoadingMore] = useState(false);
  const [followingError, setFollowingError] = useState(null);
  const [followingCursor, setFollowingCursor] = useState(null);
  const [followingHasMore, setFollowingHasMore] = useState(false);

  const toggleFollow = (handle) => {
    setFollowingMap((prev) => ({ ...prev, [handle]: !prev[handle] }));
  };

  // Fetch chronological public feed
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/posts?limit=50');
      if (res.data?.success) {
        setPosts(res.data.posts || []);
      }
    } catch (err) {
      setError(err.message || 'Unable to load stories.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch personalized Following feed (cursor-based pagination)
  const fetchFollowingFeed = useCallback(async (cursor = null, isLoadMore = false) => {
    if (!isAuthenticated) return;
    try {
      if (isLoadMore) {
        setFollowingLoadingMore(true);
      } else {
        setFollowingLoading(true);
      }
      setFollowingError(null);
      const url = `/posts/following?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await api.get(url);
      if (res.data?.success) {
        const newPosts = res.data.posts || [];
        if (isLoadMore) {
          setFollowingPosts((prev) => {
            const seen = new Set(prev.map((p) => p.feedId || p._id));
            const filtered = newPosts.filter((p) => !seen.has(p.feedId || p._id));
            return [...prev, ...filtered];
          });
        } else {
          setFollowingPosts(newPosts);
        }
        setFollowingCursor(res.data.pagination?.nextCursor || null);
        setFollowingHasMore(Boolean(res.data.pagination?.hasMore));
      }
    } catch (err) {
      setFollowingError(err.message || 'Unable to load following feed.');
    } finally {
      setFollowingLoading(false);
      setFollowingLoadingMore(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (feedMode === 'following' && isAuthenticated) {
      fetchFollowingFeed();
    }
  }, [feedMode, isAuthenticated, fetchFollowingFeed]);

  // Synchronize feed real-time like count changes from other clients/tabs
  useFeedRealTime({
    onLikeUpdate: (payload) => {
      if (!payload || !payload.postId) return;
      const updateLikes = (prev) =>
        prev.map((p) => {
          if (p._id === payload.postId) {
            let updatedLikes = [...(p.likes || [])];
            if (payload.action === 'like') {
              if (
                payload.likedUserId &&
                !updatedLikes.some((id) => (id?._id || id).toString() === payload.likedUserId.toString())
              ) {
                updatedLikes.push(payload.likedUserId);
              }
            } else if (payload.action === 'unlike') {
              if (payload.likedUserId) {
                updatedLikes = updatedLikes.filter(
                  (id) => (id?._id || id).toString() !== payload.likedUserId.toString()
                );
              }
            }
            return { ...p, likes: updatedLikes };
          }
          return p;
        });

      setPosts(updateLikes);
      setFollowingPosts(updateLikes);
    }
  });

  // Create post handler
  const handleCreatePost = async (content) => {
    const res = await api.post('/posts', { content });
    if (res.data?.success && res.data?.post) {
      setPosts((prev) => [res.data.post, ...prev]);
      setFollowingPosts((prev) => [res.data.post, ...prev]);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setFollowingPosts((prev) => [newPost, ...prev]);
  };

  // Optimistic like / unlike toggle
  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    const currentUserId = user?._id || user?.id;
    const originalPosts = [...posts];
    const originalFollowingPosts = [...followingPosts];

    const updateLikeList = (prev) =>
      prev.map((p) => {
        if (p._id === postId) {
          const isLiked = p.likes?.some(
            (id) => (typeof id === 'string' ? id : id?._id || id) === currentUserId.toString()
          );
          const newLikes = isLiked
            ? p.likes.filter(
                (id) => (typeof id === 'string' ? id : id?._id || id) !== currentUserId.toString()
              )
            : [...(p.likes || []), currentUserId];

          return { ...p, likes: newLikes };
        }
        return p;
      });

    setPosts(updateLikeList);
    setFollowingPosts(updateLikeList);

    try {
      const currentPost =
        posts.find((p) => p._id === postId) || followingPosts.find((p) => p._id === postId);
      const isCurrentlyLiked = currentPost?.likes?.some(
        (id) => (typeof id === 'string' ? id : id?._id || id) === currentUserId.toString()
      );

      if (isCurrentlyLiked) {
        await api.delete(`/posts/${postId}/like`);
      } else {
        await api.put(`/posts/${postId}/like`);
      }
    } catch (err) {
      setPosts(originalPosts);
      setFollowingPosts(originalFollowingPosts);
    }
  };

  // Delete post handler
  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setFollowingPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      alert(err.message || 'Failed to delete post.');
    }
  };

  // Categories list
  const categories = ['All', 'Essays', 'Philosophy', 'Simplicity', 'Observations', 'Poetry'];

  // Trending themes tags
  const trendingThemes = [
    { tag: 'simplicity', count: 14 },
    { tag: 'reflections', count: 19 },
    { tag: 'observations', count: 12 },
    { tag: 'minimalism', count: 8 },
    { tag: 'enduringwords', count: 15 }
  ];

  // Featured Thinkers list (Editorial Spotlight)
  const featuredThinkers = [
    {
      handle: 'sophie',
      name: 'Sophie Bennett',
      role: 'Product Designer · Usability',
      avatar: '/sophie_bennett.jpg',
      followers: '312',
      isVerified: true
    },
    {
      handle: 'clara',
      name: 'Clara Oswald',
      role: 'Literary Essayist · Philosophy',
      avatar: '/uploads/b042b82bb54fe7e6aa3b1b06.jpg',
      followers: '840',
      isVerified: true
    },
    {
      handle: 'marcus',
      name: 'Marcus Sterling',
      role: 'Architectural Critic & Author',
      avatar: '/uploads/0d4c6ced40382e04a324a88b.png',
      followers: '624',
      isVerified: true
    },
    {
      handle: 'postify',
      name: 'Postify',
      role: 'Platform Owner & Haven Curator',
      avatar: '/postifylogo2.png',
      followers: '1.4k',
      isVerified: true
    }
  ];

  // Dynamic filter
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const content = (p.content || '').toLowerCase();
      const authorName = (p.user?.name || '').toLowerCase();
      const authorUsername = (p.user?.username || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      const matchesQuery =
        !query ||
        content.includes(query) ||
        authorName.includes(query) ||
        authorUsername.includes(query);

      if (!matchesQuery) return false;

      if (selectedCategory === 'All') return true;
      if (selectedCategory === 'Essays') return content.length > 160 || content.includes('essay');
      if (selectedCategory === 'Philosophy')
        return (
          content.includes('time') ||
          content.includes('truth') ||
          content.includes('quiet') ||
          content.includes('mind') ||
          content.includes('life')
        );
      if (selectedCategory === 'Simplicity')
        return (
          content.includes('simple') ||
          content.includes('words') ||
          content.includes('write') ||
          content.includes('design') ||
          content.includes('clarity')
        );
      if (selectedCategory === 'Observations')
        return (
          content.includes('notice') ||
          content.includes('see') ||
          content.includes('look') ||
          content.includes('quiet') ||
          content.includes('today')
        );
      if (selectedCategory === 'Poetry') return content.includes('\n') || content.length < 120;
      return true;
    });
  }, [posts, selectedCategory, searchQuery]);

  return (
    <Layout>
      <Helmet>
        <title>Discover Reflections &amp; Stories — Postify</title>
        <meta
          name="description"
          content="Explore authentic micro-essays, reflections, and community stories on Postify's twilight editorial network."
        />
        <meta property="og:title" content="Discover Reflections &amp; Stories — Postify" />
        <meta
          property="og:description"
          content="An intimate, editorial community platform for sharing thoughts and connecting with thoughtful creators."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="http://localhost:5173/feed" />
      </Helmet>

      {/* Atmospheric Twilight Hero Section */}
      <section className="twilight-hero pt-40 pb-28 sm:pt-48 sm:pb-36 text-center text-white relative overflow-hidden">
        <div className="portal-container max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-widest uppercase text-white/90 mb-6 sm:mb-8">
            <Sparkles size={16} className="text-amber-200" />
            <span>Discover Haven &amp; Reading Stream</span>
          </div>

          <h1 className="editorial-h1 text-[2.6rem] leading-[1.08] sm:text-6xl md:text-7xl tracking-tight text-white mb-6 sm:mb-8">
            Elevate Stories, <br className="hidden sm:inline" /> Empower Change.
          </h1>

          <p className="text-base sm:text-lg text-white/85 max-w-xl font-normal leading-relaxed mb-10 sm:mb-12">
            An intimate space where voices resonate, ideas take shape, and words spark meaningful connections.
          </p>

          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-3 w-full max-w-sm sm:max-w-none">
              <Link
                to="/register"
                className="w-full sm:w-auto px-9 sm:px-8 py-3.5 rounded-[50px] bg-white text-[#000000] font-semibold text-sm hover:bg-[#f7f7f7] transition-all shadow-lg active:scale-95 tracking-wide"
              >
                Join Postify Free
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-9 sm:px-8 py-3.5 rounded-[50px] bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-semibold text-sm transition-all border border-white/30 active:scale-95 tracking-wide"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Balanced Editorial Magazine Layout */}
      <section className="portal-container max-w-6xl mt-10 sm:mt-14 mb-28 sm:mb-36 relative z-10">
        {/* Interactive Category Filter Pills Bar & Search Bar */}
        <div className="mb-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-[var(--portal-card-border)]">
          {/* Topic Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#007aff] text-white shadow-xs'
                    : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)]'
                }`}
              >
                {cat} {cat === 'All' && `(${posts.length})`}
              </button>
            ))}
          </div>

          {/* Search Bar Input */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-subtle)]" />
            <input
              type="text"
              placeholder="Search reflections or @writer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-full bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-xs sm:text-sm text-[var(--portal-heading)] placeholder-[var(--portal-subtle)] focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/10 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--portal-subtle)] hover:text-[var(--portal-heading)] cursor-pointer"
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Split: Feed Stream + Editorial Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column (Main Feed Stream): lg:col-span-8 */}
          <div className="lg:col-span-8 space-y-8">
            {/* Editor's Pick / Featured Spotlight Story Banner */}
            <div className="portal-card p-6 sm:p-7 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/30 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/10 border border-blue-100/60 dark:border-blue-900/30 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-[var(--portal-card)]/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-[#007aff] border border-blue-100 dark:border-blue-900/50 shadow-2xs">
                  <Award size={13} className="text-amber-500" />
                  <span>Editor's Spotlight</span>
                </span>
                <span className="text-xs text-[var(--portal-meta)]">Curated Reflection</span>
              </div>

              <h3 className="editorial-h2 text-lg sm:text-xl text-[var(--portal-heading)] mb-2 leading-snug">
                "Writing clarifies our thoughts and preserves quiet observations before the noise takes over."
              </h3>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed mb-4">
                Explore unfiltered reflections from authentic voices across the Postify community.
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-blue-100/50 dark:border-blue-900/40 text-xs text-[var(--portal-meta)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-[var(--portal-heading)]">Live Community Stream</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-[var(--portal-heading)]">
                  <img src="/verification.png" alt="Verified" className="w-4 h-4 object-contain inline-block shrink-0" />
                  <span>Authentic Community Voices</span>
                </div>
              </div>
            </div>

            {/* Post Creation (if authenticated) */}
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="editorial-h2 text-xl text-[var(--portal-heading)]">Share a Reflection</h3>
                  <span className="text-xs text-[var(--portal-meta)]">Publish to the community stream</span>
                </div>
                <PostForm onSubmit={handleCreatePost} />
              </div>
            ) : (
              <div className="portal-card p-6 bg-[var(--portal-card)] border border-[var(--portal-card-border)] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div>
                  <h3 className="text-base font-semibold text-[var(--portal-heading)]">Have a thought to share?</h3>
                  <p className="text-xs text-[var(--portal-meta)] mt-0.5">
                    Join the Postify community to publish reflections, earn verified badges, and connect.
                  </p>
                </div>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-full bg-[#007aff] text-white text-xs font-semibold hover:bg-[#0069dc] transition-all shrink-0 shadow-2xs"
                >
                  Join Free
                </Link>
              </div>
            )}

            {/* Phase 4: Feed Mode Switcher (Discovery vs Following) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[var(--portal-card-border)]">
              <div className="inline-flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] w-fit">
                <button
                  type="button"
                  onClick={() => setFeedMode('discovery')}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    feedMode === 'discovery'
                      ? 'bg-[var(--portal-card)] text-[var(--portal-heading)] shadow-xs'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  <Compass size={15} className={feedMode === 'discovery' ? 'text-[#007aff]' : ''} />
                  <span>Discovery</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      window.location.href = '/login';
                      return;
                    }
                    setFeedMode('following');
                  }}
                  className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                    feedMode === 'following'
                      ? 'bg-[var(--portal-card)] text-[var(--portal-heading)] shadow-xs'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  <Users size={15} className={feedMode === 'following' ? 'text-[#007aff]' : ''} />
                  <span>Following Feed</span>
                </button>
              </div>

              <span className="text-xs text-[var(--portal-meta)] font-medium tracking-wide">
                {feedMode === 'discovery'
                  ? `${filteredPosts.length} ${filteredPosts.length === 1 ? 'story' : 'stories'} shown`
                  : `${followingPosts.length} ${followingPosts.length === 1 ? 'reflection' : 'reflections'} from network`}
              </span>
            </div>

            {/* Feed Stream Content */}
            {feedMode === 'discovery' ? (
              <PostFeed
                posts={filteredPosts}
                loading={loading}
                error={error}
                onLike={handleLike}
                onDelete={handleDeletePost}
                onPostCreated={handlePostCreated}
                currentUserId={user?._id || user?.id}
                onRetry={fetchPosts}
                emptyTitle="No reflections found"
                emptyDescription={
                  searchQuery
                    ? `No stories matched your search for "${searchQuery}". Try a different keyword.`
                    : 'Be the first to share a reflection in this category.'
                }
              />
            ) : (
              <div className="space-y-6">
                <PostFeed
                  posts={followingPosts}
                  loading={followingLoading}
                  error={followingError}
                  onLike={handleLike}
                  onDelete={handleDeletePost}
                  onPostCreated={handlePostCreated}
                  currentUserId={user?._id || user?.id}
                  onRetry={() => fetchFollowingFeed()}
                  emptyTitle="Your Following Feed is quiet"
                  emptyDescription="Follow thoughtful writers in Discovery to curate your personal stream of stories and reposts."
                />

                {followingHasMore && (
                  <div className="pt-4 flex justify-center">
                    <button
                      type="button"
                      disabled={followingLoadingMore}
                      onClick={() => fetchFollowingFeed(followingCursor, true)}
                      className="px-6 py-2.5 rounded-full bg-[var(--portal-card)] hover:bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-xs sm:text-sm font-semibold text-[#007aff] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {followingLoadingMore ? 'Loading older reflections...' : 'Load Older Reflections ↓'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Curated Editorial Sidebar): lg:col-span-4 sticky */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Widget 1: Featured Thinkers (Curated Authors with Verified Badges) */}
            <div className="portal-card p-6 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[var(--portal-card-border)]">
                <div className="flex items-center gap-2">
                  <Users size={17} className="text-[#007aff]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--portal-heading)]">
                    Featured Thinkers
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <img src="/verification.png" alt="Verified" className="w-4 h-4 object-contain inline-block shrink-0" />
                  <span className="text-[11px] font-semibold text-[#007aff]">Verified</span>
                </div>
              </div>

              <div className="space-y-4">
                {featuredThinkers.map((author) => {
                  const isFollowing = followingMap[author.handle];
                  return (
                    <div
                      key={author.handle}
                      className="flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={author.avatar}
                          alt={author.name}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--portal-card-border)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-semibold text-[var(--portal-heading)] truncate group-hover:text-[#007aff] transition-colors">
                              {author.name}
                            </span>
                            <VerificationBadge
                              user={{ username: author.handle, isVerified: true }}
                              size="sm"
                            />
                          </div>
                          <p className="text-[11px] text-[var(--portal-meta)] truncate">{author.role}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFollow(author.handle)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs active:scale-95 ${
                          isFollowing
                            ? 'bg-[#007aff] text-white hover:bg-[#0069dc]'
                            : 'bg-[var(--portal-canvas-secondary)] hover:bg-[var(--portal-card-border)] text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
                        }`}
                      >
                        {isFollowing ? 'Following ✓' : 'Follow +'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Widget 2: Postify Daily Writing Prompt */}
            <div className="portal-card p-6 bg-gradient-to-br from-[var(--portal-card)] to-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] shadow-xs">
              <div className="flex items-center gap-2 text-[#007aff] mb-2.5">
                <Feather size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Daily Prompt</span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--portal-heading)] leading-snug mb-2">
                "What is a quiet observation that stayed with you today?"
              </h4>
              <p className="text-xs text-[var(--portal-meta)] leading-relaxed mb-4">
                Draft a short observation in the composer. Writing gives shape to what we might otherwise miss.
              </p>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 400, behavior: 'smooth' })}
                  className="w-full py-2.5 px-4 rounded-full bg-[var(--portal-card)] hover:bg-[var(--portal-canvas-secondary)] text-xs font-semibold text-[#007aff] border border-[var(--portal-card-border)] transition-all text-center cursor-pointer shadow-2xs"
                >
                  Write a Reflection →
                </button>
              ) : (
                <Link
                  to="/register"
                  className="block w-full py-2.5 px-4 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-xs font-semibold text-white transition-all text-center shadow-2xs"
                >
                  Join to Reflect →
                </Link>
              )}
            </div>

            {/* Widget 3: Trending Themes */}
            <div className="portal-card p-6 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[var(--portal-card-border)]">
                <TrendingUp size={16} className="text-[#007aff]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--portal-heading)]">
                  Trending Themes
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingThemes.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => setSelectedCategory('Simplicity')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] hover:bg-[var(--portal-card)] text-xs font-medium text-[var(--portal-heading)] border border-[var(--portal-card-border)] transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="text-[#007aff]">#</span>
                    <span>{item.tag}</span>
                    <span className="text-[10px] text-[var(--portal-subtle)]">· {item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Widget 4: Community Integrity & Rules */}
            <div className="portal-card p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/15 border border-blue-100/60 dark:border-blue-900/30 shadow-2xs text-xs text-[var(--portal-meta)] space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-[var(--portal-heading)]">
                <img src="/verification.png" alt="Verified" className="w-4 h-4 object-contain inline-block shrink-0" />
                <span>Postify Community Standard</span>
              </div>
              <p className="leading-relaxed">
                Chronological feed curated by real human voices. Platform verification honors distinguished community authors and contributors.
              </p>
              <div className="pt-2 border-t border-[var(--portal-card-border)] flex items-center justify-between text-[11px] text-[#007aff] font-semibold">
                <span>Algorithmic-Free Stream</span>
                <span>Verified Authors</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  );
};
