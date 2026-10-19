import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { PostCard } from '../components/posts/PostCard';
import { useAuth } from '../context/AuthContext';
import { VerificationBadge } from '../components/common/VerificationBadge';
import {
  Search,
  X,
  Users,
  FileText,
  Hash,
  Sparkles,
  ArrowRight,
  UserPlus,
  UserCheck,
  Code2,
  MapPin,
  FolderGit2,
  BookOpen,
  Globe
} from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialType);
  const [results, setResults] = useState({ people: [], posts: [], topics: [], projects: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});
  const { user, isAuthenticated } = useAuth();

  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const performSearch = useCallback(async (searchQuery, searchType) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ people: [], posts: [], topics: [], projects: [], total: 0 });
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await api.get(
        `/search?q=${encodeURIComponent(trimmed)}&type=${searchType}&limit=20`,
        { signal: abortControllerRef.current.signal }
      );
      if (res.data?.success) {
        setResults({
          people: res.data.people || [],
          posts: res.data.posts || [],
          topics: res.data.topics || [],
          projects: res.data.projects || [],
          total: res.data.pagination?.total || 0
        });
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.error('Search request failed:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced input effect
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, activeTab);
      // Update URL query params without reloading
      const params = {};
      if (query.trim()) params.q = query.trim();
      if (activeTab !== 'all') params.type = activeTab;
      setSearchParams(params, { replace: true });
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, activeTab, performSearch, setSearchParams]);

  const handleFollowToggle = async (targetUserId) => {
    if (!isAuthenticated) return;
    const isCurrentlyFollowing = followingMap[targetUserId];
    try {
      if (isCurrentlyFollowing) {
        await api.delete(`/users/${targetUserId}/follow`);
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: false }));
      } else {
        await api.post(`/users/${targetUserId}/follow`);
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: true }));
      }
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults({ people: [], posts: [], topics: [], projects: [], total: 0 });
    setSearchParams({}, { replace: true });
  };

  return (
    <Layout>
      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl mx-auto">
        <h1 className="sr-only">Search Developers, Projects, and Stories</h1>
        {/* Search Input Bar */}
        <div className="relative mb-6">
          <div className="relative flex items-center">
            <Search
              size={20}
              className="absolute left-4.5 text-[var(--portal-meta)] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search developers, technologies, topics, projects, or build logs"
              placeholder="Search developers, technologies, topics, projects, or build logs..."
              className="w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-sm sm:text-base text-[var(--portal-heading)] placeholder:text-[var(--portal-meta)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50 focus:border-[#007aff] transition-all shadow-xs"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 p-1 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Results', icon: Sparkles },
            { id: 'projects', label: `Projects (${results.projects.length})`, icon: FolderGit2 },
            { id: 'people', label: `People (${results.people.length})`, icon: Users },
            { id: 'posts', label: `Posts (${results.posts.length})`, icon: FileText },
            { id: 'topics', label: `Topics (${results.topics.length})`, icon: Hash }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#007aff] text-white shadow-xs'
                    : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#007aff]/30 border-t-[#007aff] animate-spin" />
            <span className="text-xs text-[var(--portal-meta)] font-medium">Searching Postify...</span>
          </div>
        )}

        {/* Results Body */}
        {!loading && query.trim() && (
          <div className="space-y-8">
            {/* 1. Topics Section (if 'all' or 'topics') */}
            {(activeTab === 'all' || activeTab === 'topics') && results.topics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--portal-card-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--portal-meta)] flex items-center gap-1.5">
                    <Hash size={14} className="text-[#007aff]" />
                    Topics & Hashtags
                  </span>
                  {activeTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('topics')}
                      className="text-xs font-medium text-[#007aff] hover:underline"
                    >
                      View all topics
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {results.topics.map((t) => (
                    <Link
                      key={t.tag}
                      to={`/topics/${t.tag}`}
                      className="portal-card p-4 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-mono text-sm font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors">
                          #{t.tag}
                        </span>
                        <span className="block text-[11px] text-[var(--portal-meta)]">
                          {t.count} {t.count === 1 ? 'publication' : 'publications'}
                        </span>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-[var(--portal-meta)] group-hover:text-[#007aff] group-hover:translate-x-1 transition-all"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 1.5 Projects Section (if 'all' or 'projects') */}
            {(activeTab === 'all' || activeTab === 'projects') && results.projects?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--portal-card-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--portal-meta)] flex items-center gap-1.5">
                    <FolderGit2 size={14} className="text-[#007aff]" />
                    Engineering Projects & Journals
                  </span>
                  {activeTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className="text-xs font-medium text-[#007aff] hover:underline"
                    >
                      View all projects
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {results.projects.map((project) => (
                    <Link
                      key={project._id}
                      to={`/projects/${project.slug || project._id}`}
                      className="portal-card p-4 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 transition-all flex flex-col justify-between group shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-semibold text-sm text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors truncate">
                            {project.name}
                          </span>
                          {project.buildLogCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 shrink-0">
                              <BookOpen size={10} />
                              <span>{project.buildLogCount} logs</span>
                            </span>
                          )}
                        </div>
                        {project.shortDescription && (
                          <p className="text-xs text-[var(--portal-meta)] line-clamp-2 mb-3 leading-relaxed">
                            {project.shortDescription}
                          </p>
                        )}
                      </div>

                      {project.techStack && project.techStack.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-[var(--portal-card-border)]">
                          {project.techStack.slice(0, 4).map((tech, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--portal-meta)] border border-black/5 dark:border-white/5"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. People Section (if 'all' or 'people') */}
            {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--portal-card-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--portal-meta)] flex items-center gap-1.5">
                    <Users size={14} className="text-purple-500" />
                    Developers & Authors
                  </span>
                  {activeTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('people')}
                      className="text-xs font-medium text-[#007aff] hover:underline"
                    >
                      View all people
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {results.people.map((p) => {
                    const isSelf = user && (user._id === p._id || user.id === p._id);
                    const isFollowing = followingMap[p._id];

                    return (
                      <div
                        key={p._id}
                        className="portal-card p-4.5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-black/15 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <Link to={`/user/${p._id}`} className="flex items-center gap-3 group">
                              <Avatar
                                src={p.Profilepic}
                                username={p.username}
                                size="md"
                              />
                              <div>
                                <div className="flex items-center gap-1 font-semibold text-sm text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors">
                                  <span>{p.name || p.username}</span>
                                  {p.isVerified && <VerificationBadge />}
                                </div>
                                <span className="text-xs text-[var(--portal-meta)]">
                                  @{p.username}
                                </span>
                              </div>
                            </Link>

                            {!isSelf && isAuthenticated && (
                              <button
                                type="button"
                                onClick={() => handleFollowToggle(p._id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                                  isFollowing
                                    ? 'bg-black/5 dark:bg-white/10 text-[var(--portal-heading)] hover:bg-red-50 hover:text-red-500'
                                    : 'bg-[#007aff] text-white hover:bg-[#0069dc] shadow-2xs'
                                }`}
                              >
                                {isFollowing ? (
                                  <>
                                    <UserCheck size={12} />
                                    <span>Following</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={12} />
                                    <span>Follow</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {p.bio && (
                            <p className="text-xs text-[var(--portal-text)] line-clamp-2 mb-2 leading-relaxed">
                              {p.bio}
                            </p>
                          )}
                        </div>

                        {p.techStack && p.techStack.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--portal-card-border)]">
                            {p.techStack.slice(0, 4).map((tech, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--portal-meta)] border border-black/5 dark:border-white/5"
                              >
                                {tech}
                              </span>
                            ))}
                            {p.techStack.length > 4 && (
                              <span className="text-[10px] text-[var(--portal-meta)] font-mono">
                                +{p.techStack.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Posts Section (if 'all' or 'posts') */}
            {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--portal-card-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--portal-meta)] flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-500" />
                    Publications & Discussions
                  </span>
                  {activeTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('posts')}
                      className="text-xs font-medium text-[#007aff] hover:underline"
                    >
                      View all posts
                    </button>
                  )}
                </div>
                <div className="space-y-3.5">
                  {results.posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      currentUserId={user?._id || user?.id}
                      onLike={async (postId, currentlyLiked) => {
                        if (currentlyLiked) {
                          await api.delete(`/posts/${postId}/like`);
                        } else {
                          await api.put(`/posts/${postId}/like`);
                        }
                      }}
                      onDelete={async (postId) => {
                        await api.delete(`/posts/${postId}`);
                        setResults((prev) => ({
                          ...prev,
                          posts: prev.posts.filter((p) => p._id !== postId)
                        }));
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty result set for query */}
            {results.people.length === 0 &&
              results.posts.length === 0 &&
              results.topics.length === 0 &&
              results.projects.length === 0 && (
                <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
                  <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-[var(--portal-meta)]">
                    <Search size={22} className="text-[var(--portal-meta)]" />
                  </div>
                  <h3 className="editorial-h2 text-xl font-medium text-[var(--portal-heading)] mb-1">
                    No results for "{query}"
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto">
                    Try searching for different keywords, a developer username, or explore popular topics like #React, #Node, or #Docker.
                  </p>
                  <Link
                    to="/topics"
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-sm"
                  >
                    Browse All Topics
                  </Link>
                </div>
              )}
          </div>
        )}

        {/* Fresh Search State (no query entered yet) */}
        {!loading && !query.trim() && (
          <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
            <div className="w-14 h-14 rounded-full bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center mx-auto mb-3 text-[#007aff]">
              <Sparkles size={24} />
            </div>
            <h3 className="editorial-h2 text-xl font-medium text-[var(--portal-heading)] mb-1">
              Search Postify
            </h3>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto mb-6">
              Find software engineers by technology stack, explore published articles, or discover topics.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-[var(--portal-meta)]">Try searching:</span>
              {['React', 'Go', 'Docker', 'TypeScript', 'Kubernetes'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setQuery(sample)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-[#007aff]/10 hover:text-[#007aff] text-[var(--portal-heading)] border border-[var(--portal-card-border)] transition-colors cursor-pointer"
                >
                  #{sample}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
};

export default SearchPage;
