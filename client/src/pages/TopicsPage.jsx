import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { LottieLoader } from '../components/common';
import { Hash, TrendingUp, Sparkles, ArrowRight, Layers } from 'lucide-react';

export const TopicsPage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/topics?limit=50');
        if (res.data?.success) {
          setTopics(res.data.topics || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load topics.');
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, []);

  return (
    <Layout>
      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-[var(--portal-card-border)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#007aff]/10 dark:bg-[#007aff]/20 flex items-center justify-center text-[#007aff]">
              <Hash size={22} />
            </div>
            <div>
              <h1 className="editorial-h2 text-2xl sm:text-3xl font-semibold text-[var(--portal-heading)]">
                Topics & Technologies
              </h1>
              <p className="text-xs sm:text-sm text-[var(--portal-meta)]">
                Explore real developer discussions, architectures, and snippets indexed by topic
              </p>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <LottieLoader size={110} />
            <span className="text-xs text-[var(--portal-meta)] font-medium">Indexing topics...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs sm:text-sm mb-6">
            {error}
          </div>
        )}

        {/* Topics Grid */}
        {!loading && topics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map((item) => (
              <Link
                key={item.tag}
                to={`/topics/${item.tag}`}
                className="group portal-card p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 font-mono text-base font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors">
                      <span className="text-[#007aff]">#</span>
                      {item.tag}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-[var(--portal-meta)] group-hover:text-[#007aff] group-hover:translate-x-1 transition-all"
                    />
                  </div>
                  <p className="text-xs text-[var(--portal-meta)] leading-relaxed">
                    Discussions and technical publications tagged with #{item.tag}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--portal-card-border)] flex items-center justify-between text-[11px] text-[var(--portal-meta)]">
                  <span className="font-semibold text-[var(--portal-heading)]">
                    {item.count} {item.count === 1 ? 'post' : 'posts'}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={11} className="text-emerald-500" />
                    Active
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && topics.length === 0 && !error && (
          <div className="text-center py-16 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
            <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-[var(--portal-meta)]">
              <Layers size={24} className="text-[#007aff]" />
            </div>
            <h3 className="editorial-h2 text-xl font-medium text-[var(--portal-heading)] mb-1">
              No topics indexed yet
            </h3>
            <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-md mx-auto">
              When authors write posts containing hashtags like #React, #Node, #SystemDesign, they will appear here automatically.
            </p>
            <Link
              to="/feed"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-sm"
            >
              Go to Feed
            </Link>
          </div>
        )}
      </PageContainer>
    </Layout>
  );
};

export default TopicsPage;
