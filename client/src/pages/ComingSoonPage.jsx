import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Sparkles, Code2, Cpu, Mic, GitBranch, ArrowRight, CheckCircle2, Home, Rocket } from 'lucide-react';

const UPCOMING_FEATURES = [
  {
    icon: Cpu,
    title: 'AI Code Companion',
    description: 'Context-aware algorithmic summaries and architectural reflections generated straight from your commits.',
    tag: 'Phase 13'
  },
  {
    icon: Code2,
    title: 'Live Interactive Sandboxes',
    description: 'Embed runnable WebAssembly snippets directly inside build logs and technical reflections.',
    tag: 'Preview'
  },
  {
    icon: Mic,
    title: 'Audio Tech Digest',
    description: 'Listen to AI-synthesized weekly engineering digests on your commute or during compilation.',
    tag: 'Audio'
  },
  {
    icon: GitBranch,
    title: 'GitHub Action Continuous Sync',
    description: 'Automate build log publishing directly from your CI/CD pipelines via our official GitHub Action.',
    tag: 'DevOps'
  }
];

export const ComingSoonPage = () => {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 8,
    minutes: 42,
    seconds: 19
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleJoinWaitlist = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setJoined(true);
    }, 600);
  };

  return (
    <Layout>
      <Helmet>
        <title>Coming Soon — What's Next | Postify</title>
        <meta name="description" content="Discover the next generation of developer reflection and build log features coming soon to Postify." />
      </Helmet>

      <div className="portal-container max-w-4xl mx-auto pt-36 pb-24 px-4">
        {/* Header Hero */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#007aff]/10 via-[#7b7ed8]/10 to-[#e8a87c]/10 text-[#007aff] dark:text-[#589cff] mb-4 border border-[#007aff]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#007aff]" />
            <span>The Next Frontier of Developer Reflections</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[var(--portal-heading)] mb-4 tracking-tight leading-tight">
            Something Extraordinary is Brewing
          </h1>

          <p className="text-sm sm:text-base text-[var(--portal-meta)] leading-relaxed">
            We are pushing the boundaries of technical storytelling, engineering journals, and real-time community collaboration.
          </p>

          {/* Countdown Clock */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto my-8">
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[#007aff] block">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-medium text-[var(--portal-subtle)]">Days</span>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[var(--portal-heading)] block">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-medium text-[var(--portal-subtle)]">Hours</span>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[var(--portal-heading)] block">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-medium text-[var(--portal-subtle)]">Mins</span>
            </div>
            <div className="p-3 sm:p-4 rounded-2xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xs">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-[#e8a87c] block">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs uppercase font-medium text-[var(--portal-subtle)]">Secs</span>
            </div>
          </div>

          {/* VIP Access Email Form */}
          <div className="max-w-md mx-auto mb-8">
            {joined ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You're on the early-access VIP list! Invitation incoming.</span>
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email for VIP early access..."
                  required
                  className="flex-1 px-4 py-3 rounded-full text-xs sm:text-sm bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-[var(--portal-heading)] placeholder-[var(--portal-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[#007aff]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-white text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Rocket className="w-4 h-4" />
                  <span>{loading ? 'Joining...' : 'Get Early Access'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Feature Teaser Cards */}
        <div className="mb-14">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold text-[var(--portal-heading)] mb-2">
              Preview What We're Engineering
            </h2>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)]">
              Designed specifically for builders, open-source maintainers, and tech thinkers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {UPCOMING_FEATURES.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-[22px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] hover:border-[#007aff]/30 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-[var(--portal-meta)] border border-[var(--portal-card-border)]">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[var(--portal-heading)] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Return Button */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-[var(--portal-meta)] hover:text-[#007aff] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Return to Community Feed</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default ComingSoonPage;
