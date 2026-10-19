import React, { useState, useRef, useEffect } from 'react';

/**
 * Accessible Dropdown / Context Menu Primitive
 * Conforms to Portal design with theme tokens, keyboard controls, and outside click dismissal.
 */
export const DropdownMenu = ({
  trigger,
  items = [],
  align = 'right', // 'left', 'right'
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
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

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen((prev) => !prev)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute z-50 mt-2 w-48 rounded-2xl shadow-xl border border-[var(--portal-card-border)] bg-[var(--portal-dropdown-bg)] backdrop-blur-xl p-1.5 focus:outline-none transition-all animate-fade-in ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`div-${index}`} className="my-1 border-t border-[var(--portal-card-border)]" />;
            }

            const isDanger = item.danger;
            return (
              <button
                key={item.label || index}
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (item.onClick) item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isDanger
                    ? 'text-red-500 hover:bg-red-500/10'
                    : 'text-[var(--portal-text)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
