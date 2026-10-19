import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/Avatar';
import { ThemeToggle } from '../common/ThemeToggle';
import { Menu, X, LogOut, User, Compass, Bell, Search, Hash, Bookmark, FolderGit2, Sparkles } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export const FloatingNav = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 px-3 sm:px-6 pointer-events-none">
      <div className="portal-container max-w-4xl mx-auto">
        {/* Desktop & Tablet Floating Capsule */}
        <div className="nav-capsule pointer-events-auto flex items-center justify-between px-4 sm:px-7 py-2.5 sm:py-3 w-full transition-all">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 text-[var(--portal-heading)] focus:outline-none group select-none"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="/postifylogo2.png"
              alt="Postify"
              className="w-11 h-11 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
            />
            <span className="editorial-h1 text-2xl tracking-tight text-[var(--portal-heading)]">
              Postify
            </span>
          </Link>

          {/* Desktop Navigation Links & Controls */}
          <nav className="hidden md:flex items-center gap-5">
            <Link
              to="/feed"
              className="text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
            >
              Discover
            </Link>

            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
              title="Search Postify"
            >
              <Search size={15} />
              <span>Search</span>
            </Link>

            <Link
              to="/topics"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
              title="Topics & Technologies"
            >
              <Hash size={15} />
              <span>Topics</span>
            </Link>

            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
              title="Projects & Build Journals"
            >
              <FolderGit2 size={15} />
              <span>Projects</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/saved"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
                  title="Saved Library"
                >
                  <Bookmark size={15} />
                  <span>Saved</span>
                </Link>

                <Link
                  to="/digest"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
                  title="Weekly Developer Digest"
                >
                  <Sparkles size={15} />
                  <span>Digest</span>
                </Link>

                {/* Notification Bell with Real-Time Badge */}
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Notifications"
                  aria-label="View notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 text-sm font-medium text-[var(--portal-heading)] hover:text-[#007aff] transition-colors"
                >
                  <Avatar
                    src={user?.Profilepic || user?.profilePic}
                    username={user?.username}
                    size="sm"
                  />
                  <span>{user?.name || user?.username}</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-[50px] text-xs font-medium text-[var(--portal-meta)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2.5 ml-1">
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-[50px] text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 rounded-[50px] text-sm font-medium bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-sm"
                >
                  Join Postify
                </Link>
              </div>
            )}

            {/* Desktop Theme Switcher */}
            <div className="pl-1 border-l border-black/10 dark:border-white/10 flex items-center">
              <ThemeToggle />
            </div>
          </nav>

          {/* Mobile Menu & Theme Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />

            {isAuthenticated && (
              <Link
                to="/notifications"
                className="relative p-1.5 rounded-full text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {isAuthenticated && (
              <Link to="/profile" className="flex items-center" aria-label="Go to profile">
                <Avatar
                  src={user?.Profilepic || user?.profilePic}
                  username={user?.username}
                  size="sm"
                />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Popover */}
        {mobileMenuOpen && (
          <div className="md:hidden pointer-events-auto mt-2 max-w-sm mx-auto portal-card p-5 bg-[var(--portal-card)] shadow-2xl border border-[var(--portal-card-border)] animate-fade-in">
            <div className="flex items-center justify-between pb-4 mb-3 border-b border-[var(--portal-card-border)]">
              <div className="flex items-center gap-3">
                <img
                  src="/postifylogo2.png"
                  alt="Postify"
                  className="w-8 h-8 object-contain"
                />
                <span className="editorial-h1 text-xl text-[var(--portal-heading)]">Postify</span>
              </div>
              <ThemeToggle />
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                to="/feed"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
              >
                <Compass size={18} className="text-[#007aff]" />
                <span>Community Feed</span>
              </Link>

              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
              >
                <Search size={18} className="text-[#007aff]" />
                <span>Search</span>
              </Link>

              <Link
                to="/topics"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
              >
                <Hash size={18} className="text-[#007aff]" />
                <span>Topics & Technologies</span>
              </Link>

              <Link
                to="/projects"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
              >
                <FolderGit2 size={18} className="text-[#007aff]" />
                <span>Projects & Journals</span>
              </Link>

              {isAuthenticated && (
                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Bell size={18} className="text-[#007aff]" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
                >
                  <Bookmark size={18} className="text-[#007aff]" />
                  <span>Saved Library</span>
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/digest"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
                >
                  <Sparkles size={18} className="text-[#007aff]" />
                  <span>Weekly Digest</span>
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-[var(--portal-canvas)] transition-colors"
                  >
                    <User size={18} className="text-[#007aff]" />
                    <span>My Profile & Stories</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors w-full text-left"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--portal-card-border)]">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-[50px] text-sm font-medium text-[var(--portal-heading)] border border-[var(--portal-card-border)] hover:bg-[var(--portal-canvas)] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-[50px] text-sm font-medium bg-[#007aff] text-white hover:bg-[#0069dc]"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
