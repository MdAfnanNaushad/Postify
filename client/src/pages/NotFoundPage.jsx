import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Compass, Search, Home, ArrowLeft, FolderGit2, BookOpen, Sparkles } from 'lucide-react';

export const NotFoundPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>404 — Story Not Found | Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="portal-container max-w-2xl mx-auto pt-36 pb-24 px-4 text-center">
        <div className="relative rounded-[26px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] p-6 sm:p-12 shadow-xl overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-b from-[#007aff]/15 via-[#7b7ed8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Visual Icon Badge */}
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center border border-[#007aff]/20 shadow-xs">
                <Compass className="w-8 h-8 animate-[spin_12s_linear_infinite]" />
              </div>
            </div>

            {/* Giant Editorial Number */}
            <span className="font-serif text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#007aff] via-[#7b7ed8] to-[#e8a87c] tracking-tight mb-2 select-none">
              404
            </span>

            {/* Headline */}
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--portal-heading)] mb-3 tracking-tight">
              Lost in the Digital Ether
            </h1>

            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto leading-relaxed mb-8">
              The reflection, project, or build log you are looking for might have been relocated, archived, or was never published.
            </p>

            {/* In-Page Quick Search */}
            <form onSubmit={handleSearch} className="w-full max-w-md mx-auto mb-8">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-4 text-[var(--portal-subtle)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, topics, or projects..."
                  className="w-full pl-11 pr-24 py-3 rounded-full text-xs sm:text-sm bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-[var(--portal-heading)] placeholder-[var(--portal-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[#007aff] transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-4 py-2 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-white text-xs font-semibold transition-all shadow-xs"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-8">
              <Link
                to="/"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-white text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Return to Feed</span>
              </Link>

              <button
                onClick={() => navigate(-1)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-heading)] text-xs sm:text-sm font-semibold transition-all border border-[var(--portal-card-border)] active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </div>

            {/* Quick Destination Pills */}
            <div className="w-full pt-6 border-t border-[var(--portal-card-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--portal-subtle)] block mb-3">
                Or explore popular destinations
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-text)] transition-colors border border-[var(--portal-card-border)]"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-[#007aff]" />
                  <span>Projects Hub</span>
                </Link>
                <Link
                  to="/digest"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-text)] transition-colors border border-[var(--portal-card-border)]"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                  <span>Weekly Digest</span>
                </Link>
                <Link
                  to="/topics"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-text)] transition-colors border border-[var(--portal-card-border)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Developer Topics</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
