// Full route tree (Phase 0 skeleton). Leaves render placeholders until their phase builds them.
import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import FullscreenLayout from '@/layouts/FullscreenLayout';
import OrgSettingsLayout from '@/layouts/OrgSettingsLayout';
import ResultLayout from '@/layouts/ResultLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import ResultTabRedirect from './ResultTabRedirect';
import NotFoundPage from '@/pages/NotFoundPage';
import ComingSoonPage from '@/pages/ComingSoonPage';
import ErrorPage from '@/pages/ErrorPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import GoogleCompleteOrgPage from '@/pages/auth/GoogleCompleteOrgPage';
import OrgPendingPage from '@/pages/auth/OrgPendingPage';
import OrgFullPage from '@/pages/auth/OrgFullPage';
import RegistrationPendingPage from '@/pages/auth/RegistrationPendingPage';
import RegistrationRejectedPage from '@/pages/auth/RegistrationRejectedPage';
import CheckoutSuccessPage from '@/pages/billing/CheckoutSuccessPage';
import CheckoutCancelPage from '@/pages/billing/CheckoutCancelPage';
import InviteInvalidPage from '@/pages/billing/InviteInvalidPage';
import ProcessPreferencePage from '@/pages/ProcessPreferencePage';
import FaqPage from '@/pages/FaqPage';
import BackendConnectionTestingPage from '@/pages/BackendConnectionTestingPage';
import SettingsPage from '@/pages/SettingsPage';
import PricingPage from '@/pages/billing/PricingPage';
import AcceptInvitePage from '@/pages/billing/AcceptInvitePage';
import OrgDashboardPage from '@/pages/organization/DashboardPage';
import OrgEditPage from '@/pages/organization/EditPage';
import OrgBillingPage from '@/pages/organization/BillingPage';
import OrgMembersPage from '@/pages/organization/MembersPage';
import OrgInvitesPage from '@/pages/organization/InvitesPage';
import OrgCreditLedgerPage from '@/pages/organization/CreditLedgerPage';
import OrgUpdatesPage from '@/pages/organization/UpdatesPage';
import OrgCrmPage from '@/pages/organization/CrmPage';
import OrgDomainsPage from '@/pages/organization/DomainsPage';
import PendingRegistrationsPage from '@/pages/admin/PendingRegistrationsPage';
import OrganizationApprovalsPage from '@/pages/admin/OrganizationApprovalsPage';
import OrganizationUpdatesPage from '@/pages/admin/OrganizationUpdatesPage';
import OrganizationsListPage from '@/pages/admin/OrganizationsListPage';
import PreviousResultsPage from '@/pages/PreviousResultsPage';
import PreviewResultPage from '@/pages/PreviewResultPage';

