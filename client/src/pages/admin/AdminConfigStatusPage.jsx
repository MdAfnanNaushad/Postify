import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sliders, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminConfigStatusPage = () => {
  const [configList, setConfigList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get('/system/config-status');
        if (res.data?.success) {
          setConfigList(res.data.configuration || []);
        }
      } catch (err) {
        console.error('Failed to load configuration status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <>
      <Helmet>
        <title>Configuration Status — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Environment & System Readiness
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Security audit checklist verifying presence of required operational environment variables.
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="portal-card p-4 border-l-4 border-l-emerald-500 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-[var(--portal-heading)]">Zero-Exposure Security Guarantee</span>
            <p className="text-[var(--portal-meta)] leading-relaxed">
              Environment secrets, API tokens, and connection strings are strictly evaluated server-side. Under zero circumstances are raw credentials exposed to browser clients.
            </p>
          </div>
        </div>

        {/* Configuration Items Table */}
        <div className="portal-card divide-y divide-[var(--portal-card-border)] overflow-hidden">
          {configList.length > 0 ? (
            configList.map((item) => (
              <div key={item.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--portal-heading)]">
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      item.severity === 'critical'
                        ? 'bg-rose-500/10 text-rose-500'
                        : item.severity === 'high'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-zinc-500/10 text-[var(--portal-meta)]'
                    }`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--portal-meta)]">
                    {item.description}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    item.configured
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  }`}>
                    {item.configured ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {item.configured ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-[var(--portal-meta)]">
              {loading ? 'Evaluating system configuration...' : 'No configuration indicators available.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
