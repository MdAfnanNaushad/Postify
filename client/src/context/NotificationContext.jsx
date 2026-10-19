import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import socketService from '../services/socket';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(res.data.count ?? res.data.unreadCount ?? 0);
      }
    } catch (err) {
      // Silently ignore network failures for badge polling
    }
  }, [isAuthenticated]);

  // Fetch paginated notifications list
  const fetchNotifications = useCallback(
    async ({ cursor = null, type = null, refresh = false } = {}) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (cursor) params.append('cursor', cursor);
        if (type && type !== 'all') params.append('type', type);
        params.append('limit', '20');

        const res = await api.get(`/notifications?${params.toString()}`);
        if (res.data?.success) {
          const fetched = res.data.notifications || [];
          const pagination = res.data.pagination || {};

          setNotifications((prev) => (refresh || !cursor ? fetched : [...prev, ...fetched]));
          setHasMore(Boolean(pagination.hasMore));
          setNextCursor(pagination.nextCursor || null);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const res = await api.patch(`/notifications/${notificationId}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, readAt: res.data.notification?.readAt || new Date().toISOString() } : n
          )
        );
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        } else {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const res = await api.delete(`/notifications/${notificationId}`);
      if (res.data?.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  // Real-time socket events subscription
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    // Initial fetch of unread count
    fetchUnreadCount();

    const socket = socketService.getSocket();

    const handleNewNotification = (newNotif) => {
      if (!newNotif) return;
      setNotifications((prev) => {
        // Prevent duplicate if already present in list
        if (prev.some((n) => n._id === newNotif._id)) return prev;
        setUnreadCount((c) => c + 1);
        return [newNotif, ...prev];
      });
    };

    const handleUnreadCountUpdate = (payload) => {
      if (payload && typeof payload.count === 'number') {
        setUnreadCount(payload.count);
      }
    };

    socket.on('connect', fetchUnreadCount);
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread_count', handleUnreadCountUpdate);

    return () => {
      socket.off('connect', fetchUnreadCount);
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread_count', handleUnreadCountUpdate);
    };
  }, [isAuthenticated, user, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        hasMore,
        nextCursor,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
