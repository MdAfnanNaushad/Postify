import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';

export const NotFoundPage = () => {
  return (
    <Layout>
      <Helmet>
        <title>404 — Story Not Found | Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="portal-container max-w-lg mx-auto pt-44 pb-24 px-4 text-center">
        <div className="portal-card p-10 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-md">
          <span className="editorial-h1 text-6xl text-[#007aff] block mb-4">404</span>
          <h1 className="editorial-h2 text-2xl text-[var(--portal-heading)] mb-3">
            This Page Does Not Exist
          </h1>
          <p className="text-sm text-[var(--portal-meta)] leading-relaxed mb-8 max-w-sm mx-auto">
            The story, reflection, or page you are looking for has been moved or was never published.
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3 rounded-[50px] bg-[#007aff] text-white text-sm font-semibold hover:bg-[#0069dc] transition-all shadow-xs"
          >
            Return to Community Feed
          </Link>
        </div>
      </div>
    </Layout>
  );
};
