import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Cpu, Activity, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { KpiCard } from '../../components/admin/KpiCard';
import { AnalyticsChart } from '../../components/admin/AnalyticsChart';
import adminApi from '../../services/adminApi';

export const AdminTrafficPage = () => {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get('/system/traffic');
        if (res.data?.success) {
          setTelemetry(res.data.telemetry);
        }
      } catch (err) {
        console.error('Failed to load traffic metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraffic();
  }, []);

  const latency = telemetry?.latency || {};
  const statusCounts = telemetry?.statusCounts || {};
  const hourly = telemetry?.hourlyTraffic || [];
  const topRoutes = telemetry?.topRoutes || [];

  return (
    <>
      <Helmet>
        <title>API & Traffic Analytics — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            API Traffic & Latency Distribution
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Real-time telemetry measuring request volume, HTTP status distribution, and response time percentiles.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total API Calls"
            value={telemetry?.totalRequests}
            subtitle="Requests instrumented since server boot"
            icon={Cpu}
            accentColor="blue"
          />
          <KpiCard
            title="Average Latency"
            value={latency.avg !== undefined ? `${latency.avg} ms` : '—'}
            subtitle={`p50 Median: ${latency.p50 || 0} ms`}
            icon={Clock}
            accentColor="emerald"
          />
          <KpiCard
            title="95th Percentile Latency"
            value={latency.p95 !== undefined ? `${latency.p95} ms` : '—'}
            subtitle={`p99 Tail: ${latency.p99 || 0} ms`}
            icon={Activity}
            accentColor="purple"
          />
          <KpiCard
            title="API Error Rate"
            value={telemetry?.errorRate !== undefined ? `${telemetry.errorRate}%` : '0%'}
            subtitle={`${telemetry?.totalErrors || 0} failed requests recorded`}
            icon={AlertTriangle}
            accentColor={telemetry?.errorRate > 5 ? 'rose' : 'emerald'}
          />
        </div>

        {/* Hourly Traffic Chart */}
        <div className="portal-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--portal-heading)]">
            Hourly Request Throughput
          </h3>
          <p className="text-[11px] text-[var(--portal-subtle)]">
            Volume of requests and error responses bucketed by hour
          </p>
          <AnalyticsChart
            type="area"
            data={hourly}
            series={[
              { dataKey: 'requests', name: 'Requests', stroke: '#007aff' },
              { dataKey: 'errors', name: 'Errors', stroke: '#ef4444' }
            ]}
            xAxisKey="hour"
            height={260}
          />
        </div>

        {/* Status Codes and Top Routes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              HTTP Response Codes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-center">
                <span className="text-[10px] font-bold text-emerald-500 block">2xx Success</span>
                <span className="text-lg font-extrabold text-[var(--portal-heading)]">{statusCounts['2xx'] || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-center">
                <span className="text-[10px] font-bold text-blue-500 block">3xx Redirect</span>
                <span className="text-lg font-extrabold text-[var(--portal-heading)]">{statusCounts['3xx'] || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-center">
                <span className="text-[10px] font-bold text-amber-500 block">4xx Client Err</span>
                <span className="text-lg font-extrabold text-[var(--portal-heading)]">{statusCounts['4xx'] || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-center">
                <span className="text-[10px] font-bold text-rose-500 block">5xx Server Err</span>
                <span className="text-lg font-extrabold text-[var(--portal-heading)]">{statusCounts['5xx'] || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Most Traversed Endpoints
            </h3>
            <div className="divide-y divide-[var(--portal-card-border)] text-xs">
              {topRoutes.length > 0 ? (
                topRoutes.map((r) => (
                  <div key={r.route} className="py-2.5 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[var(--portal-heading)] truncate max-w-xs">{r.route}</span>
                    <span className="font-bold text-[var(--portal-accent)]">{r.hits.toLocaleString()} hits</span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[var(--portal-meta)]">No route telemetry collected yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
