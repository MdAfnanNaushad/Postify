import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/layout/Layout';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { PostForm } from '../components/posts/PostForm';
import { PostFeed } from '../components/posts/PostFeed';
import { PinnedPostsSection } from '../components/profile/PinnedPostsSection';
import { SelectedProjectsSection } from '../components/profile/SelectedProjectsSection';
import { ProfileEditModal } from '../components/profile/ProfileEditModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Pin } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUserState } = useAuth();
  const [profileData, setProfileData] = useState(user || null);
  const [posts, setPosts] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch authenticated user's complete technical profile and posts
  const fetchMyProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        const authUser = res.data.user;
        setPosts(authUser.posts || []);

        // Fetch user document from /users/:id to receive populated pinnedPosts and developer identity
        try {
          const userDetailRes = await api.get(`/users/${authUser._id}`);
          if (userDetailRes.data?.success && userDetailRes.data?.user) {
            const detailed = userDetailRes.data.user;
            setProfileData(detailed);
            setPinnedPosts(detailed.pinnedPosts || []);
          } else {
            setProfileData(authUser);
          }
        } catch (detailErr) {
          setProfileData(authUser);
        }

        updateUserState({
          Bannerpic: authUser.Bannerpic,
          bannerPic: authUser.Bannerpic,
          isVerified: authUser.isVerified
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [updateUserState]);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  // Handle avatar upload via POST /api/users/me/avatar
  const handleAvatarUpload = async (file) => {
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('profilepic', file);

      const res = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.Profilepic) {
        updateUserState({
          Profilepic: res.data.Profilepic,
          profilePic: res.data.Profilepic
        });
        setProfileData((prev) => ({ ...prev, Profilepic: res.data.Profilepic }));
        fetchMyProfile();
      }
    } catch (err) {
      alert(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle banner upload via POST /api/users/me/banner
  const handleBannerUpload = async (file) => {
    try {
      setUploadingBanner(true);
      const formData = new FormData();
      formData.append('bannerpic', file);

      const res = await api.post('/users/me/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data?.Bannerpic) {
        updateUserState({
          Bannerpic: res.data.Bannerpic,
          bannerPic: res.data.Bannerpic
        });
        setProfileData((prev) => ({ ...prev, Bannerpic: res.data.Bannerpic }));
        fetchMyProfile();
      }
    } catch (err) {
      alert(err.message || 'Banner upload failed.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // Create new post
  const handleCreatePost = async (content) => {
    const res = await api.post('/posts', { content });
    if (res.data?.success && res.data?.post) {
      setPosts((prev) => [res.data.post, ...prev]);
    }
  };

  // Update existing post
  const handleUpdatePost = async (content) => {
    if (!editingPost) return;
    const res = await api.patch(`/posts/${editingPost._id}`, { content });
    if (res.data?.success && res.data?.post) {
      setPosts((prev) =>
        prev.map((p) => (p._id === editingPost._id ? res.data.post : p))
      );
      setEditingPost(null);
    }
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setPinnedPosts((prev) => prev.filter((p) => (p._id || p).toString() !== postId.toString()));
    } catch (err) {
      alert(err.message || 'Failed to delete post.');
    }
  };

  // Like / Unlike toggle
  const handleLike = async (postId) => {
    const currentUserId = user?._id || user?.id;
    const originalPosts = [...posts];

    // Optimistic toggle
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id === postId) {
          const isLiked = p.likes?.some(
            (id) => (typeof id === 'string' ? id : id?._id || id) === currentUserId.toString()
          );
          const newLikes = isLiked
            ? p.likes.filter(
                (id) => (typeof id === 'string' ? id : id?._id || id) !== currentUserId.toString()
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
        (id) => (typeof id === 'string' ? id : id?._id || id) === currentUserId.toString()
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

  // Pin a post to profile
  const handlePinPost = async (postId) => {
    try {
      const res = await api.post(`/users/me/pins/${postId}`);
      if (res.data?.success) {
        setPinnedPosts(res.data.pinnedPosts || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to pin post.');
    }
  };

  // Unpin a post from profile
  const handleUnpinPost = async (postId) => {
    try {
      const res = await api.delete(`/users/me/pins/${postId}`);
      if (res.data?.success) {
        setPinnedPosts(res.data.pinnedPosts || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to unpin post.');
    }
  };

  // Ensure pinned posts are not duplicated in the regular timeline (Phase 6.4 requirement)
  const regularTimelinePosts = posts.filter(
    (p) => !pinnedPosts.some((pin) => (pin._id || pin).toString() === p._id.toString())
  );

  return (
    <Layout>
      <Helmet>
        <title>{profileData?.name || profileData?.username || 'Writer'} — Profile & Portfolio</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="portal-container max-w-4xl pt-36 sm:pt-44 pb-28 sm:pb-36">
        {/* Profile Header with Developer Attributes & Edit Trigger */}
        <ProfileHeader
          user={profileData}
          isOwner={true}
          onAvatarUpload={handleAvatarUpload}
          uploadingAvatar={uploadingAvatar}
          onBannerUpload={handleBannerUpload}
          uploadingBanner={uploadingBanner}
          onOpenEditModal={() => setIsEditModalOpen(true)}
          followersCount={profileData?.followersCount || profileData?.followers?.length || 0}
          followingCount={profileData?.followingCount || profileData?.following?.length || 0}
        />

        {/* Selected Projects Showcase */}
        <SelectedProjectsSection
          projects={profileData?.selectedProjects || []}
          userId={profileData?._id}
          isOwner={true}
          onEditProjects={() => setIsEditModalOpen(true)}
        />

        {/* Pinned Posts Showcase Section (Featured at top) */}
        <PinnedPostsSection
          pinnedPosts={pinnedPosts}
          isOwner={true}
          currentUserId={user?._id || user?.id}
          onLike={handleLike}
          onDelete={handleDeletePost}
          onUnpin={handleUnpinPost}
          onPostCreated={fetchMyProfile}
        />

        {/* Post Form (Create or Edit Mode) */}
        <div className="mb-12">
          {editingPost ? (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="editorial-h2 text-xl text-[var(--portal-heading)]">
                  Edit Your Story
                </h3>
                <span className="text-xs text-[var(--portal-meta)]">Editing existing reflection</span>
              </div>
              <PostForm
                initialContent={editingPost.content}
                isEditing={true}
                onSubmit={handleUpdatePost}
                onCancel={() => setEditingPost(null)}
                buttonText="Update Story"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="editorial-h2 text-xl text-[var(--portal-heading)]">
                  Publish a Story or Tech Log
                </h3>
                <span className="text-xs text-[var(--portal-meta)]">Use Markdown, code snippets, and #tags</span>
              </div>
              <PostForm onSubmit={handleCreatePost} />
            </div>
          )}
        </div>

        {/* Regular Published Work Stream (with Pin action for owner) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--portal-card-border)]">
            <div className="flex items-center gap-3">
              <h2 className="editorial-h2 text-2xl text-[var(--portal-heading)]">
                Published Work
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#007aff] px-2.5 py-0.5 rounded-full bg-[#007aff]/10">
                Chronological Timeline
              </span>
            </div>
            <span className="text-xs sm:text-sm text-[var(--portal-meta)] font-medium">
              {regularTimelinePosts.length} {regularTimelinePosts.length === 1 ? 'publication' : 'publications'}
            </span>
          </div>

          <div className="space-y-4">
            {regularTimelinePosts.map((post) => (
              <div key={post._id} className="relative">
                {pinnedPosts.length < 3 && (
                  <button
                    type="button"
                    onClick={() => handlePinPost(post._id)}
                    className="absolute top-4 right-14 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 text-[var(--portal-meta)] transition-all cursor-pointer"
                    title="Pin this post to top of profile"
                  >
                    <Pin size={11} className="rotate-45" />
                    <span>Pin to Top</span>
                  </button>
                )}
                <PostFeed
                  posts={[post]}
                  loading={false}
                  onLike={handleLike}
                  onEdit={(p) => setEditingPost(p)}
                  onDelete={handleDeletePost}
                  currentUserId={user?._id || user?.id}
                />
              </div>
            ))}

            {!loading && regularTimelinePosts.length === 0 && pinnedPosts.length === 0 && (
              <div className="text-center py-12 px-4 rounded-3xl bg-[var(--portal-card)] border border-[var(--portal-card-border)]">
                <h3 className="editorial-h2 text-lg font-medium text-[var(--portal-heading)] mb-1">
                  You haven't written any publications yet
                </h3>
                <p className="text-xs sm:text-sm text-[var(--portal-meta)] max-w-sm mx-auto">
                  Compose a reflection or architectural log using the form above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={profileData}
        onProfileUpdated={(updated) => {
          setProfileData(updated);
          updateUserState({
            name: updated.name,
            bio: updated.bio
          });
        }}
      />
    </Layout>
  );
};

export default ProfilePage;
