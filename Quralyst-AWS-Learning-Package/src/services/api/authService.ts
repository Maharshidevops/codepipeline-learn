// Auth service interface + implementation. Components/hooks import from here only.
// OAuth 2.0: login/refresh return token metadata; cookies are set httpOnly by the backend.
import { http } from '@/services/http';
import { endpoints } from '@/services/endpoints';
import type {
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
  SignupPayload,
  User,
} from '@/types';

export interface SignupResult {
  signupSuccess: boolean;
  userDetails?: { name: string; username: string; email: string };
  redirect?: 'registration-pending' | 'org-pending' | 'login';
}

export interface MessageResult {
  success: boolean;
  message: string;
  lockedUntil?: string;
}

export interface GoogleCompleteOrgPayload {
  email: string;
  firstName: string;
  lastName: string;
  orgId?: string;
  orgName?: string;
  mobileNumber?: string;
  primaryDomain?: string;
}

export interface AuthTokens {
  token: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResult extends AuthTokens {
  user: User;
}

export interface AuthService {
  login(payload: LoginPayload): Promise<LoginResult>;
  signup(payload: SignupPayload): Promise<SignupResult>;
  forgotPassword(payload: ForgotPasswordPayload): Promise<MessageResult>;
  resetPassword(payload: ResetPasswordPayload): Promise<MessageResult>;
  googleCompleteOrg(payload: GoogleCompleteOrgPayload): Promise<LoginResult>;
  getCurrentUser(): Promise<User | null>;
  refreshSession(): Promise<AuthTokens | null>;
  logout(): Promise<void>;
}

export const authService: AuthService = {
  login: (payload) =>
    http<LoginResult>(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signup: (payload) =>
    http<SignupResult>(endpoints.auth.signup, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  forgotPassword: (payload) =>
    http<MessageResult>(endpoints.auth.forgotPassword, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetPassword: (payload) =>
    http<MessageResult>(endpoints.auth.resetPassword, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  googleCompleteOrg: (payload) =>
    http<LoginResult>(endpoints.auth.googleCompleteOrg, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCurrentUser: () => http<User | null>(endpoints.auth.currentUser),
  refreshSession: async () => {
    try {
      return await http<AuthTokens>(endpoints.auth.refresh, { method: 'POST' });
    } catch {
      return null;
    }
  },
  logout: () => http<void>(endpoints.auth.logout, { method: 'POST' }),
};
