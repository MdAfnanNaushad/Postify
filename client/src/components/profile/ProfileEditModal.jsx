import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Globe, MapPin, Code2, FolderGit2, Check } from 'lucide-react';
import { GithubIcon, LinkedinIcon } from '../common/SocialIcons';
import api from '../../services/api';

const POPULAR_TECHS = [
  'React',
  'Node.js',
  'TypeScript',
  'Go',
  'Python',
  'Docker',
  'Kubernetes',
  'MongoDB',
  'PostgreSQL',
  'GraphQL',
  'Next.js',
  'TailwindCSS',
  'Rust',
  'AWS',
  'Redis'
];

export const ProfileEditModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const previouslyFocusedRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [github, setGithub] = useState(user?.github || '');
  const [linkedin, setLinkedin] = useState(user?.linkedin || '');

  const [techStack, setTechStack] = useState(user?.techStack || []);
  const [newTechInput, setNewTechInput] = useState('');

  const [selectedProjects, setSelectedProjects] = useState(
    user?.selectedProjects && user.selectedProjects.length > 0
      ? user.selectedProjects.map((p) => ({
          name: p.name || '',
          description: p.description || '',
          techStack: Array.isArray(p.techStack) ? p.techStack : [],
          projectUrl: p.projectUrl || ''
        }))
      : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
          previouslyFocusedRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
      setGithub(user.github || '');
      setLinkedin(user.linkedin || '');
      setTechStack(user.techStack || []);
      setSelectedProjects(
        user.selectedProjects && user.selectedProjects.length > 0
          ? user.selectedProjects.map((p) => ({
              name: p.name || '',
              description: p.description || '',
              techStack: Array.isArray(p.techStack) ? p.techStack : [],
              projectUrl: p.projectUrl || ''
            }))
          : []
      );
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, user]);

  const handleAddTech = (tech) => {
    const trimmed = tech.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setNewTechInput('');
    }
  };

  const handleRemoveTech = (techToRemove) => {
    setTechStack(techStack.filter((t) => t !== techToRemove));
  };

  const handleAddProject = () => {
    if (selectedProjects.length >= 6) {
      alert('You can showcase a maximum of 6 projects.');
      return;
    }
    setSelectedProjects([
      ...selectedProjects,
      { name: '', description: '', techStack: [], projectUrl: '' }
    ]);
  };

  const handleProjectChange = (index, field, value) => {
    const updated = [...selectedProjects];
    updated[index][field] = value;
    setSelectedProjects(updated);
  };

  const handleRemoveProject = (index) => {
    setSelectedProjects(selectedProjects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate URLs if provided
      if (website && !/^https?:\/\//i.test(website)) {
        throw new Error('Website URL must start with http:// or https://');
      }
      if (github && !/^https?:\/\//i.test(github)) {
        throw new Error('GitHub profile must start with http:// or https://');
      }
      if (linkedin && !/^https?:\/\//i.test(linkedin)) {
        throw new Error('LinkedIn profile must start with http:// or https://');
      }

      // Filter out invalid projects
      const validProjects = selectedProjects.filter((p) => p.name && p.name.trim());

      const payload = {
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        github: github.trim(),
        linkedin: linkedin.trim(),
        techStack,
        selectedProjects: validProjects
      };

      const res = await api.put('/users/me', payload);
      if (res.data?.success) {
        setSuccess(true);
        if (onProfileUpdated) {
          onProfileUpdated(res.data.user);
        }
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-edit-modal-title"
    >
      <div className="portal-card bg-[var(--portal-card)] border border-[var(--portal-card-border)] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--portal-card-border)] shrink-0">
          <div>
            <h2 id="profile-edit-modal-title" className="editorial-h2 text-xl font-semibold text-[var(--portal-heading)]">
              Edit Technical Profile
            </h2>
            <p className="text-xs text-[var(--portal-meta)]">
              Present your developer identity, skills, projects, and work
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit profile modal"
            className="p-1.5 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
              <Check size={14} />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Linus Torvalds"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
            />
          </div>

          {/* Developer Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[var(--portal-heading)]">
                Developer Bio & Summary
              </label>
              <span className="text-[11px] text-[var(--portal-meta)] font-mono">
                {bio.length}/500
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Tell other developers about what you build, your current focus, or open source contributions..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50 resize-none leading-relaxed"
            />
          </div>

          {/* Location & External Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-[#007aff]" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, India / Remote"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5 flex items-center gap-1.5">
                <Globe size={13} className="text-[#007aff]" />
                Portfolio / Personal Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourdomain.dev"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5 flex items-center gap-1.5">
                <GithubIcon size={13} className="text-[#007aff]" />
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5 flex items-center gap-1.5">
                <LinkedinIcon size={13} className="text-[#007aff]" />
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-sm text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
              />
            </div>
          </div>

          {/* Technology Stack Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--portal-heading)] mb-1.5 flex items-center gap-1.5">
              <Code2 size={14} className="text-[#007aff]" />
              Technology Stack
            </label>

            {/* Current Selected Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5 min-h-[32px] p-2 rounded-xl bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)]">
              {techStack.length === 0 ? (
                <span className="text-xs text-[var(--portal-meta)] italic">
                  No technologies selected yet. Click from suggestions below or type a custom tag.
                </span>
              ) : (
                techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[#007aff]/10 text-[#007aff] border border-[#007aff]/20"
                  >
                    <span>{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(tech)}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newTechInput}
                onChange={(e) => setNewTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTech(newTechInput);
                  }
                }}
                placeholder="Type technology name and press Add..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-xs text-[var(--portal-text)] focus:outline-none focus:ring-2 focus:ring-[#007aff]/50"
              />
              <button
                type="button"
                onClick={() => handleAddTech(newTechInput)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--portal-canvas-secondary)] border border-[var(--portal-card-border)] hover:bg-[#007aff]/10 hover:text-[#007aff] transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Popular Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[var(--portal-meta)] mr-1">Suggestions:</span>
              {POPULAR_TECHS.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => handleAddTech(tech)}
                  disabled={techStack.includes(tech)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                    techStack.includes(tech)
                      ? 'opacity-40 line-through bg-black/5 dark:bg-white/5 text-[var(--portal-meta)]'
                      : 'bg-black/5 dark:bg-white/5 hover:bg-[#007aff]/15 hover:text-[#007aff] text-[var(--portal-text)]'
                  }`}
                >
                  +{tech}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Projects Showcase */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--portal-heading)] flex items-center gap-1.5">
                <FolderGit2 size={14} className="text-[#007aff]" />
                Selected Projects Showcase (Max 6)
              </label>
              {selectedProjects.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#007aff] hover:underline cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Project</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {selectedProjects.map((proj, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-[var(--portal-card-border)] bg-[var(--portal-canvas-secondary)] space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--portal-heading)]">
                      Project #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(idx)}
                      className="p-1 rounded-md text-[var(--portal-meta)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Remove project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => handleProjectChange(idx, 'name', e.target.value)}
                      placeholder="Project Name (e.g. Raft-KV Database)"
                      className="px-3 py-1.5 rounded-lg bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-xs text-[var(--portal-text)] focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                      required
                    />
                    <input
                      type="url"
                      value={proj.projectUrl}
                      onChange={(e) => handleProjectChange(idx, 'projectUrl', e.target.value)}
                      placeholder="URL (https://github.com/org/repo)"
                      className="px-3 py-1.5 rounded-lg bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-xs text-[var(--portal-text)] focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                    />
                  </div>

                  <textarea
                    value={proj.description}
                    onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                    rows={2}
                    placeholder="Short description of technical architecture, features, or impact..."
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-xs text-[var(--portal-text)] focus:outline-none focus:ring-1 focus:ring-[#007aff] resize-none"
                  />

                  <div>
                    <input
                      type="text"
                      value={(proj.techStack || []).join(', ')}
                      onChange={(e) =>
                        handleProjectChange(
                          idx,
                          'techStack',
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="Technologies used (comma separated: Go, Raft, gRPC, Docker)"
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--portal-input)] border border-[var(--portal-input-border)] text-xs font-mono text-[var(--portal-text)] focus:outline-none focus:ring-1 focus:ring-[#007aff]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--portal-card-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 rounded-full text-xs font-semibold text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
