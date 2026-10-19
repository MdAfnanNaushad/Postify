import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or hate speech' },
  { value: 'hate_speech', label: 'Hate speech or discrimination' },
  { value: 'inappropriate', label: 'Inappropriate or explicit content' },
  { value: 'copyright', label: 'Copyright or intellectual property violation' },
  { value: 'other', label: 'Other violation' }
];

export const ReportModal = ({
  isOpen,
  onClose,
  targetType = 'post',
  targetId,
  targetTitle = ''
}) => {
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const modalRef = useRef(null);
  const previouslyFocusedElementRef = useRef(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement;
      setReason('spam');
      setDescription('');
      setError(null);
      setSuccess(false);

      // Focus first interactive element in modal
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector('input, select, textarea, button');
        firstFocusable?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await api.post('/reports', {
        targetType,
        targetId,
        reason,
        description: description.trim()
      });

      if (res.data?.success) {
        setSuccess(true);
        const announcer = document.getElementById('a11y-status');
        if (announcer) {
          announcer.textContent = 'Report submitted successfully. Thank you for helping keep Postify safe.';
        }
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit report. Please try again.';
      setError(msg);
      const announcer = document.getElementById('a11y-status');
      if (announcer) {
        announcer.textContent = `Report error: ${msg}`;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        ref={modalRef}
        className="portal-card w-full max-w-lg bg-[var(--portal-card)] border border-[var(--portal-card-border)] p-6 sm:p-7 shadow-2xl flex flex-col gap-4 text-[var(--portal-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--portal-card-border)]">
          <div className="flex items-center gap-2.5 text-[var(--portal-heading)]">
            <div className="p-2 rounded-full bg-rose-500/10 text-rose-500">
              <Flag size={18} />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-lg font-semibold tracking-tight">
                Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
              </h2>
              {targetTitle && (
                <p className="text-xs text-[var(--portal-meta)] line-clamp-1">{targetTitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            aria-label="Close report dialog"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-semibold text-[var(--portal-heading)]">Thank you for reporting</h3>
            <p className="text-xs text-[var(--portal-meta)] max-w-sm">
              Our moderation team will review this content against Postify's community guidelines.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2"
              >
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reason Selector */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-reason" className="text-xs font-semibold text-[var(--portal-heading)]">
                Reason for reporting <span className="text-rose-500">*</span>
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-colors"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="report-desc" className="text-xs font-semibold text-[var(--portal-heading)]">
                  Additional Details <span className="text-xs font-normal text-[var(--portal-meta)]">(optional)</span>
                </label>
                <span className="text-[11px] text-[var(--portal-subtle)]">
                  {description.length} / 500
                </span>
              </div>
              <textarea
                id="report-desc"
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help our moderators understand what is wrong with this content..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-colors resize-none"
              />
            </div>

            <p className="text-[11px] text-[var(--portal-subtle)] leading-relaxed">
              Reports are confidential. The reported author will never see who submitted this report.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--portal-card-border)]">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
