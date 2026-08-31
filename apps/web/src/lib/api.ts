import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// ─── Request interceptor: attach access token ─────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 → refresh → retry once ──────────────
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processPendingQueue(error: any, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 on non-auth and non-retried requests
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue requests that come in while a refresh is in-flight
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setAuth, logout, user } = useAuthStore.getState();

      if (!refreshToken) {
        // No refresh token — force logout
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const refreshUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/auth/refresh` : `${baseUrl}/v1/auth/refresh`;
        const res = await axios.post(refreshUrl, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;

        // Update stored tokens (keep user as-is)
        setAuth(user, newAccess, newRefresh);

        // Flush pending queue
        processPendingQueue(null, newAccess);

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processPendingQueue(refreshError, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
