import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'staff';
  tenantId: string;
  avatar?: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (tokens) =>
        set({
          tokens,
        }),

      setLoading: (isLoading) =>
        set({
          isLoading,
        }),

      setError: (error) =>
        set({
          error,
        }),

      clearError: () =>
        set({
          error: null,
        }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error?.message || 'Gagal login. Periksa email dan password Anda.'
            );
          }

          const data = await response.json();

          set({
            user: data.data.user,
            tokens: data.data.tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Terjadi kesalahan saat login';

          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });

          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });

        // Call logout endpoint to invalidate tokens
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${get().tokens?.accessToken}`,
          },
          credentials: 'include',
        }).catch(() => {
          // Silently fail if logout endpoint fails
        });
      },

      refreshAccessToken: async () => {
        const { tokens } = get();

        if (!tokens?.refreshToken) {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.refreshToken}`,
            },
            credentials: 'include',
          });

          if (!response.ok) {
            set({
              user: null,
              tokens: null,
              isAuthenticated: false,
            });
            return;
          }

          const data = await response.json();

          set({
            tokens: data.data.tokens,
            isAuthenticated: true,
          });
        } catch {
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
        }
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      hasPermission: (permission) => {
        const { user } = get();
        return user?.permissions.includes(permission) || false;
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);