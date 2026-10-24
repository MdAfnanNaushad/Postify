import React, { useState, useEffect, useRef } from 'react';
import { X, FolderGit2, Check, Globe, Lock, Code2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { createProject, updateProject } from '../../services/projectService';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

export const ProjectModal = ({ isOpen, onClose, project = null, onSaved }) => {
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      if (project) {
        setName(project.name || '');
        setShortDescription(project.shortDescription || '');
        setDescription(project.description || '');
        setTechStackInput(Array.isArray(project.techStack) ? project.techStack.join(', ') : '');
        setRepositoryUrl(project.repositoryUrl || '');
        setLiveUrl(project.liveUrl || '');
        setCoverImage(project.coverImage || '');
        setStatus(project.status || 'in_progress');
        setVisibility(project.visibility || 'public');
      } else {
        setName('');
        setShortDescription('');
        setDescription('');
        setTechStackInput('');
        setRepositoryUrl('');
        setLiveUrl('');
        setCoverImage('');
        setStatus('in_progress');
        setVisibility('public');
      }
      setError(null);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedRef.current?.focus) {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen, project, onClose]);

  if (!isOpen) return null;

  const isEditing = Boolean(project && project._id);

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Project name cannot exceed 100 characters.');
      return;
    }
    if (shortDescription.trim().length > 250) {
      setError('Short description cannot exceed 250 characters.');
      return;
    }
    if (repositoryUrl && !validateUrl(repositoryUrl.trim())) {
      setError('Repository URL must be a valid http:// or https:// URL.');
      return;
    }
    if (liveUrl && !validateUrl(liveUrl.trim())) {
      setError('Live URL must be a valid http:// or https:// URL.');
      return;
    }

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      name: trimmedName,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      techStack,
      repositoryUrl: repositoryUrl.trim(),
      liveUrl: liveUrl.trim(),
      coverImage: coverImage.trim(),
      status,
      visibility
    };

    try {
      setLoading(true);
      setError(null);
      let res;
      if (isEditing) {
        res = await updateProject(project._id, payload);
      } else {
        res = await createProject(payload);
      }

      if (res.success) {
        if (onSaved) onSaved(res.project);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-3xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden my-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--portal-card-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
              <FolderGit2 size={18} />
            </div>
            <div>
              <h2 id="project-modal-title" className="editorial-h2 text-lg font-semibold text-[var(--portal-heading)]">
                {isEditing ? 'Edit Project' : 'Create Project'}
              </h2>
              <p className="text-[11px] text-[var(--portal-meta)]">
                Document engineering systems and chronological build journals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-medium">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Task Engine"
              maxLength={100}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {name.length}/100
            </p>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Short Summary <span className="text-[var(--portal-meta)] font-normal">(Brief tagline)</span>
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="e.g. High-throughput distributed scheduling queue written in Go"
              maxLength={250}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {shortDescription.length}/250
            </p>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Technologies & Frameworks <span className="text-[var(--portal-meta)] font-normal">(comma-separated)</span>
            </label>
            <div className="relative">
              <Code2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)]" />
              <input
                type="text"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                placeholder="e.g. Go, Redis, Docker, gRPC, React"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
              />
            </div>
          </div>

          {/* Status & Visibility Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
                Visibility
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    visibility === 'public'
                      ? 'border-[#007aff] bg-[#007aff]/10 text-[#007aff]'
                      : 'border-[var(--portal-card-border)] text-[var(--portal-meta)] hover:border-[#007aff]/30'
                  }`}
                >
                  <Globe size={14} />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    visibility === 'private'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-[var(--portal-card-border)] text-[var(--portal-meta)] hover:border-amber-500/30'
                  }`}
                >
                  <Lock size={14} />
                  <span>Private</span>
                </button>
              </div>
            </div>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
                Repository URL <span className="text-[var(--portal-meta)] font-normal">(GitHub/GitLab)</span>
              </label>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)]" />
                <input
                  type="url"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
                Live Deployment URL
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--portal-meta)]" />
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://myproject.app"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Full Markdown Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Project Overview & Architecture <span className="text-[var(--portal-meta)] font-normal">(Markdown supported)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the architectural design, core engineering challenges, roadmap, and design trade-offs..."
              rows={4}
              maxLength={10000}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-[var(--portal-card)] border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-none focus:border-[#007aff] transition-colors font-mono resize-y"
            />
            <p className="mt-1 text-[11px] text-[var(--portal-meta)] text-right">
              {description.length}/10000
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--portal-card-border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0062cc] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check size={14} />
                  <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
