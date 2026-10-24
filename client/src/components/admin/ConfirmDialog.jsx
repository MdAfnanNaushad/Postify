import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to perform this administrative action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  requireReason = false,
  reasonPlaceholder = 'Please explain the reason for this action (for audit logs)...',
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to perform this action.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onCancel()}
      />

      {/* Modal Dialog with strict 6px radius */}
      <div
        style={{ borderRadius: '6px' }}
        className="relative w-full max-w-md bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-[6px] shadow-2xl p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              style={{ borderRadius: '6px' }}
              className={`w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--portal-heading)]">
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            disabled={loading}
            style={{ borderRadius: '6px' }}
            className="p-1 rounded-[6px] text-[var(--portal-subtle)] hover:text-[var(--portal-text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[var(--portal-meta)] leading-relaxed">
          {message}
        </p>

        {requireReason && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--portal-text)]">
              Administrative Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              style={{ borderRadius: '6px' }}
              className="w-full p-2.5 rounded-[6px] text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)] resize-none"
            />
            {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{ borderRadius: '6px' }}
            className="px-4 py-2 rounded-[6px] text-xs font-semibold border border-[var(--portal-card-border)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            style={{ borderRadius: '6px' }}
            className={`px-4 py-2 rounded-[6px] text-xs font-semibold text-white flex items-center gap-2 transition-all ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-sm'
                : 'bg-[var(--portal-accent)] hover:opacity-90 shadow-sm'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
