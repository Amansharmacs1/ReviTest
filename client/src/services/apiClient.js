import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Pre-configured Axios instance for REVITEST SaaS
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Send HTTP-Only refresh cookies
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: attach auth token & tenant context
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date().getTime() };

    // Attach Bearer Access Token if present
    const token = localStorage.getItem('revitest_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach Tenant identifier if workspace is selected
    const tenantSlug = localStorage.getItem('revitest_tenant_slug');
    if (tenantSlug && !config.headers['X-Tenant-Slug']) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: compute duration and normalize response structure
apiClient.interceptors.response.use(
  (response) => {
    const duration = new Date().getTime() - (response.config.metadata?.startTime || 0);
    return {
      ...response.data,
      _latencyMs: duration,
      _status: response.status,
    };
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 and token expired, attempt automatic session refresh once
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.code === 'AUTH_TOKEN_EXPIRED' &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (refreshRes.data?.success && refreshRes.data?.data?.accessToken) {
          const newToken = refreshRes.data.data.accessToken;
          localStorage.setItem('revitest_access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        localStorage.removeItem('revitest_access_token');
        localStorage.removeItem('revitest_user');
        localStorage.removeItem('revitest_org');
      }
    }

    const errorResponse = {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Unable to connect to REVITEST API server',
      statusCode: error.response?.status || 0,
      error: error.response?.data?.error || null,
      errors: error.response?.data?.errors || null,
      rawError: error,
    };
    return Promise.reject(errorResponse);
  }
);

export default apiClient;
