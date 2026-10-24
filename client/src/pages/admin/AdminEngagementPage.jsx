import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Heart, MessageSquare, Repeat, Quote, HelpCircle } from 'lucide-react';
import { KpiCard } from '../../components/admin/KpiCard';
import { AnalyticsChart } from '../../components/admin/AnalyticsChart';
import adminApi from '../../services/adminApi';

export const AdminEngagementPage = () => {
  const [data, setData] = useState({ series: [], distribution: [] });
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        setLoading(true);
        const [engRes, dashRes] = await Promise.all([
          adminApi.get('/analytics/engagement?range=30d'),
          adminApi.get('/dashboard')
        ]);
        setData(engRes.data || { series: [], distribution: [] });
        setKpis(dashRes.data?.data?.engagement || null);
      } catch (err) {
        console.error('Failed to load engagement:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, []);

  return (
    <>
      <Helmet>
        <title>Engagement Analytics — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Engagement & Interaction Analytics
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Detailed breakdown of reactions, replies, reposts, and feed engagement density.
          </p>
        </div>

        {/* Engagement KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Likes"
            value={kpis?.totalLikes}
            subtitle="Reactions on posts & replies"
            icon={Heart}
            accentColor="rose"
          />
          <KpiCard
            title="Total Replies"
            value={kpis?.totalReplies}
            subtitle="Threaded discussions"
            icon={MessageSquare}
            accentColor="blue"
          />
          <KpiCard
            title="Total Reposts"
            value={kpis?.totalReposts}
            subtitle="Shared posts in timeline"
            icon={Repeat}
            accentColor="emerald"
          />
          <KpiCard
            title="Quote Posts"
            value={kpis?.totalQuotes}
            subtitle="Posts with technical commentary"
            icon={Quote}
            accentColor="amber"
          />
        </div>

        {/* Formula Explanation Card */}
        <div className="portal-card p-4 border-l-4 border-l-[var(--portal-accent)] flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[var(--portal-accent)] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-[var(--portal-heading)]">
              Documented Engagement Rate Formula
            </span>
            <p className="text-[var(--portal-meta)] font-mono text-[11px]">
              Engagement Rate = (Total Likes + Total Replies + Total Reposts) / Total Posts
            </p>
            <p className="text-[var(--portal-subtle)] text-[11px]">
              Current Calculated Rate: <strong className="text-[var(--portal-heading)]">{kpis?.engagementRate ?? '—'}</strong> interactions per post.
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 portal-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Interaction Volume (Last 30 Days)
            </h3>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Time-series curve of replies, reposts, and quote posts
            </p>
            <AnalyticsChart
              type="area"
              data={data.series}
              series={[
                { dataKey: 'replies', name: 'Replies', stroke: '#007aff' },
                { dataKey: 'reposts', name: 'Reposts', stroke: '#10b981' },
                { dataKey: 'quotes', name: 'Quotes', stroke: '#f59e0b' }
              ]}
              xAxisKey="date"
              height={270}
            />
          </div>

          <div className="portal-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Distribution by Action Type
            </h3>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Aggregate share of community interactions
            </p>
            <AnalyticsChart
              type="pie"
              data={data.distribution}
              height={270}
            />
          </div>
        </div>
      </div>
    </>
  );
};
