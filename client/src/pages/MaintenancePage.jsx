import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Wrench, Clock, CheckCircle2, Bell, RefreshCw, Send, ShieldCheck, ArrowRight } from 'lucide-react';

export const MaintenancePage = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
    }, 700);
  };

  return (
    <Layout>
      <Helmet>
        <title>Maintenance in Progress | Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="portal-container max-w-2xl mx-auto pt-36 pb-24 px-4">
        <div className="relative rounded-[26px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] p-6 sm:p-12 shadow-xl overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-gradient-to-b from-[#7b7ed8]/15 via-[#007aff]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Maintenance Graphic */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#007aff]/10 via-[#7b7ed8]/15 to-[#e8a87c]/10 border border-[var(--portal-card-border)] flex items-center justify-center text-[#007aff] shadow-inner">
                <Wrench className="w-10 h-10 animate-[spin_8s_linear_infinite]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md animate-pulse">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Scheduled Platform Evolution</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--portal-heading)] mb-3 tracking-tight">
              Under System Maintenance
            </h1>

            <p className="text-sm sm:text-base text-[var(--portal-meta)] max-w-lg leading-relaxed mb-8">
              Postify is currently executing planned database optimizations and infrastructure scalability upgrades. All data remains safe and protected.
            </p>

            {/* Progress Checklist */}
            <div className="w-full max-w-md mx-auto mb-8 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-[var(--portal-card-border)] text-left">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--portal-subtle)] block mb-3">
                Deployment Phases
              </span>
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Database Snapshot & Backup Archive Completed</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#007aff] font-medium">
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Migrating Redis Caching & Socket Clusters (85%)</span>
                </div>
                <div className="flex items-center gap-2.5 text-[var(--portal-meta)]">
                  <span className="w-4 h-4 rounded-full border border-[var(--portal-subtle)] shrink-0 flex items-center justify-center text-[10px]">3</span>
                  <span>Health Check & Zero-Downtime Traffic Switch</span>
                </div>
              </div>
            </div>

            {/* Email Notification Form */}
            <div className="w-full max-w-md mx-auto mb-8">
              {subscribed ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>You're on the list! We will ping you the moment we are back online.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email for live notification..."
                    required
                    className="flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-[var(--portal-heading)] placeholder-[var(--portal-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[#007aff]"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{loading ? 'Subscribing...' : 'Notify Me'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Live Refresh Check */}
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--portal-meta)]">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 hover:text-[#007aff] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Status Again</span>
              </button>
              <span>•</span>
              <a
                href="https://github.com/MdAfnanNaushad/Postify"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#007aff] transition-colors"
              >
                GitHub Repository
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MaintenancePage;
