import React, { useState, useEffect } from 'react';
import { Sparkles, Terminal } from 'lucide-react';

const LOADING_TIPS = [
  'Calibrating editorial frequencies...',
  'Synchronizing real-time developer stream...',
  'Compiling latest community reflections...',
  'Connecting to WebSockets cluster...',
  'Fetching project build logs...',
  'Polishing syntax highlighters...'
];

export const LoadingScreen = ({
  message = null,
  fullScreen = true,
  showLogo = true,
  subtext = null,
  showTips = true,
  className = ''
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!showTips) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [showTips]);

  const activeMessage = message || (showTips ? LOADING_TIPS[tipIndex] : 'Loading Postify...');

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto select-none">
      {/* Glowing Brand Mark & Animated Rings */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Subtle Ambient Pulse Glow */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-[#007aff]/20 via-[#7b7ed8]/20 to-[#e8a87c]/20 rounded-full blur-xl animate-pulse" />
        
        {/* Outer Rotating Dotted Orbit */}
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#007aff]/30 dark:border-[#007aff]/25 animate-[spin_10s_linear_infinite]" />
        
        {/* Inner Counter-Rotating Gradient Ring */}
        <div className="absolute w-14 h-14 rounded-full border-2 border-transparent border-t-[#007aff] border-r-[#7b7ed8] animate-[spin_1.5s_cubic-bezier(0.4,0,0.2,1)_infinite]" />

        {/* Center Logo Icon */}
        {showLogo && (
          <div className="absolute w-10 h-10 rounded-xl bg-gradient-to-br from-[#007aff] via-[#6366f1] to-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#007aff]/25">
            <span className="font-serif font-black text-xl tracking-tighter">P</span>
          </div>
        )}
      </div>

      {/* Brand Title */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-serif text-lg font-bold tracking-tight text-[var(--portal-heading)]">
          Postify
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-[#007aff]/10 text-[#007aff] dark:bg-[#007aff]/20">
          <Sparkles className="w-2.5 h-2.5 animate-spin" /> Live
        </span>
      </div>

      {/* Progress / Status Message */}
      <p className="text-xs sm:text-sm font-medium text-[var(--portal-text)] transition-all duration-300 min-h-[1.5rem]">
        {activeMessage}
      </p>

      {/* Optional Subtext */}
      {subtext && (
        <p className="mt-1 text-xs text-[var(--portal-meta)] max-w-xs">
          {subtext}
        </p>
      )}

      {/* Animated indeterminate progress line */}
      <div className="w-36 h-1 mt-6 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#007aff] via-[#7b7ed8] to-[#e8a87c] w-1/2 rounded-full animate-[shimmer_1.8s_infinite]" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`min-h-screen w-full flex items-center justify-center bg-[var(--portal-canvas)] text-[var(--portal-text)] transition-colors duration-200 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`py-12 flex items-center justify-center ${className}`}
    >
      {content}
    </div>
  );
};

export default LoadingScreen;
