import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, Check } from 'lucide-react';
import { createCollection, updateCollection } from '../../services/bookmarkService';

export const CollectionModal = ({ isOpen, onClose, collection = null, onSaved }) => {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(collection?.name || '');
      setDescription(collection?.description || '');
      setError(null);
    }
  }, [isOpen, collection]);

  if (!isOpen) return null;

  const isEditing = Boolean(collection && collection._id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Collection name is required.');
      return;
    }
    if (trimmedName.length > 60) {
      setError('Collection name cannot exceed 60 characters.');
      return;
    }
    if (description.trim().length > 300) {
      setError('Description cannot exceed 300 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let res;
      if (isEditing) {
        res = await updateCollection(collection._id, {
          name: trimmedName,
          description: description.trim()
        });
      } else {
        res = await createCollection({
          name: trimmedName,
          description: description.trim()
        });
      }

      if (res.success) {
        if (onSaved) onSaved(res.collection);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save collection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--portal-card-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
              {isEditing ? <Folder size={18} /> : <FolderPlus size={18} />}
            </div>
            <h2 className="editorial-h2 text-lg font-semibold text-[var(--portal-heading)]">
              {isEditing ? 'Edit Collection' : 'New Collection'}
            </h2>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Collection Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spring Boot Guides, Architecture Notes"
              maxLength={60}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {name.length}/60
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Description <span className="text-[var(--portal-meta)] font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of resources saved in this collection"
              rows={3}
              maxLength={300}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors resize-none"
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {description.length}/300
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--portal-card-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0062cc] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>{isEditing ? 'Save Changes' : 'Create Collection'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