// Heavy, rarely-first-visited routes are lazy()-loaded so they ship in their own chunks instead of
// the main bundle. The AppLayout <Suspense> boundary covers them all (Phase 9). SummaryPage also
// pulls in ApexCharts, so its chart lib only ships on that route.
const TargetListPage = lazy(() => import('@/pages/TargetListPage'));
const StrategicResearchPage = lazy(() => import('@/pages/StrategicResearchPage'));
const FinancialVerticalsPage = lazy(() => import('@/pages/FinancialVerticalsPage'));
const FinancialVerticalsDatabasePage = lazy(() => import('@/pages/FinancialVerticalsDatabasePage'));
const FinancialVerticalsResultsPage = lazy(() => import('@/pages/FinancialVerticalsResultsPage'));
const ViewPreviousResultPage = lazy(() => import('@/pages/ViewPreviousResultPage'));
const SummaryPage = lazy(() => import('@/pages/SummaryPage'));
const KnowledgeBankPage = lazy(() => import('@/pages/KnowledgeBankPage'));
const AnalystPreferencesPage = lazy(() => import('@/pages/AnalystPreferencesPage'));
const ScorecardPage = lazy(() => import('@/pages/ScorecardPage'));
const FirmMemoryPage = lazy(() => import('@/pages/FirmMemoryPage'));
const DealsListPage = lazy(() => import('@/pages/deals/DealsListPage'));
const DealWorkspacePage = lazy(() => import('@/pages/deals/DealWorkspacePage'));
const EmailSyncSettingsPage = lazy(() => import('@/pages/EmailSyncSettingsPage'));
// PE Dataset (F23.4) — permission-gated, rarely first-visited → own chunks.
const PEFirmsPage = lazy(() => import('@/pages/pe/PEFirmsPage'));
const PEFirmDetailPage = lazy(() => import('@/pages/pe/PEFirmDetailPage'));
const PEHoldingsPage = lazy(() => import('@/pages/pe/PEHoldingsPage'));
const PEPeoplePage = lazy(() => import('@/pages/pe/PEPeoplePage'));
// PE Review Queue + Corrections (F27.3) — under the pe:dataset gate (staff OR grant).
const PEReviewQueuePage = lazy(() => import('@/pages/pe/PEReviewQueuePage'));
const PECorrectionsPage = lazy(() => import('@/pages/pe/PECorrectionsPage'));
// PE Screener (F29.2) — four-tab search + find-similar, under the pe:dataset gate.
const PEScreenerPage = lazy(() => import('@/pages/pe/PEScreenerPage'));
// PE Exit Watch (F30.2) — exit-readiness ranked table, under the pe:dataset gate.
const PEExitWatchPage = lazy(() => import('@/pages/pe/PEExitWatchPage'));
// PE Activity Feed (F31.2) — changes feed, under the pe:dataset gate.
const PEChangesPage = lazy(() => import('@/pages/pe/PEChangesPage'));
// PE Analysis Dashboard (F32.2) — market analytics, under the pe:dataset gate.
const PEAnalysisPage = lazy(() => import('@/pages/pe/PEAnalysisPage'));
// PE Talent Flow (F33.2) — detected cross-firm moves + person history, under the pe:dataset gate.
const PETalentFlowPage = lazy(() => import('@/pages/pe/PETalentFlowPage'));
// PE Digest (F37.2) — ranked market-event feed, under the pe:dataset gate.
const PEDigestPage = lazy(() => import('@/pages/pe/PEDigestPage'));
// PE Market Map (F38.2) — buyer universe + whitespace, under the pe:dataset gate.
const PEMarketMapPage = lazy(() => import('@/pages/pe/PEMarketMapPage'));
// PE Ask the Market (F39.2) — NL Q&A with citations, under the pe:dataset gate.
const PEAskPage = lazy(() => import('@/pages/pe/PEAskPage'));
// PE Tearsheet (F40.2) — AI company dossier deck, under the pe:dataset gate.
const PETearsheetPage = lazy(() => import('@/pages/pe/PETearsheetPage'));
const PETearsheetViewerPage = lazy(() => import('@/pages/pe/PETearsheetViewerPage'));
// PE Market News (F41.2) — curated headlines widget / standalone page.
const PENewsPage = lazy(() => import('@/pages/pe/PENewsPage'));
// PE Data Tools (F42.3) — single-shot + bulk enrichment utilities.
const PEDataToolsPage = lazy(() => import('@/pages/pe/PEDataToolsPage'));
// PE Admin Ops (F28.2) — STAFF-only operator console, gated separately from pe:dataset.
const PEActionQueuePage = lazy(() => import('@/pages/pe/PEActionQueuePage'));
const PEAdminPage = lazy(() => import('@/pages/pe/PEAdminPage'));
// IB Vertical (F34.4) — banks + transactions + people + screener, under the pe:dataset gate.
const IBBanksPage = lazy(() => import('@/pages/pe/IBBanksPage'));
const IBBankDetailPage = lazy(() => import('@/pages/pe/IBBankDetailPage'));
const IBTransactionsPage = lazy(() => import('@/pages/pe/IBTransactionsPage'));
const IBPeoplePage = lazy(() => import('@/pages/pe/IBPeoplePage'));
const IBScreenerPage = lazy(() => import('@/pages/pe/IBScreenerPage'));
// Usage dashboard (F35.3) — ordinary member; admin budgets under /admin.
const UsagePage = lazy(() => import('@/pages/usage/UsagePage'));
const AdminProviderBudgetsPage = lazy(() => import('@/pages/admin/AdminProviderBudgetsPage'));
const BdScoringPage = lazy(() => import('@/pages/bd-scoring/BdScoringPage'));

