import React from 'react';

/**
 * Semantic configuration for all project statuses.
 * Guarantees distinct, vibrant colors for each status:
 * - in_progress: Amber / Yellow (active building)
 * - completed: Emerald Green (shipped / done)
 * - planned: Purple / Violet (blueprint / upcoming)
 * - paused: Orange / Coral (on hold)
 * - archived: Zinc / Gray (retired)
 */
export const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/25',
    dotClass: 'bg-amber-500 dark:bg-amber-400 animate-pulse',
    activeBtnClass: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs'
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/25',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    activeBtnClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs'
  },
  planned: {
    label: 'Planned',
    badgeClass: 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
    activeBtnClass: 'border-purple-500/40 bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-xs'
  },
  paused: {
    label: 'Paused',
    badgeClass: 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/25',
    dotClass: 'bg-orange-500 dark:bg-orange-400',
    activeBtnClass: 'border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-xs'
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/25',
    dotClass: 'bg-zinc-400 dark:bg-zinc-500',
    activeBtnClass: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 shadow-xs'
  }
};

/**
 * Normalizes any format of status (camelCase, Title Case, spaces, hyphens)
 * to one of the canonical status keys.
 */
export function normalizeStatus(rawStatus) {
  if (!rawStatus || typeof rawStatus !== 'string') return 'in_progress';
  const clean = rawStatus.trim().toLowerCase().replace(/[-\s]+/g, '_');

  if (clean === 'completed' || clean === 'complete' || clean === 'finished' || clean === 'done') {
    return 'completed';
  }
  if (clean === 'planned' || clean === 'plan' || clean === 'backlog' || clean === 'upcoming') {
    return 'planned';
  }
  if (clean === 'paused' || clean === 'pause' || clean === 'on_hold' || clean === 'hold') {
    return 'paused';
  }
  if (clean === 'archived' || clean === 'archive' || clean === 'deprecated') {
    return 'archived';
  }
  if (clean === 'in_progress' || clean === 'inprogress' || clean === 'active' || clean === 'building') {
    return 'in_progress';
  }

  return clean in STATUS_CONFIG ? clean : 'in_progress';
}

/**
 * Get config helper for inline class string usage
 */
export function getStatusConfig(rawStatus) {
  const key = normalizeStatus(rawStatus);
  return STATUS_CONFIG[key] || STATUS_CONFIG.in_progress;
}

/**
 * Reusable ProjectStatusBadge component
 *
 * @param {string} status - Raw project status string
 * @param {('xs'|'sm'|'md')} size - Badge sizing
 * @param {boolean} showDot - Whether to show colored indicator dot
 * @param {string} className - Extra Tailwind classes
 */
export const ProjectStatusBadge = ({
  status,
  size = 'sm',
  showDot = true,
  className = ''
}) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    xs: 'text-[9.5px] px-2 py-0.5 gap-1 tracking-tight',
    sm: 'text-[10px] px-2.5 py-0.5 gap-1.5 tracking-tight',
    md: 'text-[11px] px-3 py-1 gap-1.5 tracking-normal'
  }[size] || 'text-[10px] px-2.5 py-0.5 gap-1.5';

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  }[size] || 'w-1.5 h-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border select-none transition-colors ${config.badgeClass} ${sizeClasses} ${className}`}
      title={`Status: ${config.label}`}
    >
      {showDot && (
        <span
          className={`rounded-full shrink-0 ${dotSizes} ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
};

export default ProjectStatusBadge;
