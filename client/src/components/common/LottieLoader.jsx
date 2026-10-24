import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web/build/player/lottie_light.js';
import defaultAnimationData from '../../assets/loading.json';

/**
 * LottieLoader component for Postify.
 * Renders animated vector Lottie graphics from loading.json.
 *
 * @param {Object|null} animationData - Lottie JSON data object (defaults to imported loading.json)
 * @param {string|null} animationPath - Path to JSON file if fetching dynamically (e.g. '/loading.json')
 * @param {number|string} size - Size in pixels (number) or CSS string
 * @param {boolean} loop - Whether to loop the animation (default true)
 * @param {boolean} autoplay - Whether to autoplay on mount (default true)
 * @param {string} className - Additional CSS classes
 */
export const LottieLoader = ({
  animationData = null,
  animationPath = null,
  size = 140,
  loop = true,
  autoplay = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;

    try {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }

      // Determine animation source:
      // 1. Explicit animationData prop
      // 2. Explicit animationPath prop
      // 3. Bundled defaultAnimationData
      // 4. Fallback path '/loading.json'
      const dataToUse = animationData || (!animationPath ? defaultAnimationData : null);
      const pathToUse = animationPath || (!dataToUse ? '/loading.json' : null);

      const animConfig = {
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay
      };

      if (dataToUse) {
        // Deep clone animation data to avoid lottie-web in-place mutation of imported JSON modules
        try {
          animConfig.animationData = typeof structuredClone === 'function'
            ? structuredClone(dataToUse)
            : JSON.parse(JSON.stringify(dataToUse));
        } catch {
          animConfig.animationData = dataToUse;
        }
      } else if (pathToUse) {
        animConfig.path = pathToUse;
      }

      const instance = lottie.loadAnimation(animConfig);
      animRef.current = instance;

      instance.addEventListener('DOMLoaded', () => {
        if (isMounted) setIsLoaded(true);
      });

      instance.addEventListener('data_ready', () => {
        if (isMounted) setIsLoaded(true);
      });

      instance.addEventListener('data_failed', () => {
        if (isMounted) setLoadError(true);
      });

      instance.addEventListener('error', () => {
        if (isMounted) setLoadError(true);
      });
    } catch (err) {
      console.warn('LottieLoader initialization failed, falling back:', err);
      if (isMounted) setLoadError(true);
    }

    return () => {
      isMounted = false;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [animationData, animationPath, loop, autoplay]);

  const dimensionStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 ${className}`}
        style={dimensionStyle}
      >
        <div className="w-10 h-10 rounded-full border-2 border-[#007aff]/30 border-t-[#007aff] animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={dimensionStyle}
      className={`relative flex items-center justify-center shrink-0 select-none pointer-events-none transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-80'
      } ${className}`}
      aria-hidden="true"
    />
  );
};

export default LottieLoader;
