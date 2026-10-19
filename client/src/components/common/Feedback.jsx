import React, { useEffect, useRef } from 'react';

export const LoadingSkeleton = ({ type = 'post', count = 3 }) => {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="portal-card p-6 bg-[var(--portal-card)] animate-pulse flex flex-col gap-4 border border-[var(--portal-card-border)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 shrink-0"></div>
            <div className="space-y-1.5 flex-1">
              <div className="w-28 h-3.5 bg-black/10 dark:bg-white/10 rounded"></div>
              <div className="w-20 h-2.5 bg-black/5 dark:bg-white/5 rounded"></div>
            </div>
          </div>
          <div className="space-y-2 py-1">
            <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded"></div>
            <div className="w-4/5 h-3 bg-black/10 dark:bg-white/10 rounded"></div>
            <div className="w-2/3 h-3 bg-black/5 dark:bg-white/5 rounded"></div>
          </div>
          <div className="flex gap-4 pt-2 border-t border-[var(--portal-card-border)]">
            <div className="w-14 h-4 bg-black/10 dark:bg-white/10 rounded-full"></div>
            <div className="w-14 h-4 bg-black/5 dark:bg-white/5 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({
  title = 'No stories yet',
  description = 'Be the first to share an inspiring thought or story with the community.',
  action
}) => {
  return (
    <div className="portal-card p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-sm">
      <div className="w-12 h-12 rounded-full bg-[#007aff]/10 text-[#007aff] flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      </div>
      <h3 className="editorial-h2 text-xl text-[var(--portal-heading)] mb-2">{title}</h3>
      <p className="text-[var(--portal-meta)] text-sm leading-relaxed max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
};

export const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="portal-card p-6 bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 text-center flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-red-600 dark:text-red-400">{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-[#007aff] hover:underline cursor-pointer"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export const ConfirmationDialog = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel
}) => {
  const previouslyFocusedRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      // Auto focus cancel button for safety
      if (cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      }
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen, onCancel, loading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="portal-card max-w-md w-full p-6 bg-[var(--portal-card)] shadow-2xl border border-[var(--portal-card-border)]">
        <h3 id="confirm-dialog-title" className="editorial-h2 text-xl text-[var(--portal-heading)] mb-2">{title}</h3>
        <p id="confirm-dialog-message" className="text-sm text-[var(--portal-meta)] mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-5 py-2.5 rounded-[50px] text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-[50px] text-xs font-medium text-white transition-all cursor-pointer shadow-sm ${
              isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#007aff] hover:bg-[#0069dc]'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
