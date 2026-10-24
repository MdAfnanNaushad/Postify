import React, { useState } from 'react';

export const Avatar = ({
  src,
  alt = 'User Avatar',
  size = 'md', // '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'
  username = '',
  name = '',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    '2xs': 'w-5 h-5 text-[9px]',
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
    '2xl': 'w-32 h-32 text-3xl'
  };

  const resolvedSizeClass = sizeClasses[size] || sizeClasses.md;

  // Resolve upload path: handles legacy filenames, full paths, or default
  const getAvatarUrl = (path) => {
    if (!path || path === 'Profilepic.jpg') {
      return '/uploads/Profilepic.jpg';
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/uploads/') || path.startsWith('/images/uploads/')) {
      return path;
    }
    return `/uploads/${path}`;
  };

  const initial = (username || name || alt || 'P').charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full aspect-square border border-[var(--portal-card-border)] bg-[var(--portal-canvas-secondary)] shadow-sm select-none ${resolvedSizeClass} ${className}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      {!imageError && src ? (
        <img
          src={getAvatarUrl(src)}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full max-w-full max-h-full object-cover rounded-full block pointer-events-none"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold text-[#007aff] leading-none">{initial}</span>
      )}
    </div>
  );
};
