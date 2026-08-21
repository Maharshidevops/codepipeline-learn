// Organization settings shell — Replit `/usage` parity header + OrgSubnav pill row.
// Each tab sets title/subtitle via useOrgPageMeta() and renders its body through <Outlet>.
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import OrgSubnav from '@/components/layout/OrgSubnav';
import { useAuth } from '@/hooks/useAuth';
import { OrgMetaContext, useOrgSlug, type OrgPageMeta } from './orgSettingsMeta';
import '@/styles/pages/org-settings.css';

export default function OrgSettingsLayout() {
  const slug = useOrgSlug();
  const { isOrgAdmin } = useAuth();
  const [meta, setMeta] = useState<OrgPageMeta>({ title: '' });

  return (
    <OrgMetaContext.Provider value={{ setMeta }}>
      <div className="org-settings-page">
        <header className="org-header">
          <p className="org-eyebrow">Organization</p>
          <h1 className="org-title">{meta.title || 'Organization'}</h1>
          {meta.subtitle ? <div className="org-subtitle">{meta.subtitle}</div> : null}
        </header>

        <OrgSubnav orgSlug={slug} isOrgAdmin={isOrgAdmin} />

        <Outlet />
      </div>
    </OrgMetaContext.Provider>
  );
}
