import axios from "axios";

// Derive API base URL for LAN testing:
// 1) Use VITE_API_URL if provided
// 2) Else use current host's IP with backend port 5000
// 3) Fallback to localhost
const runtimeBase = (() => {
  // eslint-disable-next-line no-undef
  const envUrl = import.meta?.env?.VITE_API_URL;
  if (envUrl) return envUrl.endsWith('/') ? envUrl : envUrl + '/';
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const proto = window.location.protocol || 'http:';
    return `/api/`;
    // return "http://localhost:5000/api/"

  }
  return "/api/";
  // return "http://localhost:5000/api/"
})();

const api = axios.create({
  baseURL: runtimeBase,
});

// Automatically attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const hasAuthHeader =
    config.headers &&
    Object.prototype.hasOwnProperty.call(config.headers, "Authorization");
  if (token && !hasAuthHeader) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error interceptor -> dispatch CustomEvent for overlay
api.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message || 'Request failed';
      const requestId = error?.response?.data?.requestId;
      const url = error?.config?.url;
      
      // Don't show token verification errors as global errors
      // Let individual components handle auth errors
      if (status === 401) {
        // 401 means unauthorized - let component handle silently
        console.debug('Unauthorized request:', url);
        return Promise.reject(error);
      }

      // Only dispatch error event for non-auth errors
      window.dispatchEvent(new CustomEvent('api-error', { detail: { status, message, requestId, url } }));
    } catch (_) {}
    return Promise.reject(error);
  }
);

export default api;
