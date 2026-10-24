import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  TrendingUp,
  Users,
  FileText,
  Heart,
  ShieldAlert,
  FolderGit2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { AnalyticsChart } from '../../components/admin/AnalyticsChart';
import adminApi from '../../services/adminApi';

export const AdminAnalyticsPage = () => {
  const [range, setRange] = useState('30d');
  const [communityData, setCommunityData] = useState([]);
  const [contentData, setContentData] = useState({ series: [], distribution: [] });
  const [engagementData, setEngagementData] = useState({ series: [], distribution: [] });
  const [moderationData, setModerationData] = useState({ byStatus: [], byReason: [], series: [] });
  const [topPosts, setTopPosts] = useState([]);
  const [topDevelopers, setTopDevelopers] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [commRes, contRes, engRes, modRes, postsRes, devRes, hashRes] = await Promise.all([
          adminApi.get(`/analytics/community?range=${range}`),
          adminApi.get(`/analytics/content?range=${range}`),
          adminApi.get(`/analytics/engagement?range=${range}`),
          adminApi.get(`/analytics/moderation?range=${range}`),
          adminApi.get('/analytics/top-posts?limit=5'),
          adminApi.get('/analytics/top-developers?limit=5'),
          adminApi.get('/analytics/hashtags')
        ]);

        setCommunityData(commRes.data?.series || []);
        setContentData(contRes.data || { series: [], distribution: [] });
        setEngagementData(engRes.data || { series: [], distribution: [] });
        setModerationData(modRes.data || { byStatus: [], byReason: [], series: [] });
        setTopPosts(postsRes.data?.posts || []);
        setTopDevelopers(devRes.data?.developers || []);
        setHashtags(hashRes.data?.hashtags || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [range]);

  return (
    <>
      <Helmet>
        <title>Analytics & Insights — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header with Time-range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              Platform Analytics
            </h2>
            <p className="text-xs text-[var(--portal-meta)] mt-0.5">
              Time-series metrics and engagement distribution aggregated directly from MongoDB records.
            </p>
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-xl self-start sm:self-auto shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-[var(--portal-subtle)] ml-2" />
            {['7d', '30d', '90d', '12m'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  range === r
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-text)] hover:bg-[var(--portal-canvas)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Row 1: Community Growth & Content Creation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#007aff]" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Community Growth ({range.toUpperCase()})
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Daily developer signups and cumulative platform membership
            </p>
            <AnalyticsChart
              type="area"
              data={communityData}
              series={[
                { dataKey: 'newUsers', name: 'New Signups', stroke: '#007aff' },
                { dataKey: 'cumulativeUsers', name: 'Total Users', stroke: '#7a7fd4' }
              ]}
              xAxisKey="date"
              height={260}
            />
          </div>

          <div className="portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7a7fd4]" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Content Creation Activity
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Daily distribution of posts, replies, projects, and build logs
            </p>
            <AnalyticsChart
              type="bar"
              data={contentData.series}
              series={[
                { dataKey: 'posts', name: 'Posts', fill: '#007aff' },
                { dataKey: 'replies', name: 'Replies', fill: '#7a7fd4' },
                { dataKey: 'projects', name: 'Projects', fill: '#c98ab5' },
                { dataKey: 'buildLogs', name: 'Build Logs', fill: '#e8a87c' }
              ]}
              xAxisKey="date"
              height={260}
            />
          </div>
        </div>

        {/* Charts Row 2: Engagement Trends & Engagement Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Engagement Trends
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Reactions, comments, and reposts across developer discussions
            </p>
            <AnalyticsChart
              type="line"
              data={engagementData.series}
              series={[
                { dataKey: 'replies', name: 'Replies', stroke: '#007aff' },
                { dataKey: 'reposts', name: 'Reposts', stroke: '#10b981' },
                { dataKey: 'quotes', name: 'Quotes', stroke: '#f59e0b' }
              ]}
              xAxisKey="date"
              height={260}
            />
          </div>

          <div className="portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Interaction Breakdown
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Total volume by reaction type
            </p>
            <AnalyticsChart
              type="pie"
              data={engagementData.distribution}
              height={260}
            />
          </div>
        </div>

        {/* Charts Row 3: Moderation Resolution & Content Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Trust & Safety Activity
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Incoming user reports and administrative enforcement actions taken
            </p>
            <AnalyticsChart
              type="area"
              data={moderationData.series}
              series={[
                { dataKey: 'reports', name: 'Reports Submitted', stroke: '#ef4444' },
                { dataKey: 'actions', name: 'Actions Executed', stroke: '#10b981' }
              ]}
              xAxisKey="date"
              height={250}
            />
          </div>

          <div className="portal-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-[var(--portal-heading)]">
                Total Content Inventory
              </h3>
            </div>
            <p className="text-[11px] text-[var(--portal-subtle)]">
              Breakdown across posts, projects, journal entries, and replies
            </p>
            <AnalyticsChart
              type="pie"
              data={contentData.distribution}
              height={250}
            />
          </div>
        </div>

        {/* Tables Row: Top Posts & Top Developers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Posts */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Top Posts by Engagement Score
            </h3>
            <div className="divide-y divide-[var(--portal-card-border)]">
              {topPosts.length > 0 ? (
                topPosts.map((post) => (
                  <div key={post._id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--portal-heading)] line-clamp-2">
                        "{post.content}"
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--portal-subtle)]">
                        <span>@{post.author?.username || 'developer'}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[var(--portal-accent)]">
                        {post.engagementScore} pts
                      </div>
                      <div className="text-[10px] text-[var(--portal-meta)]">
                        {post.likesCount}L • {post.repliesCount}R • {post.repostsCount}RP
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[var(--portal-meta)]">No posts recorded.</div>
              )}
            </div>
          </div>

          {/* Top Contributing Developers */}
          <div className="portal-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Top Developers (Activity Score)
            </h3>
            <div className="divide-y divide-[var(--portal-card-border)]">
              {topDevelopers.length > 0 ? (
                topDevelopers.map((item, idx) => (
                  <div key={item.user?._id || idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {item.user?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--portal-heading)]">
                          {item.user?.name || item.user?.username}
                        </div>
                        <div className="text-[10px] text-[var(--portal-subtle)] font-mono">
                          @{item.user?.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-500">
                        {item.score} pts
                      </span>
                      <div className="text-[10px] text-[var(--portal-meta)]">
                        {item.postsCount} posts • {item.projectsCount} projects
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[var(--portal-meta)]">No developer stats available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
