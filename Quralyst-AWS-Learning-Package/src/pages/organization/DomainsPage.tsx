// Domains — add domain form + verified/pending list.
import { useEffect, useState, type FormEvent } from 'react';
import { Spinner } from '@/components/ui';
import { organizationService } from '@/services/api';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { useToast } from '@/hooks/useToast';
import type { OrgDomain } from '@/types';

export default function DomainsPage() {
  const slug = useOrgSlug();
  useOrgPageMeta(
    'Domains',
    <>Verify email domains for this organization to streamline onboarding.</>,
  );
  const toast = useToast();

  const [domains, setDomains] = useState<OrgDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    return organizationService
      .getDomains(slug)
      .then((data) => setDomains(data.domains))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    organizationService
      .getDomains(slug)
      .then((data) => {
        if (active) setDomains(data.domains);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const value = domain.trim();
    if (!value) return;
    setSubmitting(true);
    try {
      const res = await organizationService.domainAction(slug, { action: 'add', domain: value });
      if (res.success) {
        toast.success(res.message);
        setDomain('');
        await load();
      } else {
        toast.error(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (value: string) => {
    const res = await organizationService.domainAction(slug, { action: 'verify', domain: value });
    if (res.success) {
      toast.success(res.message);
      await load();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <>
      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Add domain</h2>
            <p className="org-section-sub">Start verification for a work email domain</p>
          </div>
        </div>
        <div className="org-section-body">
          <form className="org-domain-form" onSubmit={handleAdd}>
            <input
              name="domain"
              className="form-control"
              placeholder="example.com"
              autoComplete="off"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <button type="submit" className="btn btn-standard" disabled={submitting}>
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Verified domains</h2>
            <p className="org-section-sub">Domains that can join this organization</p>
          </div>
        </div>
        {loading ? (
          <div className="org-tab-loading">
            <Spinner />
          </div>
        ) : (
          <ul className="org-feed">
            {domains.length ? (
              domains.map((d) => (
                <li key={d.value} className="org-feed-item is-stacked">
                  <div className="org-domain-row">
                    <span>{d.value}</span>
                    <span className="d-flex align-items-center gap-2 flex-wrap">
                      {d.verifiedAt ? (
                        <span className="badge bg-success">verified</span>
                      ) : (
                        <>
                          <span className="badge bg-warning text-dark">pending</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-standard"
                            onClick={() => handleVerify(d.value)}
                          >
                            Verify TXT
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  {d.verificationToken && (
                    <small className="org-domain-token">TXT record: {d.verificationToken}</small>
                  )}
                </li>
              ))
            ) : (
              <li className="org-feed-item is-muted">No domains added yet.</li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}
