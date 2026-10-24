import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Clock, CheckCircle2, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminBackgroundJobsPage = () => {
  const [jobsData, setJobsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/system/jobs');
      if (res.data?.success) {
        setJobsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load background jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const runs = jobsData?.runs || [];
  const tasks = jobsData?.recentTasks || [];

  return (
    <>
      <Helmet>
        <title>Background Jobs — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              Scheduled Background Jobs
            </h2>
            <p className="text-xs text-[var(--portal-meta)] mt-0.5">
              Read-only telemetry for automated cron workers and batch digest distribution.
            </p>
          </div>
          <button
            onClick={fetchJobs}
            className="p-2 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cron Worker Metadata Card */}
        <div className="portal-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                  {jobsData?.jobType || 'Weekly Developer Digest'}
                </h3>
                <span className="text-xs font-mono text-[var(--portal-subtle)]">
                  Cron Schedule: {jobsData?.schedule || '0 0 * * 0'}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Active / Scheduled
            </span>
          </div>
          <p className="text-xs text-[var(--portal-meta)] leading-relaxed">
            Generates personalized weekly summaries for developers and coordinates Resend email dispatching with duplicate prevention and ambiguous timeout recovery safeguards.
          </p>
        </div>

        {/* Batch Runs History */}
        <div className="portal-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--portal-heading)]">
            Historical Batch Execution Runs
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--portal-card-border)] text-[var(--portal-subtle)] uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Period Key</th>
                  <th className="py-2.5 px-3">Generated</th>
                  <th className="py-2.5 px-3">Email Sent</th>
                  <th className="py-2.5 px-3">Skipped</th>
                  <th className="py-2.5 px-3">Failed</th>
                  <th className="py-2.5 px-3 text-right">Run Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--portal-card-border)]">
                {runs.length > 0 ? (
                  runs.map((r) => (
                    <tr key={r.periodKey} className="hover:bg-[var(--portal-canvas)]/50">
                      <td className="py-3 px-3 font-mono font-bold text-[var(--portal-heading)]">{r.periodKey}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--portal-accent)]">{r.totalDigests}</td>
                      <td className="py-3 px-3 text-emerald-500 font-semibold">{r.deliveredEmail}</td>
                      <td className="py-3 px-3 text-[var(--portal-meta)]">{r.skippedEmail}</td>
                      <td className="py-3 px-3 text-rose-500 font-semibold">{r.failedEmail}</td>
                      <td className="py-3 px-3 text-right text-[var(--portal-subtle)] font-mono">
                        {new Date(r.latestRun).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[var(--portal-meta)]">
                      {loading ? 'Querying digest batch logs...' : 'No historical batch runs recorded.'}
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
