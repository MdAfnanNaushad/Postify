import React, { useRef, useState } from 'react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { VerificationBadge } from '../common/VerificationBadge';
import {
  Camera,
  BookOpen,
  Mail,
  Sparkles,
  Image as ImageIcon,
  UserPlus,
  Check,
  Users,
  Edit3,
  Globe,
  MapPin
} from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../common/SocialIcons';

export const ProfileHeader = ({
  user,
  isOwner,
  onAvatarUpload,
  uploadingAvatar = false,
  onBannerUpload,
  uploadingBanner = false,
  isFollowing = false,
  onToggleFollow,
  followingActionLoading = false,
  followersCount = 0,
  followingCount = 0,
  onOpenEditModal
}) => {
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [avatarError, setAvatarError] = useState(null);
  const [bannerError, setBannerError] = useState(null);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar image size exceeds the 2MB limit.');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setAvatarError('Only JPG, PNG, WebP or GIF images are permitted.');
      return;
    }

    setAvatarError(null);
    if (onAvatarUpload) onAvatarUpload(file);
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB for high res banners)
    if (file.size > 5 * 1024 * 1024) {
      setBannerError('Banner image size exceeds the 5MB limit.');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setBannerError('Only JPG, PNG, WebP or GIF images are permitted.');
      return;
    }

    setBannerError(null);
    if (onBannerUpload) onBannerUpload(file);
  };

  const storyCount = user?.posts?.length || 0;
  const bannerImage = user?.Bannerpic || user?.bannerPic;

  return (
    <div className="portal-card bg-[var(--portal-card)] mb-10 border border-[var(--portal-card-border)] overflow-hidden shadow-sm">
      {/* Banner Section with Optional Custom Uploaded Image */}
      <div className="h-36 sm:h-52 bg-gradient-to-r from-[#4a7ff2]/20 via-[#b988bc]/20 to-[#df9e8e]/20 relative overflow-hidden group">
        {bannerImage ? (
          <img
            src={`/uploads/${bannerImage}`}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#4a7ff2]/25 via-[#9d4edd]/20 to-[#f72585]/20 backdrop-blur-3xl" />
        )}

        {/* Banner Overlay Controls for Profile Owner */}
        {isOwner && onBannerUpload && (
          <>
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-4 left-4 sm:top-5 sm:left-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/25 text-white text-xs font-medium transition-all shadow-sm cursor-pointer active:scale-95 z-20"
              aria-label="Upload profile banner"
            >
              <Camera size={14} />
              <span>{uploadingBanner ? 'Uploading...' : 'Change Banner'}</span>
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleBannerFileChange}
              className="hidden"
              aria-label="Upload profile banner image"
            />
          </>
        )}

        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--portal-card)]/80 backdrop-blur-md border border-[var(--portal-card-border)] text-xs font-semibold text-[#007aff] shadow-2xs z-10">
          <Sparkles size={13} className="text-amber-500" />
          <span>Writer Portfolio</span>
        </div>
      </div>

      <div className="px-6 sm:px-10 pb-8 sm:pb-10 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 pb-6 border-b border-[var(--portal-card-border)] text-center sm:text-left">
          {/* Avatar with Upload Trigger */}
          <div className="relative group shrink-0">
            <Avatar
              src={user?.Profilepic || user?.profilePic}
              username={user?.username}
              size="xl"
              className="w-28 h-28 sm:w-36 sm:h-36 ring-4 ring-[var(--portal-card)] shadow-md rounded-full object-cover bg-[var(--portal-card)]"
            />

            {isOwner && (
              <>
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/45 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus:opacity-100 z-10"
                  aria-label="Update profile avatar"
                >
                  <Camera size={24} />
                  <span className="text-[11px] font-semibold mt-1">Change</span>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  aria-label="Upload profile image"
                />
              </>
            )}
          </div>

          {/* User Actions & Statistics */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
            {isOwner && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => avatarInputRef.current?.click()}
                  loading={uploadingAvatar}
                  className="rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs"
                >
                  Update Avatar
                </Button>
                {onBannerUpload && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => bannerInputRef.current?.click()}
                    loading={uploadingBanner}
                    className="rounded-full px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:bg-[var(--portal-canvas-secondary)] text-[var(--portal-text)] shadow-2xs"
                  >
                    <ImageIcon size={15} className="mr-1.5 text-[#007aff]" />
                    Banner
                  </Button>
                )}
              </>
            )}

            {isOwner && onOpenEditModal && (
              <Button
                variant="secondary"
                size="md"
                onClick={onOpenEditModal}
                className="rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:bg-[var(--portal-canvas-secondary)] text-[var(--portal-heading)]"
              >
                <Edit3 size={14} className="mr-1.5 text-[#007aff]" />
                Edit Profile
              </Button>
            )}

            {!isOwner && onToggleFollow && (
              <Button
                variant={isFollowing ? 'secondary' : 'primary'}
                size="md"
                onClick={onToggleFollow}
                loading={followingActionLoading}
                className="rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer"
                aria-label={isFollowing ? 'Unfollow writer' : 'Follow writer'}
              >
                {isFollowing ? (
                  <span className="flex items-center gap-1.5">
                    <Check size={14} className="text-[#007aff]" />
                    <span>Following</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UserPlus size={14} />
                    <span>Follow</span>
                  </span>
                )}
              </Button>
            )}

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-xs sm:text-sm font-semibold text-[var(--portal-heading)]">
              <Users size={15} className="text-[#007aff]" />
              <span>{followersCount} <span className="text-[var(--portal-meta)] font-normal">Followers</span></span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-xs sm:text-sm font-semibold text-[var(--portal-heading)]">
              <span>{followingCount} <span className="text-[var(--portal-meta)] font-normal">Following</span></span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-xs sm:text-sm font-semibold text-[var(--portal-heading)]">
              <BookOpen size={15} className="text-[#007aff]" />
              <span>{storyCount} <span className="text-[var(--portal-meta)] font-normal">{storyCount === 1 ? 'Story' : 'Stories'}</span></span>
            </div>
          </div>
        </div>

        {/* User Details & Identity */}
        <div className="pt-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2 max-w-xl">
            <h1 className="editorial-h1 text-3xl sm:text-4xl text-[var(--portal-heading)] tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
              <span>{user?.name || user?.username || 'Writer'}</span>
              <VerificationBadge user={user} size="lg" />
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#007aff] flex items-center justify-center sm:justify-start gap-1.5">
              <span>@{user?.username || 'user'}</span>
              {user?.username?.toLowerCase() === 'postify' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#007aff] font-bold uppercase tracking-wider">
                  Platform Owner
                </span>
              )}
            </p>

            {/* Developer Bio */}
            {user?.bio ? (
              <p className="text-sm text-[var(--portal-text)] leading-relaxed pt-1">
                {user.bio}
              </p>
            ) : (
              <p className="text-sm text-[var(--portal-meta)] leading-relaxed pt-1">
                Member of the Postify developer community sharing technical publications and architecture logs.
              </p>
            )}

            {/* Technology Stack Badges */}
            {user?.techStack && user.techStack.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                {user.techStack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium bg-[#007aff]/10 text-[#007aff] dark:text-[#5aa2ff] border border-[#007aff]/20"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {avatarError && (
              <p className="text-xs text-red-500 font-medium pt-1">{avatarError}</p>
            )}
            {bannerError && (
              <p className="text-xs text-red-500 font-medium pt-1">{bannerError}</p>
            )}
          </div>

          {/* Genuine Profile Attributes & Links */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs text-[var(--portal-meta)]">
            {user?.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-[var(--portal-heading)]">
                <MapPin size={13} className="text-[#007aff]" />
                <span>{user.location}</span>
              </span>
            )}

            {user?.website && (
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-[#007aff] hover:underline"
              >
                <Globe size={13} />
                <span>Website</span>
              </a>
            )}

            {user?.github && (
              <a
                href={user.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:text-[#007aff]"
              >
                <GithubIcon size={13} />
                <span>GitHub</span>
              </a>
            )}

            {user?.linkedin && (
              <a
                href={user.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] hover:text-[#007aff]"
              >
                <LinkedinIcon size={13} />
                <span>LinkedIn</span>
              </a>
            )}

            {user?.email && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] truncate max-w-[240px]">
                <Mail size={13} className="text-[var(--portal-meta)] shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
