import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Activity,
  Radio,
  Filter,
  Trash2,
  Pause,
  Play,
  ShieldAlert,
  UserPlus,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';
import adminApi from '../../services/adminApi';

export const AdminLiveActivityPage = () => {
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch initial historical events
  const fetchHistorical = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/activity?limit=30');
      if (res.data?.activities) {
        setEvents(res.data.activities);
      }
    } catch (err) {
      console.error('Failed to load historical activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorical();

    // Establish Socket.IO connection
    const socket = io({
      path: '/socket.io',
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:admin');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('admin:event', (newEvent) => {
      if (!isPaused) {
        setEvents((prev) => [
          {
            id: `live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: newEvent.type,
            title: newEvent.type.replace(/_/g, ' ').toUpperCase(),
            description: typeof newEvent.payload === 'string' ? newEvent.payload : JSON.stringify(newEvent.payload),
            timestamp: newEvent.timestamp || new Date().toISOString(),
            actor: 'System Event',
            severity: 'info'
          },
          ...prev
        ].slice(0, 100)); // Keep max 100
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isPaused]);

  const filteredEvents = events.filter((ev) => {
    if (filterType === 'all') return true;
    if (filterType === 'moderation') return ev.type.includes('moderation') || ev.type.includes('report');
    if (filterType === 'users') return ev.type.includes('user');
    if (filterType === 'posts') return ev.type.includes('post');
    return true;
  });

  const getEventIcon = (type) => {
    if (type.includes('report') || type.includes('moderation')) return ShieldAlert;
    if (type.includes('user')) return UserPlus;
    if (type.includes('post')) return FileText;
    return Activity;
  };

  return (
    <>
      <Helmet>
        <title>Live Activity Stream — Postify Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--portal-heading)] tracking-tight">
                Live Administrative Activity
              </h2>
            </div>
            <p className="text-xs text-[var(--portal-meta)]">
              {isConnected ? 'Real-time WebSocket event stream active' : 'Connecting to live event stream...'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-1.5 rounded-xl border border-[var(--portal-card-border)] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isPaused ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)]'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>

            <button
              onClick={() => setEvents([])}
              className="px-3 py-1.5 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-xs font-semibold text-[var(--portal-meta)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>

            <button
              onClick={fetchHistorical}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--portal-card-border)] bg-[var(--portal-card)] text-[var(--portal-text)] hover:bg-[var(--portal-canvas)] transition-colors"
              title="Refresh stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-[var(--portal-subtle)] shrink-0 ml-1" />
          {[
            { id: 'all', label: 'All Events' },
            { id: 'moderation', label: 'Trust & Moderation' },
            { id: 'users', label: 'User Accounts' },
            { id: 'posts', label: 'Content Posts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                  : 'bg-[var(--portal-card)] text-[var(--portal-meta)] border border-[var(--portal-card-border)] hover:text-[var(--portal-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Event Stream List */}
        <div className="portal-card divide-y divide-[var(--portal-card-border)] overflow-hidden">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev) => {
              const Icon = getEventIcon(ev.type);
              return (
                <div
                  key={ev.id}
                  className="p-4 flex items-start gap-3 hover:bg-[var(--portal-canvas)]/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-[var(--portal-canvas)] border border-[var(--portal-card-border)] flex items-center justify-center shrink-0 mt-0.5 text-[var(--portal-accent)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[var(--portal-heading)] capitalize">
                        {ev.title}
                      </span>
                      <span className="text-[11px] text-[var(--portal-subtle)] shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--portal-meta)] leading-relaxed">
                      {ev.description}
                    </p>
                    {ev.actor && (
                      <div className="text-[10px] text-[var(--portal-subtle)] pt-1">
                        Triggered by: <span className="font-semibold text-[var(--portal-text)]">{ev.actor}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-xs text-[var(--portal-meta)]">
              No live events matching the active filter.
            </div>
          )}
        </div>
      </div>
    </>
  );
};
