import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'ghost', 'danger'
  size = 'md',        // 'sm', 'md', 'lg'
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007aff]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  // Exact 50px pill radius rule from Portal specification
  const shape = 'rounded-[50px]';

  const sizeStyles = {
    sm: 'px-5 py-2 text-xs tracking-tight',
    md: 'px-7 py-3 text-sm tracking-normal',
    lg: 'px-9 py-4 text-base tracking-normal'
  };

  const variants = {
    primary:
      'bg-[#007aff] text-white hover:bg-[#0069dc] shadow-sm',
    secondary:
      'bg-[var(--portal-card)] text-[var(--portal-heading)] border border-[var(--portal-card-border)] hover:bg-[var(--portal-canvas-secondary)] shadow-sm',
    ghost:
      'bg-transparent text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10',
    danger:
      'bg-red-500 text-white hover:bg-red-600 shadow-sm'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${shape} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
