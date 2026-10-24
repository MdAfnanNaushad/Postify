import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Send, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminEmailDeliveryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmailStats = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/system/email-deliveries');
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load email delivery telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailStats();
  }, []);

  const summary = data?.statusSummary || {};
  const deliveries = data?.deliveries || [];

  return (
    <>
      <Helmet>
        <title>Email Delivery & Resend — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              Email Dispatch & Resend Telemetry
            </h2>
            <p className="text-xs text-[var(--portal-meta)] mt-0.5">
              Observability metrics for outgoing developer digest emails and deliverability status.
            </p>
          </div>
          <button
            onClick={fetchEmailStats}
            className="p-2 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Configuration Card */}
        <div className="portal-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              data?.configured ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
            }`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Email Provider: {data?.provider || 'Resend'}
              </h3>
              <p className="text-xs text-[var(--portal-meta)]">
                Sender Address: <span className="font-mono text-[var(--portal-heading)]">{data?.senderAddress || 'Not configured'}</span>
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
            data?.configured ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
          }`}>
            {data?.configured ? 'Configured & Ready' : 'API Key Missing'}
          </span>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="portal-card p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-500">Delivered</span>
            <div className="text-xl font-extrabold text-[var(--portal-heading)]">{summary.email_sent || 0}</div>
          </div>
          <div className="portal-card p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--portal-meta)]">Skipped / Pref</span>
            <div className="text-xl font-extrabold text-[var(--portal-heading)]">{summary.email_skipped || 0}</div>
          </div>
          <div className="portal-card p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-500">Failed</span>
            <div className="text-xl font-extrabold text-rose-500">{summary.email_failed || 0}</div>
          </div>
          <div className="portal-card p-4 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-amber-500">Ambiguous Timeouts</span>
            <div className="text-xl font-extrabold text-amber-500">{data?.ambiguousTimeoutCount || 0}</div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="portal-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--portal-heading)]">
            Recent Email Delivery Dispatches
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--portal-card-border)] text-[var(--portal-subtle)] uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3 text-right">Message ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--portal-card-border)]">
                {deliveries.length > 0 ? (
                  deliveries.map((d) => (
                    <tr key={d._id} className="hover:bg-[var(--portal-canvas)]/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[var(--portal-heading)]">{d.user?.name || d.user?.username || 'User'}</div>
                        <div className="text-[10px] text-[var(--portal-subtle)] font-mono">{d.user?.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--portal-meta)]">{d.periodKey}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.deliveryStatus === 'email_sent'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {d.deliveryStatus?.replace('email_', '')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--portal-heading)]">{d.deliveryAttempts || 1}</td>
                      <td className="py-3 px-3 text-right font-mono text-[10px] text-[var(--portal-subtle)] truncate max-w-[120px]">
                        {d.emailMessageId || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[var(--portal-meta)]">
                      {loading ? 'Checking email deliveries...' : 'No email dispatches recorded in database.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
