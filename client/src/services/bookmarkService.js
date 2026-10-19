import api from './api';

export const bookmarkPost = async (postId, collectionId = null) => {
  const res = await api.post('/bookmarks', { postId, collectionId });
  return res.data;
};

export const unbookmarkPost = async (postId) => {
  const res = await api.delete(`/bookmarks/${postId}`);
  return res.data;
};

export const checkBookmark = async (postId) => {
  const res = await api.get(`/bookmarks/check/${postId}`);
  return res.data;
};

export const checkBatchBookmarks = async (postIds) => {
  const res = await api.post('/bookmarks/check-batch', { postIds });
  return res.data;
};

export const getBookmarks = async (params = {}) => {
  const res = await api.get('/bookmarks', { params });
  return res.data;
};

export const updateBookmarkCollection = async (postId, collectionId) => {
  const res = await api.patch(`/bookmarks/${postId}/collection`, { collectionId });
  return res.data;
};

export const createCollection = async (data) => {
  const res = await api.post('/collections', data);
  return res.data;
};

export const getCollections = async () => {
  const res = await api.get('/collections');
  return res.data;
};

export const updateCollection = async (id, data) => {
  const res = await api.patch(`/collections/${id}`, data);
  return res.data;
};

export const deleteCollection = async (id) => {
  const res = await api.delete(`/collections/${id}`);
  return res.data;
};
