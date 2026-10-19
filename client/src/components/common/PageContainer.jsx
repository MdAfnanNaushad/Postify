import React from 'react';

/**
 * Standard Portal Page Container Primitive
 * Eliminates recurring spacing inconsistencies across the entire application.
 */
export const PageContainer = ({
  children,
  size = 'xl', // 'sm', 'md', 'lg', 'xl', 'full'
  className = '',
  as: Component = 'div',
  ...props
}) => {
  const sizeMap = {
    sm: 'max-w-xl',    // 576px: Form bounds, Auth, Single action modals
    md: 'max-w-3xl',    // 768px: Deep reading, Article details, Build logs
    lg: 'max-w-5xl',    // 1024px: Story showcases, Project grids
    xl: 'max-w-6xl',    // 1152px: Main feeds, Magazine layouts
    full: 'max-w-7xl'   // 1280px: Maximum layout width
  };

  return (
    <Component
      className={`w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-10 ${sizeMap[size] || sizeMap.xl} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default PageContainer;