// Legacy per-view URL redirects live in ./ResultTabRedirect (react-refresh: no
// component definitions in this file).

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/auth/login', element: <LoginPage />, handle: { title: 'Sign In' } },
      { path: '/auth/signup', element: <SignupPage />, handle: { title: 'Sign Up' } },
      {
        path: '/auth/forgot-password',
        element: <ForgotPasswordPage />,
        handle: { title: 'Forgot Password' },
      },
      {
        path: '/auth/reset-password',
        element: <ResetPasswordPage />,
        handle: { title: 'Reset Password' },
      },
      {
        path: '/auth/google/complete-org',
        element: <GoogleCompleteOrgPage />,
        handle: { title: 'Complete Sign Up' },
      },
      {
        path: '/auth/org-pending',
        element: <OrgPendingPage />,
        handle: { title: 'Organization Pending' },
      },
      { path: '/auth/org-full', element: <OrgFullPage />, handle: { title: 'Organization Full' } },
      {
        path: '/auth/registration-pending',
        element: <RegistrationPendingPage />,
        handle: { title: 'Registration Pending' },
      },
      {
        path: '/auth/registration-rejected',
        element: <RegistrationRejectedPage />,
        handle: { title: 'Registration Rejected' },
      },
    ],
  },
  // Diagnostic page — no auth required, not linked from any nav (direct URL only).
  {
    path: '/backend-connection-testing',
    element: <BackendConnectionTestingPage />,
    handle: { title: 'Backend Connection Testing' },
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <FullscreenLayout />,
        errorElement: <ErrorPage />,
        children: [
          {
            // eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization prop, not the ARIA attribute.
            element: <RoleRoute role="pe_dataset" />,
            children: [
              {
                path: '/pe/tearsheet/view/:id',
                element: <PETearsheetViewerPage />,
                handle: { title: 'Tearsheet' },
              },
            ],
          },
        ],
      },
      {
        element: <AppLayout />,
        // Loader/render errors inside the authed shell render here (within the layout) rather than
        // bubbling to the top-level ErrorBoundary (Phase 14).
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <Navigate to="/process-preference" replace /> },
          {
            path: '/coming-soon',
            element: <ComingSoonPage />,
            handle: { title: 'Coming Soon' },
          },
          {
            path: '/process-preference',
            element: <ProcessPreferencePage />,
            // Wide shell (full width + fixed ~32px gutters) — matches Replit AppShell px-8 gap to sidebar.
            handle: { title: 'Research Home', width: 'wide' },
          },
          {
            path: '/quralyst-research',
            element: <TargetListPage />,
            handle: { title: 'Target List', width: 'wide' },
          },
          {
            path: '/strategic-research',
            element: <StrategicResearchPage />,
            handle: { title: 'Strategic Research', width: 'wide' },
          },
          {
            path: '/financial-verticals',
            element: <FinancialVerticalsPage />,
            handle: { title: 'Financial Verticals', width: 'wide' },
          },
          {
            path: '/financial-verticals/database',
            element: <FinancialVerticalsDatabasePage />,
            handle: { title: 'Financial Verticals Database' },
          },
          {
            path: '/financial-verticals/firm-memory',
            element: <FirmMemoryPage />,
            handle: { title: 'Firm Memory' },
          },
          {
            path: '/financial-verticals/results/:resultId',
            element: <FinancialVerticalsResultsPage />,
            handle: { title: 'Financial Verticals — Results' },
          },
          {
            path: '/deals',
            element: <DealsListPage />,
            handle: { title: 'Deals' },
          },
          {
            path: '/deals/:dealId',
            element: <DealWorkspacePage />,
            handle: { title: 'Deal Workspace' },
          },
          {
            path: '/previous-results',
            element: <PreviousResultsPage />,
            handle: { title: 'Previous Results' },
          },
          {
            path: '/quralyst-research/result/:resultId/data',
            element: <ViewPreviousResultPage />,
            handle: { title: 'Result — Data', width: 'wide' },
          },
          {
            // Merged result workspace (Phase 12): one tabbed shell, client-side tab nav.
            path: '/quralyst-research/result/:resultId',
            element: <ResultLayout />,
            children: [
              { index: true, element: <Navigate to="data" replace /> },
              {
                path: 'preview',
                element: <PreviewResultPage />,
                handle: { title: 'Result — Preview' },
              },
              { path: 'summary', element: <SummaryPage />, handle: { title: 'Result — Summary' } },
            ],
          },
          // Redirects from the legacy per-view URLs (bookmarks / shared links keep working).
          {
            path: '/quralyst-research/previous-results/:resultId',
            element: <ResultTabRedirect tab="data" />,
          },
          {
            path: '/quralyst-research/preview/:resultId',
            element: <ResultTabRedirect tab="preview" />,
          },
          {
            // Manage CRM was removed (CRM is inline now); send old bookmarks to the results tab.
            path: '/quralyst-research/manage-results/:resultId',
            element: <ResultTabRedirect tab="data" />,
          },
          {
            path: '/quralyst-research/summary/:resultId',
            element: <ResultTabRedirect tab="summary" />,
          },
          {
            path: '/knowledge-bank',
            element: <KnowledgeBankPage />,
            handle: { title: 'Knowledge Bank' },
          },
          {
            path: '/analyst-preferences',
            element: <AnalystPreferencesPage />,
            handle: { title: 'Analyst Preferences', width: 'narrow' },
          },
          {
            path: '/scorecard',
            element: <ScorecardPage />,
            handle: { title: 'Scorecard', width: 'narrow' },
          },
          { path: '/settings', element: <Navigate to="/settings/profile" replace /> },
          { path: '/settings/:tab', element: <SettingsPage />, handle: { title: 'Settings' } },
          {
            path: '/email-sync',
            element: <EmailSyncSettingsPage />,
            handle: { title: 'Email Sync' },
          },
          { path: '/faq', element: <FaqPage />, handle: { title: 'FAQ', width: 'narrow' } },
          {
            path: '/usage',
            element: <UsagePage />,
            handle: { title: 'Usage' },
          },
          {
            path: '/bd-scoring',
            element: <BdScoringPage />,
            handle: { title: 'BD Scoring' },
          },
          { path: '/pricing', element: <PricingPage />, handle: { title: 'Pricing' } },
          {
            path: '/billing/accept-invite',
            element: <AcceptInvitePage />,
            handle: { title: 'Accept Invite' },
          },
          {
            path: '/billing/checkout/success',
            element: <CheckoutSuccessPage />,
            handle: { title: 'Checkout Complete' },
          },
          {
            path: '/billing/checkout/cancel',
            element: <CheckoutCancelPage />,
            handle: { title: 'Checkout Cancelled' },
          },
          {
            path: '/billing/invite-invalid',
            element: <InviteInvalidPage />,
            handle: { title: 'Invalid Invite' },
          },
          {
            path: '/org/:orgSlug',
            element: <OrgSettingsLayout />,
            children: [
              {
                path: 'dashboard',
                element: <OrgDashboardPage />,
                handle: { title: 'Organization — Dashboard' },
              },
              { path: 'edit', element: <OrgEditPage />, handle: { title: 'Organization — Edit' } },
              {
                path: 'billing',
                element: <OrgBillingPage />,
                handle: { title: 'Organization — Billing' },
              },
              {
                path: 'members',
                element: <OrgMembersPage />,
                handle: { title: 'Organization — Members' },
              },
              {
                path: 'invites',
                element: <OrgInvitesPage />,
                handle: { title: 'Organization — Invites' },
              },
              {
                path: 'credit-ledger',
                element: <OrgCreditLedgerPage />,
                handle: { title: 'Organization — Credit Ledger' },
              },
              {
                path: 'updates',
                element: <OrgUpdatesPage />,
                handle: { title: 'Organization — Updates' },
              },
              { path: 'crm', element: <OrgCrmPage />, handle: { title: 'Organization — CRM' } },
              {
                path: 'domains',
                element: <OrgDomainsPage />,
                handle: { title: 'Organization — Domains' },
              },
            ],
          },
          {
            path: '/admin',
            // eslint-disable-next-line jsx-a11y/aria-role -- `role` here is RoleRoute's authorization-flag prop (UserFlags key), not the ARIA role attribute.
            element: <RoleRoute role="is_admin" />,
            children: [
              {
                path: 'pending-registrations',
                element: <PendingRegistrationsPage />,
                handle: { title: 'Admin — Pending Registrations' },
              },
              {
                path: 'organization-approvals',
                element: <OrganizationApprovalsPage />,
                handle: { title: 'Admin — Organization Approvals' },
              },
              {
                path: 'organization-updates',
                element: <OrganizationUpdatesPage />,
                handle: { title: 'Admin — Organization Updates' },
              },
              {
                path: 'organizations',
                element: <OrganizationsListPage />,
                handle: { title: 'Admin — Organizations' },
              },
              {
                path: 'provider-budgets',
                element: <AdminProviderBudgetsPage />,
                handle: { title: 'Admin — Provider Budgets' },
              },
            ],
          },
          {
            path: '/pe',
            // eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization prop, not the ARIA attribute.
            element: <RoleRoute role="pe_dataset" />,
            children: [
              {
                path: 'firms',
                element: <PEFirmsPage />,
                handle: { title: 'PE Dataset — Firms', width: 'wide' },
              },
              {
                path: 'firms/:id',
                element: <PEFirmDetailPage />,
                handle: { title: 'PE Dataset — Firm', width: 'wide' },
              },
              {
                path: 'holdings',
                element: <PEHoldingsPage />,
                handle: { title: 'PE Dataset — Holdings', width: 'wide' },
              },
              {
                path: 'people',
                element: <PEPeoplePage />,
                handle: { title: 'PE Dataset — People', width: 'wide' },
              },
              {
                path: 'review-queue',
                element: <PEReviewQueuePage />,
                handle: { title: 'PE Dataset — Review Queue' },
              },
              {
                path: 'corrections',
                element: <PECorrectionsPage />,
                handle: { title: 'PE Dataset — Corrections' },
              },
              {
                path: 'screener',
                element: <PEScreenerPage />,
                handle: { title: 'PE Dataset — Screener' },
              },
              {
                path: 'exit-watch',
                element: <PEExitWatchPage />,
                handle: { title: 'PE Dataset — Exit Watch', width: 'wide' },
              },
              {
                path: 'changes',
                element: <PEChangesPage />,
                handle: { title: 'PE Dataset — Activity' },
              },
              {
                path: 'analysis',
                element: <PEAnalysisPage />,
                handle: { title: 'PE Dataset — Analysis', width: 'wide' },
              },
              {
                path: 'talent-flow',
                element: <PETalentFlowPage />,
                handle: { title: 'PE Dataset — Talent Flow' },
              },
              {
                path: 'digest',
                element: <PEDigestPage />,
                handle: { title: 'PE Dataset — Digest' },
              },
              {
                path: 'market-map',
                element: <PEMarketMapPage />,
                handle: { title: 'PE Dataset — Market Map', width: 'wide' },
              },
              {
                path: 'ask',
                element: <PEAskPage />,
                handle: { title: 'PE Dataset — Ask the Market' },
              },
              {
                path: 'tearsheet',
                element: <PETearsheetPage />,
                handle: { title: 'PE Dataset — Tearsheet' },
              },
              {
                path: 'news',
                element: <PENewsPage />,
                handle: { title: 'PE Dataset — Market News' },
              },
              {
                path: 'data-tools',
                element: <PEDataToolsPage />,
                handle: { title: 'PE Dataset — Data Tools' },
              },
            ],
          },
          {
            // IB Vertical (F34.4) — same pe:dataset gate as the PE dataset. Literal paths
            // (transactions/people/screener) are declared BEFORE the `:id` detail route so they
            // never resolve as a bank id (mirrors the backend route ordering, §3.10).
            path: '/ib',
            // eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization prop, not the ARIA attribute.
            element: <RoleRoute role="pe_dataset" />,
            children: [
              { index: true, element: <IBBanksPage />, handle: { title: 'Investment Banks' } },
              {
                path: 'transactions',
                element: <IBTransactionsPage />,
                handle: { title: 'Investment Banks — Transactions' },
              },
              {
                path: 'people',
                element: <IBPeoplePage />,
                handle: { title: 'Investment Banks — People' },
              },
              {
                path: 'screener',
                element: <IBScreenerPage />,
                handle: { title: 'Investment Banks — Screener' },
              },
              {
                path: ':id',
                element: <IBBankDetailPage />,
                handle: { title: 'Investment Banks — Bank' },
              },
            ],
          },
          {
            // F64.6 — the queue view as its own page. SAME staff-only gate as /pe/admin: it shows
            // cross-firm operational data and carries destructive requeue/purge/pause controls.
            path: '/pe/action-queue',
            // eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization prop, not the ARIA attribute.
            element: <RoleRoute role="pe_admin" />,
            children: [
              {
                index: true,
                element: <PEActionQueuePage />,
                handle: { title: 'PE Dataset — Action Queue' },
              },
            ],
          },
          {
            // Staff-only operator console — gated by pe:admin (staff), NOT the pe:dataset grant.
            path: '/pe/admin',
            // eslint-disable-next-line jsx-a11y/aria-role -- RoleRoute's authorization prop, not the ARIA attribute.
            element: <RoleRoute role="pe_admin" />,
            children: [
              {
                index: true,
                element: <PEAdminPage />,
                handle: { title: 'PE Dataset — Admin Ops' },
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage />, handle: { title: 'Page Not Found' } },
]);
