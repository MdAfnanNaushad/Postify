import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while mobile drawer is open to prevent background jitter
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <>
      <header className="fixed top-2.5 sm:top-5 inset-x-0 z-50 px-2.5 sm:px-6 pointer-events-none">
        <div className="portal-container max-w-4xl mx-auto">
          {/* Floating Capsule Bar */}
          <div className="nav-capsule pointer-events-auto flex items-center justify-between px-3 sm:px-7 py-2 sm:py-3 w-full transition-all">
            {/* Brand Logo & Wordmark */}
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 text-[var(--portal-heading)] focus:outline-none group select-none shrink-0"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img
                src="/postifylogo2.png"
                alt="Postify"
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="editorial-h1 text-xl sm:text-2xl tracking-tight text-[var(--portal-heading)]">
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

            {/* Uncluttered Mobile Controls (Clean 2-Action Cluster) */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
              {isAuthenticated ? (
                <>
                  {/* Notification Bell with Badge */}
                  <Link
                    to="/notifications"
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                    aria-label="View notifications"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </>
              ) : (
                <>
                  {/* Search Link for Guest */}
                  <Link
                    to="/search"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                    aria-label="Search Postify"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Search size={18} />
                  </Link>
                </>
              )}

              {/* Mobile Drawer Trigger (Hamburger / Close Toggle) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007aff] ${
                  mobileMenuOpen
                    ? 'bg-[#007aff] text-white shadow-sm'
                    : 'text-[var(--portal-heading)] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15'
                }`}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Refined Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed top-14 sm:top-18 inset-x-3 sm:inset-x-6 z-50 md:hidden pointer-events-auto max-w-sm mx-auto animate-fade-in">
          <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] shadow-2xl rounded-2xl p-4 sm:p-5 max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain space-y-4">
            {/* Drawer Header: User Profile Snippet or Guest Brand Badge */}
            {isAuthenticated ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 min-w-0 flex-1 mr-2 group"
                >
                  <Avatar
                    src={user?.Profilepic || user?.profilePic}
                    username={user?.username}
                    size="md"
                  />
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors truncate">
                      {user?.name || user?.username}
                    </div>
                    <div className="text-xs text-[var(--portal-meta)] truncate">
                      @{user?.username}
                    </div>
                  </div>
                </Link>
                <ThemeToggle />
              </div>
            ) : (
              <div className="flex items-center justify-between pb-3 border-b border-[var(--portal-card-border)]">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/postifylogo2.png"
                    alt="Postify"
                    className="w-7 h-7 object-contain"
                  />
                  <span className="editorial-h1 text-lg text-[var(--portal-heading)]">Postify</span>
                </div>
                <ThemeToggle />
              </div>
            )}

            {/* Navigation Sections */}
            <div className="space-y-3">
              {/* Explore Section */}
              <div>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--portal-meta)]">
                  Explore
                </p>
                <nav className="flex flex-col gap-1">
                  <Link
                    to="/feed"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                  >
                    <Compass size={17} className="text-[#007aff] shrink-0" />
                    <span>Community Feed</span>
                  </Link>

                  <Link
                    to="/search"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                  >
                    <Search size={17} className="text-[#007aff] shrink-0" />
                    <span>Search</span>
                  </Link>

                  <Link
                    to="/topics"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                  >
                    <Hash size={17} className="text-[#007aff] shrink-0" />
                    <span>Topics &amp; Technologies</span>
                  </Link>

                  <Link
                    to="/projects"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                  >
                    <FolderGit2 size={17} className="text-[#007aff] shrink-0" />
                    <span>Projects &amp; Journals</span>
                  </Link>
                </nav>
              </div>

              {/* Authenticated Workspace Section */}
              {isAuthenticated && (
                <div className="pt-2 border-t border-[var(--portal-card-border)]">
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--portal-meta)]">
                    Workspace
                  </p>
                  <nav className="flex flex-col gap-1">
                    <Link
                      to="/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Bell size={17} className="text-[#007aff] shrink-0" />
                        <span>Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      to="/saved"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                    >
                      <Bookmark size={17} className="text-[#007aff] shrink-0" />
                      <span>Saved Library</span>
                    </Link>

                    <Link
                      to="/digest"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                    >
                      <Sparkles size={17} className="text-[#007aff] shrink-0" />
                      <span>Weekly Digest</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 transition-colors"
                    >
                      <User size={17} className="text-[#007aff] shrink-0" />
                      <span>My Profile &amp; Stories</span>
                    </Link>
                  </nav>
                </div>
              )}
            </div>

            {/* Bottom Actions Area */}
            {isAuthenticated ? (
              <div className="pt-2 border-t border-[var(--portal-card-border)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--portal-card-border)]">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full text-sm font-medium text-[var(--portal-heading)] border border-[var(--portal-card-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-full text-sm font-medium bg-[#007aff] text-white hover:bg-[#0069dc] transition-colors shadow-sm"
                >
                  Join Postify Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingNav;
