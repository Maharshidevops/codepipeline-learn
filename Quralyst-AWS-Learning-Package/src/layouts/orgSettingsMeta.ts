// Org-settings shell context + tab hooks, split out of OrgSettingsLayout.tsx so that
// file only exports components (react-refresh/only-export-components — HMR fast-refresh).
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';

export interface OrgPageMeta {
  title: string;
  subtitle?: ReactNode;
}

export interface OrgMetaContextValue {
  setMeta: (meta: OrgPageMeta) => void;
}

export const OrgMetaContext = createContext<OrgMetaContextValue | null>(null);

/** Set the org page header title/subtitle for the current tab. */
export function useOrgPageMeta(title: string, subtitle?: ReactNode) {
  const ctx = useContext(OrgMetaContext);
  useEffect(() => {
    ctx?.setMeta({ title, subtitle });
  }, [ctx, title, subtitle]);
}

/** Current org slug from the route. */
export function useOrgSlug(): string {
  return useParams<{ orgSlug: string }>().orgSlug ?? '';
}
