import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageContainer } from '../components/common/PageContainer';
import { Avatar } from '../components/common/Avatar';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { ProjectModal } from '../components/projects/ProjectModal';
import { useAuth } from '../context/AuthContext';
import { getProjects, getMyProjects } from '../services/projectService';
import {
  FolderGit2,
  Plus,
  Search,
  ExternalLink,
  Code2,
  Calendar,
  Layers,
  BookOpen,
  Lock,
  Globe,
  Sparkles,
  Filter
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'planned', label: 'Planned' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' }
];

const STATUS_STYLES = {
  in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  planned: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
};

export const ProjectsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'mine' && isAuthenticated) {
        const res = await getMyProjects();
        if (res.success) {
          let list = res.projects || [];
          if (statusFilter !== 'all') {
            list = list.filter((p) => p.status === statusFilter);
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
              (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
                (p.techStack && p.techStack.some((t) => t.toLowerCase().includes(q)))
            );
          }
          setProjects(list);
        }
      } else {
        const params = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        const res = await getProjects(params);
        if (res.success) {
          setProjects(res.projects || []);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAuthenticated, statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  return (
    <Layout>
      <Helmet>
        <title>Engineering Projects & Build Journals — Postify</title>
        <meta
          name="description"
          content="Explore open-source engineering systems, architecture deep dives, and chronological build log journals by developers on Postify."
        />
      </Helmet>

      <PageContainer className="pt-24 sm:pt-28 pb-16 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pb-6 border-b border-[var(--portal-card-border)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20 mb-3">
              <FolderGit2 size={13} />
              <span>Project Ecosystem & Build Journals</span>
            </div>
            <h1 className="editorial-h1 text-3xl sm:text-4xl text-[var(--portal-heading)] mb-2 font-normal">
              Engineering Projects
            </h1>
            <p className="text-sm sm:text-base text-[var(--portal-meta)] max-w-2xl leading-relaxed">
              Discover real-world systems, technology stacks, and chronological build logs documenting engineering progress and architectural decisions.
            </p>
          </div>

          <div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-sm hover:shadow"
              >
                <Plus size={16} />
                <span>Create Project</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-sm"
              >
                <Plus size={16} />
                <span>Sign in to Build</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
          {/* Tab Selector */}
          <div className="flex items-center rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-[var(--portal-card-border)] self-start">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs'
                  : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
              }`}
            >
              Public Projects
            </button>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'mine'
                    ? 'bg-[var(--portal-card)] text-[#007aff] shadow-2xs'
                    : 'text-[var(--portal-meta)] hover:text-[var(--portal-heading)]'
                }`}
              >
                My Projects
              </button>
            )}
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects or stack..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors cursor-pointer capitalize"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
            {error}
          </div>
        )}

        {/* Content State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="portal-card p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] animate-pulse h-64"
              >
                <div className="w-1/2 h-5 bg-black/10 dark:bg-white/10 rounded-md mb-3" />
                <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-md mb-2" />
                <div className="w-3/4 h-3 bg-black/10 dark:bg-white/10 rounded-md mb-6" />
                <div className="flex gap-2 mb-6">
                  <div className="w-14 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
                  <div className="w-14 h-5 bg-black/10 dark:bg-white/10 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="portal-card p-12 text-center rounded-3xl border border-dashed border-[var(--portal-card-border)] bg-[var(--portal-card)]/50">
            <FolderGit2 size={36} className="mx-auto text-[var(--portal-meta)] mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-[var(--portal-heading)] mb-1">
              No Projects Found
            </h3>
            <p className="text-xs text-[var(--portal-meta)] max-w-sm mx-auto mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter to discover projects.'
                : 'Be the first developer to create an engineering project and publish build logs!'}
            </p>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Create First Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const statusClass = STATUS_STYLES[project.status] || STATUS_STYLES.in_progress;
              const isOwner = user && project.owner && (project.owner._id === user._id || project.owner === user._id);
              const identifier = project.slug || project._id;

              return (
                <Link
                  key={project._id}
                  to={`/projects/${identifier}`}
                  className="portal-card p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/50 transition-all flex flex-col justify-between group shadow-2xs hover:shadow-md overflow-hidden"
                >
                  <div>
                    {/* Top row: Status and Visibility */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${statusClass}`}
                      >
                        {project.status ? project.status.replace('_', ' ') : 'In Progress'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {project.visibility === 'private' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            title="Private Project"
                          >
                            <Lock size={10} />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-[var(--portal-meta)]"
                            title="Public Project"
                          >
                            <Globe size={11} />
                            <span>Public</span>
                          </span>
                        )}

                        {project.buildLogCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20">
                            <BookOpen size={10} />
                            <span>{project.buildLogCount} logs</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors mb-1.5 line-clamp-1">
                      {project.name}
                    </h3>

                    {/* Short Description */}
                    {project.shortDescription && (
                      <p className="text-xs text-[var(--portal-meta)] leading-relaxed mb-4 line-clamp-2">
                        {project.shortDescription}
                      </p>
                    )}

                    {/* Tech Stack Pills */}
                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mb-4">
                        {project.techStack.slice(0, 4).map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 text-[var(--portal-heading)] border border-black/5 dark:border-white/5"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.techStack.length > 4 && (
                          <span className="text-[10px] text-[var(--portal-meta)]">
                            +{project.techStack.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Owner & Meta */}
                  <div className="pt-3 border-t border-[var(--portal-card-border)] flex items-center justify-between gap-2 text-xs text-[var(--portal-meta)]">
                    {project.owner && typeof project.owner === 'object' && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={project.owner.Profilepic || project.owner.profilePic}
                          username={project.owner.username}
                          name={project.owner.name}
                          size="xs"
                        />
                        <span className="truncate font-medium text-[var(--portal-heading)]">
                          {project.owner.name || project.owner.username}
                        </span>
                        {project.owner.isVerified && <VerificationBadge size={12} />}
                      </div>
                    )}

                    <span className="text-[11px] shrink-0">
                      {new Date(project.updatedAt || project.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Project Creation Modal */}
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleProjectCreated}
        />
      </PageContainer>
    </Layout>
  );
};

export default ProjectsPage;
