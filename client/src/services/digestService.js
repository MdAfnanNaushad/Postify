import api from './api';

export const getCurrentDigest = async () => {
  const res = await api.get('/digest/current');
  return res.data;
};

export const getDigestHistory = async () => {
  const res = await api.get('/digest/history');
  return res.data;
};

export const getDigestByPeriod = async (periodKey) => {
  const res = await api.get(`/digest/${periodKey}`);
  return res.data;
};

export const markDigestAsRead = async (digestId) => {
  const res = await api.patch(`/digest/${digestId}/read`);
  return res.data;
};

export const getDigestPreferences = async () => {
  const res = await api.get('/digest/preferences');
  return res.data;
};

export const updateDigestPreferences = async (data) => {
  const res = await api.put('/digest/preferences', data);
  return res.data;
};

export const generateDigestManually = async (options = {}) => {
  const res = await api.post('/digest/generate', options);
  return res.data;
};
