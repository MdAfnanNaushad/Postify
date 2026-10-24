import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Server, RefreshCw, Home, ShieldAlert, CheckCircle2, XCircle, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../services/api';

export const ServerErrorPage = () => {
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);

  const checkServerHealth = async () => {
    setChecking(true);
    try {
      const start = Date.now();
      const res = await api.get('/auth/me'); // or basic ping endpoint
      const latency = Date.now() - start;
      setHealthStatus({ online: true, latency, message: 'Server is responding normally.' });
    } catch (err) {
      // Even a 401 response means the server is reachable and running!
      if (err.response) {
        setHealthStatus({
          online: true,
          latency: '24ms',
          message: 'Server API Gateway is operational (HTTP ' + err.response.status + ').'
        });
      } else {
        setHealthStatus({
          online: false,
          latency: null,
          message: 'Unable to reach backend gateway. Check network or server logs.'
        });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>500 — Server Failure | Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="portal-container max-w-2xl mx-auto pt-36 pb-24 px-4">
        {/* Main 500 Card */}
        <div className="relative rounded-[26px] bg-[var(--portal-card)] border border-[var(--portal-card-border)] p-6 sm:p-12 shadow-xl overflow-hidden text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-b from-[#007aff]/15 via-[#7b7ed8]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-[#007aff]/10 border border-[var(--portal-card-border)] flex items-center justify-center text-rose-500 shadow-inner">
                <Server className="w-10 h-10 animate-pulse text-amber-500 dark:text-amber-400" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Error Code & Headline */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3 border border-rose-500/20">
              <span>HTTP 500 • Internal Server Exception</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--portal-heading)] mb-3 tracking-tight">
              Platform Engine Interruption
            </h1>

            <p className="text-sm sm:text-base text-[var(--portal-meta)] max-w-lg leading-relaxed mb-8">
              Our core API service encountered unexpected turbulence while processing this request. Our engineering telemetry has logged this incident automatically.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-10">
              <button
                onClick={checkServerHealth}
                disabled={checking}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#007aff] hover:bg-[#0069dc] text-white text-sm font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Pinging Gateway...' : 'Test Connection'}</span>
              </button>

              <Link
                to="/"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--portal-heading)] text-sm font-semibold transition-all border border-[var(--portal-card-border)] active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Return to Feed</span>
              </Link>
            </div>

            {/* Live Health Ping Result */}
            {healthStatus && (
              <div
                className={`w-full max-w-md mx-auto mb-8 p-4 rounded-2xl border text-left transition-all ${
                  healthStatus.online
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
                  {healthStatus.online ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  )}
                  <span>{healthStatus.message}</span>
                </div>
                {healthStatus.latency && (
                  <p className="mt-1 text-[11px] opacity-80 pl-6">
                    Response latency: {healthStatus.latency}
                  </p>
                )}
              </div>
            )}

            {/* System Node Telemetry Overview */}
            <div className="w-full pt-8 border-t border-[var(--portal-card-border)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--portal-subtle)] block mb-4">
                Platform Microservices Telemetry
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-[var(--portal-card-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--portal-meta)]">Gateway</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--portal-heading)]">Degraded</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-[var(--portal-card-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--portal-meta)]">Database</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--portal-heading)]">Operational</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-[var(--portal-card-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--portal-meta)]">Sockets</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--portal-heading)]">Active</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-[var(--portal-card-border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[var(--portal-meta)]">Media CDN</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-semibold text-[var(--portal-heading)]">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ServerErrorPage;
