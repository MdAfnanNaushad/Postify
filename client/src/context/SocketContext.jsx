import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import socketService from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = socketService.connect();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socketService, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return { socketService, isConnected: false };
  }
  return context;
};

/**
 * Custom hook to subscribe to real-time events for a specific post
 * Automatically handles room subscription, event cleanup, and memory-leak prevention.
 */
export const usePostRealTime = (postId, handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!postId) return;

    socketService.joinPost(postId);
    const socket = socketService.getSocket();

    const handleLike = (payload) => {
      if (payload && payload.postId === postId.toString()) {
        if (handlersRef.current.onLikeUpdate) {
          handlersRef.current.onLikeUpdate(payload);
        }
      }
    };

    const handleReplyCreated = (payload) => {
      if (payload && payload.postId === postId.toString()) {
        if (handlersRef.current.onNewReply) {
          handlersRef.current.onNewReply(payload.reply);
        }
      }
    };

    const handleReplyUpdated = (payload) => {
      if (payload && payload.postId === postId.toString()) {
        if (handlersRef.current.onUpdateReply) {
          handlersRef.current.onUpdateReply(payload.reply);
        }
      }
    };

    const handleReplyDeleted = (payload) => {
      if (payload && payload.postId === postId.toString()) {
        if (handlersRef.current.onDeleteReply) {
          handlersRef.current.onDeleteReply(payload.replyId);
        }
      }
    };

    socket.on('post:like_updated', handleLike);
    socket.on('reply:created', handleReplyCreated);
    socket.on('reply:updated', handleReplyUpdated);
    socket.on('reply:deleted', handleReplyDeleted);

    return () => {
      socketService.leavePost(postId);
      socket.off('post:like_updated', handleLike);
      socket.off('reply:created', handleReplyCreated);
      socket.off('reply:updated', handleReplyUpdated);
      socket.off('reply:deleted', handleReplyDeleted);
    };
  }, [postId]);
};

/**
 * Custom hook to subscribe to feed-level real-time updates (like counts across the feed)
 */
export const useFeedRealTime = (handlers = {}) => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    socketService.joinFeed();
    const socket = socketService.getSocket();

    const handleLike = (payload) => {
      if (handlersRef.current.onLikeUpdate) {
        handlersRef.current.onLikeUpdate(payload);
      }
    };

    socket.on('post:like_updated', handleLike);

    return () => {
      socketService.leaveFeed();
      socket.off('post:like_updated', handleLike);
    };
  }, []);
};
