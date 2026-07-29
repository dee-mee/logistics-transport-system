import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("wb_access_token");
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem("wb_refresh_token");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE}/auth/login/refresh/`, {
            refresh: refreshToken
          });
          
          localStorage.setItem("wb_access_token", response.data.access);
          localStorage.setItem("wb_refresh_token", response.data.refresh);
          
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return client(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem("wb_access_token");
        localStorage.removeItem("wb_refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden - permission denied
    if (error.response?.status === 403) {
      return Promise.reject({
        ...error,
        customMessage: "You don't have permission to access this resource.",
        isPermissionError: true
      });
    }

    // Handle 423 Locked - account locked
    if (error.response?.status === 423) {
      return Promise.reject({
        ...error,
        customMessage: "Your account has been locked due to too many failed login attempts. Please try again later.",
        isLockedError: true
      });
    }

    return Promise.reject(error);
  }
);

export default client;
export const apiClient = client;
