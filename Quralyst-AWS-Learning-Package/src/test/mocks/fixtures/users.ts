// Seed user fixture (dummy-data mode). Matches the deployed snapshots (Jatin Choudhary).
// id is the special Financial-Verticals-DB user so every sidebar item is exercised in Phase 0.
// Phase 32: users carry a server-driven permission map (see usePermissions/can()); per-role
// seeds below model what FastAPI will compute. Log in with an email containing "member" to get
// the plain-member user and exercise ForbiddenPage / hidden admin links.
import type { User } from '@/types';

export const mockUser: User = {
  id: '6894a9750af0b3214c50205a',
  email: 'jchoudhary@indago-research.com',
  username: 'jatin_choudhary',
  profile: {
    firstName: 'Jatin',
    lastName: 'Choudhary',
    gender: 'male',
    country: 'IN',
    mobileNumber: '+91 8080808080',
    timezone: 'Asia/Kolkata',
    avatar: '/images/profile.png',
  },
  orgRole: 'owner',
  isAdmin: true,
  isAuthenticated: true,
  hasPassword: true,
  showOrgNav: true,
  orgNavSlug: 'quralyst',
  permissions: {
    'org:manage_members': true,
    'org:view': true,
    'billing:view': true,
    'admin:approve': true,
    'results:export': true,
  },
};

// Plain org member — no admin surface, no member management; can still view org pages + export.
export const mockMemberUser: User = {
  id: 'u2',
  email: 'mpatel@indago-research.com',
  username: 'maya_patel',
  profile: {
    firstName: 'Maya',
    lastName: 'Patel',
    gender: 'female',
    country: 'IN',
    timezone: 'Asia/Kolkata',
  },
  orgRole: 'member',
  isAdmin: false,
  isAuthenticated: true,
  hasPassword: true,
  showOrgNav: true,
  orgNavSlug: 'quralyst',
  permissions: {
    'org:manage_members': false,
    'org:view': true,
    'billing:view': false,
    'admin:approve': false,
    'results:export': true,
  },
};

export const mockToken = 'mock-dev-token';
