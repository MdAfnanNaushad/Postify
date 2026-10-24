import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  HeartPulse,
  Server,
  Cpu,
  Database,
  Radio,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminSystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await adminApi.get('/system/health');
      if (res.data?.success) {
        setHealth(res.data.health);
      }
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const app = health?.application || {};
  const db = health?.database || {};
  const socket = health?.socket || {};
  const telemetry = health?.telemetry || {};

  return (
    <>
      <Helmet>
        <title>System Health & Telemetry — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              System Observability & Health
            </h2>
            <p className="text-xs text-[var(--portal-meta)] mt-0.5">
              Live server performance, Node process runtime, memory consumption, and database connection metrics.
            </p>
          </div>

          <button
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] text-xs font-semibold hover:bg-[var(--portal-canvas)] transition-colors flex items-center gap-2 self-start sm:self-auto shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Ping Services</span>
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          health?.status === 'healthy'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold text-sm block">
                {health?.status === 'healthy' ? 'All Core Subsystems Operational' : 'Degraded Cluster Status'}
              </span>
              <span className="text-[11px] opacity-80">
                Verified at {health ? new Date(health.timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-white/20">
            {health?.status || 'Active'}
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Node Process */}
          <div className="portal-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--portal-heading)]">
              <Cpu className="w-4 h-4 text-[#007aff]" />
              <span>Application Runtime</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Environment</span>
                <span className="font-mono font-bold text-[var(--portal-heading)] uppercase">{app.environment}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Node.js Version</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{app.nodeVersion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Process Platform</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{app.platform}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--portal-meta)]">Process Uptime</span>
                <span className="font-mono font-bold text-emerald-500">{app.uptimeFormatted}</span>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="portal-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--portal-heading)]">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>MongoDB Primary Cluster</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Connection Status</span>
                <span className="font-bold text-emerald-500 capitalize">{db.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Round-Trip Ping</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{db.pingMs !== null ? `${db.pingMs} ms` : '<1 ms'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Ready State</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{db.readyState === 1 ? '1 (Connected)' : db.readyState}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--portal-meta)]">Cluster Host</span>
                <span className="font-mono text-[11px] text-[var(--portal-subtle)] truncate max-w-[150px]">{db.host}</span>
              </div>
            </div>
          </div>

          {/* Memory Heap */}
          <div className="portal-card p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-bold text-[var(--portal-heading)]">
              <Server className="w-4 h-4 text-purple-500" />
              <span>Memory Footprint</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Heap Used</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{app.memory?.heapUsedMB} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Heap Allocated</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{app.memory?.heapTotalMB} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--portal-card-border)]">
                <span className="text-[var(--portal-meta)]">Resident Set (RSS)</span>
                <span className="font-mono font-bold text-[var(--portal-heading)]">{app.memory?.rssMB} MB</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--portal-meta)]">Socket Connections</span>
                <span className="font-mono font-bold text-[var(--portal-accent)]">{socket.activeConnections || 0} active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
