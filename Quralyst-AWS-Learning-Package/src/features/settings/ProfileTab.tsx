// ProfilePage — port of profile.html. View/Edit/Save/Cancel with field locking, country→timezone +
// phone-prefix cascade, avatar upload (validate type/size → POST), and password change/set (live
// checklist). Field names/logic match the Flask form; gender/country/timezone use the shared Select.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';
import { Button, Modal, Select, type SelectOption } from '@/components/ui';
import PasswordRequirements from '@/components/form/PasswordRequirements';
import Spinner from '@/components/ui/Spinner/Spinner';
import { profileService } from '@/services/api';
import { countries, countryTimezones, phonePrefixes, mobilePlaceholders } from '@/data/profileData';
import { passwordMeetsAllRequirements } from '@/lib/password';
import { getAuthErrorMessage } from '@/lib/authErrors';
import '@/styles/pages/profile.css';

const GENDER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Select your country' },
  ...countries.map((c) => ({ value: c.code, label: c.name })),
];

// Strip a known country prefix (and leading +/0) to show just the local number.
function extractPhoneNumber(full: string): string {
  if (!full) return '';
  let n = full.trim();
  for (const prefix of Object.values(phonePrefixes)) {
    if (n.startsWith(prefix + ' ') || n.startsWith(prefix)) {
      n = n.substring(prefix.length).trim();
      break;
    }
  }
  return n.replace(/^[+0]+/, '').trim();
}

function normalizeAvatarUrl(url?: string | null): string {
  if (!url) return '/images/profile.png';
  if (url.startsWith('/profile/image/')) return `/api${url}`;
  return url;
}

