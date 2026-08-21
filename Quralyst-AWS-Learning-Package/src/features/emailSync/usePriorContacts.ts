// Batch prior-contact lookup (Tier B / B9 / F21). One request matches a page of companies to the
// user's email interactions; returns a Map keyed by company name (only matched entries). Empty when
// no mailbox is connected. Kept separate from the badge component for react-refresh cleanliness.
import { useQuery } from '@tanstack/react-query';
import { emailSyncService, type PriorContact } from '@/services/api';

export function usePriorContacts(
  companies: { name: string; website?: string }[],
): Map<string, PriorContact> {
  const names = companies.map((c) => c.name).filter(Boolean);
  const { data } = useQuery({
    queryKey: ['prior-contacts', [...names].sort().join('|')],
    queryFn: () => emailSyncService.matchCompanies(companies),
    enabled: names.length > 0,
    staleTime: 5 * 60_000,
  });
  const map = new Map<string, PriorContact>();
  for (const r of data ?? []) {
    if (r.matched) map.set(r.name, r);
  }
  return map;
}
