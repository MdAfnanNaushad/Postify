import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Check, Tag, Pin, AlertCircle, Eye, Edit3, Sparkles } from 'lucide-react';
import { createBuildLog, updateBuildLog } from '../../services/projectService';
import { MarkdownContent } from '../common/MarkdownContent';

const ENTRY_TYPE_OPTIONS = [
  { value: 'milestone', label: 'Milestone', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  { value: 'feature', label: 'Feature', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'fix', label: 'Fix / Bug', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { value: 'refactor', label: 'Refactor', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { value: 'research', label: 'Research', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'release', label: 'Release', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { value: 'note', label: 'Engineering Note', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' }
];

export const BuildLogModal = ({ isOpen, onClose, projectIdOrSlug, log = null, onSaved }) => {
  const [title, setTitle] = useState('');
  const [entryType, setEntryType] = useState('feature');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      if (log) {
        setTitle(log.title || '');
        setEntryType(log.entryType || 'feature');
        setContent(log.content || '');
        setTagsInput(Array.isArray(log.tags) ? log.tags.join(', ') : '');
        setIsPinned(Boolean(log.isPinned));
      } else {
        setTitle('');
        setEntryType('feature');
        setContent('');
        setTagsInput('');
        setIsPinned(false);
      }
      setActiveTab('write');
      setError(null);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedRef.current?.focus) {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen, log, onClose]);

  if (!isOpen) return null;

  const isEditing = Boolean(log && log._id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Entry title is required.');
      return;
    }
    if (trimmedTitle.length > 150) {
      setError('Title cannot exceed 150 characters.');
      return;
    }
    if (!trimmedContent) {
      setError('Log content is required.');
      return;
    }
    if (trimmedContent.length > 15000) {
      setError('Content cannot exceed 15,000 characters.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload = {
      title: trimmedTitle,
      entryType,
      content: trimmedContent,
      tags,
      isPinned
    };

    try {
      setLoading(true);
      setError(null);
      let res;
      if (isEditing) {
        res = await updateBuildLog(projectIdOrSlug, log._id, payload);
      } else {
        res = await createBuildLog(projectIdOrSlug, payload);
      }

      if (res.success) {
        if (onSaved) onSaved(res.log);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save build log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-log-modal-title"
    >
      <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--portal-card-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 id="build-log-modal-title" className="editorial-h2 text-lg font-semibold text-[var(--portal-heading)]">
                {isEditing ? 'Edit Build Log' : 'New Build Log Entry'}
              </h2>
              <p className="text-[11px] text-[var(--portal-meta)]">
                Publish chronological engineering progress, architecture changes, and lessons
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Entry Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implemented Raft Consensus & Log Compaction"
              maxLength={150}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {title.length}/150
            </p>
          </div>

          {/* Entry Type & Pinned */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
                Entry Category / Milestone
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors cursor-pointer capitalize"
              >
                {ENTRY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center h-[42px] px-3.5 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)]">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--portal-heading)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-[#007aff] focus:ring-[#007aff] focus:ring-offset-0 cursor-pointer"
                />
                <Pin size={14} className={isPinned ? 'text-[#007aff]' : 'text-[var(--portal-meta)]'} />
                <span>Pin this entry to top of journal</span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Tags <span className="text-[var(--portal-meta)] font-normal">(comma-separated)</span>
            </label>
            <div className="relative">
              <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)]" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. database, benchmarking, memory-leak, raft"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              />
            </div>
          </div>

          {/* Content with Write / Preview Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--portal-heading)]">
                Journal Content <span className="text-red-500">*</span> <span className="text-[var(--portal-meta)] font-normal">(Markdown & Code blocks supported)</span>
              </label>
              <div className="flex items-center rounded-lg bg-black/5 dark:bg-white/5 p-0.5 border border-[var(--portal-card-border)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTab === 'write'
                      ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs font-semibold'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  <Edit3 size={12} />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs font-semibold'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="### Problem Statement&#10;Describe the challenge encountered...&#10;&#10;```go&#10;// code example&#10;```&#10;&#10;### Resolution & Benchmarks&#10;Document measured improvements and future iterations..."
                  rows={8}
                  maxLength={15000}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors font-mono resize-y"
                  required
                />
                <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
                  {content.length}/15000
                </p>
              </>
            ) : (
              <div className="p-4 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] min-h-[190px] max-h-[350px] overflow-y-auto">
                {content.trim() ? (
                  <MarkdownContent content={content} />
                ) : (
                  <p className="text-xs text-[var(--portal-meta)] italic">
                    Nothing to preview. Write some Markdown above.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--portal-card-border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0062cc] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {loading ? (
                <span>Publishing...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>{isEditing ? 'Save Changes' : 'Publish Entry'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BuildLogModal;
