import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentIcon = resolvedTheme === 'dark' ? (
    <Moon size={16} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
  ) : (
    <Sun size={16} className="text-amber-500 group-hover:text-amber-600 transition-colors" />
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Primary Toggle Capsule Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-[var(--portal-heading)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007aff] group select-none shadow-2xs border border-black/5 dark:border-white/10"
        aria-label={`Current theme: ${theme} mode. Click to change theme.`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (${resolvedTheme})`}
      >
        {currentIcon}
      </button>

      {/* Accessible 3-Way Mode Selection Popover Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Theme selection options"
          className="absolute right-0 mt-2 w-36 rounded-2xl p-1.5 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xl z-50 backdrop-blur-md animate-fade-in text-xs font-medium"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#007aff]/10 text-[#007aff] font-semibold'
                    : 'text-[var(--portal-text)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} className={isSelected ? 'text-[#007aff]' : 'text-[var(--portal-meta)]'} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-[#007aff]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
