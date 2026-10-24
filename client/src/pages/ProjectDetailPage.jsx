import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { MarkdownContent } from '../components/common/MarkdownContent';
import { ProjectModal } from '../components/projects/ProjectModal';
import { BuildLogModal } from '../components/projects/BuildLogModal';
import { useAuth } from '../context/AuthContext';
import {
  getProject,
  getProjectLogs,
  deleteProject,
  deleteBuildLog
} from '../services/projectService';
import {
  Calendar,
  ExternalLink,
  Code2,
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Share2,
  Lock,
  Globe,
  Pin,
  Tag,
  ArrowLeft,
  Check,
  Copy
} from 'lucide-react';

import { ProjectStatusBadge } from '../components/projects/ProjectStatusBadge';

const ENTRY_TYPE_BADGES = {
  milestone: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  feature: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  fix: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  refactor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  research: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  release: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  note: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
};

export const ProjectDetailPage = () => {
  const { idOrSlug, username, slug } = useParams();
  const projectParam = useMemo(() => {
    return (username && slug) ? { username, slug } : idOrSlug;
  }, [username, slug, idOrSlug]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals & Actions
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = chronological, 'desc' = newest first

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProject(projectParam);
      if (res.success && res.project) {
        setProject(res.project);
      } else {
        throw new Error('Project not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [projectParam]);

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const target = project?._id || projectParam;
      const res = await getProjectLogs(target, { order: sortOrder });
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch {
      // Don't overwrite general error
    } finally {
      setLogsLoading(false);
    }
  }, [projectParam, project?._id, sortOrder]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    if (project) {
      fetchLogs();
    }
  }, [project, fetchLogs]);

  const isOwner = Boolean(
    user && project && project.owner && (project.owner._id === user._id || project.owner === user._id)
  );

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this project and all its build logs?')) {
      return;
    }
    try {
      await deleteProject(project?._id || projectParam);
      navigate('/projects');
    } catch (err) {
      alert(err.message || 'Failed to delete project.');
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this build log entry?')) {
      return;
    }
    try {
      await deleteBuildLog(project?._id || projectParam, logId);
      setLogs((prev) => prev.filter((l) => l._id !== logId));
    } catch (err) {
      alert(err.message || 'Failed to delete log entry.');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyLogLink = (logId) => {
    const ownerName = project?.owner?.username || username || 'developer';
    const projSlug = project?.slug || slug || idOrSlug;
    const url = `${window.location.origin}/projects/${ownerName}/${projSlug}/logs/${logId}`;
    navigator.clipboard.writeText(url);
    alert('Build log URL copied to clipboard!');
  };

  if (loading) {
    return (
      <Layout>
        <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl">
          <div className="space-y-6 animate-pulse">
            <div className="w-1/3 h-8 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="w-2/3 h-4 bg-black/10 dark:bg-white/10 rounded-md" />
            <div className="w-full h-48 bg-black/10 dark:bg-white/10 rounded-2xl" />
          </div>
        </PageContainer>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl text-center">
          <div className="portal-card p-12 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)]">
            <Lock size={36} className="mx-auto text-amber-500 mb-3" />
            <h2 className="editorial-h2 text-2xl font-semibold text-[var(--portal-heading)] mb-2">
              Project Inaccessible
            </h2>
            <p className="text-sm text-[var(--portal-meta)] max-w-md mx-auto mb-6">
              {error || 'This project is private or does not exist. Only the project owner can view private projects.'}
            </p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} />
              <span>Back to Projects Directory</span>
            </Link>
          </div>
        </PageContainer>
      </Layout>
    );
  }

  const ownerObj = typeof project.owner === 'object' ? project.owner : null;

  return (
    <Layout>
      <Helmet>
        <title>{`${project.name} — Engineering Journal | Postify`}</title>
        <meta
          name="description"
          content={project.shortDescription || `Follow the build log and engineering progress of ${project.name} on Postify.`}
        />
        <meta property="og:title" content={`${project.name} — Postify Project Journal`} />
        <meta
          property="og:description"
          content={project.shortDescription || `Chronological build logs and architecture overview for ${project.name}.`}
        />
      </Helmet>

      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All Projects</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:border-[#007aff]/30 transition-all cursor-pointer shadow-2xs"
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Copied URL!' : 'Share'}</span>
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setIsProjectEditOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:border-[#007aff]/30 transition-all cursor-pointer shadow-2xs"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Project Hero Header */}
        <div className="portal-card p-6 sm:p-8 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] mb-8 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ProjectStatusBadge status={project.status} size="md" />

            {project.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Lock size={12} />
                <span>Private Project</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--portal-meta)] font-medium">
                <Globe size={13} />
                <span>Public Project</span>
              </span>
            )}
          </div>

          <h1 className="editorial-h1 text-2xl sm:text-4xl text-[var(--portal-heading)] mb-2.5 font-normal tracking-tight">
            {project.name}
          </h1>

          {project.shortDescription && (
            <p className="text-sm sm:text-base text-[var(--portal-meta)] leading-relaxed mb-6 max-w-2xl">
              {project.shortDescription}
            </p>
          )}

          {/* Tech Stack Badges */}
          {project.techStack && project.techStack.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-6">
              {project.techStack.map((tech, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--portal-heading)] border border-black/5 dark:border-white/5"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Links & Owner Info Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 border-t border-[var(--portal-card-border)]">
            {ownerObj && (
              <Link
                to={`/profile/${ownerObj.username}`}
                className="flex items-center gap-2.5 group select-none"
              >
                <Avatar
                  src={ownerObj.Profilepic || ownerObj.profilePic}
                  username={ownerObj.username}
                  size="sm"
                />
                <div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors">
                    <span>{ownerObj.name || ownerObj.username}</span>
                    {ownerObj.isVerified && <VerificationBadge size={13} />}
                  </div>
                  <span className="text-[11px] text-[var(--portal-meta)]">@{ownerObj.username}</span>
                </div>
              </Link>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {project.repositoryUrl && (
                <a
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/5 text-[var(--portal-heading)] hover:text-[#007aff] border border-[var(--portal-card-border)] transition-colors"
                >
                  <Code2 size={14} />
                  <span>Repository</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              )}

              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#007aff]/10 text-[#007aff] hover:bg-[#007aff]/20 border border-[#007aff]/20 transition-colors"
                >
                  <Globe size={14} />
                  <span>Live App</span>
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Project Markdown Overview Section */}
        {project.description && (
          <div className="portal-card p-6 sm:p-8 rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] mb-10 shadow-xs">
            <h2 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)] mb-4 pb-3 border-b border-[var(--portal-card-border)]">
              Architecture & System Overview
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownContent content={project.description} />
            </div>
          </div>
        )}

        {/* Build Log Journal Timeline Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--portal-card-border)] mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
                <BookOpen size={18} />
              </div>
              <div>
                <h2 className="editorial-h2 text-2xl font-semibold text-[var(--portal-heading)]">
                  Build Log & Journal
                </h2>
                <span className="text-xs text-[var(--portal-meta)]">
                  {logs.length} {logs.length === 1 ? 'entry' : 'entries'} documented
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Chronological order toggle */}
              <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-[var(--portal-card-border)]">
                <button
                  type="button"
                  onClick={() => setSortOrder('asc')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    sortOrder === 'asc'
                      ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs font-semibold'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  Chronological
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('desc')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    sortOrder === 'desc'
                      ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs font-semibold'
                      : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                  }`}
                >
                  Latest First
                </button>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLog(null);
                    setIsLogModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>New Log Entry</span>
                </button>
              )}
            </div>
          </div>

          {/* Timeline List */}
          {logsLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="portal-card p-6 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] h-40"
                />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="portal-card p-12 text-center rounded-3xl border border-dashed border-[var(--portal-card-border)] bg-[var(--portal-card)]/50">
              <BookOpen size={36} className="mx-auto text-[var(--portal-meta)] mb-3 opacity-60" />
              <h3 className="text-base font-semibold text-[var(--portal-heading)] mb-1">
                No Build Logs Yet
              </h3>
              <p className="text-xs text-[var(--portal-meta)] max-w-sm mx-auto mb-4">
                {isOwner
                  ? 'Document your development milestones, technical challenges, and release notes.'
                  : 'The author has not published any build logs for this project yet.'}
              </p>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLog(null);
                    setIsLogModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Publish First Entry</span>
                </button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[var(--portal-card-border)]">
              {logs.map((log) => {
                const badgeClass = ENTRY_TYPE_BADGES[log.entryType] || ENTRY_TYPE_BADGES.feature;
                const dateStr = new Date(log.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={log._id}
                    id={`log-${log._id}`}
                    className="relative portal-card p-6 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] shadow-2xs hover:border-[#007aff]/40 transition-all"
                  >
                    {/* Glowing Node on Timeline Axis */}
                    <div className="absolute -left-[27px] sm:-left-[35px] top-6 w-3.5 h-3.5 rounded-full border-2 border-[var(--portal-canvas)] bg-[#007aff] shadow-xs" />

                    {/* Entry Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${badgeClass}`}>
                          {log.entryType}
                        </span>

                        {log.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Pin size={10} />
                            <span>Pinned</span>
                          </span>
                        )}

                        <span className="text-xs text-[var(--portal-meta)] flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{dateStr}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Stable Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLogLink(log._id)}
                          className="p-1.5 rounded-lg text-[var(--portal-meta)] hover:text-[#007aff] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                          title="Copy direct permalink"
                        >
                          <Copy size={13} />
                        </button>

                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLog(log);
                                setIsLogModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Edit build log"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log._id)}
                              className="p-1.5 rounded-lg text-[var(--portal-meta)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete build log"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Entry Title */}
                    <h3 className="editorial-h2 text-lg sm:text-xl font-bold text-[var(--portal-heading)] mb-3">
                      {log.title}
                    </h3>

                    {/* Markdown Content */}
                    <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm mb-4">
                      <MarkdownContent content={log.content} />
                    </div>

                    {/* Tags */}
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--portal-card-border)]">
                        {log.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--portal-meta)] bg-black/5 dark:bg-white/5"
                          >
                            <Tag size={10} />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modals */}
        <ProjectModal
          isOpen={isProjectEditOpen}
          onClose={() => setIsProjectEditOpen(false)}
          project={project}
          onSaved={(updated) => setProject(updated)}
        />

        <BuildLogModal
          isOpen={isLogModalOpen}
          onClose={() => {
            setIsLogModalOpen(false);
            setEditingLog(null);
          }}
          projectIdOrSlug={idOrSlug}
          log={editingLog}
          onSaved={(savedLog) => {
            if (editingLog) {
              setLogs((prev) => prev.map((l) => (l._id === savedLog._id ? savedLog : l)));
            } else {
              setLogs((prev) => (sortOrder === 'asc' ? [...prev, savedLog] : [savedLog, ...prev]));
            }
          }}
        />
      </PageContainer>
    </Layout>
  );
};

export default ProjectDetailPage;
