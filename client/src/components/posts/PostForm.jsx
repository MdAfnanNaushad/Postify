import React, { useState, useRef } from 'react';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { MarkdownContent } from '../common/MarkdownContent';
import { useAuth } from '../../context/AuthContext';
import {
  Bold,
  Italic,
  Heading,
  Code,
  FileCode,
  List,
  Link as LinkIcon,
  Eye,
  Edit3
} from 'lucide-react';

export const PostForm = ({
  onSubmit,
  initialContent = '',
  isEditing = false,
  onCancel,
  buttonText
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [tab, setTab] = useState('write'); // 'write' | 'preview'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const maxLength = 2500;
  const charsLeft = maxLength - content.length;

  const insertSnippet = (prefix, suffix = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newText = `${before}${prefix}${selectedText}${suffix}${after}`;
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(start + prefix.length, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please write something before posting.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(content.trim());
      if (!isEditing) {
        setContent('');
        setTab('write');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-card p-5 sm:p-7 bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
      <div className="flex gap-4 items-start">
        {!isEditing && (
          <Avatar
            src={user?.Profilepic || user?.profilePic}
            username={user?.username}
            size="md"
            className="ring-2 ring-black/5 dark:ring-white/10 shrink-0 hidden sm:block mt-1"
          />
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-w-0">
          {/* Header Bar with Write / Preview Tabs & Markdown Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--portal-card-border)]">
            {/* Mode Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-xs font-medium">
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
                <span>Write</span>
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

            {/* Markdown Quick Formatting Toolbar (Enabled in Write Mode) */}
            {tab === 'write' && (
              <div className="flex items-center gap-1 text-[var(--portal-meta)]">
                <button
                  type="button"
                  onClick={() => insertSnippet('**', '**', 'bold')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Bold (**text**)"
                  aria-label="Bold"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('*', '*', 'italic')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Italic (*text*)"
                  aria-label="Italic"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('### ', '', 'Heading')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Heading (### text)"
                  aria-label="Heading"
                >
                  <Heading size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('`', '`', 'code')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Inline code (`code`)"
                  aria-label="Inline code"
                >
                  <Code size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('```javascript\n', '\n```', '// Your code here')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Fenced code block"
                  aria-label="Code block"
                >
                  <FileCode size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('- ', '', 'List item')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="List (- item)"
                  aria-label="List"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('[', '](https://example.com)', 'link text')}
                  className="p-1.5 rounded-lg hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Link [text](url)"
                  aria-label="Link"
                >
                  <LinkIcon size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Editor Body: Write Mode vs Preview Mode */}
          {tab === 'write' ? (
            <div>
              <label htmlFor="post-textarea" className="sr-only">
                {isEditing ? 'Edit your post' : 'Share your story or technical reflection'}
              </label>
              <textarea
                ref={textareaRef}
                id="post-textarea"
                rows={isEditing ? 6 : 4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={maxLength}
                placeholder={
                  isEditing
                    ? 'Update your story or code notes...'
                    : 'Publish an insight, architecture note, debugging lesson, or code snippet (Markdown supported)...'
                }
                className="w-full bg-transparent text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] outline-none resize-none text-sm sm:text-base leading-relaxed p-1 font-sans focus:ring-0"
              />
            </div>
          ) : (
            <div className="min-h-[120px] p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)] overflow-hidden">
              {content.trim() ? (
                <MarkdownContent content={content} />
              ) : (
                <p className="text-xs text-[var(--portal-subtle)] italic py-6 text-center">
                  Nothing to preview yet. Switch back to Write mode to compose your post.
                </p>
              )}
            </div>
          )}

          {error && <span className="text-xs text-red-500 my-1">{error}</span>}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--portal-card-border)] mt-3">
            <div className="flex items-center gap-3 text-xs text-[var(--portal-meta)]">
              <span
                className={`${
                  charsLeft < 100 ? 'text-amber-500 font-semibold' : 'text-[var(--portal-meta)]'
                }`}
              >
                {charsLeft} chars remaining
              </span>
              <span className="hidden sm:inline text-black/20 dark:text-white/20">|</span>
              <span className="hidden sm:inline text-[11px] text-[var(--portal-subtle)]">
                Ctrl+Enter to publish
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isEditing && onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={loading}
                disabled={!content.trim() || loading}
              >
                {buttonText || (isEditing ? 'Save Changes' : 'Publish Story')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostForm;
