// can() gating (Phase 32): the server permission map wins when present; legacy role derivation
// covers payloads without one; logged-out is always false.
import { describe, it, expect } from 'vitest';
import { checkPermission } from './usePermissions';
import type { User } from '@/types';

const base: User = {
  id: 'u1',
  email: 'a@b.c',
  profile: {},
  orgRole: 'member',
  isAdmin: false,
  isAuthenticated: true,
  hasPassword: true,
};

describe('checkPermission', () => {
  it('returns false for a logged-out user', () => {
    expect(checkPermission(null, 'org:view')).toBe(false);
  });

  it('prefers the server permission map when present', () => {
    const user: User = { ...base, permissions: { 'admin:approve': true, 'results:export': false } };
    expect(checkPermission(user, 'admin:approve')).toBe(true); // map overrides isAdmin=false
    expect(checkPermission(user, 'results:export')).toBe(false); // map overrides legacy "everyone"
  });

  it('falls back to legacy role derivation when the map lacks the key', () => {
    const member: User = { ...base, permissions: {} };
    expect(checkPermission(member, 'org:manage_members')).toBe(false);
    expect(checkPermission(member, 'org:view')).toBe(true);
    expect(checkPermission(member, 'results:export')).toBe(true);

    const orgAdmin: User = { ...base, orgRole: 'admin' };
    expect(checkPermission(orgAdmin, 'org:manage_members')).toBe(true);
    expect(checkPermission(orgAdmin, 'admin:approve')).toBe(false);

    const staff: User = { ...base, orgRole: null, isAdmin: true };
    expect(checkPermission(staff, 'admin:approve')).toBe(true);
    expect(checkPermission(staff, 'org:manage_members')).toBe(true);
  });
});
