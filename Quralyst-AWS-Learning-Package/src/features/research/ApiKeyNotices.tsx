// Shared UI for the research-wizard API-key guard: the "Verifying API keys…" banner shown while the
// probe is in flight, and the inline red note shown under a toggle whose key isn't valid (with a
// link to User Preferences to fix it). Used by both Target and Strategic Step 2.
import { Link } from 'react-router-dom';
import { paths } from '@/routes/paths';

export function ApiKeyVerifyingBanner() {
  return (
    <div className="alert alert-info d-flex align-items-center mb-3" role="status">
      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      <span>Verifying API keys…</span>
    </div>
  );
}

export function ApiKeyDisabledNote({ reason }: { reason: string }) {
  if (!reason) return null;
  return (
    <div className="text-danger small mb-2">
      <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
      {reason} <Link to={paths.settings.apiKeys}>Configure API Key</Link>
    </div>
  );
}
