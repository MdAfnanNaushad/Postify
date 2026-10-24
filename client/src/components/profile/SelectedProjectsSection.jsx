import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  ExternalLink,
  Code2,
  BookOpen,
  Plus,
  Lock,
  Globe,
  ArrowRight
} from 'lucide-react';
import { getMyProjects, getUserProjects } from '../../services/projectService';
import { ProjectModal } from '../projects/ProjectModal';
import { ProjectStatusBadge } from '../projects/ProjectStatusBadge';

export const SelectedProjectsSection = ({
  projects = [],
  userId = null,
  isOwner = false,
  onEditProjects
}) => {
  const [dedicatedProjects, setDedicatedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDedicated = async () => {
      try {
        setLoading(true);
        let res;
        if (isOwner) {
          res = await getMyProjects();
        } else if (userId) {
          res = await getUserProjects(userId);
        }
        if (res && res.success && isMounted) {
          setDedicatedProjects(res.projects || []);
        }
      } catch (err) {
        // Fallback to legacy projects gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDedicated();
    return () => {
      isMounted = false;
    };
  }, [userId, isOwner]);

  // Non-destructive de-duplication:
  // If a dedicated project exists with the same name, prefer the dedicated document.
  const dedicatedNames = new Set(
    dedicatedProjects.map((p) => (p.name ? p.name.trim().toLowerCase() : ''))
  );

  const filteredLegacy = (projects || []).filter(
    (lp) => lp.name && !dedicatedNames.has(lp.name.trim().toLowerCase())
  );

  const totalCount = dedicatedProjects.length + filteredLegacy.length;

  if (totalCount === 0 && !loading) {
    if (!isOwner) return null;
    return (
      <div className="mb-10 portal-card p-6 rounded-3xl border border-dashed border-[var(--portal-card-border)] bg-[var(--portal-card)]/50 text-center">
        <FolderGit2 size={28} className="mx-auto text-[var(--portal-meta)] mb-2" />
        <h3 className="text-sm font-semibold text-[var(--portal-heading)] mb-1">
          No Engineering Projects Showcased
        </h3>
        <p className="text-xs text-[var(--portal-meta)] max-w-sm mx-auto mb-3">
          Create dedicated engineering projects with build logs and journals, or add showcase links.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Create Project</span>
          </button>
          {onEditProjects && (
            <button
              type="button"
              onClick={onEditProjects}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] border border-[var(--portal-card-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Add Legacy Showcase
            </button>
          )}
        </div>
        <ProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaved={(newProj) => setDedicatedProjects((prev) => [newProj, ...prev])}
        />
      </div>
    );
  }

  return (
    <div className="mb-10 space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--portal-card-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
            <FolderGit2 size={16} />
          </div>
          <div>
            <h2 className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)]">
              Engineering Projects & Journals
            </h2>
            <span className="text-[11px] text-[var(--portal-meta)]">
              Active systems, architectures, and chronological build logs
            </span>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#007aff] hover:underline cursor-pointer"
            >
              <Plus size={13} />
              <span>New Project</span>
            </button>
            {onEditProjects && (
              <button
                type="button"
                onClick={onEditProjects}
                className="text-xs text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
              >
                Edit Showcase
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Dedicated Projects */}
        {dedicatedProjects.map((project) => {
          const identifier = project.slug || project._id;

          return (
            <Link
              key={project._id}
              to={`/projects/${identifier}`}
              className="portal-card p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/50 transition-all flex flex-col justify-between group shadow-2xs hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <ProjectStatusBadge status={project.status} size="xs" />

                  <div className="flex items-center gap-1.5">
                    {project.visibility === 'private' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Lock size={10} />
                        <span>Private</span>
                      </span>
                    ) : null}

                    {project.buildLogCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20">
                        <BookOpen size={10} />
                        <span>{project.buildLogCount} logs</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors mb-1.5">
                  {project.name}
                </h3>

                {project.shortDescription && (
                  <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed mb-4 line-clamp-2">
                    {project.shortDescription}
                  </p>
                )}
              </div>

              {project.techStack && project.techStack.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--portal-card-border)]">
                  {project.techStack.map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--portal-heading)] border border-black/5 dark:border-white/5"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}

        {/* 2. Legacy Selected Projects (Non-destructive fallback) */}
        {filteredLegacy.map((project, idx) => (
          <div
            key={project._id || idx}
            className="portal-card p-5 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] hover:border-[#007aff]/40 transition-all flex flex-col justify-between group shadow-2xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--portal-heading)] group-hover:text-[#007aff] transition-colors">
                  {project.name}
                </h3>
                {project.projectUrl && (
                  <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-md text-[var(--portal-meta)] hover:text-[#007aff] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                    aria-label={`Open ${project.name} link`}
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>

              {project.description && (
                <p className="text-xs sm:text-sm text-[var(--portal-meta)] leading-relaxed mb-4">
                  {project.description}
                </p>
              )}
            </div>

            {project.techStack && project.techStack.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[var(--portal-card-border)]">
                {project.techStack.map((tech, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-black/5 dark:bg-white/5 text-[var(--portal-heading)] border border-black/5 dark:border-white/5"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={(newProj) => setDedicatedProjects((prev) => [newProj, ...prev])}
      />
    </div>
  );
};

export default SelectedProjectsSection;
