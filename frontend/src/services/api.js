import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

let accessToken = null;
let refreshPromise = null;
let onUnauthorized = () => {};

export const setAccessToken = (token) => { accessToken = token || null; };
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  const authRequest = /\/auth\/(login|refresh|register\/patient|register\/doctor)/.test(original?.url || '');
  if (error.response?.status !== 401 || !original || original._retried || authRequest) {
    return Promise.reject(error);
  }
  original._retried = true;
  try {
    refreshPromise ||= api.post('/auth/refresh').then(({ data }) => {
      const token = data.data?.accessToken;
      setAccessToken(token);
      return token;
    }).finally(() => { refreshPromise = null; });
    await refreshPromise;
    return api(original);
  } catch (refreshError) {
    setAccessToken(null);
    onUnauthorized();
    return Promise.reject(refreshError);
  }
});

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors.map((item) => item.msg).join('. ');
  return data?.message || error?.message || 'Something went wrong. Please try again.';
}

export default api;
