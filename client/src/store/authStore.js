import { create } from 'zustand';
import { authService } from '../services/authService';

// Safely retrieve cached user from local storage
const getCachedItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  user: getCachedItem('revitest_user'),
  organization: getCachedItem('revitest_org'),
  accessToken: localStorage.getItem('revitest_access_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('revitest_access_token')),
  isLoading: false,
  error: null,

  /**
   * Set active tenant slug for workspace scoping
   */
  setTenantSlug: (slug) => {
    if (slug) {
      localStorage.setItem('revitest_tenant_slug', slug);
    } else {
      localStorage.removeItem('revitest_tenant_slug');
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Register Organization and Org Admin
   */
  registerOrg: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.registerOrganization(formData);
      const { user, organization, accessToken } = res.data;

      localStorage.setItem('revitest_access_token', accessToken);
      localStorage.setItem('revitest_user', JSON.stringify(user));
      localStorage.setItem('revitest_org', JSON.stringify(organization));
      localStorage.setItem('revitest_tenant_slug', organization.slug);

      set({
        user,
        organization,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return res;
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Failed to register organization workspace.',
      });
      throw err;
    }
  },

  /**
   * Register Candidate under Organization
   */
  registerCandidate: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.registerCandidate(formData);
      const { user, organization, accessToken } = res.data;

      localStorage.setItem('revitest_access_token', accessToken);
      localStorage.setItem('revitest_user', JSON.stringify(user));
      localStorage.setItem('revitest_org', JSON.stringify(organization));
      localStorage.setItem('revitest_tenant_slug', organization.slug);

      set({
        user,
        organization,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return res;
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Candidate registration failed.',
      });
      throw err;
    }
  },

  /**
   * Login User
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(credentials);
      const { user, organization, accessToken } = res.data;

      localStorage.setItem('revitest_access_token', accessToken);
      localStorage.setItem('revitest_user', JSON.stringify(user));
      if (organization) {
        localStorage.setItem('revitest_org', JSON.stringify(organization));
        localStorage.setItem('revitest_tenant_slug', organization.slug);
      }

      set({
        user,
        organization: organization || null,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return res;
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Invalid credentials or login failed.',
      });
      throw err;
    }
  },

  /**
   * Validate session & fetch fresh user/workspace details
   */
  checkAuth: async () => {
    const token = localStorage.getItem('revitest_access_token');
    if (!token) {
      set({ isAuthenticated: false, user: null, organization: null });
      return;
    }

    try {
      const res = await authService.getCurrentUser();
      const { user, organization } = res.data;

      localStorage.setItem('revitest_user', JSON.stringify(user));
      if (organization) {
        localStorage.setItem('revitest_org', JSON.stringify(organization));
        localStorage.setItem('revitest_tenant_slug', organization.slug);
      }

      set({
        user,
        organization: organization || null,
        isAuthenticated: true,
      });
    } catch {
      localStorage.removeItem('revitest_access_token');
      localStorage.removeItem('revitest_user');
      localStorage.removeItem('revitest_org');
      set({
        isAuthenticated: false,
        user: null,
        organization: null,
        accessToken: null,
      });
    }
  },

  /**
   * Log out session
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      localStorage.removeItem('revitest_access_token');
      localStorage.removeItem('revitest_user');
      localStorage.removeItem('revitest_org');
      localStorage.removeItem('revitest_tenant_slug');

      set({
        user: null,
        organization: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },
}));
