import React, { useState, useEffect, useCallback } from 'react';
import {
  Bookmark,
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  Plus,
  Layers,
  Sparkles
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import PostCard from '../components/posts/PostCard';
import { LoadingSkeleton, EmptyState, ConfirmationDialog } from '../components/common/Feedback';
import { CollectionModal } from '../components/saved/CollectionModal';
import {
  getBookmarks,
  getCollections,
  deleteCollection,
  unbookmarkPost
} from '../services/bookmarkService';
import { useAuth } from '../context/AuthContext';

export const SavedPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all' or collectionId
  const [collections, setCollections] = useState([]);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collToDelete, setCollToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch collections
  const fetchCollectionsData = useCallback(async () => {
    try {
      setCollectionsLoading(true);
      const res = await getCollections();
      if (res.success) {
        setCollections(res.collections || []);
        setTotalBookmarks(res.totalBookmarks || 0);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  // Fetch bookmarks
  const fetchBookmarksData = useCallback(
    async ({ cursor = null, refresh = false } = {}) => {
      try {
        setLoading(true);
        const params = {
          limit: 20
        };
        if (cursor) params.cursor = cursor;
        if (activeTab !== 'all') params.collectionId = activeTab;

        const res = await getBookmarks(params);
        if (res.success) {
          const list = res.bookmarks || [];
          setBookmarks((prev) => (refresh || !cursor ? list : [...prev, ...list]));
          setHasMore(Boolean(res.pagination?.hasMore));
          setNextCursor(res.pagination?.nextCursor || null);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchCollectionsData();
  }, [fetchCollectionsData]);

  useEffect(() => {
    fetchBookmarksData({ refresh: true });
  }, [fetchBookmarksData]);

  const activeCollection = collections.find((c) => c._id === activeTab);

  const handleCollectionSaved = (updatedCol) => {
    fetchCollectionsData();
    if (editingCollection && updatedCol) {
      setCollections((prev) =>
        prev.map((c) => (c._id === updatedCol._id ? { ...c, ...updatedCol } : c))
      );
    }
    setEditingCollection(null);
  };

  const handleDeleteCollectionConfirm = async () => {
    if (!collToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await deleteCollection(collToDelete._id);
      if (res.success) {
        setActiveTab('all');
        fetchCollectionsData();
        fetchBookmarksData({ refresh: true });
        setShowDeleteConfirm(false);
        setCollToDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete collection:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUnbookmark = async (postId) => {
    try {
      await unbookmarkPost(postId);
      setBookmarks((prev) => prev.filter((b) => b.post._id !== postId));
      fetchCollectionsData();
    } catch (err) {
      console.error('Failed to unbookmark:', err);
    }
  };

  // Filter bookmarks locally by search keyword
  const filteredBookmarks = bookmarks.filter((bm) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const content = bm.post?.content?.toLowerCase() || '';
    const author = bm.post?.user?.name?.toLowerCase() || bm.post?.user?.username?.toLowerCase() || '';
    const tags = Array.isArray(bm.post?.tags) ? bm.post.tags.join(' ').toLowerCase() : '';
    return content.includes(q) || author.includes(q) || tags.includes(q);
  });

  return (
    <Layout>
      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-[var(--portal-card-border)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
              <Bookmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="editorial-h2 text-2xl sm:text-3xl font-semibold text-[var(--portal-heading)]">
                  Saved Library
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#007aff]/10 text-[#007aff]">
                  Private
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)] mt-0.5">
                Curate and organize your technical references, snippets, and guides
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="new-collection-button"
            onClick={() => {
              setEditingCollection(null);
              setShowCollectionModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0062cc] transition-all cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <FolderPlus size={15} />
            <span>New Collection</span>
          </button>
        </div>

        {/* Collections Tabs Bar */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#007aff] text-white shadow-xs font-semibold'
                : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
            }`}
          >
            <Layers size={13} />
            <span>All Bookmarks</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-black/5 dark:bg-white/10 text-[var(--portal-meta)]'
              }`}
            >
              {totalBookmarks}
            </span>
          </button>

          {collections.map((coll) => {
            const isActive = activeTab === coll._id;
            return (
              <button
                key={coll._id}
                type="button"
                onClick={() => setActiveTab(coll._id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#007aff] text-white shadow-xs font-semibold'
                    : 'bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)]'
                }`}
              >
                <Folder size={13} />
                <span>{coll.name}</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 dark:bg-white/10 text-[var(--portal-meta)]'
                  }`}
                >
                  {coll.bookmarkCount || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Collection Header (if viewing a custom collection) */}
        {activeCollection && (
          <div className="mb-6 p-5 sm:p-6 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Folder size={18} className="text-[#007aff]" />
                <h2 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)]">
                  {activeCollection.name}
                </h2>
              </div>
              {activeCollection.description && (
                <p className="mt-1 text-xs sm:text-sm text-[var(--portal-meta)]">
                  {activeCollection.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="edit-collection-button"
                onClick={() => {
                  setEditingCollection(activeCollection);
                  setShowCollectionModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Edit2 size={13} />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollToDelete(activeCollection);
                  setShowDeleteConfirm(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Search within saved items */}
        {bookmarks.length > 0 && (
          <div className="mb-6 relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter saved items by keywords or tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs sm:text-sm bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-meta)] focus:outline-none focus:border-[#007aff] transition-colors"
            />
          </div>
        )}

        {/* Content list */}
        {loading && bookmarks.length === 0 ? (
          <div className="space-y-4">
            <LoadingSkeleton count={3} />
          </div>
        ) : filteredBookmarks.length > 0 ? (
          <div className="space-y-5">
            {filteredBookmarks.map((bm) => (
              <div key={bm._id} className="relative group">
                <PostCard
                  post={{
                    ...bm.post,
                    isBookmarked: true
                  }}
                  onLike={() => {}}
                  currentUserId={user?._id}
                />
                {bm.collection && (
                  <div className="absolute top-4 right-14 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 pointer-events-none">
                    <Folder size={11} />
                    <span>{bm.collection.name}</span>
                  </div>
                )}
              </div>
            ))}

            {hasMore && (
              <div className="text-center pt-6">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fetchBookmarksData({ cursor: nextCursor })}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:border-[#007aff] transition-colors cursor-pointer"
                >
                  {loading ? 'Loading more...' : 'Load more saved posts'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
            <div className="w-16 h-16 rounded-2xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff] mx-auto mb-4">
              <Bookmark size={30} />
            </div>
            <h3 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)] mb-2">
              {activeCollection ? 'No posts in this collection yet' : 'No saved posts yet'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto mb-6">
              {activeCollection
                ? 'Save technical posts from your home feed and select this collection to organize your reference materials.'
                : 'When you discover interesting code snippets, architecture breakdowns, or discussions, click the Bookmark icon to save them here.'}
            </p>
          </div>
        )}

        {/* Create / Edit Collection Modal */}
        <CollectionModal
          isOpen={showCollectionModal}
          onClose={() => {
            setShowCollectionModal(false);
            setEditingCollection(null);
          }}
          collection={editingCollection}
          onSaved={handleCollectionSaved}
        />

        {/* Delete Collection Confirmation */}
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Collection"
          message={`Are you sure you want to delete the collection "${collToDelete?.name}"? All saved posts in this collection will be preserved and safely returned to your general Saved view.`}
          confirmText="Delete Collection"
          loading={deleteLoading}
          onConfirm={handleDeleteCollectionConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCollToDelete(null);
          }}
        />
      </PageContainer>
    </Layout>
  );
};

export default SavedPage;
