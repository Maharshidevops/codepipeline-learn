// Auth/session store (Zustand). OAuth 2.0: tokens live in httpOnly cookies; this store holds
// the current user and optional expiry metadata for proactive refresh scheduling.
import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  token: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setUser: (user: User | null, token?: string | null, expiresIn?: number | null) => void;
  login: (user: User, token: string, expiresIn?: number) => void;
  logout: () => void;
  markHydrated: () => void;
  scheduleTokenExpiry: (expiresIn: number) => void;
}

function expiryFromNow(expiresIn: number): number {
  return Date.now() + Math.max(60, expiresIn) * 1000;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  token: null,
  tokenExpiresAt: null,
  isAuthenticated: false,
  hydrated: false,
  setUser: (user, token = null, expiresIn = null) =>
    set({
      currentUser: user,
      token,
      isAuthenticated: !!user,
      tokenExpiresAt: expiresIn ? expiryFromNow(expiresIn) : null,
    }),
  login: (user, token, expiresIn) =>
    set({
      currentUser: user,
      token,
      isAuthenticated: true,
      tokenExpiresAt: expiresIn ? expiryFromNow(expiresIn) : null,
    }),
  logout: () =>
    set({ currentUser: null, token: null, tokenExpiresAt: null, isAuthenticated: false }),
  markHydrated: () => set({ hydrated: true }),
  scheduleTokenExpiry: (expiresIn) => set({ tokenExpiresAt: expiryFromNow(expiresIn) }),
}));
