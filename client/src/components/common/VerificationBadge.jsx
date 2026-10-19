import React from 'react';

/**
 * Determines whether a user qualifies for the Postify verification badge:
 * 1. @postify is the platform owner and is prebuilt verified
 * 2. Any user with isVerified === true
 * 3. Any user who has received 100+ likes on any post
 */
export const isUserVerified = (user, posts = null) => {
  if (!user) return false;

  const username = (user.username || '').trim().toLowerCase();
  if (username === 'postify') return true;

  if (user.isVerified) return true;

  // Check user's embedded posts if available
  if (Array.isArray(user.posts)) {
    const hasHundred = user.posts.some((p) => {
      const count = Array.isArray(p?.likes) ? p.likes.length : (p?.likeCount || 0);
      return count >= 100;
    });
    if (hasHundred) return true;
  }

  // Check supplementary posts array if passed
  if (Array.isArray(posts)) {
    const userId = (user._id || user.id || '').toString();
    const hasHundred = posts.some((p) => {
      const postAuthorId = (p?.user?._id || p?.user?.id || p?.user || '').toString();
      const count = Array.isArray(p?.likes) ? p.likes.length : (p?.likeCount || 0);
      return (postAuthorId === userId || p?.user?.username?.toLowerCase() === username) && count >= 100;
    });
    if (hasHundred) return true;
  }

  return false;
};

export const VerificationBadge = ({
  user,
  posts = null,
  size = 'md',
  variant = 'default',
  className = '',
  title = 'Verified by Postify'
}) => {
  const verified = isUserVerified(user, posts);
  if (!verified) return null;

  const sizeClasses = {
    xs: 'w-3.5 h-3.5 min-w-[14px]',
    sm: 'w-4 h-4 min-w-[16px]',
    md: 'w-5 h-5 min-w-[20px]',
    lg: 'w-6 h-6 min-w-[24px]',
    xl: 'w-7 h-7 min-w-[28px]'
  };

  return (
    <img
      src="/verification.png"
      alt={title}
      title={title}
      className={`inline-block shrink-0 select-none align-middle object-contain ${sizeClasses[size] || sizeClasses.md} ${className}`}
      draggable="false"
      loading="eager"
    />
  );
};
