# src/types/

Domain TypeScript types shared across services, mocks, and UI. Everything is re-exported through the barrel, so consumers write `import type { User } from '@/types'`. Shapes track the legacy Flask data model — see `REF-DATA-MODEL.md`.

| File              | Purpose                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`        | Barrel re-exporting all domain type modules.                                                                                                                                                                     |
| `common.ts`       | Cross-domain types: `Paginated<T>` envelope and the `ApiError` thrown by `http.ts`.                                                                                                                              |
| `user.ts`         | `User`, `Profile`, `Gender`, `OrgRole`, and the server-driven `PermissionKey` map read only via `can()`/`usePermissions`.                                                                                        |
| `organization.ts` | `Organization`, `OrgDomain`, members/invites/usage/ledger rows, and the `OrgKeyName` union of the eight provider API keys.                                                                                       |
| `billing.ts`      | `Plan`, `TopupPack`, `Subscription`, balance/invoice/payment-method types.                                                                                                                                       |
| `preferences.ts`  | API-key preference types: `ApiKeySource`, `ApiKeyTestStatus`/`ApiKeyTestResult`, `PreferencesData`, update results.                                                                                              |
| `admin.ts`        | Admin queue types: `PendingRegistration`, `OrgApproval`, seat requests, org updates, org directory entries.                                                                                                      |
| `research.ts`     | Research/location/progress types: `LocationData`/`LocationGroup`, `ProcessType`, the wizard form models (RHF state per process page), and progress-stream event types (`ProgressSource`, `ProgressUpdateEvent`). |
| `result.ts`       | Results types: `ResultTab`, `ResultSummary`/`ResultDetail`, `FiltersApplied`, summary stats, CRM rows, and `Comment`/`CommentStats`.                                                                             |
