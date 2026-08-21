// EditPage — org profile, Settings-parity API keys (test/clear/update), join-code rotate.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgPageMeta, useOrgSlug } from '@/layouts/orgSettingsMeta';
import { Spinner } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { organizationService } from '@/services/api';
import type { EditData } from '@/services/api/organizationService';
import { paths } from '@/routes/paths';
import OrgApiKeysSection from '@/features/organization/OrgApiKeysSection';

export default function EditPage() {
  const slug = useOrgSlug();
  const { success, error } = useToast();
  const confirm = useConfirm();

  const [data, setData] = useState<EditData | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [allowMemberKeys, setAllowMemberKeys] = useState(false);
  const [orgKeyFallback, setOrgKeyFallback] = useState(false);
  const [membersSeeOrgUsage, setMembersSeeOrgUsage] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [savedProfile, setSavedProfile] = useState({
    name: '',
    allowMemberKeys: false,
    orgKeyFallback: false,
    membersSeeOrgUsage: true,
  });

  useEffect(() => {
    if (!slug) return;
    organizationService
      .getEditData(slug)
      .then((d) => {
        setData(d);
        setName(d.name);
        setAllowMemberKeys(d.allowMemberKeys);
        setOrgKeyFallback(d.orgKeyFallback);
        setMembersSeeOrgUsage(d.membersSeeOrgUsage ?? true);
        setSavedProfile({
          name: d.name,
          allowMemberKeys: d.allowMemberKeys,
          orgKeyFallback: d.orgKeyFallback,
          membersSeeOrgUsage: d.membersSeeOrgUsage ?? true,
        });
        setJoinCode(d.joinCode);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const profileDirty =
    name.trim() !== savedProfile.name.trim() ||
    allowMemberKeys !== savedProfile.allowMemberKeys ||
    orgKeyFallback !== savedProfile.orgKeyFallback ||
    membersSeeOrgUsage !== savedProfile.membersSeeOrgUsage;

  useOrgPageMeta(
    'Organization settings',
    data ? (
      <>
        <span className="org-meta-line">
          {data.name} · slug <code>{slug}</code> · join code <code>{joinCode}</code>
        </span>
        Configure defaults for your organization. Questions? See the{' '}
        <Link to={paths.faq} target="_blank" rel="noopener noreferrer">
          FAQ
        </Link>
        .
      </>
    ) : undefined,
  );

  const saveProfile = async () => {
    setSaving(true);
    try {
      const result = await organizationService.saveEdit(slug, {
        name: name.trim(),
        allow_member_keys: allowMemberKeys,
        org_key_fallback: orgKeyFallback,
        members_see_org_usage: membersSeeOrgUsage,
        keys: {},
      });
      if (result.success) {
        const trimmedName = name.trim();
        setSavedProfile({
          name: trimmedName,
          allowMemberKeys,
          orgKeyFallback,
          membersSeeOrgUsage,
        });
        setName(trimmedName);
        setData((prev) =>
          prev
            ? {
                ...prev,
                name: trimmedName,
                allowMemberKeys,
                orgKeyFallback,
                membersSeeOrgUsage,
              }
            : prev,
        );
        success('Settings saved', result.message || 'Organization settings updated.');
      } else {
        error('Save failed', result.message || 'Failed to save organization settings.');
      }
    } catch {
      error('Error', 'An error occurred while saving organization settings.');
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    const ok = await confirm({
      title: 'Rotate join code',
      message: 'Rotate the organization join code? The old code will stop working.',
      confirmText: 'Rotate',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    setRotating(true);
    try {
      const result = await organizationService.rotateJoinCode(slug);
      setJoinCode(result.joinCode);
      success('Join code rotated', 'A new join code has been generated.');
    } catch {
      error('Error', 'Failed to rotate the join code.');
    } finally {
      setRotating(false);
    }
  };

  if (loading) {
    return (
      <div className="org-tab-loading">
        <Spinner label="Loading organization settings" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="org-section">
        <div className="org-empty">Unable to load organization settings.</div>
      </div>
    );
  }

  return (
    <>
      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Organization profile</h2>
            <p className="org-section-sub">Name and member key policies</p>
          </div>
          {profileDirty && (
            <div className="org-section-actions">
              <button
                type="button"
                className="btn btn-standard"
                onClick={saveProfile}
                disabled={saving || !name.trim()}
              >
                <i className="bi bi-save me-1" /> {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}
        </div>
        <div className="org-section-body">
          <div className="org-field org-field-narrow">
            <label className="org-label" htmlFor="org-display-name">
              Display name
            </label>
            <input
              type="text"
              id="org-display-name"
              name="name"
              className="form-control"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-check org-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="allow_member_keys"
              id="allow_member_keys"
              checked={allowMemberKeys}
              onChange={(e) => setAllowMemberKeys(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="allow_member_keys">
              Allow members to use their own API keys
            </label>
          </div>
          <div className="form-check org-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="org_key_fallback"
              id="org_key_fallback"
              checked={orgKeyFallback}
              onChange={(e) => setOrgKeyFallback(e.target.checked)}
              disabled={!allowMemberKeys}
            />
            <label className="form-check-label" htmlFor="org_key_fallback">
              Fall back to organization default keys when a member has not set their own
            </label>
          </div>
          <div className="form-check org-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="members_see_org_usage"
              id="members_see_org_usage"
              checked={membersSeeOrgUsage}
              onChange={(e) => setMembersSeeOrgUsage(e.target.checked)}
              data-testid="members-see-org-usage"
            />
            <label className="form-check-label" htmlFor="members_see_org_usage">
              Let everyone see everyone’s usage
            </label>
          </div>
        </div>
      </div>

      <OrgApiKeysSection
        slug={slug}
        data={data}
        profileSnapshot={{
          name,
          allowMemberKeys,
          orgKeyFallback,
          membersSeeOrgUsage,
        }}
        onKeyStatusChange={(keyStatus) => setData((prev) => (prev ? { ...prev, keyStatus } : prev))}
      />

      <div className="org-section">
        <div className="org-section-header">
          <div>
            <h2 className="org-section-title">Join code</h2>
            <p className="org-section-sub">
              Rotating invalidates the previous join code. Share the new code only with trusted
              people.
            </p>
          </div>
        </div>
        <div className="org-section-body">
          <p className="mb-3">
            Current join code: <code>{joinCode}</code>
          </p>
          <button type="button" className="btn btn-standard" onClick={rotate} disabled={rotating}>
            <i className="bi bi-arrow-clockwise me-1" />{' '}
            {rotating ? 'Rotating…' : 'Rotate join code'}
          </button>
        </div>
      </div>
    </>
  );
}
