import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const DetailDrawer = ({
  isOpen = false,
  title = 'Details',
  onClose,
  children
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-xl h-full bg-[var(--portal-card)] border-l border-[var(--portal-card-border)] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-[var(--portal-card-border)] flex items-center justify-between shrink-0 select-none">
          <h2 className="text-base font-bold text-[var(--portal-heading)] tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{ borderRadius: '6px' }}
            className="p-1.5 rounded-[6px] text-[var(--portal-subtle)] hover:text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
