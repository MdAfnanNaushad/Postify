import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Bell, Clock, Globe, Check, AlertCircle } from 'lucide-react';
import { getDigestPreferences, updateDigestPreferences } from '../../services/digestService';

export const DigestSettingsModal = ({ isOpen, onClose, onSaved }) => {
  const previouslyFocusedRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [lastDeliveryStatus, setLastDeliveryStatus] = useState(null);

  // Form State
  const [enabled, setEnabled] = useState(true);
  const [emailDelivery, setEmailDelivery] = useState(false);
  const [deliveryDay, setDeliveryDay] = useState('monday');
  const [timezone, setTimezone] = useState('UTC');
  const [includeFollowedPosts, setIncludeFollowedPosts] = useState(true);
  const [includeInteractions, setIncludeInteractions] = useState(true);
  const [includeBuildLogs, setIncludeBuildLogs] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(true);

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

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await getDigestPreferences();
      if (res.success && res.preferences) {
        const p = res.preferences;
        setEnabled(p.enabled !== false);
        setEmailDelivery(Boolean(p.emailDelivery));
        setDeliveryDay(p.deliveryDay || 'monday');
        setTimezone(p.timezone || 'UTC');
        setIncludeFollowedPosts(p.includeFollowedPosts !== false);
        setIncludeInteractions(p.includeInteractions !== false);
        setIncludeBuildLogs(p.includeBuildLogs !== false);
        setIncludeHighlights(p.includeHighlights !== false);
        setLastDeliveryStatus(p.lastDeliveryStatus || null);
      }
      setEmailConfigured(Boolean(res.emailConfigured));
    } catch {
      // Fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const res = await updateDigestPreferences({
        enabled,
        emailDelivery,
        deliveryDay,
        timezone,
        includeFollowedPosts,
        includeInteractions,
        includeBuildLogs,
        includeHighlights
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Digest settings saved successfully!' });
        if (onSaved) onSaved(res.preferences);
        setTimeout(() => {
          onClose();
          setFeedback(null);
        }, 1200);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="digest-settings-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--portal-card-border)] mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 text-[#007aff] flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <h3 id="digest-settings-title" className="text-lg font-bold text-[var(--portal-heading)]">Digest Preferences</h3>
              <p className="text-xs text-[var(--portal-meta)]">Control your weekly engineering radar and delivery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close digest preferences modal"
            className="p-1.5 rounded-full text-[var(--portal-meta)] hover:text-[var(--portal-heading)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}
          >
            {feedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4 py-8 animate-pulse">
            <div className="h-10 bg-black/10 dark:bg-white/10 rounded-xl" />
            <div className="h-10 bg-black/10 dark:bg-white/10 rounded-xl" />
            <div className="h-10 bg-black/10 dark:bg-white/10 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)]">
              <div>
                <div className="text-sm font-semibold text-[var(--portal-heading)]">Weekly Digest Generation</div>
                <div className="text-xs text-[var(--portal-meta)]">Generate your personalized weekly developer journal</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007aff]" />
              </label>
            </div>

            {/* Email Opt-in Section */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--portal-card-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--portal-meta)]" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--portal-heading)]">Email Delivery</div>
                    <div className="text-xs text-[var(--portal-meta)]">Receive weekly summaries in your inbox</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailDelivery}
                    onChange={(e) => setEmailDelivery(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007aff]" />
                </label>
              </div>

              {emailConfigured ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <div>
                    <span className="font-semibold">Resend Delivery:</span> Active and configured for weekly developer digests.
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Provider Notice:</span> Resend email provider is not currently configured in this environment. In-app digests remain active.
                  </div>
                </div>
              )}

              {lastDeliveryStatus === 'email_failed' && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>Most recent weekly email delivery attempt could not be confirmed by provider.</span>
                </div>
              )}

              {!emailDelivery && (
                <div className="text-[11px] text-[var(--portal-meta)] px-1">
                  Email delivery is disabled. Weekly digests will be generated exclusively within the application.
                </div>
              )}
            </div>

            {/* Timing & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--portal-meta)] uppercase tracking-wider mb-2">
                  Delivery Day
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-3 text-[var(--portal-meta)]" />
                  <select
                    value={deliveryDay}
                    onChange={(e) => setDeliveryDay(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-hidden focus:border-[#007aff]"
                  >
                    <option value="monday">Monday (Recommended)</option>
                    <option value="sunday">Sunday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--portal-meta)] uppercase tracking-wider mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-3 text-[var(--portal-meta)]" />
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="UTC or America/New_York"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-black/5 dark:bg-white/5 border border-[var(--portal-card-border)] text-[var(--portal-heading)] focus:outline-hidden focus:border-[#007aff]"
                  />
                </div>
              </div>
            </div>

            {/* Content Customization */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--portal-meta)] uppercase tracking-wider mb-1">
                Include in your digest
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs sm:text-sm text-[var(--portal-text)]">
                <input
                  type="checkbox"
                  checked={includeFollowedPosts}
                  onChange={(e) => setIncludeFollowedPosts(e.target.checked)}
                  className="rounded-sm text-[#007aff] focus:ring-[#007aff]"
                />
                <span>New updates from followed developers</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs sm:text-sm text-[var(--portal-text)]">
                <input
                  type="checkbox"
                  checked={includeInteractions}
                  onChange={(e) => setIncludeInteractions(e.target.checked)}
                  className="rounded-sm text-[#007aff] focus:ring-[#007aff]"
                />
                <span>Interactions & replies on your posts</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs sm:text-sm text-[var(--portal-text)]">
                <input
                  type="checkbox"
                  checked={includeBuildLogs}
                  onChange={(e) => setIncludeBuildLogs(e.target.checked)}
                  className="rounded-sm text-[#007aff] focus:ring-[#007aff]"
                />
                <span>Project Build Logs from followed engineers</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs sm:text-sm text-[var(--portal-text)]">
                <input
                  type="checkbox"
                  checked={includeHighlights}
                  onChange={(e) => setIncludeHighlights(e.target.checked)}
                  className="rounded-sm text-[#007aff] focus:ring-[#007aff]"
                />
                <span>Platform Highlights & Public Discovery</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--portal-card-border)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--portal-meta)] hover:text-[var(--portal-heading)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-full text-xs font-semibold bg-[#007aff] text-white hover:bg-[#0069dc] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
