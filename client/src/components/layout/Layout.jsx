import React from 'react';
import { FloatingNav } from './FloatingNav';

export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--portal-canvas)] text-[var(--portal-text)] transition-colors duration-200">
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2.5 rounded-full bg-[#007aff] text-white text-sm font-semibold shadow-xl focus:outline-none focus:ring-2 focus:ring-white transition-all"
      >
        Skip to main content
      </a>

      {/* Floating Capsule Navigation */}
      <FloatingNav />

      {/* Main Page Content Landmark */}
      <main id="main-content" className="flex-1 w-full" tabIndex={-1}>
        {children}
      </main>

      {/* Screen Reader Live Region for Asynchronous Status Announcements */}
      <div id="a11y-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Architectural Editorial Footer (Preserving Colorful Identity & Twilight Depth) */}
      <footer className="mt-12 sm:mt-16 relative bg-gradient-to-b from-[#fbfbfc] via-[#f5f6fa] to-[#eaedf5] dark:from-[#121218] dark:via-[#151520] dark:to-[#0b0b0f] text-[var(--portal-text)] overflow-hidden pt-8 sm:pt-10 pb-16 sm:pb-20 px-3 sm:px-6 lg:px-8 border-t border-[var(--portal-card-border)] transition-colors duration-200">
        {/* Colorful Atmospheric Glow Overlays aligned with Logo Colors */}
        <div className="absolute -bottom-10 right-0 w-[450px] h-[350px] bg-gradient-to-tl from-[#ff5884]/15 via-[#ff9a62]/10 to-[#007aff]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Oversized Colorful Postify Wordmark + Embedded Colorful Logo in Lower Right Overlay */}
        <div className="absolute -bottom-6 sm:-bottom-8 right-0 sm:right-4 pointer-events-none select-none flex items-end gap-3 sm:gap-6 z-0 overflow-hidden pr-2 sm:pr-6">
          {/* Embedded Colorful Postify Logo in Watermark Overlay */}
          <img
            src="/postifylogo2.png"
            alt=""
            className="w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48 object-contain opacity-25 drop-shadow-[0_8px_24px_rgba(255,88,132,0.25)] select-none pointer-events-none"
          />
          {/* Colorful Gradient Postify Text Watermark */}
          <span className="editorial-h1 text-[4.5rem] sm:text-[7.5rem] md:text-[10rem] lg:text-[13rem] leading-none tracking-tighter font-extrabold bg-gradient-to-r from-[#1e2a78]/25 via-[#ff5884]/25 to-[#ff9a62]/30 dark:from-white/10 dark:via-[#ff5884]/20 dark:to-[#ff9a62]/20 bg-clip-text text-transparent whitespace-nowrap">
            postify
          </span>
        </div>

        <div className="portal-container relative z-10 max-w-6xl mx-auto">
          {/* The Postify Dispatch Newsletter Box */}
          <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#007aff] mb-1.5 block">
                The Postify Dispatch
              </span>
              <h3 className="editorial-h2 text-2xl sm:text-3xl text-[var(--portal-heading)] mb-2 font-normal">
                Curated thoughts in your inbox
              </h3>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed">
                A weekly selection of the most insightful essays, reflections, and community perspectives. No noise, just prose.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.elements?.email;
                if (input && input.value) {
                  alert(`Thank you for subscribing to The Postify Dispatch!`);
                  input.value = '';
                }
              }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"
            >
              <label htmlFor="dispatch-email" className="sr-only">
                Email address for newsletter
              </label>
              <input
                id="dispatch-email"
                type="email"
                name="email"
                required
                placeholder="Enter your email address"
                className="w-full sm:w-72 px-4 py-3 rounded-full bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-2 focus:ring-[#007aff] transition-colors"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#000000] dark:bg-[#007aff] text-white hover:bg-[#1c1c1e] dark:hover:bg-[#0069dc] text-sm font-semibold tracking-wide transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-sm hover:shadow"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Main Footer Links Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 pb-12 border-b border-[var(--portal-card-border)]">
            {/* Column 1: Brand Mark & Mission Statement */}
            <div className="md:col-span-5 flex flex-col items-start gap-4">
              <a href="/" className="flex items-center gap-3 group">
                <img
                  src="/postifylogo2.png"
                  alt="Postify Logo"
                  className="w-11 h-11 object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
                />
                <span className="editorial-h2 text-2xl sm:text-3xl text-[var(--portal-heading)] tracking-tight">
                  Postify
                </span>
              </a>
              <p className="text-sm text-[var(--portal-meta)] leading-relaxed max-w-sm">
                An intimate, editorial sanctuary designed for deliberate writers and curious minds to explore honest human perspectives.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--portal-card)] text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </span>
                <span className="text-xs text-[var(--portal-meta)]">v1.4 Portal Edition</span>
              </div>
            </div>

            {/* Column 2: Explore Platform */}
            <div className="md:col-span-3 flex flex-col justify-start gap-3 text-sm">
              <span className="font-bold text-xs uppercase tracking-widest text-[var(--portal-heading)]">
                Explore Platform
              </span>
              <nav className="flex flex-col gap-2.5 text-[var(--portal-meta)]">
                <a href="/#why-postify" className="hover:text-[#007aff] transition-colors">
                  Why Postify
                </a>
                <a href="/#how-it-works" className="hover:text-[#007aff] transition-colors">
                  How It Works
                </a>
                <a href="/#about" className="hover:text-[#007aff] transition-colors">
                  Our Manifesto
                </a>
                <a href="/feed" className="hover:text-[#007aff] transition-colors">
                  Public Feed
                </a>
              </nav>
            </div>

            {/* Column 3: Community */}
            <div className="md:col-span-2 flex flex-col justify-start gap-3 text-sm">
              <span className="font-bold text-xs uppercase tracking-widest text-[var(--portal-heading)]">
                Community
              </span>
              <nav className="flex flex-col gap-2.5 text-[var(--portal-meta)]">
                <a href="/login" className="hover:text-[#007aff] transition-colors">
                  Sign In
                </a>
                <a href="/register" className="hover:text-[#007aff] transition-colors font-medium text-[#007aff]">
                  Create Account
                </a>
                <a href="/feed" className="hover:text-[#007aff] transition-colors">
                  Explore Stories
                </a>
              </nav>
            </div>

            {/* Column 4: Guidelines */}
            <div className="md:col-span-2 flex flex-col justify-start gap-3 text-sm">
              <span className="font-bold text-xs uppercase tracking-widest text-[var(--portal-heading)]">
                Guidelines
              </span>
              <nav className="flex flex-col gap-2.5 text-[var(--portal-meta)]">
                <a href="/#about" className="hover:text-[#007aff] transition-colors">
                  Writer Privacy
                </a>
                <a href="/#about" className="hover:text-[#007aff] transition-colors">
                  Editorial Ethics
                </a>
                <a href="/#about" className="hover:text-[#007aff] transition-colors">
                  Content Standards
                </a>
              </nav>
            </div>
          </div>

          {/* Secondary Row: Copyright, Ethos & Attribution */}
          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-[var(--portal-meta)]">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span>© {new Date().getFullYear()} Postify. All rights reserved.</span>
              <span className="hidden sm:inline">·</span>
              <span>An Editorial Haven for Reflections.</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Architected & Built with passion by <span className="text-[#007aff] font-semibold">Md Afnan Naushad</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
