import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, Check, Bookmark } from 'lucide-react';
import {
  getCollections,
  createCollection,
  updateBookmarkCollection,
  bookmarkPost
} from '../../services/bookmarkService';

export const SaveToCollectionModal = ({
  isOpen,
  onClose,
  postId,
  currentCollectionId = null,
  onUpdated
}) => {
  const [collections, setCollections] = useState([]);
  const [selectedId, setSelectedId] = useState(currentCollectionId || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [error, setError] = useState(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      setSelectedId(currentCollectionId || null);
      setError(null);
      setShowCreateNew(false);
      setNewCollName('');

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);

      const fetchColls = async () => {
        try {
          setLoading(true);
          const res = await getCollections();
          if (res.success) {
            setCollections(res.collections || []);
          }
        } catch (err) {
          setError('Failed to load collections.');
        } finally {
          setLoading(false);
        }
      };

      fetchColls();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedRef.current?.focus) {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen, currentCollectionId, onClose]);

  if (!isOpen) return null;

  const handleCreateInline = async (e) => {
    e.preventDefault();
    if (!newCollName.trim()) return;

    try {
      setSaving(true);
      setError(null);
      const res = await createCollection({ name: newCollName.trim() });
      if (res.success) {
        setCollections((prev) => [res.collection, ...prev]);
        setSelectedId(res.collection._id);
        setShowCreateNew(false);
        setNewCollName('');
      }
    } catch (err) {
      setError(err.message || 'Failed to create collection.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Ensure post is bookmarked with the chosen collection
      const res = await bookmarkPost(postId, selectedId);
      if (res.success) {
        if (onUpdated) onUpdated(selectedId);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to update saved collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-collection-title"
    >
      <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--portal-card-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
              <Bookmark size={18} />
            </div>
            <div>
              <h2 id="save-collection-title" className="editorial-h2 text-lg font-semibold text-[var(--portal-heading)]">
                Save to Collection
              </h2>
              <p className="text-[11px] text-[var(--portal-meta)]">
                Organize your bookmarked technical posts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
              {error}
            </div>
          )}

          {/* All Saved Option */}
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
              selectedId === null
                ? 'bg-[#007aff]/10 border-[#007aff] text-[var(--portal-heading)]'
                : 'bg-[var(--portal-card)] border-[var(--portal-card-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--portal-heading)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--portal-meta)]">
                <Bookmark size={15} />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold">General Saved Items</span>
                <p className="text-[11px] text-[var(--portal-meta)]">Not in any specific collection</p>
              </div>
            </div>
            {selectedId === null && <Check size={16} className="text-[#007aff]" />}
          </button>

          {/* Collection Options */}
          {collections.map((coll) => {
            const isSelected = selectedId === coll._id;
            return (
              <button
                key={coll._id}
                type="button"
                onClick={() => setSelectedId(coll._id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#007aff]/10 border-[#007aff] text-[var(--portal-heading)]'
                    : 'bg-[var(--portal-card)] border-[var(--portal-card-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--portal-heading)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
                    <Folder size={15} />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-semibold">{coll.name}</span>
                    {coll.description && (
                      <p className="text-[11px] text-[var(--portal-meta)] line-clamp-1">
                        {coll.description}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-[#007aff]" />}
              </button>
            );
          })}

          {/* Inline Create New Collection Form */}
          {showCreateNew ? (
            <form onSubmit={handleCreateInline} className="p-3.5 rounded-2xl border border-[#007aff]/30 bg-[#007aff]/5 space-y-2.5">
              <label className="block text-xs font-semibold text-[var(--portal-heading)]">
                Create & Select Collection
              </label>
              <input
                type="text"
                value={newCollName}
                onChange={(e) => setNewCollName(e.target.value)}
                placeholder="Collection name (e.g. System Design)"
                maxLength={60}
                autoFocus
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNew(false)}
                  className="px-3 py-1.5 text-xs text-[var(--portal-meta)] hover:text-[var(--portal-heading)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newCollName.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-[#007aff] text-white rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[var(--portal-card-border)] text-xs text-[#007aff] hover:bg-[#007aff]/5 transition-colors cursor-pointer"
            >
              <FolderPlus size={15} />
              <span>Create New Collection</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[var(--portal-card-border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0062cc] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={14} />
                <span>Save to Collection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
