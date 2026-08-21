// User / auth types. See REF-DATA-MODEL.md (base.html, profile.html).

export type Gender = '' | 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type OrgRole = 'owner' | 'admin' | 'member';

export interface Profile {
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  country?: string; // country code
  mobileNumber?: string; // stored with prefix, e.g. "+1 5551234567"
  timezone?: string; // IANA
  avatar?: string;
}

// Server-driven permission map (Phase 32). Keys are namespaced actions; the backend computes
// them per user — `can()` (usePermissions) is the ONLY read path for new UI gating. When the
// map is absent (older payloads), can() falls back to the legacy role derivation.
export type PermissionKey =
  | 'org:manage_members'
  | 'org:view'
  | 'billing:view'
  | 'admin:approve'
  | 'results:export'
  | 'pe:dataset' // F23.4 — staff or explicit per-user grant (backend F23.1)
  | 'pe:admin'; // F28.2 — staff only (the /pe/admin operator console; backend require_staff)

export interface User {
  id: string;
  email: string;
  username?: string;
  profile: Profile;
  orgRole: OrgRole | null;
  isAdmin: boolean; // Quralyst staff
  isAuthenticated: boolean;
  hasPassword: boolean; // false = Google-only account
  showOrgNav?: boolean;
  orgNavSlug?: string;
  permissions?: Partial<Record<PermissionKey, boolean>>;
}

export interface LoginPayload {
  email: string;
  password: string;
  /** Controls the server cookie lifetime once httpOnly sessions land (Phase 32 contract). */
  remember: boolean;
}

/** Login lockout (Phase 32): after repeated failures the login endpoint responds 429 with this
 *  body; the UI counts down to `lockedUntil` (ISO) and disables submit until then. */
export interface LoginLockout {
  error: string;
  lockedUntil: string;
}

export interface SignupPayload {
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  invite?: string; // invite token
  orgId?: string; // join existing (QR-XXXXXX)
  orgName?: string; // create new
  primaryDomain?: string;
  mobileNumber?: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}
