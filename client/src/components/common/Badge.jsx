import React from 'react';

/**
 * Technology Tag & Badge Primitive
 * Follows Portal pill radius (rounded-[50px]) and color standards.
 */
export const Badge = ({
  children,
  variant = 'default', // 'default', 'accent', 'secondary', 'outline', 'success', 'warning'
  size = 'sm',        // 'sm', 'md'
  clickable = false,
  onClick,
  className = '',
  icon,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium tracking-tight',
    md: 'px-3.5 py-1 text-xs font-semibold tracking-normal'
  };

  const variants = {
    default:
      'bg-[var(--portal-canvas-secondary)] text-[var(--portal-meta)] border border-[var(--portal-card-border)]',
    accent:
      'bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20',
    secondary:
      'bg-black/5 dark:bg-white/10 text-[var(--portal-text)] border border-transparent',
    outline:
      'bg-transparent text-[var(--portal-meta)] border border-[var(--portal-card-border)] hover:border-[var(--portal-subtle)]',
    success:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
  };

  const interactiveStyles = clickable
    ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all duration-150'
    : '';

  const Component = clickable ? 'button' : 'span';

  return (
    <Component
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      className={`inline-flex items-center gap-1.5 rounded-[50px] select-none ${sizeStyles[size]} ${variants[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </Component>
  );
};

export default Badge;
