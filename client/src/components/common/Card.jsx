import React from 'react';

/**
 * Portal Design System Card Primitive
 * Provides consistent paper-white / elevated dark surface, border, and glow-ring shadows.
 */
export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  as: Component = 'div',
  padding = 'normal', // 'none', 'sm', 'normal', 'lg'
  onClick,
  ...props
}) => {
  const paddingMap = {
    none: '',
    sm: 'p-4 sm:p-5',
    normal: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-10 md:p-12'
  };

  const hoverClasses = hoverEffect
    ? 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 cursor-pointer'
    : 'transition-colors duration-200';

  return (
    <Component
      onClick={onClick}
      className={`portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] ${paddingMap[padding]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between gap-4 pb-4 border-b border-[var(--portal-card-border)] mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`space-y-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between gap-4 pt-4 border-t border-[var(--portal-card-border)] mt-4 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
