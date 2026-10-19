import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/layout/Layout';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PostFeed } from '../components/posts/PostFeed';
import { PinnedPostsSection } from '../components/profile/PinnedPostsSection';
import { SelectedProjectsSection } from '../components/profile/SelectedProjectsSection';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const UserProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwner =
    currentUser && (currentUser._id === id || currentUser.id === id);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/users/${id}`);
      if (res.data?.success && res.data?.user) {
        setProfileUser(res.data.user);
        setPosts(res.data.user.posts || []);
      }
    } catch (err) {
      setError(err.message || 'User profile not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    const currentUserId = currentUser?._id || currentUser?.id;
    const originalPosts = [...posts];

    setPosts((prev) =>
      prev.map((p) => {
        if (p._id === postId) {
          const isLiked = p.likes?.some(
            (uid) => (typeof uid === 'string' ? uid : uid?._id || uid) === currentUserId.toString()
          );
          const newLikes = isLiked
            ? p.likes.filter(
                (uid) => (typeof uid === 'string' ? uid : uid?._id || uid) !== currentUserId.toString()
              )
            : [...(p.likes || []), currentUserId];
          return { ...p, likes: newLikes };
        }
        return p;
      })
    );

    try {
      const currentPost = posts.find((p) => p._id === postId);
      const isCurrentlyLiked = currentPost?.likes?.some(
        (uid) => (typeof uid === 'string' ? uid : uid?._id || uid) === currentUserId.toString()
      );

      if (isCurrentlyLiked) {
        await api.delete(`/posts/${postId}/like`);
      } else {
        await api.put(`/posts/${postId}/like`);
      }
    } catch (err) {
      setPosts(originalPosts);
    }
  };

  const [followingActionLoading, setFollowingActionLoading] = useState(false);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    try {
      setFollowingActionLoading(true);
      const isCurrentlyFollowing = profileUser?.isFollowing;
      if (isCurrentlyFollowing) {
        await api.delete(`/users/${id}/follow`);
        setProfileUser((prev) => ({
          ...prev,
          isFollowing: false,
          followersCount: Math.max(0, (prev.followersCount || 1) - 1)
        }));
      } else {
        await api.post(`/users/${id}/follow`);
        setProfileUser((prev) => ({
          ...prev,
          isFollowing: true,
          followersCount: (prev.followersCount || 0) + 1
        }));
      }
    } catch (err) {
      console.error('Follow action failed:', err);
    } finally {
      setFollowingActionLoading(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>
          {profileUser?.name || profileUser?.username || 'Writer'} — Postify
        </title>
        <meta
          name="description"
          content={`Read stories and reflections by @${profileUser?.username || 'user'} on Postify.`}
        />
        <meta
          property="og:title"
          content={`${profileUser?.name || profileUser?.username} — Postify`}
        />
        <link rel="canonical" href={`http://localhost:5173/user/${id}`} />
      </Helmet>

      <div className="portal-container max-w-4xl pt-36 sm:pt-44 pb-28 sm:pb-36">
        <ProfileHeader
          user={profileUser}
          isOwner={isOwner}
          onAvatarUpload={() => {}}
          isFollowing={!!profileUser?.isFollowing}
          onToggleFollow={handleToggleFollow}
          followingActionLoading={followingActionLoading}
          followersCount={profileUser?.followersCount || 0}
          followingCount={profileUser?.followingCount || 0}
        />

        {/* Selected Projects Showcase */}
        {profileUser?._id && (
          <SelectedProjectsSection
            projects={profileUser.selectedProjects || []}
            userId={profileUser._id}
            isOwner={false}
          />
        )}

        {/* Pinned Posts Showcase Section */}
        {profileUser?.pinnedPosts && profileUser.pinnedPosts.length > 0 && (
          <PinnedPostsSection
            pinnedPosts={profileUser.pinnedPosts}
            isOwner={false}
            currentUserId={currentUser?._id || currentUser?.id}
            onLike={handleLike}
          />
        )}

        <div className="space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--portal-card-border)]">
            <div className="flex items-center gap-3">
              <h2 className="editorial-h2 text-2xl text-[var(--portal-heading)]">
                Published Work
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#007aff] px-2.5 py-0.5 rounded-full bg-[#007aff]/10">
                Portfolio Stream
              </span>
            </div>
            <span className="text-xs sm:text-sm text-[var(--portal-meta)] font-medium">
              {posts.filter((p) => !(profileUser?.pinnedPosts || []).some((pin) => (pin._id || pin).toString() === p._id.toString())).length}{' '}
              {posts.length === 1 ? 'publication' : 'publications'}
            </span>
          </div>

          <PostFeed
            posts={posts.filter((p) => !(profileUser?.pinnedPosts || []).some((pin) => (pin._id || pin).toString() === p._id.toString()))}
            loading={loading}
            error={error}
            onLike={handleLike}
            currentUserId={currentUser?._id || currentUser?.id}
            onRetry={fetchUserProfile}
            emptyTitle="No publications written yet"
            emptyDescription="This developer has not published any technical stories yet."
          />
        </div>
      </div>
    </Layout>
  );
};