export default function ProfileTab() {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const profile = currentUser?.profile ?? {};

  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [gender, setGender] = useState<string>(profile.gender ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [timezone, setTimezone] = useState(profile.timezone ?? '');
  const [mobile, setMobile] = useState(extractPhoneNumber(profile.mobileNumber ?? ''));
  const original = useRef<Record<string, string>>({});

  const [avatar, setAvatar] = useState(() => normalizeAvatarUrl(profile.avatar));

  useEffect(() => {
    if (profile.avatar) {
      setAvatar(normalizeAvatarUrl(profile.avatar));
    }
  }, [profile.avatar]);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasPassword = currentUser?.hasPassword ?? true;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const tzOptions: SelectOption[] = useMemo(() => {
    const list = country ? (countryTimezones[country] ?? []) : [];
    return [
      { value: '', label: 'Select a timezone' },
      ...list.map(([v, l]) => ({ value: v, label: l })),
    ];
  }, [country]);

  const phonePrefix = (country && phonePrefixes[country]) || '+1';
  const mobilePlaceholder = (country && mobilePlaceholders[country]) || 'Your Mobile Number';

  const enterEdit = () => {
    original.current = { firstName, lastName, gender, country, timezone, mobile };
    setEditMode(true);
  };
  const cancelEdit = () => {
    const o = original.current;
    setFirstName(o.firstName ?? '');
    setLastName(o.lastName ?? '');
    setGender(o.gender ?? '');
    setCountry(o.country ?? '');
    setTimezone(o.timezone ?? '');
    setMobile(o.mobile ?? '');
    setEditMode(false);
  };

  const onCountryChange = (code: string) => {
    setCountry(code);
    // Auto-select the only timezone if a country has exactly one.
    const list = countryTimezones[code] ?? [];
    setTimezone(list.length === 1 ? list[0][0] : '');
    setMobile((cur) => extractPhoneNumber(cur));
  };

  const save = async () => {
    try {
      const completeMobile = mobile.trim() ? `${phonePrefix} ${mobile.trim()}` : '';
      const result = await profileService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        gender,
        country,
        timezone,
        mobile_number: completeMobile,
      });
      if (result.success) {
        success('Profile Updated', 'Your profile has been updated successfully.');
        setEditMode(false);
      } else {
        error('Update Failed', result.message || 'Failed to update profile.');
      }
    } catch {
      error('Error', 'An error occurred while updating your profile.');
    }
  };

  const onDeleteImage = async () => {
    setDeletingImage(true);
    try {
      const res = await profileService.deleteImage();
      if (res.success) {
        setAvatar('/images/profile.png');
        if (currentUser) {
          useAuthStore.getState().setUser({
            ...currentUser,
            profile: {
              ...currentUser.profile,
              avatar: undefined,
            },
          });
        }
        success('Profile photo removed', 'Your profile photo has been reset to default.');
        setPreviewOpen(false);
      } else {
        error('Delete failed', res.message || 'Failed to remove profile photo.');
      }
    } catch {
      error('Error', 'An error occurred while removing your profile photo.');
    } finally {
      setDeletingImage(false);
    }
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      error('Invalid file type', 'Please upload a PNG, JPG, JPEG, GIF, or WebP image.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('File too large', 'File size exceeds the 5MB limit. Please choose a smaller image.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const data = await profileService.uploadImage(file);
      if (data.success && data.image_url) {
        const rawUrl = data.image_url.startsWith('/profile/image/')
          ? `/api${data.image_url}`
          : data.image_url;
        setAvatar(`${rawUrl}?t=${Date.now()}`);
        if (currentUser) {
          useAuthStore.getState().setUser({
            ...currentUser,
            profile: {
              ...currentUser.profile,
              avatar: rawUrl,
            },
          });
        }
        success('Profile image updated successfully!', '');
      } else {
        error('Upload failed', data.message || 'Error uploading image.');
      }
    } catch {
      error('Error', 'Error uploading image. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const changePassword = async () => {
    setPwdMsg(null);
    if (!newPassword.trim()) {
      setPwdMsg({
        success: false,
        text: hasPassword
          ? 'Please provide both current and new passwords.'
          : 'Please enter a password to set.',
      });
      return;
    }
    if (hasPassword && !oldPassword.trim()) {
      setPwdMsg({ success: false, text: 'Please provide your current password.' });
      return;
    }
    if (!passwordMeetsAllRequirements(newPassword)) {
      setPwdMsg({
        success: false,
        text: 'Please meet all password requirements before continuing.',
      });
      return;
    }
    setPwdLoading(true);
    try {
      const data = await profileService.changePassword({
        new_password: newPassword,
        ...(hasPassword ? { old_password: oldPassword } : {}),
      });
      setPwdMsg({ success: data.success, text: data.message });
      if (data.success) {
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setPwdMsg({
        success: false,
        text: getAuthErrorMessage(err, 'Unable to change password. Please try again.'),
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const inputCls = (extra = '') => `profile-input${editMode ? ' editable' : ''}${extra}`;

  return (
    <div className="profile-tab">
      {/* Header */}
      <div className="profile-header-container">
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div
              className="profile-avatar"
              onClick={() => setPreviewOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPreviewOpen(true);
                }
              }}
              title="Click to view or change profile photo"
              aria-label="View or change profile photo"
            >
              <img
                id="profileImageDisplay"
                src={avatar}
                alt="Profile"
                className="profile-image"
                onError={() => {
                  if (avatar !== '/images/profile.png') {
                    setAvatar('/images/profile.png');
                  }
                }}
              />
              <button
                type="button"
                className="profile-image-upload-label"
                title="Click to upload profile image"
                aria-label="Upload profile image"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRef.current?.click();
                }}
              >
                <i className="bi bi-camera" />
              </button>
              <input
                ref={fileRef}
                type="file"
                id="profileImageInput"
                accept="image/*"
                className="d-none"
                onChange={onPickImage}
              />
              {uploading && (
                <div className="image-upload-progress">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            <div className="profile-basic-info">
              <h2 className="profile-name">
                {firstName} {lastName}
              </h2>
              <p className="profile-email">{currentUser?.email}</p>
            </div>
          </div>
          <div className="profile-actions">
            {!editMode ? (
              <Button variant="primary" onClick={enterEdit}>
                <i className="bi bi-pencil-square me-1" /> Edit Profile
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={save}>
                  <i className="bi bi-check-lg me-1" /> Save Changes
                </Button>
                <Button variant="secondary" onClick={cancelEdit}>
                  <i className="bi bi-x-lg me-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="profile-section">
        <div className="row">
          <div className="col-md-6 mb-4">
            <label className="profile-label" htmlFor="profileFirstName">
              First Name
            </label>
            <input
              type="text"
              id="profileFirstName"
              className={inputCls()}
              value={firstName}
              placeholder="Your First Name"
              readOnly={!editMode}
              disabled={!editMode}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-4">
            <label className="profile-label" htmlFor="profileLastName">
              Last Name
            </label>
            <input
              type="text"
              id="profileLastName"
              className={inputCls()}
              value={lastName}
              placeholder="Your Last Name"
              readOnly={!editMode}
              disabled={!editMode}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-4">
            <label className="profile-label" htmlFor="profileUsername">
              Username
            </label>
            <input
              type="text"
              id="profileUsername"
              className="profile-input non-editable"
              value={currentUser?.username ?? ''}
              placeholder="Username"
              readOnly
              disabled
            />
          </div>
          <div className="col-md-6 mb-4">
            <label className="profile-label" htmlFor="profileEmail">
              Email
            </label>
            <input
              type="email"
              id="profileEmail"
              className="profile-input non-editable"
              value={currentUser?.email ?? ''}
              placeholder="Email Address"
              readOnly
              disabled
            />
          </div>
          <div className="col-md-6 mb-4">
            {/* a11y (Phase 35): Select captions are <span>s (label[for] cannot target the
                  custom combobox); each Select is named via aria-labelledby instead. */}
            <span className="profile-label" id="profileGenderLabel">
              Gender
            </span>
            <Select
              value={gender}
              onChange={setGender}
              options={GENDER_OPTIONS}
              disabled={!editMode}
              buttonClassName="profile-input"
              aria-labelledby="profileGenderLabel"
            />
          </div>
          <div className="col-md-6 mb-4">
            <span className="profile-label" id="profileCountryLabel">
              Country
            </span>
            <Select
              value={country}
              onChange={onCountryChange}
              options={COUNTRY_OPTIONS}
              disabled={!editMode}
              buttonClassName="profile-input"
              aria-labelledby="profileCountryLabel"
            />
          </div>
          <div className="col-md-6 mb-4">
            <label className="profile-label" htmlFor="mobileNumber">
              Mobile Number
            </label>
            <div className="input-group">
              <span className="input-group-text" id="phonePrefix">
                {phonePrefix}
              </span>
              <input
                type="tel"
                className={inputCls()}
                id="mobileNumber"
                value={mobile}
                placeholder={mobilePlaceholder}
                readOnly={!editMode}
                disabled={!editMode}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <span className="profile-label" id="profileTimezoneLabel">
              Time Zone
            </span>
            <Select
              value={timezone}
              onChange={setTimezone}
              options={tzOptions}
              disabled={!editMode}
              buttonClassName="profile-input"
              aria-labelledby="profileTimezoneLabel"
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="billing-section profile-security-section">
        <h3 className="billing-title">Security Settings</h3>
        {pwdMsg && (
          <div
            className="profile-notice profile-notice--password"
            style={{
              backgroundColor: pwdMsg.success
                ? 'var(--color-success-bg)'
                : 'var(--color-danger-bg)',
              color: pwdMsg.success ? 'var(--color-success)' : 'var(--color-danger)',
            }}
          >
            {pwdMsg.text}
          </div>
        )}

        {!hasPassword && (
          <div className="row mb-2">
            <div className="col-12">
              <div className="profile-notice profile-notice--google">
                <i className="bi bi-google google-brand-icon" />
                Your account was created with Google. Set a password to also sign in with email
                &amp; password.
              </div>
            </div>
          </div>
        )}

        <div className="row security-password-inputs align-items-start g-2">
          {hasPassword && (
            <div className="col-12 col-md-4 mb-2 mb-md-3">
              <label className="profile-label" htmlFor="old_password">
                Current Password
              </label>
              <input
                type="password"
                className="profile-input editable"
                id="old_password"
                placeholder="Enter current password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
          )}
          <div className={`col-12 ${hasPassword ? 'col-md-4' : 'col-md-8'} mb-2 mb-md-3`}>
            <label className="profile-label" htmlFor="new_password">
              {hasPassword ? 'New Password' : 'Set Password'}
            </label>
            <input
              type="password"
              className="profile-input editable"
              id="new_password"
              placeholder={hasPassword ? 'Enter new password' : 'Choose a password'}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordRequirements password={newPassword} id="profile-password-reqs" />
          </div>
          <div className="col-12 col-md-4 mb-3 d-grid d-md-block change-password-col">
            <Button
              variant="primary"
              onClick={changePassword}
              disabled={pwdLoading}
              loading={pwdLoading}
              className="w-100 justify-content-center"
            >
              {hasPassword ? 'Change Password' : 'Set Password'}
            </Button>
          </div>
        </div>
      </div>
      {/* Photo Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Profile Photo"
        size="sm"
      >
        <div className="profile-preview-modal-body">
          <div className="profile-preview-img-wrap">
            <img
              src={avatar}
              alt="Profile full preview"
              className="profile-preview-img"
              onError={() => {
                if (avatar !== '/images/profile.png') {
                  setAvatar('/images/profile.png');
                }
              }}
            />
          </div>
          <div className="profile-preview-actions">
            <Button
              variant="primary"
              loading={uploading}
              onClick={() => {
                fileRef.current?.click();
              }}
            >
              <i className="bi bi-camera me-1" /> Change Photo
            </Button>
            {avatar !== '/images/profile.png' && (
              <Button variant="danger" loading={deletingImage} onClick={onDeleteImage}>
                <i className="bi bi-trash me-1" /> Delete Photo
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
