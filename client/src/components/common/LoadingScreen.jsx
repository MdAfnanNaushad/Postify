import React from 'react';
import { LottieLoader } from './LottieLoader';

/**
 * LoadingScreen component for Postify.
 * Renders the official client/public/loading.json Lottie animation
 * on the initial loading screen and route transitions.
 *
 * @param {string|null} message - Optional contextual status message (e.g. "Verifying session...")
 * @param {boolean} fullScreen - Whether to take over the full viewport (fixed inset-0)
 * @param {number} size - Dimension of the Lottie animation in pixels (default 160)
 * @param {string} className - Additional CSS classes
 */
export const LoadingScreen = ({
  message = null,
  fullScreen = true,
  size = 160,
  className = ''
}) => {
  const content = (
    <div className="relative flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto select-none">
      {/* Subtle ambient glow behind the Lottie animation */}
      <div className="absolute w-48 h-48 bg-gradient-to-tr from-[#007aff]/15 via-[#7b7ed8]/15 to-[#e8a87c]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Lottie Vector Animation from loading.json */}
      <LottieLoader
        size={size}
        className="relative z-10"
      />

      {/* Optional contextual status message */}
      {message && (
        <p className="mt-4 text-xs sm:text-sm font-medium text-[var(--portal-meta)] tracking-wide transition-opacity duration-300">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-50 min-h-screen w-full flex items-center justify-center bg-[var(--portal-canvas)] text-[var(--portal-text)] transition-colors duration-200 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`py-12 w-full flex items-center justify-center ${className}`}
    >
      {content}
    </div>
  );
};

export default LoadingScreen;
