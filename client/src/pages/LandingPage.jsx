import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/common/Button';
import { VerificationBadge } from '../components/common/VerificationBadge';
import {
  Feather,
  Compass,
  Users,
  Heart,
  Sparkles,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Quote,
  User,
  FileText,
  CheckSquare
} from 'lucide-react';

export const LandingPage = () => {
  const shouldReduceMotion = useReducedMotion();
  const [followingMap, setFollowingMap] = useState({});

  const toggleFollow = (key) => {
    setFollowingMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Reusable spring pop animation helper for cards
  const getPopProps = (delay = 0) => ({
    initial: false,
    whileInView: { opacity: 1, scale: 1, y: 0 },
    viewport: { once: true },
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
      delay: shouldReduceMotion ? 0 : delay
    }
  });

  return (
    <Layout>
      <Helmet>
        <title>Postify — Where Thoughts Find Their Voice</title>
        <meta
          name="description"
          content="Postify is an intimate, editorial community platform for sharing reflections, discovering perspectives, and connecting with thoughtful writers."
        />
        <meta property="og:title" content="Postify — Where Thoughts Find Their Voice" />
        <meta
          property="og:description"
          content="Share your reflections, discover new perspectives, and find connection through the things we write."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="http://localhost:5173/" />
      </Helmet>

      {/* SECTION B: Atmospheric Hero with seamless merge */}
      <section className="twilight-hero pt-44 pb-40 sm:pt-52 sm:pb-48 text-center text-white relative overflow-hidden">
        <div className="portal-container max-w-4xl mx-auto flex flex-col items-center relative z-10">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-widest uppercase text-white/90 mb-8">
            <Sparkles size={18} className="text-amber-200 shrink-0" />
            <span>An Editorial Haven For Reflections</span>
          </div>

          <h1 className="editorial-h1 text-4xl sm:text-6xl md:text-7xl tracking-tight text-white mb-8 leading-[1.08]">
            Your words deserve a place.
          </h1>

          <p className="text-base sm:text-xl text-white/90 max-w-2xl font-normal leading-relaxed mb-12">
            Share your reflections, discover new perspectives, and find connection through the things we write.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/register"
              className="inline-flex items-center justify-center font-semibold rounded-[50px] bg-white text-[#111111] hover:bg-[#f7f7f7] shadow-lg active:scale-95 px-8 py-3.5 text-base tracking-normal transition-all"
            >
              Join Postify Free
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center justify-center font-semibold rounded-[50px] bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 active:scale-95 px-8 py-3.5 text-base tracking-normal transition-all"
            >
              Explore Stories
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION C: Product Preview — Staggered Pop Animation per card with Balanced Non-Empty Composition */}
      <section className="portal-container max-w-5xl -mt-24 sm:-mt-28 relative z-20 mb-36 sm:mb-44">
        <div className="text-center mb-10">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#007aff] inline-block">
            Product Experience
          </span>
        </div>

        {/* Art-Directed Balanced Story Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Main Showcase Essay + Companion Author Reflection */}
          <div className="md:col-span-7 flex flex-col gap-6 sm:gap-8">
            {/* Card 1: Clara Oswald Main Showcase Post Card */}
            <motion.div
              {...getPopProps(0.1)}
              className="portal-card p-8 sm:p-10 md:p-11 bg-[var(--portal-card)] border border-[var(--portal-card-border)] transform md:-rotate-1 transition-transform hover:rotate-0 duration-300 shadow-md"
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src="/uploads/b042b82bb54fe7e6aa3b1b06.jpg"
                    alt="Clara Oswald"
                    className="w-14 h-14 rounded-full object-cover border border-[var(--portal-card-border)] ring-2 ring-[var(--portal-card-border)] shadow-xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base sm:text-lg font-semibold text-[var(--portal-heading)]">Clara Oswald</h2>
                      <VerificationBadge user={{ isVerified: true }} size="sm" />
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--portal-meta)]">@clara · 12 minutes ago</p>
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-medium text-[var(--portal-meta)]">
                  Essay
                </span>
              </div>

              <p className="text-[var(--portal-text)] text-base sm:text-lg leading-relaxed mb-8">
                "We often rush toward conclusions without giving the quiet observations time to settle. Writing here feels like pausing the noise long enough to hear what I actually meant."
              </p>

              <div className="pt-6 border-t border-[var(--portal-card-border)] flex items-center justify-between text-xs sm:text-sm text-[var(--portal-meta)]">
                <div className="flex items-center gap-2 text-red-500 font-medium">
                  <Heart size={20} className="fill-red-500 text-red-500" />
                  <span>14 likes</span>
                </div>
                <span>Postify Editorial</span>
              </div>
            </motion.div>

            {/* Card 2: Sagar Community Reflection Card (Fills previous empty gap below Clara) */}
            <motion.div
              {...getPopProps(0.25)}
              className="portal-card p-6 sm:p-8 bg-[var(--portal-card)] border border-[var(--portal-card-border)] transform md:rotate-0.5 transition-transform hover:rotate-0 duration-300 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#1e2a78] to-[#007aff] text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-black/5 shrink-0">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--portal-heading)]">Sagar</h3>
                    <p className="text-xs text-[var(--portal-meta)]">@sagar · 45 minutes ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007aff]/10 text-[#007aff] text-xs font-semibold">
                  Observation
                </span>
              </div>

              <p className="text-[var(--portal-text)] text-sm sm:text-base leading-relaxed mb-5">
                "Good writing isn't about finding something entirely new to say, but telling the quiet truth about what has always been right in front of us."
              </p>

              <div className="pt-4 border-t border-[var(--portal-card-border)] flex items-center justify-between text-xs sm:text-sm text-[var(--portal-meta)]">
                <div className="flex items-center gap-1.5 text-red-500 font-medium">
                  <Heart size={16} className="fill-red-500 text-red-500" />
                  <span>8 likes</span>
                </div>
                <span>Community Reflection</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Marcus Sterling + The Composer + Community Pulse */}
          <div className="md:col-span-5 flex flex-col gap-6 sm:gap-8">
            {/* Card 3: Marcus Sterling */}
            <motion.div
              {...getPopProps(0.4)}
              className="portal-card p-7 sm:p-9 bg-[var(--portal-card)] border border-[var(--portal-card-border)] transform md:rotate-1 transition-transform hover:rotate-0 duration-300 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/uploads/0d4c6ced40382e04a324a88b.png"
                  alt="Marcus Sterling"
                  className="w-13 h-13 rounded-full object-cover border border-[var(--portal-card-border)] ring-2 ring-[var(--portal-card-border)] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--portal-heading)]">Marcus Sterling</h3>
                    <VerificationBadge user={{ isVerified: true }} size="sm" />
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--portal-meta)]">@marcus · 1 hour ago</p>
                </div>
              </div>
              <p className="text-[var(--portal-text)] text-sm sm:text-base leading-relaxed mb-5">
                The architecture of good prose is just deliberate patience disguised as words.
              </p>
              <div className="flex items-center justify-between text-xs sm:text-sm text-[var(--portal-meta)] pt-4 border-t border-[var(--portal-card-border)]">
                <span className="flex items-center gap-1.5 text-[var(--portal-meta)]">
                  <Heart size={16} />
                  <span>9 likes</span>
                </span>
                <span>Community Reflection</span>
              </div>
            </motion.div>

            {/* Card 4: Composer Glimpse Card */}
            <motion.div
              {...getPopProps(0.55)}
              className="portal-card p-7 sm:p-8 bg-gradient-to-br from-[var(--portal-card)] to-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] shadow-xs"
            >
              <div className="flex items-center gap-2.5 mb-3 text-[#007aff]">
                <Feather size={22} />
                <span className="text-xs font-bold uppercase tracking-wider">The Composer</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed mb-4">
                Distraction-free canvas with live character counts, markdown clarity, and instant publication to the community stream.
              </p>
              <div className="w-full py-3.5 px-4 rounded-xl bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-xs sm:text-sm text-[var(--portal-subtle)] flex items-center justify-between">
                <span>Start writing your reflection...</span>
                <span className="text-xs text-[#007aff] font-semibold">1000 left</span>
              </div>
            </motion.div>

            {/* Card 5: Live Community Pulse Card */}
            <motion.div
              {...getPopProps(0.7)}
              className="portal-card p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/50 dark:from-blue-950/25 dark:via-indigo-950/20 dark:to-purple-950/15 border border-blue-100/60 dark:border-blue-900/30 flex items-center justify-between gap-4 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  <img
                    src="/uploads/b042b82bb54fe7e6aa3b1b06.jpg"
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-[var(--portal-card)] object-cover"
                  />
                  <img
                    src="/uploads/0d4c6ced40382e04a324a88b.png"
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-[var(--portal-card)] object-cover"
                  />
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--portal-card)] bg-[#007aff] text-white text-[11px] font-bold flex items-center justify-center">
                    +5
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[var(--portal-heading)]">Live Community</span>
                  </div>
                  <p className="text-[11px] text-[var(--portal-meta)]">25 reflections published</p>
                </div>
              </div>

              <Link
                to="/feed"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white dark:bg-[var(--portal-card)] text-xs font-semibold text-[#007aff] hover:bg-blue-50 dark:hover:bg-[var(--portal-canvas-secondary)] border border-blue-200/50 dark:border-blue-900/40 transition-all shrink-0 shadow-2xs"
              >
                <span>Feed</span>
                <ArrowRight size={13} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION D: Our Foundation — Author Identity Cards (Inspired by Reference Design) */}
      <section id="why-postify" className="portal-container max-w-5xl mb-36 sm:mb-44">
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#007aff] mb-4 inline-block">
            Our Foundation
          </span>
          <h2 className="editorial-h2 text-3xl sm:text-5xl text-[var(--portal-heading)] mb-5">
            Why thoughtful writers choose Postify
          </h2>
          <p className="text-base sm:text-lg text-[var(--portal-meta)] leading-relaxed">
            In an era of fleeting feeds and algorithmic noise, Postify is engineered to preserve the intimacy of the written word.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 sm:gap-8">
          {/* Card 1: Sophie Bennett (Exact match to Reference Image) */}
          <motion.div
            {...getPopProps(0.1)}
            className="bg-[var(--portal-card)] rounded-[36px] sm:rounded-[40px] overflow-hidden border border-[var(--portal-card-border)] shadow-[0_16px_50px_rgba(0,0,0,0.06)] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              {/* Full-bleed Portrait with Soft Bottom Melt */}
              <div className="relative w-full h-[320px] sm:h-[360px] overflow-hidden bg-[var(--portal-canvas-secondary)]">
                <img
                  src="/sophie_bennett.jpg"
                  alt="Sophie Bennett"
                  className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-700"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--portal-card)] via-[var(--portal-card)]/80 to-transparent pointer-events-none" />
              </div>

              {/* Identity & Bio */}
              <div className="px-6 sm:px-7 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl sm:text-[26px] font-bold text-[var(--portal-heading)] tracking-tight">
                    Sophie Bennett
                  </h3>
                  <VerificationBadge user={{ isVerified: true }} size="md" />
                </div>

                <p className="text-[15px] sm:text-base text-[var(--portal-meta)] font-normal leading-relaxed mb-6">
                  Product Designer who focuses on simplicity &amp; usability.
                </p>
              </div>
            </div>

            {/* Bottom Stats & Follow Capsule */}
            <div className="px-6 sm:px-7 pb-6 sm:pb-7 flex items-center justify-between pt-1">
              <div className="flex items-center gap-5 text-[15px] font-bold text-[var(--portal-heading)]">
                <span className="inline-flex items-center gap-2">
                  <User size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>312</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckSquare size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>48</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleFollow('sophie')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-95 border border-[var(--portal-card-border)] ${
                  followingMap['sophie']
                    ? 'bg-[#007aff] text-white hover:bg-[#0069dc] border-[#007aff]'
                    : 'bg-[var(--portal-canvas-secondary)] hover:bg-[var(--portal-card-border)] text-[var(--portal-heading)]'
                }`}
              >
                {followingMap['sophie'] ? 'Following ✓' : 'Follow +'}
              </button>
            </div>
          </motion.div>

          {/* Card 2: Clara Oswald (Full-bleed Card Style) */}
          <motion.div
            {...getPopProps(0.25)}
            className="bg-[var(--portal-card)] rounded-[36px] sm:rounded-[40px] overflow-hidden border border-[var(--portal-card-border)] shadow-[0_16px_50px_rgba(0,0,0,0.06)] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              {/* Full-bleed Portrait with Soft Bottom Melt */}
              <div className="relative w-full h-[320px] sm:h-[360px] overflow-hidden bg-[var(--portal-canvas-secondary)]">
                <img
                  src="/uploads/b042b82bb54fe7e6aa3b1b06.jpg"
                  alt="Clara Oswald"
                  className="w-full h-full object-cover object-top group-hover:scale-102 transition-transform duration-700"
                />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--portal-card)] via-[var(--portal-card)]/80 to-transparent pointer-events-none" />
              </div>

              {/* Identity & Bio */}
              <div className="px-6 sm:px-7 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl sm:text-[26px] font-bold text-[var(--portal-heading)] tracking-tight">
                    Clara Oswald
                  </h3>
                  <VerificationBadge user={{ isVerified: true }} size="md" />
                </div>

                <p className="text-[15px] sm:text-base text-[var(--portal-meta)] font-normal leading-relaxed mb-6">
                  Literary essayist exploring quiet observations &amp; honest perspectives.
                </p>
              </div>
            </div>

            {/* Bottom Stats & Follow Capsule */}
            <div className="px-6 sm:px-7 pb-6 sm:pb-7 flex items-center justify-between pt-1">
              <div className="flex items-center gap-5 text-[15px] font-bold text-[var(--portal-heading)]">
                <span className="inline-flex items-center gap-2">
                  <User size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>840</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckSquare size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>92</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleFollow('clara')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-95 border border-[var(--portal-card-border)] ${
                  followingMap['clara']
                    ? 'bg-[#007aff] text-white hover:bg-[#0069dc] border-[#007aff]'
                    : 'bg-[var(--portal-canvas-secondary)] hover:bg-[var(--portal-card-border)] text-[var(--portal-heading)]'
                }`}
              >
                {followingMap['clara'] ? 'Following ✓' : 'Follow +'}
              </button>
            </div>
          </motion.div>

          {/* Card 3: Postify Platform Owner (@postify) */}
          <motion.div
            {...getPopProps(0.4)}
            className="bg-[var(--portal-card)] rounded-[36px] sm:rounded-[40px] overflow-hidden border border-[var(--portal-card-border)] shadow-[0_16px_50px_rgba(0,0,0,0.06)] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              {/* Full-bleed Emblem Canvas */}
              <div className="relative w-full h-[320px] sm:h-[360px] overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2d2d34] to-[#000000] flex items-center justify-center p-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#007aff] via-[#8b5cf6] to-[#ec4899] p-1.5 shadow-xl">
                  <div className="w-full h-full rounded-full bg-[#18181b] flex items-center justify-center text-white">
                    <Feather size={42} className="text-white" />
                  </div>
                </div>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-white">
                  Owner
                </div>
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--portal-card)] via-[var(--portal-card)]/80 to-transparent pointer-events-none" />
              </div>

              {/* Identity & Bio */}
              <div className="px-6 sm:px-7 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl sm:text-[26px] font-bold text-[var(--portal-heading)] tracking-tight">
                    Postify
                  </h3>
                  <VerificationBadge user={{ username: 'postify', isVerified: true }} size="md" />
                </div>

                <p className="text-[15px] sm:text-base text-[var(--portal-meta)] font-normal leading-relaxed mb-6">
                  Curating intimate writing, verified milestones &amp; community haven.
                </p>
              </div>
            </div>

            {/* Bottom Stats & Follow Capsule */}
            <div className="px-6 sm:px-7 pb-6 sm:pb-7 flex items-center justify-between pt-1">
              <div className="flex items-center gap-5 text-[15px] font-bold text-[var(--portal-heading)]">
                <span className="inline-flex items-center gap-2">
                  <User size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>1.4k</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckSquare size={18} className="text-[var(--portal-subtle)] stroke-[2]" />
                  <span>142</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleFollow('postify')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-95 border border-[var(--portal-card-border)] ${
                  followingMap['postify']
                    ? 'bg-[#007aff] text-white hover:bg-[#0069dc] border-[#007aff]'
                    : 'bg-[var(--portal-canvas-secondary)] hover:bg-[var(--portal-card-border)] text-[var(--portal-heading)]'
                }`}
              >
                {followingMap['postify'] ? 'Following ✓' : 'Follow +'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION E: Simplicity First (Editorial Vibrant Cards — Inspired by Reference Design) */}
      <section id="how-it-works" className="portal-container max-w-5xl mb-36 sm:mb-44">
        <div className="text-center max-w-xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#007aff] mb-3 inline-block">
            Simplicity First
          </span>
          <h2 className="editorial-h2 text-3xl sm:text-5xl text-[var(--portal-heading)] mb-4">
            How Postify Works
          </h2>
          <p className="text-base text-[var(--portal-meta)]">
            Three intuitive steps from sign-up to sharing your perspective.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Vibrant Sunset Orange & Coral (Report Style) */}
          <motion.div
            {...getPopProps(0.15)}
            className="rounded-[30px] p-7 sm:p-9 min-h-[420px] sm:min-h-[460px] bg-gradient-to-br from-[#ff5722] via-[#ff6b35] to-[#f43f5e] text-white relative flex flex-col justify-between overflow-hidden shadow-xl border border-white/15 group"
          >
            {/* Abstract Geometry */}
            <div className="absolute -bottom-10 -right-10 w-52 h-52 rounded-full bg-gradient-to-tr from-amber-300/40 to-yellow-200/15 blur-md pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-16 right-6 w-32 h-32 rounded-full border-4 border-white/15 pointer-events-none" />

            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80 block mb-4">
                REPORT · 01
              </span>
              <h3 className="editorial-h1 text-2xl sm:text-3xl text-white font-bold leading-tight mb-4">
                Design Report — Pure Composition
              </h3>
              <p className="text-sm text-white/90 leading-relaxed font-normal max-w-xs">
                A distraction-free typography composer with instant markdown clarity, live counter limits, and zero noisy gimmicks.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#18181b] hover:bg-white/95 text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Read article
              </Link>
            </div>
          </motion.div>

          {/* Card 2: Electric Azure & Cobalt (Optimized for Conversions / Reflections) */}
          <motion.div
            {...getPopProps(0.3)}
            className="rounded-[30px] p-7 sm:p-9 min-h-[420px] sm:min-h-[460px] bg-gradient-to-br from-[#007aff] via-[#0066eb] to-[#3b82f6] text-white relative flex flex-col justify-between overflow-hidden shadow-xl border border-white/15 group"
          >
            {/* Abstract Folded Angular Geometric Accent */}
            <div className="absolute top-1/4 -right-12 w-48 h-48 bg-white/10 rounded-3xl transform rotate-45 pointer-events-none group-hover:rotate-50 transition-transform duration-700" />
            <div className="absolute bottom-8 right-8 w-28 h-28 bg-sky-300/20 rounded-full blur-lg pointer-events-none" />

            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80 block mb-4">
                CASE STUDY · 02
              </span>
              <h3 className="editorial-h1 text-2xl sm:text-3xl text-white font-bold leading-tight mb-4">
                Optimized for Quiet Discovery
              </h3>
              <p className="text-sm text-white/90 leading-relaxed font-normal max-w-xs">
                No algorithmic baiting. Pure chronological stream where your words find connection based on merit and truth.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/feed"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#18181b] hover:bg-white/95 text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Read article
              </Link>
            </div>
          </motion.div>

          {/* Card 3: Midnight Noir with Overlapping Violet & Coral Geometrics */}
          <motion.div
            {...getPopProps(0.45)}
            className="rounded-[30px] p-7 sm:p-9 min-h-[420px] sm:min-h-[460px] bg-[#0c0d10] text-white relative flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10 group"
          >
            {/* Overlapping Vibrant Shapes (Faithful to Reference Image 2) */}
            <div className="absolute bottom-4 -right-6 w-44 h-44 rounded-3xl bg-gradient-to-tr from-[#7c3aed] to-[#a855f7] transform rotate-18 opacity-90 pointer-events-none group-hover:rotate-24 transition-transform duration-700 shadow-lg" />
            <div className="absolute bottom-12 right-6 w-36 h-36 rounded-3xl bg-gradient-to-tr from-[#ff6b35] to-[#f97316] transform -rotate-12 opacity-95 pointer-events-none group-hover:-rotate-6 transition-transform duration-700 shadow-md" />

            <div className="relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/70 block mb-4">
                REPORT · 03
              </span>
              <h3 className="editorial-h1 text-2xl sm:text-3xl text-white font-bold leading-tight mb-4">
                Design Report — Verified Identity
              </h3>
              <p className="text-sm text-white/80 leading-relaxed font-normal max-w-xs">
                Receive the official Postify verification badge at 100 likes, upload your custom profile banner, and leave your mark.
              </p>
            </div>

            <div className="relative z-10 pt-6">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-[#18181b] hover:bg-white/95 text-xs font-bold shadow-md active:scale-95 transition-all"
              >
                Read article
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION F: Editorial Brand Statement */}
      <section id="about" className="portal-container max-w-4xl mb-36 sm:mb-44 text-center">
        <motion.div
          {...getPopProps(0.15)}
          className="portal-card p-12 sm:p-20 md:p-24 bg-[var(--portal-card)] border border-[var(--portal-card-border)] relative overflow-hidden"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center mx-auto mb-8">
            <Quote size={32} />
          </div>

          <h2 className="editorial-h1 text-3xl sm:text-5xl md:text-6xl text-[var(--portal-heading)] mb-8 max-w-2xl mx-auto leading-tight">
            Some thoughts deserve more than a passing scroll.
          </h2>

          <p className="text-base sm:text-xl text-[var(--portal-meta)] max-w-2xl mx-auto leading-relaxed mb-10">
            Social feeds often reward reaction over reflection. We created Postify because writing clarifies our thoughts, gives voice to quiet observations, and opens honest windows into the lived experiences of others.
          </p>

          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-[#007aff]">
            <span>Designed for writers and curious minds</span>
          </div>
        </motion.div>
      </section>

      {/* SECTION G: Final Conversion Section */}
      <section className="portal-container max-w-4xl mb-32 sm:mb-40">
        <motion.div
          {...getPopProps(0.15)}
          className="rounded-[36px] p-12 sm:p-20 md:p-24 bg-gradient-to-b from-[#1c1c1e] to-[#0b0b0f] text-white text-center shadow-xl border border-white/10 relative overflow-hidden"
        >
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="editorial-h1 text-3xl sm:text-5xl md:text-6xl text-white mb-6 leading-tight">
              Make room for your next reflection.
            </h2>

            <p className="text-base sm:text-xl text-white/80 font-normal leading-relaxed mb-10 max-w-xl">
              Start writing, discover new voices, and share the ideas that matter to you.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
              <Link to="/register">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-[#007aff] text-white hover:bg-[#0069dc] shadow-md active:scale-95 px-10 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-semibold tracking-wide"
                >
                  Create Your Account
                </Button>
              </Link>
              <Link to="/feed">
                <Button
                  variant="ghost"
                  size="lg"
                  className="bg-white/15 hover:bg-white/25 text-white border border-white/20 active:scale-95 px-10 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-semibold tracking-wide"
                >
                  Explore the Feed
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
};
