// Prior-contact badge (Tier B / B9 / F21). Renders "N emails · Last <month>" with a summary tooltip
// for a matched company, or nothing when there's no prior contact. The batch hook lives in
// ./usePriorContacts.
import { type PriorContact } from '@/services/api';

export default function PriorContactBadge({ contact }: { contact?: PriorContact }) {
  if (!contact || !contact.matched) return null;
  const when = contact.lastMessageDate
    ? new Date(contact.lastMessageDate).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : '';
  const count = contact.messageCount ?? 0;
  return (
    <span
      className="badge bg-info-subtle text-info-emphasis border border-info-subtle"
      title={contact.summary || 'Prior email contact'}
    >
      <i className="bi bi-envelope-check me-1" aria-hidden="true" />
      {count} email{count === 1 ? '' : 's'}
      {when ? ` · ${when}` : ''}
    </span>
  );
}
