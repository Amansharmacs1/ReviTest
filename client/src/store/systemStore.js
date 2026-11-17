import { create } from 'zustand';
import { healthService } from '../services/healthService';

export const useSystemStore = create((set) => ({
  apiStatus: 'checking', // 'healthy' | 'unhealthy' | 'checking'
  dbStatus: 'checking', // 'connected' | 'disconnected' | 'checking'
  apiDetails: null,
  dbDetails: null,
  latencyMs: null,
  lastChecked: null,
  errorMessage: null,
  isRefreshing: false,

  /**
   * Run full health check against backend API and Database
   */
  checkSystemHealth: async () => {
    set({ isRefreshing: true, errorMessage: null });

    try {
      const [apiRes, dbRes] = await Promise.allSettled([
        healthService.getApiHealth(),
        healthService.getDatabaseHealth(),
      ]);

      const isApiOk = apiRes.status === 'fulfilled' && apiRes.value.success;
      const isDbOk =
        dbRes.status === 'fulfilled' &&
        dbRes.value.success &&
        dbRes.value.data?.database?.connected;

      set({
        apiStatus: isApiOk ? 'healthy' : 'unhealthy',
        dbStatus: isDbOk ? 'connected' : 'disconnected',
        apiDetails: apiRes.status === 'fulfilled' ? apiRes.value.data : null,
        dbDetails: dbRes.status === 'fulfilled' ? dbRes.value.data?.database : null,
        latencyMs: apiRes.status === 'fulfilled' ? apiRes.value._latencyMs : null,
        lastChecked: new Date().toLocaleTimeString(),
        isRefreshing: false,
        errorMessage:
          !isApiOk && apiRes.reason?.message
            ? apiRes.reason.message
            : !isDbOk && dbRes.reason?.message
              ? dbRes.reason.message
              : null,
      });
    } catch (err) {
      set({
        apiStatus: 'unhealthy',
        dbStatus: 'disconnected',
        isRefreshing: false,
        lastChecked: new Date().toLocaleTimeString(),
        errorMessage: err.message || 'Health check failed',
      });
    }
  },
}));
