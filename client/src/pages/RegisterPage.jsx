import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { Camera, ArrowLeft } from 'lucide-react';
import { AuthStoryPanel } from '../components/auth/AuthStoryPanel';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    age: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Avatar image must be smaller than 2MB.');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.username) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Construct multipart form data if avatar is chosen
      const submission = new FormData();
      submission.append('name', formData.name);
      submission.append('username', formData.username);
      submission.append('email', formData.email);
      submission.append('password', formData.password);
      if (formData.age) submission.append('age', formData.age);
      if (avatarFile) submission.append('profilepic', avatarFile);

      const res = await register(submission);
      if (res.success) {
        navigate('/profile');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[var(--portal-canvas)] text-[var(--portal-text)] flex flex-col justify-center px-3 sm:px-6 py-2 sm:py-3 lg:py-3 transition-colors duration-200">
      <Helmet>
        <title>Create Account — Postify</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="w-full max-w-[1440px] mx-auto h-full flex flex-col justify-center">
        {/* 60:40 Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch lg:h-[calc(100vh-1.5rem)] max-h-[820px]">
          {/* Left: 60% Rotating Verses Story Panel */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <AuthStoryPanel />
          </div>

          {/* Right: 40% Register Form Card */}
          <div className="lg:col-span-5 flex flex-col justify-center h-full">
            <div className="portal-card p-5 sm:p-6 lg:p-6 xl:p-7 bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-xl h-full flex flex-col justify-between rounded-3xl lg:rounded-4xl transition-colors duration-200">
              {/* Header */}
              <div className="text-left mb-2.5 flex flex-col items-start w-full">
                <div className="flex items-center justify-between w-full mb-1.5">
                  <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
                    <img
                      src="/postifylogo2.png"
                      alt="Postify"
                      className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-sm"
                    />
                  </Link>
                  <ThemeToggle />
                </div>
                <h1 className="editorial-h1 text-2xl sm:text-3xl text-[var(--portal-heading)] mb-0.5 font-normal">Join the Community</h1>
                <p className="text-xs text-[var(--portal-meta)] leading-normal">
                  Share reflections, connect with writers, and empower change.
                </p>
              </div>

              {error && (
                <div className="mb-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200/50 dark:border-red-900/40">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Optional Avatar Upload */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)]">
                  <label
                    htmlFor="register-avatar"
                    className="relative w-11 h-11 rounded-full border border-[var(--portal-card-border)] bg-[var(--portal-card)] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 group transition-all shrink-0"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-[var(--portal-meta)] group-hover:text-[#007aff]">
                        <Camera size={16} />
                      </div>
                    )}
                  </label>
                  <input
                    id="register-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[var(--portal-heading)] block">Author Portrait</span>
                    <span className="text-[11px] text-[var(--portal-meta)]">Optional JPEG, PNG or WebP</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="Full Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Austen"
                  />

                  <Input
                    label="Username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="janeausten"
                    required
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="writer@postify.com"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    showPasswordToggle
                    required
                  />

                  <Input
                    label="Age"
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="25"
                  />
                </div>

                <div className="pt-1.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full py-2.5 sm:py-3 text-sm sm:text-base font-semibold"
                    loading={loading}
                  >
                    Create Account
                  </Button>
                </div>
              </form>

              <div className="mt-2.5 pt-2.5 border-t border-[var(--portal-card-border)] text-center text-xs sm:text-sm text-[var(--portal-meta)]">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-[#007aff] font-semibold hover:underline ml-1"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
