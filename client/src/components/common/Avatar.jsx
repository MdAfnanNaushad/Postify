import React, { useState } from 'react';

export const Avatar = ({
  src,
  alt = 'User Avatar',
  size = 'md', // 'sm', 'md', 'lg', 'xl'
  username = '',
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };

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

  const initial = (username || alt || 'P').charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full border border-[var(--portal-card-border)] bg-[var(--portal-canvas-secondary)] shadow-sm select-none ${sizeClasses[size]} ${className}`}
    >
      {!imageError && src ? (
        <img
          src={getAvatarUrl(src)}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <span className="font-semibold text-[#007aff]">{initial}</span>
      )}
    </div>
  );
};
