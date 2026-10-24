import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { AdminProtectedRoute, AdminPublicOnlyRoute } from './components/admin/AdminProtectedRoute';
import { LoadingScreen, ErrorBoundary } from './components/common';

// Public & Community Pages
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then(m => ({ default: m.UserProfilePage })));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage').then(m => ({ default: m.PostDetailPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const SavedPage = lazy(() => import('./pages/SavedPage').then(m => ({ default: m.SavedPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const TopicsPage = lazy(() => import('./pages/TopicsPage').then(m => ({ default: m.TopicsPage })));
const TopicDetailPage = lazy(() => import('./pages/TopicDetailPage').then(m => ({ default: m.TopicDetailPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const BuildLogDetailPage = lazy(() => import('./pages/BuildLogDetailPage').then(m => ({ default: m.BuildLogDetailPage })));
const DigestPage = lazy(() => import('./pages/DigestPage').then(m => ({ default: m.DigestPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ServerErrorPage = lazy(() => import('./pages/ServerErrorPage').then(m => ({ default: m.ServerErrorPage })));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage').then(m => ({ default: m.ComingSoonPage })));

// Admin Control Center Suite
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })));
const AdminLiveActivityPage = lazy(() => import('./pages/admin/AdminLiveActivityPage').then(m => ({ default: m.AdminLiveActivityPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminPostsPage = lazy(() => import('./pages/admin/AdminPostsPage').then(m => ({ default: m.AdminPostsPage })));
const AdminRepliesPage = lazy(() => import('./pages/admin/AdminRepliesPage').then(m => ({ default: m.AdminRepliesPage })));
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage').then(m => ({ default: m.AdminProjectsPage })));
const AdminBuildLogsPage = lazy(() => import('./pages/admin/AdminBuildLogsPage').then(m => ({ default: m.AdminBuildLogsPage })));
const AdminHashtagsPage = lazy(() => import('./pages/admin/AdminHashtagsPage').then(m => ({ default: m.AdminHashtagsPage })));
const AdminFollowsPage = lazy(() => import('./pages/admin/AdminFollowsPage').then(m => ({ default: m.AdminFollowsPage })));
const AdminEngagementPage = lazy(() => import('./pages/admin/AdminEngagementPage').then(m => ({ default: m.AdminEngagementPage })));
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage').then(m => ({ default: m.AdminModerationPage })));
const AdminSuspendedUsersPage = lazy(() => import('./pages/admin/AdminSuspendedUsersPage').then(m => ({ default: m.AdminSuspendedUsersPage })));
const AdminHiddenContentPage = lazy(() => import('./pages/admin/AdminHiddenContentPage').then(m => ({ default: m.AdminHiddenContentPage })));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage').then(m => ({ default: m.AdminAuditLogsPage })));
const AdminSystemHealthPage = lazy(() => import('./pages/admin/AdminSystemHealthPage').then(m => ({ default: m.AdminSystemHealthPage })));
const AdminTrafficPage = lazy(() => import('./pages/admin/AdminTrafficPage').then(m => ({ default: m.AdminTrafficPage })));
const AdminBackgroundJobsPage = lazy(() => import('./pages/admin/AdminBackgroundJobsPage').then(m => ({ default: m.AdminBackgroundJobsPage })));
const AdminEmailDeliveryPage = lazy(() => import('./pages/admin/AdminEmailDeliveryPage').then(m => ({ default: m.AdminEmailDeliveryPage })));
const AdminConfigStatusPage = lazy(() => import('./pages/admin/AdminConfigStatusPage').then(m => ({ default: m.AdminConfigStatusPage })));
const AdminProfilePage = lazy(() => import('./pages/admin/AdminProfilePage').then(m => ({ default: m.AdminProfilePage })));

const adminRoute = typeof __ADMIN_ROUTE__ !== 'undefined' ? __ADMIN_ROUTE__ : '/admin-portal';
const loginPath = typeof __ADMIN_LOGIN_ROUTE__ !== 'undefined' ? __ADMIN_LOGIN_ROUTE__ : `${adminRoute}/login`;

function App() {
  const renderAdminChildren = () => (
    <>
      <Route index element={<AdminDashboardPage />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="analytics" element={<AdminAnalyticsPage />} />
      <Route path="activity" element={<AdminLiveActivityPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="posts" element={<AdminPostsPage />} />
      <Route path="replies" element={<AdminRepliesPage />} />
      <Route path="projects" element={<AdminProjectsPage />} />
      <Route path="build-logs" element={<AdminBuildLogsPage />} />
      <Route path="hashtags" element={<AdminHashtagsPage />} />
      <Route path="follows" element={<AdminFollowsPage />} />
      <Route path="engagement" element={<AdminEngagementPage />} />
      <Route path="digest" element={<AdminBackgroundJobsPage />} />
      <Route path="moderation" element={<AdminModerationPage />} />
      <Route path="suspended-users" element={<AdminSuspendedUsersPage />} />
      <Route path="hidden-content" element={<AdminHiddenContentPage />} />
      <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      <Route path="system/health" element={<AdminSystemHealthPage />} />
      <Route path="system/traffic" element={<AdminTrafficPage />} />
      <Route path="system/jobs" element={<AdminBackgroundJobsPage />} />
      <Route path="system/email" element={<AdminEmailDeliveryPage />} />
      <Route path="system/config" element={<AdminConfigStatusPage />} />
      <Route path="profile" element={<AdminProfilePage />} />
    </>
  );

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen fullScreen={true} />}>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/feed" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/topics" element={<TopicsPage />} />
          <Route path="/topics/:tag" element={<TopicDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:username/:slug" element={<ProjectDetailPage />} />
          <Route path="/projects/:username/:slug/logs/:logId" element={<BuildLogDetailPage />} />
          <Route path="/projects/:idOrSlug" element={<ProjectDetailPage />} />
          <Route path="/projects/:idOrSlug/logs/:logId" element={<BuildLogDetailPage />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/user/:id" element={<UserProfilePage />} />

          {/* Guest / Public-Only Pages */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* Authenticated User Pages */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/digest"
            element={
              <ProtectedRoute>
                <DigestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/upload"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Administrative Entry & Control Center */}
          <Route
            path={loginPath}
            element={
              <AdminPublicOnlyRoute>
                <AdminLoginPage />
              </AdminPublicOnlyRoute>
            }
          />
          {loginPath !== `${adminRoute}/login` && (
            <Route
              path={`${adminRoute}/login`}
              element={
                <AdminPublicOnlyRoute>
                  <AdminLoginPage />
                </AdminPublicOnlyRoute>
              }
            />
          )}

          {/* Protected Admin Suite Mount */}
          <Route
            path={adminRoute}
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            {renderAdminChildren()}
          </Route>

          {/* System & Status Pages */}
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/coming-soon" element={<ComingSoonPage />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
