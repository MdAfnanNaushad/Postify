import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { UserPlus, Users, Award } from 'lucide-react';
import { KpiCard } from '../../components/admin/KpiCard';
import adminApi from '../../services/adminApi';

export const AdminFollowsPage = () => {
  const [data, setData] = useState({ totalFollows: 0, topFollowed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollows = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get('/follows');
        if (res.data?.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load follows:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFollows();
  }, []);

  return (
    <>
      <Helmet>
        <title>Follows & Community Growth — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Follows & Network Topology
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Overview of developer follow relationships and community connection density.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <KpiCard
            title="Total Follow Connections"
            value={data.totalFollows}
            subtitle="Distinct one-way following edges in database"
            icon={UserPlus}
            accentColor="blue"
          />
        </div>

        {/* Top Followed Developers */}
        <div className="portal-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-[var(--portal-heading)]">
              Most Followed Developers
            </h3>
          </div>

          <div className="divide-y divide-[var(--portal-card-border)]">
            {data.topFollowed && data.topFollowed.length > 0 ? (
              data.topFollowed.map((item, idx) => (
                <div key={item.user?._id || idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-[var(--portal-subtle)]">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white flex items-center justify-center font-bold text-xs">
                      {item.user?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--portal-heading)]">
                        {item.user?.name}
                      </div>
                      <div className="text-[10px] text-[var(--portal-subtle)] font-mono">
                        @{item.user?.username}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[var(--portal-accent)]">
                      {item.followersCount}
                    </span>
                    <span className="text-[10px] text-[var(--portal-meta)] block">
                      followers
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-[var(--portal-meta)]">
                {loading ? 'Calculating follow relationships...' : 'No follow relationships recorded.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
