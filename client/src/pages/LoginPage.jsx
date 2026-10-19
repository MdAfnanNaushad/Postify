import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { AuthStoryPanel } from '../components/auth/AuthStoryPanel';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ArrowLeft } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await login(email, password);
      if (res.success) {
        navigate('/profile');
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[var(--portal-canvas)] text-[var(--portal-text)] flex flex-col justify-center px-3 sm:px-6 py-2 sm:py-3 lg:py-3 transition-colors duration-200">
      <Helmet>
        <title>Sign In — Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="w-full max-w-[1440px] mx-auto h-full flex flex-col justify-center">
        {/* 60:40 Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch lg:h-[calc(100vh-1.5rem)] max-h-[820px]">
          {/* Left: 60% Literary Atmosphere Panel */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <AuthStoryPanel />
          </div>

          {/* Right: 40% Login Form Card */}
          <div className="lg:col-span-5 flex flex-col justify-center h-full">
            <div className="portal-card p-5 sm:p-7 lg:p-7 xl:p-8 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xl h-full flex flex-col justify-between rounded-3xl lg:rounded-4xl transition-colors duration-200">
              {/* Header */}
              <div className="text-left mb-3 flex flex-col items-start w-full">
                <div className="flex items-center justify-between w-full mb-2">
                  <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
                    <img
                      src="/postifylogo2.png"
                      alt="Postify"
                      className="w-10 h-10 sm:w-11 sm:h-11 object-contain drop-shadow-sm"
                    />
                  </Link>
                  <ThemeToggle />
                </div>
                <h1 className="editorial-h1 text-2xl sm:text-3xl text-[var(--portal-heading)] mb-1 font-normal">Welcome Back</h1>
                <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed">
                  Sign in to your account to continue writing stories and reflections.
                </p>
              </div>

              {error && (
                <div className="mb-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200/50 dark:border-red-900/40">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="writer@postify.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  showPasswordToggle
                  required
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold"
                    loading={loading}
                  >
                    Sign In
                  </Button>
                </div>
              </form>

              {/* Footer Links */}
              <div className="mt-4 pt-3.5 border-t border-[var(--portal-card-border)] text-center text-xs sm:text-sm text-[var(--portal-meta)]">
                <span>Don&apos;t have an account? </span>
                <Link
                  to="/register"
                  className="text-[#007aff] font-semibold hover:underline ml-1"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
