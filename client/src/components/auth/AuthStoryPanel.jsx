import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Quote, Sparkles, ArrowLeft } from 'lucide-react';

export const AUTH_VERSES = [
  {
    verse: "Let a thought become a sentence, let a sentence find its voice, and let a story travel farther than the silence it once held.",
    author: "Postify Editorial",
    role: "The Writer's Ethos",
    tag: "Voice"
  },
  {
    verse: "We write to taste life twice, in the moment and in retrospect.",
    author: "Anaïs Nin",
    role: "On the Art of Reflection",
    tag: "Reflection"
  },
  {
    verse: "Fill your paper with the breathings of your heart.",
    author: "William Wordsworth",
    role: "Lyrical Observation",
    tag: "Authenticity"
  },
  {
    verse: "There is no greater agony than bearing an untold story inside you.",
    author: "Maya Angelou",
    role: "Poet & Storyteller",
    tag: "Expression"
  },
  {
    verse: "Writing is an act of reclamation. In placing one word after another, we restore order to chaos.",
    author: "Joan Didion",
    role: "Literary Essayist",
    tag: "Clarity"
  },
  {
    verse: "A word after a word after a word is power.",
    author: "Margaret Atwood",
    role: "Cultural Observer",
    tag: "Resonance"
  }
];

export const AuthStoryPanel = () => {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Rotate every 5 seconds as specified in Part 4
    const interval = setInterval(() => {
      // Pause rotation if document is hidden/tab is inactive
      if (document.hidden) return;
      setIndex((prev) => (prev + 1) % AUTH_VERSES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const current = AUTH_VERSES[index];

  return (
    <div className="relative h-full w-full rounded-3xl lg:rounded-4xl overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2c2d35] to-[#121316] p-5 sm:p-7 lg:p-8 xl:p-9 text-white flex flex-col justify-between border border-white/10 shadow-2xl min-h-[360px] lg:min-h-full">
      {/* Twilight atmospheric glow overlays (Postify theme) */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#4a7ff2]/25 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[#df9e8e]/20 via-[#b988bc]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Silhouette SVG Curve */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none opacity-10 flex justify-center">
        <svg
          className="w-full h-28 text-white"
          viewBox="0 0 1200 120"
          fill="currentColor"
          preserveAspectRatio="none"
        >
          <path d="M0,120 L0,85 Q150,30 300,75 T600,45 Q750,15 900,65 T1200,55 L1200,120 Z" />
        </svg>
      </div>

      {/* Large Brand Watermark */}
      <div className="absolute -bottom-6 -right-6 pointer-events-none select-none opacity-15">
        <img
          src="/postifylogo2.png"
          alt=""
          className="w-56 h-56 sm:w-72 sm:h-72 object-contain drop-shadow-[0_10px_30px_rgba(0,122,255,0.3)]"
        />
      </div>

      {/* Top Header Region: Back Button + Brand Treatment */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Back to landing page control */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs sm:text-sm font-medium text-white border border-white/20 backdrop-blur-md transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#007aff]"
          aria-label="Back to Postify landing page"
        >
          <ArrowLeft size={15} className="text-[#007aff] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>

        {/* 5-second Pulse Progress Indicator */}
        <div className="flex items-center gap-1.5" aria-label="Verse rotation indicator">
          {AUTH_VERSES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Jump to verse ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                i === index ? 'w-6 bg-[#007aff]' : 'w-1.5 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Center Dynamic Verse Section */}
      <div className="relative z-10 my-auto py-3 sm:py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[#007aff] border border-white/10 shadow-xs">
            <Quote size={18} />
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold tracking-widest uppercase text-blue-200">
            <Sparkles size={11} className="text-amber-300" />
            <span>{current.tag}</span>
          </span>
        </div>

        {/* Reserved height container to prevent layout shifts */}
        <div className="min-h-[140px] sm:min-h-[160px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="editorial-h1 text-lg sm:text-xl lg:text-2xl text-white leading-relaxed sm:leading-snug mb-3.5 font-normal tracking-tight">
                &ldquo;{current.verse}&rdquo;
              </p>
              <div>
                <h4 className="text-sm font-semibold text-white tracking-wide">
                  {current.author}
                </h4>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {current.role}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Brand Statement */}
      <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <img src="/postifylogo2.png" alt="" className="w-5 h-5 object-contain" />
          <span className="font-semibold text-white">Postify</span>
          <span className="hidden sm:inline">· Sanctuary for Reflections</span>
        </div>
        <span className="font-mono text-zinc-500 text-[11px] hidden sm:inline">Rotates every 5s</span>
      </div>
    </div>
  );
};
