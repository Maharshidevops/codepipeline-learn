# Rule: services & data (the one network seam)

**Applies to:** `src/services/**`, `src/lib/caseMapper*`, `src/config.ts`

- **All backend traffic goes through `src/services/http.ts`** and the typed services in
  `src/services/api/*`. Never call `fetch`/axios directly from a component or hook.
- **Auth & CSRF:** requests send `credentials: 'include'` (httpOnly cookie session); **mutations echo
  the CSRF double-submit token**. 401/403/CSRF handling lives in the http seam — don't re-implement.
- **Casing:** the backend speaks **camelCase**; conversion is centralised in `lib/caseMapper`. Don't
  scatter manual key remapping.
- **Server state = TanStack Query v5.** Query keys are stable and typed; mutations invalidate the
  exact keys they affect. Don't fetch in `useEffect` and store in component state.
- **Config** is read once in `src/config.ts` into a typed `config` (`apiBaseUrl`, `errorReportingDsn`,
  `logShipping`). `VITE_API_BASE_URL` is empty for same-origin (the dev Vite proxy / prod serving
  layer route API paths to FastAPI on `:8000`).
- **Types** for request/response shapes live in `src/types` and must match the backend; the contract
  is `Phases/REF-API-CONTRACTS.md`. Update both sides together.
- **Observability:** errors flow through `lib/reportError` (Sentry, env-gated) and the ring-buffered
  logger ships to `/api/logs` with `X-Request-ID`. Don't add new logging transports ad hoc.
