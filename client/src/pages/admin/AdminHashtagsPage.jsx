import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Hash, TrendingUp, Search } from 'lucide-react';
import adminApi from '../../services/adminApi';

export const AdminHashtagsPage = () => {
  const [hashtags, setHashtags] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get('/analytics/hashtags');
        if (res.data?.success) {
          setHashtags(res.data.hashtags || []);
        }
      } catch (err) {
        console.error('Failed to load hashtags:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHashtags();
  }, []);

  const filtered = hashtags.filter((h) =>
    h.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Hashtags & Discovery — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
            Hashtags & Community Discovery
          </h2>
          <p className="text-xs text-[var(--portal-meta)] mt-0.5">
            Real-time index of trending technical topics and post associations.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--portal-subtle)]" />
          <input
            type="text"
            placeholder="Search hashtags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)]"
          />
        </div>

        {/* Hashtags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <div
                key={item.tag}
                className="portal-card p-4 flex items-center justify-between hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--portal-accent)]/10 text-[var(--portal-accent)] flex items-center justify-center font-bold text-sm shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[var(--portal-heading)] block">
                      #{item.tag}
                    </span>
                    <span className="text-[10px] text-[var(--portal-subtle)]">
                      Last used: {item.latestPost ? new Date(item.latestPost).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-[var(--portal-heading)]">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[var(--portal-meta)] block">
                    posts
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-xs text-[var(--portal-meta)] portal-card">
              {loading ? 'Aggregating community hashtag usage...' : 'No hashtags recorded in published posts.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
