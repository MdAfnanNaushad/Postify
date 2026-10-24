import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Helmet } from 'react-helmet-async';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, adminRoute } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide administrative credentials.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(`${adminRoute}/dashboard`);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your administrative credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Control Center — Sign In</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[var(--portal-canvas)] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#007aff] to-[#7a7fd4] text-white shadow-lg shadow-[#007aff]/20 mb-2">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
              Postify Control Center
            </h1>
            <p className="text-xs text-[var(--portal-meta)] max-w-xs mx-auto">
              Restricted administrative environment. Server-side authorization required for all operations.
            </p>
          </div>

          {/* Login Card */}
          <div className="portal-card p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--portal-text)] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--portal-subtle)]" />
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@postify.dev"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)] disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--portal-text)] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--portal-subtle)]" />
                  Administrator Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] placeholder:text-[var(--portal-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--portal-accent)] disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[var(--portal-accent)] hover:opacity-90 transition-all shadow-md shadow-[var(--portal-accent)]/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <span>Authenticate Session</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[10px] text-[var(--portal-subtle)]">
              All administrative access attempts are securely recorded in the immutable audit log.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
