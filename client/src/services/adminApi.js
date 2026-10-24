import axios from 'axios';

// Dedicated Axios instance for Admin Control Center APIs
const adminApi = axios.create({
  baseURL: '/api/admin',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to handle session expiration cleanly
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Return structured error message
    const message = error.response?.data?.message || error.message || 'An administrative API error occurred';
    return Promise.reject(new Error(message));
  }
);

export default adminApi;
