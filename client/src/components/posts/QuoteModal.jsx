import React, { useState } from 'react';
import { Button } from '../common/Button';
import { MarkdownContent } from '../common/MarkdownContent';
import { QuotedPostCard } from './QuotedPostCard';
import { X, Edit3, Eye, Quote } from 'lucide-react';
import api from '../../services/api';

export const QuoteModal = ({ isOpen, onClose, postToQuote, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [tab, setTab] = useState('write');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const previouslyFocusedRef = React.useRef(null);

  React.useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
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
  }, [isOpen, onClose]);

  if (!isOpen || !postToQuote) return null;

  const maxLength = 2500;
  const charsLeft = maxLength - content.length;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim()) {
      setError('Please add your thoughts before quoting.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/posts', {
        content: content.trim(),
        quotedPost: postToQuote._id
      });

      if (res.data?.success && res.data?.post) {
        if (onPostCreated) onPostCreated(res.data.post);
        setContent('');
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to publish quote-post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
    >
      <div
        className="portal-card w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[var(--portal-card)] border border-[var(--portal-card-border)] p-6 sm:p-7 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--portal-card-border)]">
          <div className="flex items-center gap-2 text-[var(--portal-heading)]">
            <Quote size={18} className="text-[#007aff]" />
            <h2 id="quote-modal-title" className="text-base sm:text-lg font-bold">
              Quote Story
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            aria-label="Close quote modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-xs font-medium self-start">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              tab === 'write'
                ? 'bg-[var(--portal-card)] text-[var(--portal-heading)] shadow-xs'
                : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
            }`}
          >
            <Edit3 size={13} />
            <span>Commentary</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
              tab === 'preview'
                ? 'bg-[var(--portal-card)] text-[var(--portal-heading)] shadow-xs'
                : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
            }`}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>

        {/* Commentary Editor / Preview */}
        {tab === 'write' ? (
          <div>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={maxLength}
              placeholder="Add your reflections, perspective, or critique on this story (Markdown supported)..."
              className="w-full bg-transparent text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] outline-none resize-none text-sm sm:text-base leading-relaxed font-sans p-2 border border-[var(--portal-card-border)] rounded-xl focus:border-[#007aff] transition-colors"
              autoFocus
            />
          </div>
        ) : (
          <div className="min-h-[96px] p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)] overflow-hidden">
            {content.trim() ? (
              <MarkdownContent content={content} />
            ) : (
              <p className="text-xs text-[var(--portal-subtle)] italic py-4 text-center">
                Type your reflection in Commentary mode to preview it here.
              </p>
            )}
          </div>
        )}

        {/* Quoted Story Embed Preview */}
        <div className="pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--portal-meta)]">
            Referencing:
          </span>
          <QuotedPostCard quotedPost={postToQuote} compact={true} />
        </div>

        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--portal-card-border)]">
          <span
            className={`text-xs ${
              charsLeft < 100 ? 'text-amber-500 font-semibold' : 'text-[var(--portal-meta)]'
            }`}
          >
            {charsLeft} chars remaining
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              disabled={!content.trim() || loading}
              onClick={handleSubmit}
            >
              Publish Quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
