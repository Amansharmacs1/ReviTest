import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Pre-configured Axios instance for REVITEST SaaS
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: add timestamp or correlation ID
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date().getTime() };
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
  (error) => {
    const errorResponse = {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        'Unable to connect to REVITEST API server',
      statusCode: error.response?.status || 0,
      errors: error.response?.data?.errors || null,
      rawError: error,
    };
    return Promise.reject(errorResponse);
  }
);

export default apiClient;
