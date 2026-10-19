import api from './api';

const toPath = (idOrSlug) => {
  if (!idOrSlug) return '';
  if (typeof idOrSlug === 'object' && idOrSlug.username && idOrSlug.slug) {
    return `user/${idOrSlug.username}/${idOrSlug.slug}`;
  }
  return String(idOrSlug);
};

export const getProjects = async (params = {}) => {
  const res = await api.get('/projects', { params });
  return res.data;
};

export const getMyProjects = async () => {
  const res = await api.get('/projects/my');
  return res.data;
};

export const getProject = async (idOrSlug) => {
  const path = toPath(idOrSlug);
  const res = await api.get(`/projects/${path}`);
  return res.data;
};

export const createProject = async (data) => {
  const res = await api.post('/projects', data);
  return res.data;
};

export const updateProject = async (idOrSlug, data) => {
  const path = toPath(idOrSlug);
  const res = await api.patch(`/projects/${path}`, data);
  return res.data;
};

export const deleteProject = async (idOrSlug) => {
  const path = toPath(idOrSlug);
  const res = await api.delete(`/projects/${path}`);
  return res.data;
};

export const getUserProjects = async (userId) => {
  const res = await api.get(`/users/${userId}/projects`);
  return res.data;
};

export const getProjectLogs = async (idOrSlug, params = {}) => {
  const path = toPath(idOrSlug);
  const res = await api.get(`/projects/${path}/logs`, { params });
  return res.data;
};

export const createBuildLog = async (idOrSlug, data) => {
  const path = toPath(idOrSlug);
  const res = await api.post(`/projects/${path}/logs`, data);
  return res.data;
};

export const getBuildLog = async (idOrSlug, logId) => {
  const path = toPath(idOrSlug);
  const res = await api.get(`/projects/${path}/logs/${logId}`);
  return res.data;
};

export const updateBuildLog = async (idOrSlug, logId, data) => {
  const path = toPath(idOrSlug);
  const res = await api.patch(`/projects/${path}/logs/${logId}`, data);
  return res.data;
};

export const deleteBuildLog = async (idOrSlug, logId) => {
  const path = toPath(idOrSlug);
  const res = await api.delete(`/projects/${path}/logs/${logId}`);
  return res.data;
};
